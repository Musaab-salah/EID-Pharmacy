from datetime import date, timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import F, Sum
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Batch, Branch, Customer, Product, SaleInvoice, SaleLine, User
from .serializers import (
    BatchSerializer,
    BranchSerializer,
    CustomerSerializer,
    InventoryAdjustSerializer,
    ProductSerializer,
    SaleInvoiceSerializer,
    SaleLineSerializer,
    UserSerializer,
)


class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer
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
    queryset = Product.objects.all().order_by("id")
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated]


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


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by("id")
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]


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
        lines = payload.get("lines", [])
        if not lines:
            return Response({"detail": "Lines are required."}, status=400)

        branch_id = payload.get("branch")
        cashier_id = payload.get("cashier")
        if not branch_id or not cashier_id:
            return Response({"detail": "Branch and cashier are required."}, status=400)

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


class ReportViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

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
        days = int(request.query_params.get("days", 30))
        cutoff = date.today() + timedelta(days=days)
        qs = Batch.objects.filter(expiry_date__lte=cutoff)
        serializer = BatchSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def low_stock(self, request):
        threshold = int(request.query_params.get("threshold", 5))
        qs = Batch.objects.filter(qty_on_hand__lte=threshold)
        serializer = BatchSerializer(qs, many=True)
        return Response(serializer.data)
from django.shortcuts import render

# Create your views here.
