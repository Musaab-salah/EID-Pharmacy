from datetime import date, timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import F, Sum
from django.db.models.functions import Coalesce
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    Batch,
    Branch,
    Category,
    Customer,
    PaymentAccount,
    Product,
    PurchaseInvoice,
    PurchaseLine,
    SaleInvoice,
    SaleLine,
    StockCountLog,
    Supplier,
    User,
)
from .serializers import (
    BatchSerializer,
    BranchSerializer,
    CategorySerializer,
    CustomerSerializer,
    InventoryAdjustSerializer,
    PaymentAccountSerializer,
    ProductSerializer,
    PurchaseInvoiceSerializer,
    PurchaseLineSerializer,
    SaleInvoiceSerializer,
    SaleLineSerializer,
    SupplierSerializer,
    UserSerializer,
)


class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer
    permission_classes = [IsAuthenticated]


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by("id")
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all().order_by("id")
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated]


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("id")
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.prefetch_related("branches").all().order_by("id")
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]

    def _prepare_data(self, request):
        """Ensure branches is a list when sent as JSON string (e.g. from FormData)."""
        data = request.data.copy()
        if hasattr(data, "_mutable"):
            data._mutable = True
        branches = data.get("branches")
        if isinstance(branches, str):
            import json
            try:
                data["branches"] = json.loads(branches)
            except (json.JSONDecodeError, TypeError):
                data["branches"] = []
        return data

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=self._prepare_data(request))
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(
            instance, data=self._prepare_data(request), partial=partial
        )
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="low-stock")
    def low_stock(self, request):
        threshold = int(request.query_params.get("threshold", 5))
        qs = (
            Product.objects.annotate(stock=Coalesce(Sum("batches__qty_on_hand"), 0))
            .filter(stock__lte=threshold)
            .order_by("id")
        )
        data = [
            {
                "id": product.id,
                "name_ar": product.name_ar,
                "name_en": product.name_en,
                "sku": product.sku,
                "stock": int(product.stock or 0),
            }
            for product in qs
        ]
        return Response(data)


class BatchViewSet(viewsets.ModelViewSet):
    queryset = Batch.objects.select_related("product", "branch").all().order_by("id")
    serializer_class = BatchSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"])
    def fefo(self, request):
        product_id = request.query_params.get("product_id")
        branch_id = request.query_params.get("branch_id")
        batches = Batch.objects.filter(qty_on_hand__gt=0)
        if product_id:
            batches = batches.filter(product_id=product_id)
        if branch_id:
            batches = batches.filter(branch_id=branch_id)
        batches = batches.filter(expiry_date__gte=date.today()).order_by("expiry_date")
        serializer = self.get_serializer(batches, many=True)
        return Response(serializer.data)


class PaymentAccountViewSet(viewsets.ModelViewSet):
    queryset = PaymentAccount.objects.all().order_by("id")
    serializer_class = PaymentAccountSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"], url_path="active")
    def active_list(self, request):
        qs = PaymentAccount.objects.filter(is_active=True).order_by("id")
        serializer = PaymentAccountSerializer(qs, many=True)
        return Response(serializer.data)


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by("id")
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"], url_path="lookup")
    def lookup(self, request):
        phone = (request.query_params.get("phone") or "").strip()
        if not phone:
            return Response({"exists": False})
        customer = Customer.objects.filter(phone__iexact=phone).first()
        if not customer:
            return Response({"exists": False})
        return Response({"exists": True, "customer": CustomerSerializer(customer).data})


class SaleLineViewSet(viewsets.ModelViewSet):
    queryset = SaleLine.objects.select_related("invoice", "product", "batch").all()
    serializer_class = SaleLineSerializer
    permission_classes = [IsAuthenticated]


class SaleInvoiceViewSet(viewsets.ModelViewSet):
    queryset = SaleInvoice.objects.select_related("branch", "customer", "cashier").all()
    serializer_class = SaleInvoiceSerializer
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        payload = request.data.copy()
        if isinstance(payload.get("lines"), str):
            import json
            payload["lines"] = json.loads(payload["lines"])
        lines = payload.get("lines", [])
        if not lines:
            return Response({"detail": "Lines are required."}, status=400)

        branch_id = payload.get("branch")
        cashier_id = payload.get("cashier")
        if not branch_id or not cashier_id:
            return Response({"detail": "Branch and cashier are required."}, status=400)

        payment_method = payload.get("payment_method") or SaleInvoice.PAYMENT_CASH
        if payment_method == SaleInvoice.PAYMENT_TRANSFER:
            payment_account_id = payload.get("payment_account")
            payment_proof = request.FILES.get("payment_proof") if hasattr(request, "FILES") else None
            if not payment_account_id:
                return Response({"detail": "Payment account is required for transfer."}, status=400)
            if not payment_proof:
                return Response({"detail": "Payment proof image is required for transfer."}, status=400)

        total = Decimal("0.00")
        for line in lines:
            batch_id = line.get("batch")
            qty = int(line.get("qty", 0))
            if qty <= 0:
                return Response({"detail": "Qty must be positive."}, status=400)

            batch = Batch.objects.select_for_update().get(id=batch_id)
            if batch.branch_id != int(branch_id):
                return Response({"detail": "Batch branch mismatch."}, status=400)
            if batch.expiry_date < date.today():
                return Response({"detail": "Expired batch."}, status=400)
            if batch.qty_on_hand < qty:
                return Response({"detail": "Insufficient stock."}, status=400)

            unit_price = Decimal(str(line.get("unit_price", batch.product.price)))
            line_total = unit_price * qty
            line["unit_price"] = unit_price
            line["line_total"] = line_total
            total += line_total

        discount = Decimal(str(payload.get("discount", 0)))
        tax = Decimal(str(payload.get("tax", 0)))
        grand_total = total - discount + tax
        payload["total"] = total
        payload["grand_total"] = grand_total
        payload["payment_method"] = payment_method
        if payment_method == SaleInvoice.PAYMENT_TRANSFER:
            payload["payment_account"] = payload.get("payment_account")
            payload["payment_proof"] = request.FILES.get("payment_proof") if hasattr(request, "FILES") else None

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        invoice = serializer.save()

        for line in invoice.lines.all():
            Batch.objects.filter(id=line.batch_id).update(
                qty_on_hand=F("qty_on_hand") - line.qty
            )

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def today(self, request):
        user = request.user
        qs = self.get_queryset().filter(created_at__date=date.today())
        if user.branch_id:
            qs = qs.filter(branch_id=user.branch_id)
        total = qs.aggregate(total=Sum("grand_total"))["total"] or 0
        return Response({"count": qs.count(), "total": total})


class InventoryViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"], url_path="audit/batches")
    def audit_batches(self, request):
        """List batches for inventory audit. Filter: branch_id, branch_ids (comma-separated), audit_type."""
        branch_id = request.query_params.get("branch_id")
        branch_ids_str = request.query_params.get("branch_ids")
        audit_type = request.query_params.get("audit_type", "weekly")
        qs = Batch.objects.select_related("product", "branch").order_by("product__name_en", "batch_no")
        if branch_ids_str:
            ids = [int(x.strip()) for x in branch_ids_str.split(",") if x.strip().isdigit()]
            if ids:
                qs = qs.filter(branch_id__in=ids)
        elif branch_id:
            qs = qs.filter(branch_id=branch_id)
        data = [
            {
                "id": b.id,
                "product_id": b.product_id,
                "product_name": b.product.name_en,
                "product_name_ar": b.product.name_ar,
                "batch_no": b.batch_no,
                "expiry_date": str(b.expiry_date),
                "branch_id": b.branch_id,
                "branch_name": b.branch.name_en,
                "system_qty": b.qty_on_hand,
            }
            for b in qs
        ]
        return Response(data)

    @action(detail=False, methods=["post"], url_path="audit/save")
    @transaction.atomic
    def audit_save(self, request):
        """Save physical stock counts. Body: { audit_type, branch_id, counts: [{ batch_id, physical_qty }] }"""
        audit_type = request.data.get("audit_type", "weekly")
        branch_id = request.data.get("branch_id")
        counts = request.data.get("counts", [])
        if not branch_id:
            return Response({"detail": "branch_id required."}, status=400)
        adjustments = []
        for item in counts:
            batch_id = item.get("batch_id")
            physical_qty = int(item.get("physical_qty", 0))
            if batch_id is None or physical_qty < 0:
                continue
            batch = Batch.objects.select_for_update().filter(id=batch_id, branch_id=branch_id).first()
            if not batch:
                continue
            old_qty = batch.qty_on_hand
            if old_qty != physical_qty:
                batch.qty_on_hand = physical_qty
                batch.save()
                adjustments.append({"batch_id": batch_id, "old_qty": old_qty, "new_qty": physical_qty})
        if audit_type in ("daily", "weekly", "monthly"):
            StockCountLog.objects.create(
                audit_type=audit_type,
                branch_id=branch_id,
                created_by=request.user,
                adjustments=adjustments,
            )
        return Response({"detail": "Saved.", "adjusted": len(adjustments)})

    @action(detail=False, methods=["post"])
    @transaction.atomic
    def adjust(self, request):
        serializer = InventoryAdjustSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        batch = Batch.objects.select_for_update().get(id=data["batch_id"])
        qty = data["qty"]
        action = data["action"]

        if action == "add":
            batch.qty_on_hand += qty
            batch.save()
            return Response({"detail": "Stock added."})

        if action == "subtract":
            if batch.qty_on_hand < qty:
                return Response({"detail": "Insufficient stock."}, status=400)
            batch.qty_on_hand -= qty
            batch.save()
            return Response({"detail": "Stock subtracted."})

        if action == "transfer":
            target_branch_id = data.get("target_branch_id")
            if not target_branch_id:
                return Response({"detail": "Target branch required."}, status=400)
            if batch.qty_on_hand < qty:
                return Response({"detail": "Insufficient stock."}, status=400)
            batch.qty_on_hand -= qty
            batch.save()
            Batch.objects.create(
                product=batch.product,
                branch_id=target_branch_id,
                batch_no=batch.batch_no,
                expiry_date=batch.expiry_date,
                qty_on_hand=qty,
                unit_cost=batch.unit_cost,
            )
            return Response({"detail": "Stock transferred."})

        return Response({"detail": "Invalid action."}, status=400)


class PurchaseInvoiceViewSet(viewsets.ModelViewSet):
    queryset = PurchaseInvoice.objects.select_related("supplier", "branch").prefetch_related(
        "lines__product"
    ).order_by("-purchase_date", "-id")
    serializer_class = PurchaseInvoiceSerializer
    permission_classes = [IsAuthenticated]


class ReportViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"])
    def purchases(self, request):
        """Purchase reports with filters: date_from, date_to, supplier_id, product_id."""
        qs = PurchaseInvoice.objects.select_related("supplier", "branch").prefetch_related(
            "lines__product"
        ).order_by("-purchase_date", "-id")

        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        supplier_id = request.query_params.get("supplier_id")
        product_id = request.query_params.get("product_id")

        if date_from:
            qs = qs.filter(purchase_date__gte=date_from)
        if date_to:
            qs = qs.filter(purchase_date__lte=date_to)
        if supplier_id:
            qs = qs.filter(supplier_id=supplier_id)
        if product_id:
            qs = qs.filter(lines__product_id=product_id).distinct()

        data = []
        for inv in qs:
            lines = []
            for line in inv.lines.all():
                if product_id and line.product_id != int(product_id):
                    continue
                lines.append({
                    "product_id": line.product_id,
                    "product_name": line.product.name_en,
                    "product_name_ar": line.product.name_ar,
                    "qty": line.qty,
                    "unit_price": float(line.unit_price),
                    "line_total": float(line.line_total),
                })
            data.append({
                "id": inv.id,
                "invoice_no": inv.invoice_no,
                "purchase_date": str(inv.purchase_date),
                "supplier_id": inv.supplier_id,
                "supplier_name": inv.supplier.name_en,
                "supplier_name_ar": inv.supplier.name_ar,
                "branch_name": inv.branch.name_en,
                "lines": lines,
                "total": float(inv.total),
            })
        return Response(data)

    @action(detail=False, methods=["get"])
    def sales(self, request):
        """Sales reports with filters: date_from, date_to, cashier_id, payment_method."""
        qs = SaleInvoice.objects.select_related("branch", "cashier").prefetch_related(
            "lines__product", "lines__batch"
        ).order_by("-created_at")

        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        cashier_id = request.query_params.get("cashier_id")
        payment_method = request.query_params.get("payment_method")

        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)
        if cashier_id:
            qs = qs.filter(cashier_id=cashier_id)
        if payment_method:
            qs = qs.filter(payment_method=payment_method)

        data = []
        for inv in qs:
            lines = []
            for line in inv.lines.all():
                lines.append({
                    "product_id": line.product_id,
                    "product_name": line.product.name_en,
                    "product_name_ar": line.product.name_ar,
                    "qty": line.qty,
                    "unit_price": float(line.unit_price),
                    "line_total": float(line.line_total),
                })
            data.append({
                "id": inv.id,
                "invoice_no": str(inv.id),
                "sale_date": inv.created_at.strftime("%Y-%m-%d"),
                "sale_time": inv.created_at.strftime("%H:%M"),
                "cashier_id": inv.cashier_id,
                "cashier_name": inv.cashier.name,
                "payment_method": inv.payment_method,
                "lines": lines,
                "total": float(inv.total),
                "grand_total": float(inv.grand_total),
            })
        return Response(data)

    @action(detail=False, methods=["get"])
    def daily_sales(self, request):
        qs = SaleInvoice.objects.filter(created_at__date=date.today())
        total = qs.aggregate(total=Sum("grand_total"))["total"] or 0
        return Response({"count": qs.count(), "total": total})

    @action(detail=False, methods=["get"])
    def monthly_sales(self, request):
        today = date.today()
        qs = SaleInvoice.objects.filter(created_at__year=today.year, created_at__month=today.month)
        total = qs.aggregate(total=Sum("grand_total"))["total"] or 0
        return Response({"count": qs.count(), "total": total})

    @action(detail=False, methods=["get"])
    def expiring(self, request):
        """Near expiry: batches expiring within N days (default 90 = 3 months)."""
        days = int(request.query_params.get("days", 90))
        cutoff = date.today() + timedelta(days=days)
        qs = Batch.objects.select_related("product", "branch").filter(
            expiry_date__lte=cutoff, expiry_date__gte=date.today(), qty_on_hand__gt=0
        ).order_by("expiry_date")
        data = [
            {
                "id": b.id,
                "product_id": b.product_id,
                "product_name": b.product.name_en,
                "product_name_ar": b.product.name_ar,
                "batch_no": b.batch_no,
                "expiry_date": str(b.expiry_date),
                "qty_on_hand": b.qty_on_hand,
                "branch_name": b.branch.name_en,
            }
            for b in qs
        ]
        return Response(data)

    @action(detail=False, methods=["get"])
    def low_stock(self, request):
        """Products where total stock is below product.min_quantity (or threshold param)."""
        threshold_param = request.query_params.get("threshold")
        qs = Product.objects.annotate(stock=Coalesce(Sum("batches__qty_on_hand"), 0))
        if threshold_param is not None:
            qs = qs.filter(stock__lte=int(threshold_param))
        else:
            qs = qs.filter(stock__lte=F("min_quantity")).exclude(min_quantity=0)
        qs = qs.order_by("stock")
        data = [
            {
                "id": p.id,
                "name_en": p.name_en,
                "name_ar": p.name_ar,
                "sku": p.sku,
                "current_quantity": int(p.stock or 0),
                "min_quantity": p.min_quantity,
            }
            for p in qs
        ]
        return Response(data)
