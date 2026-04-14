from datetime import date, datetime, timedelta
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
    BatchImport,
    Branch,
    Category,
    Customer,
    Notification,
    PaymentAccount,
    Product,
    ProductConflict,
    PurchaseDueDate,
    PurchaseInvoice,
    PurchaseLine,
    SaleInvoice,
    SaleLine,
    StockCountLog,
    Supplier,
    User,
    UserSession,
)
from .utils import normalize_product_identity, to_canonical_qty
def _client_date(request):
    """Get client's local date from X-Client-Date header, fallback to server today."""
    h = request.META.get("HTTP_X_CLIENT_DATE")
    if h:
        try:
            return datetime.strptime(h, "%Y-%m-%d").date()
        except ValueError:
            pass
    return date.today()


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

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        # Admin sees all products; others see only products in their branch
        if user.role != User.ROLE_ADMIN and user.branch_id:
            qs = qs.filter(branches__id=user.branch_id).distinct()
        return qs

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

    @action(detail=False, methods=["post"], url_path="sync-from-batches")
    @transaction.atomic
    def sync_from_batches(self, request):
        """Sync BatchImport records → Product + Batch. Groups by sku > barcode > normalized product_name."""
        imports_qs = BatchImport.objects.filter(synced=False).select_related(
            "supplier", "category", "branch"
        )
        groups = {}
        for bi in imports_qs:
            key = None
            if bi.sku and bi.sku.strip():
                key = ("sku", bi.sku.strip().lower())
            elif bi.barcode and bi.barcode.strip():
                key = ("barcode", bi.barcode.strip())
            else:
                key = ("name", normalize_product_identity(bi.product_name))
            if key not in groups:
                groups[key] = []
            groups[key].append(bi)

        created, updated, conflicts_count, skipped = 0, 0, 0, 0
        for key, batch_imports in groups.items():
            first = batch_imports[0]
            pps = first.pills_per_strip or 1
            spb = first.strips_per_box or 1
            price_strip = first.price_per_strip
            price_box = first.price_per_box

            conflicts = {}
            for bi in batch_imports[1:]:
                if (bi.pills_per_strip or 1) != pps:
                    conflicts["pills_per_strip"] = conflicts.get("pills_per_strip", []) + [
                        pps,
                        bi.pills_per_strip or 1,
                    ]
                if (bi.strips_per_box or 1) != spb:
                    conflicts["strips_per_box"] = conflicts.get("strips_per_box", []) + [
                        spb,
                        bi.strips_per_box or 1,
                    ]
                if (bi.price_per_strip or 0) != (price_strip or 0):
                    conflicts["price_per_strip"] = conflicts.get("price_per_strip", []) + [
                        float(price_strip or 0),
                        float(bi.price_per_strip or 0),
                    ]
                if (bi.price_per_box or 0) != (price_box or 0):
                    conflicts["price_per_box"] = conflicts.get("price_per_box", []) + [
                        float(price_box or 0),
                        float(bi.price_per_box or 0),
                    ]

            if conflicts:
                identifier = f"{key[0]}:{key[1]}"
                ProductConflict.objects.update_or_create(
                    product_identifier=identifier,
                    status=ProductConflict.STATUS_PENDING,
                    defaults={
                        "conflicting_batch_ids": [bi.id for bi in batch_imports],
                        "conflicting_values": conflicts,
                        "resolved_values": None,
                    },
                )
                conflicts_count += 1
                skipped += len(batch_imports)
                continue

            product = None
            if key[0] == "sku":
                product = Product.objects.filter(sku__iexact=key[1]).first()
            elif key[0] == "barcode":
                product = Product.objects.filter(barcode=key[1]).first()
            else:
                norm = key[1]
                for p in Product.objects.all():
                    if normalize_product_identity(p.name_en) == norm or normalize_product_identity(p.name_ar) == norm:
                        product = p
                        break

            if product:
                updated += 1
            else:
                product = Product.objects.create(
                    name_en=first.product_name,
                    name_ar=first.product_name,
                    sku=first.sku or "",
                    barcode=first.barcode or "",
                    product_type=Product.TYPE_PILLS if pps > 1 else Product.TYPE_DEFAULT,
                    pills_per_strip=pps,
                    strips_per_box=spb,
                    price_per_strip=price_strip,
                    price_per_box=price_box,
                    category=first.category,
                    supplier=first.supplier,
                    price=float(price_strip or price_box or 0),
                    purchase_price=float(first.cost or 0),
                )
                if first.branch:
                    product.branches.add(first.branch)
                created += 1

            total_canonical = 0
            for bi in batch_imports:
                qty = to_canonical_qty(bi.quantity, bi.unit, pps, spb)
                total_canonical += qty
                branch = bi.branch or (first.branch if bi.id != first.id else first.branch)
                if not branch:
                    continue
                Batch.objects.create(
                    product=product,
                    branch=branch,
                    batch_no=bi.batch_number,
                    expiry_date=bi.expiry_date,
                    qty_on_hand=qty,
                    unit=Batch.UNIT_PILL,
                    unit_cost=bi.cost or 0,
                )
                bi.synced = True
                bi.save()

        return Response({
            "created": created,
            "updated": updated,
            "conflicts": conflicts_count,
            "skipped": skipped,
        })

    @action(detail=False, methods=["get"], url_path="conflicts")
    def conflicts_list(self, request):
        qs = ProductConflict.objects.filter(status=ProductConflict.STATUS_PENDING)
        data = [
            {
                "id": c.id,
                "product_identifier": c.product_identifier,
                "product_id": c.product_id,
                "conflicting_batch_ids": c.conflicting_batch_ids,
                "conflicting_values": c.conflicting_values,
                "resolved_values": c.resolved_values,
            }
            for c in qs
        ]
        return Response(data)

    @action(detail=False, methods=["post"], url_path="resolve-conflict")
    def resolve_conflict(self, request):
        payload = request.data
        conflict_id = payload.get("conflict_id")
        resolved = payload.get("resolved_values", {})
        if not conflict_id:
            return Response({"detail": "conflict_id required."}, status=400)
        conflict = ProductConflict.objects.filter(id=conflict_id).first()
        if not conflict:
            return Response({"detail": "Conflict not found."}, status=404)
        conflict.resolved_values = resolved
        conflict.status = ProductConflict.STATUS_RESOLVED
        conflict.save()

        identifier = conflict.product_identifier
        batch_ids = conflict.conflicting_batch_ids
        batch_imports = list(BatchImport.objects.filter(id__in=batch_ids, synced=False))
        if not batch_imports:
            return Response({"detail": "No unsynced batches for this conflict."}, status=400)

        first = batch_imports[0]
        pps = int(resolved.get("pills_per_strip") or first.pills_per_strip or 1)
        spb = int(resolved.get("strips_per_box") or first.strips_per_box or 1)
        price_strip = resolved.get("price_per_strip") or first.price_per_strip
        price_box = resolved.get("price_per_box") or first.price_per_box

        key_type, key_val = (identifier.split(":", 1) + [""])[:2]
        product = None
        if key_type == "sku":
            product = Product.objects.filter(sku__iexact=key_val).first()
        elif key_type == "barcode":
            product = Product.objects.filter(barcode=key_val).first()
        else:
            norm = key_val
            for p in Product.objects.all():
                if normalize_product_identity(p.name_en) == norm or normalize_product_identity(p.name_ar) == norm:
                    product = p
                    break

        if not product:
            product = Product.objects.create(
                name_en=first.product_name,
                name_ar=first.product_name,
                sku=first.sku or "",
                barcode=first.barcode or "",
                product_type=Product.TYPE_PILLS if pps > 1 else Product.TYPE_DEFAULT,
                pills_per_strip=pps,
                strips_per_box=spb,
                price_per_strip=price_strip,
                price_per_box=price_box,
                category=first.category,
                supplier=first.supplier,
                price=float(price_strip or price_box or 0),
                purchase_price=float(first.cost or 0),
            )
            if first.branch:
                product.branches.add(first.branch)

        for bi in batch_imports:
            qty = to_canonical_qty(bi.quantity, bi.unit, pps, spb)
            branch = bi.branch or first.branch
            if branch:
                Batch.objects.create(
                    product=product,
                    branch=branch,
                    batch_no=bi.batch_number,
                    expiry_date=bi.expiry_date,
                    qty_on_hand=qty,
                    unit=Batch.UNIT_PILL,
                    unit_cost=bi.cost or 0,
                )
            bi.synced = True
            bi.save()

        return Response({"detail": "Resolved."})

    @action(detail=False, methods=["get"], url_path="by-barcode")
    def by_barcode(self, request):
        code = request.query_params.get("code") or request.query_params.get("barcode")
        if not code:
            return Response({"detail": "Barcode required."}, status=400)
        product = Product.objects.filter(barcode__iexact=code.strip()).first()
        if not product:
            return Response({"detail": "Product not found."}, status=404)
        batches = list(
            Batch.objects.filter(product=product, qty_on_hand__gt=0)
            .select_related("branch")
            .order_by("expiry_date")
        )
        stock = sum(b.qty_on_hand for b in batches)
        if not batches:
            return Response({"detail": "No stock available."}, status=404)
        batch = batches[0]
        return Response({
            "id": product.id,
            "name": product.name_ar or product.name_en,
            "name_en": product.name_en,
            "name_ar": product.name_ar,
            "sku": product.sku,
            "barcode": product.barcode,
            "product_type": product.product_type,
            "pills_per_strip": product.pills_per_strip,
            "strips_per_box": product.strips_per_box,
            "price_per_strip": float(product.price_per_strip or 0),
            "price_per_box": float(product.price_per_box or 0),
            "price": float(product.price),
            "stock": stock,
            "image": product.image.url if product.image else None,
            "batch": {
                "id": batch.id,
                "batch_no": batch.batch_no,
                "expiry_date": str(batch.expiry_date),
                "qty_on_hand": batch.qty_on_hand,
            },
            "batches": [
                {
                    "id": b.id,
                    "batch_no": b.batch_no,
                    "expiry_date": str(b.expiry_date),
                    "qty_on_hand": b.qty_on_hand,
                }
                for b in batches
            ],
        })

    @action(detail=False, methods=["post"], url_path="quick-create")
    def quick_create(self, request):
        """Create product + batch for POS. Requires: productName, barcode (pre-filled)."""
        from datetime import timedelta

        data = request.data
        name = (data.get("productName") or data.get("name") or "").strip()
        if not name:
            return Response({"detail": "productName is required."}, status=400)
        product_type = data.get("productType") or data.get("product_type") or "pills"
        pps = int(data.get("pillsPerStrip") or data.get("pills_per_strip") or 1)
        spb = int(data.get("stripsPerBox") or data.get("strips_per_box") or 1)
        price_strip = data.get("pricePerStrip") or data.get("price_per_strip")
        price_box = data.get("pricePerBox") or data.get("price_per_box")
        sku = (data.get("sku") or "").strip()
        barcode = (data.get("barcode") or "").strip()
        stock_qty = int(data.get("initialStockQty") or data.get("initial_stock_qty") or 0)
        stock_unit = (data.get("stockUnit") or data.get("stock_unit") or "pill").lower()
        category_id = data.get("category")
        supplier_id = data.get("supplier")
        branch_id = data.get("branch") or (request.user.branch_id if request.user else None)

        if not branch_id:
            branches = Branch.objects.all()[:1]
            branch_id = branches[0].id if branches else None
        if not branch_id:
            return Response({"detail": "Branch required."}, status=400)

        price = float(price_strip or price_box or 0)
        product = Product.objects.create(
            name_en=name,
            name_ar=name,
            sku=sku,
            barcode=barcode,
            product_type=product_type,
            pills_per_strip=pps,
            strips_per_box=spb,
            price_per_strip=price_strip,
            price_per_box=price_box,
            price=price,
            purchase_price=0,
            category_id=category_id or None,
            supplier_id=supplier_id or None,
        )
        product.branches.add(branch_id)

        qty = to_canonical_qty(stock_qty, stock_unit, pps, spb)
        batch = Batch.objects.create(
            product=product,
            branch_id=branch_id,
            batch_no=f"QC-{product.id}",
            expiry_date=date.today() + timedelta(days=365),
            qty_on_hand=qty,
            unit=Batch.UNIT_PILL,
            unit_cost=0,
        )

        serializer = ProductSerializer(product)
        data = serializer.data
        data["batch"] = {
            "id": batch.id,
            "batch_no": batch.batch_no,
            "expiry_date": str(batch.expiry_date),
            "qty_on_hand": batch.qty_on_hand,
        }
        data["batches"] = [data["batch"]]
        return Response(data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="import-template")
    def import_template(self, request):
        """Download Excel import template."""
        import io
        import openpyxl

        wb = openpyxl.Workbook()
        ws = wb.active
        headers = [
            "productName", "sku", "barcode", "productType", "category", "supplier",
            "pillsPerStrip", "stripsPerBox", "pricePerStrip", "pricePerBox",
            "stockUnit", "stockQty", "batchNumber", "expiryDate", "cost",
        ]
        ws.append(headers)
        ws.append([
            "Panadol 500mg", "PAN500", "1234567890123", "pills", "Analgesics", "Supplier A",
            10, 10, 2.5, 25, "pill", 100, "BATCH001", "2026-12-31", 1.5,
        ])
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        from django.http import HttpResponse
        resp = HttpResponse(buf.getvalue(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        resp["Content-Disposition"] = 'attachment; filename="products_import_template.xlsx"'
        return resp

    @action(detail=False, methods=["post"], url_path="import-batches-excel")
    def import_batches_excel(self, request):
        """Import batch data into BatchImport for sync. File with batch-level rows."""
        import openpyxl
        from datetime import datetime

        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "file required."}, status=400)
        if file.size > 5 * 1024 * 1024:
            return Response({"detail": "File size must be ≤ 5MB."}, status=400)
        if not file.name.lower().endswith(".xlsx"):
            return Response({"detail": "Only .xlsx files allowed."}, status=400)

        try:
            wb = openpyxl.load_workbook(file, read_only=True, data_only=True)
            ws = wb.active
            headers = [str(c or "").strip().lower().replace(" ", "_") for c in next(ws.iter_rows(min_row=1, values_only=True))]
            rows = list(ws.iter_rows(min_row=2, values_only=True))
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

        def col(name):
            for i, h in enumerate(headers):
                if name in h or name.replace("_", "") in h.replace("_", ""):
                    return i
            return -1

        created = 0
        for row in rows:
            if not row or all(c is None or str(c).strip() == "" for c in row):
                continue
            product_name = str(row[col("productname")] or row[col("product_name")] or "").strip()
            if not product_name:
                continue
            batch_number = str(row[col("batchnumber")] or row[col("batch_number")] or "").strip() or f"B-{created+1}"
            sku = str(row[col("sku")] or "").strip()
            barcode = str(row[col("barcode")] or "").strip()
            pps = int(row[col("pillsperstrip")] or row[col("pills_per_strip")] or 1)
            spb = int(row[col("stripsperbox")] or row[col("strips_per_box")] or 1)
            price_strip = row[col("priceperstrip")] or row[col("price_per_strip")]
            price_box = row[col("priceperbox")] or row[col("price_per_box")]
            try:
                price_strip = Decimal(str(price_strip)) if price_strip is not None else None
                price_box = Decimal(str(price_box)) if price_box is not None else None
            except Exception:
                price_strip = price_box = None
            expiry_val = row[col("expirydate")] or row[col("expiry_date")]
            try:
                expiry_date = datetime.strptime(str(expiry_val)[:10], "%Y-%m-%d").date() if expiry_val else date.today() + timedelta(days=365)
            except Exception:
                expiry_date = date.today() + timedelta(days=365)
            cost = row[col("cost")]
            try:
                cost = Decimal(str(cost)) if cost is not None else Decimal(0)
            except Exception:
                cost = Decimal(0)
            quantity = int(row[col("quantity")] or row[col("stockqty")] or row[col("stock_qty")] or 0)
            unit = str(row[col("unit")] or row[col("stockunit")] or "pill").lower()
            if unit not in ("pill", "strip", "box"):
                unit = "pill"
            cat_name = str(row[col("category")] or "").strip()
            sup_name = str(row[col("supplier")] or "").strip()
            branch_id = row[col("branch")]
            if branch_id is not None:
                try:
                    branch_id = int(branch_id)
                except Exception:
                    branch_id = None
            if not branch_id and request.user and request.user.branch_id:
                branch_id = request.user.branch_id
            if not branch_id:
                b = Branch.objects.first()
                branch_id = b.id if b else None

            category = None
            if cat_name:
                category = Category.objects.filter(name_en__iexact=cat_name).first() or Category.objects.filter(name_ar__iexact=cat_name).first()
            supplier = None
            if sup_name:
                supplier = Supplier.objects.filter(name_en__iexact=sup_name).first() or Supplier.objects.filter(name_ar__iexact=sup_name).first()

            BatchImport.objects.create(
                batch_number=batch_number,
                product_name=product_name,
                sku=sku,
                barcode=barcode,
                pills_per_strip=pps,
                strips_per_box=spb,
                price_per_strip=price_strip,
                price_per_box=price_box,
                expiry_date=expiry_date,
                cost=cost,
                quantity=quantity,
                unit=unit,
                supplier=supplier,
                category=category,
                branch_id=branch_id,
            )
            created += 1

        return Response({"created": created})

    @action(detail=False, methods=["post"], url_path="import-excel")
    def import_excel(self, request):
        """Parse Excel file, return rows + suggested column mapping. Max 5MB."""
        import openpyxl

        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "file required."}, status=400)
        if file.size > 5 * 1024 * 1024:
            return Response({"detail": "File size must be ≤ 5MB."}, status=400)
        if not file.name.lower().endswith(".xlsx"):
            return Response({"detail": "Only .xlsx files allowed."}, status=400)

        try:
            wb = openpyxl.load_workbook(file, read_only=True, data_only=True)
            ws = wb.active
            headers = [str(c or "").strip() for c in next(ws.iter_rows(min_row=1, values_only=True))]
            rows_raw = list(ws.iter_rows(min_row=2, values_only=True))
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

        field_map = {
            "productName": "productName",
            "product_name": "productName",
            "name": "productName",
            "sku": "sku",
            "barcode": "barcode",
            "productType": "productType",
            "product_type": "productType",
            "category": "category",
            "supplier": "supplier",
            "pillsPerStrip": "pillsPerStrip",
            "pills_per_strip": "pillsPerStrip",
            "stripsPerBox": "stripsPerBox",
            "strips_per_box": "stripsPerBox",
            "pricePerStrip": "pricePerStrip",
            "price_per_strip": "pricePerStrip",
            "pricePerBox": "pricePerBox",
            "price_per_box": "pricePerBox",
            "stockUnit": "stockUnit",
            "stock_unit": "stockUnit",
            "stockQty": "stockQty",
            "stock_qty": "stockQty",
            "batchNumber": "batchNumber",
            "batch_number": "batchNumber",
            "expiryDate": "expiryDate",
            "expiry_date": "expiryDate",
            "cost": "cost",
        }
        suggested = {}
        for i, h in enumerate(headers):
            h_lower = h.lower().replace(" ", "_")
            for k, v in field_map.items():
                if k.lower() == h_lower or k.lower().replace("_", "") == h_lower.replace("_", ""):
                    suggested[v] = i
                    break

        rows = []
        for row_idx, row in enumerate(rows_raw):
            if not row or all(c is None or str(c).strip() == "" for c in row):
                continue
            obj = {"_row": row_idx + 2, "_raw": [str(c) if c is not None else "" for c in row]}
            for field, col_idx in suggested.items():
                if col_idx < len(row) and row[col_idx] is not None:
                    obj[field] = row[col_idx]
            rows.append(obj)

        return Response({
            "headers": headers,
            "suggested_mapping": suggested,
            "rows": rows[:500],
            "total_rows": len(rows),
        })

    @action(detail=False, methods=["post"], url_path="import-commit")
    @transaction.atomic
    def import_commit(self, request):
        """Commit Excel import. Body: { rows: [...], mapping: {...} }."""
        from datetime import datetime

        rows = request.data.get("rows", [])
        mapping = request.data.get("mapping", {})
        branch_id = request.data.get("branch") or (request.user.branch_id if request.user else None)
        if not branch_id:
            branches = Branch.objects.all()[:1]
            branch_id = branches[0].id if branches else None
        if not branch_id:
            return Response({"detail": "Branch required."}, status=400)

        created, updated, batches_created, errors = 0, 0, 0, []

        for row in rows:
            row_num = row.get("_row", 0)
            try:
                product_name = (row.get("productName") or row.get("product_name") or "").strip()
                if not product_name:
                    errors.append({"row": row_num, "message": "productName is required."})
                    continue

                sku = (row.get("sku") or "").strip()
                barcode = (row.get("barcode") or "").strip()
                product_type = (row.get("productType") or row.get("product_type") or "pills").lower()
                pps = int(row.get("pillsPerStrip") or row.get("pills_per_strip") or 1)
                spb = int(row.get("stripsPerBox") or row.get("strips_per_box") or 1)
                if product_type == "pills" and pps < 1:
                    errors.append({"row": row_num, "message": "pillsPerStrip must be ≥ 1 for pills."})
                    continue

                price_strip = row.get("pricePerStrip") or row.get("price_per_strip")
                price_box = row.get("pricePerBox") or row.get("price_per_box")
                try:
                    price_strip = Decimal(str(price_strip)) if price_strip is not None else None
                    price_box = Decimal(str(price_box)) if price_box is not None else None
                except Exception:
                    price_strip = price_box = None
                if price_strip is not None and price_strip < 0:
                    errors.append({"row": row_num, "message": "pricePerStrip must be ≥ 0."})
                    continue
                if price_box is not None and price_box < 0:
                    errors.append({"row": row_num, "message": "pricePerBox must be ≥ 0."})
                    continue

                stock_qty = int(row.get("stockQty") or row.get("stock_qty") or 0)
                stock_unit = (row.get("stockUnit") or row.get("stock_unit") or "pill").lower()
                batch_number = (row.get("batchNumber") or row.get("batch_number") or "").strip()
                expiry_str = row.get("expiryDate") or row.get("expiry_date")
                try:
                    expiry_date = datetime.strptime(str(expiry_str)[:10], "%Y-%m-%d").date() if expiry_str else None
                except Exception:
                    expiry_date = date.today() + timedelta(days=365)
                cost = row.get("cost")
                try:
                    cost = Decimal(str(cost)) if cost is not None else Decimal(0)
                except Exception:
                    cost = Decimal(0)

                category_name = (row.get("category") or "").strip()
                supplier_name = (row.get("supplier") or "").strip()
                category = None
                if category_name:
                    category = Category.objects.filter(
                        name_en__iexact=category_name
                    ).first() or Category.objects.filter(name_ar__iexact=category_name).first()
                supplier = None
                if supplier_name:
                    supplier = Supplier.objects.filter(
                        name_en__iexact=supplier_name
                    ).first() or Supplier.objects.filter(name_ar__iexact=supplier_name).first()

                product = None
                if sku:
                    product = Product.objects.filter(sku__iexact=sku).first()
                if not product and barcode:
                    product = Product.objects.filter(barcode=barcode).first()
                if not product:
                    norm = normalize_product_identity(product_name)
                    for p in Product.objects.all():
                        if normalize_product_identity(p.name_en) == norm or normalize_product_identity(p.name_ar) == norm:
                            product = p
                            break

                if product:
                    updated += 1
                    product.name_en = product_name
                    product.name_ar = product_name
                    if sku:
                        product.sku = sku
                    if barcode:
                        product.barcode = barcode
                    product.pills_per_strip = pps
                    product.strips_per_box = spb
                    product.price_per_strip = price_strip
                    product.price_per_box = price_box
                    product.price = float(price_strip or price_box or 0)
                    if category:
                        product.category = category
                    if supplier:
                        product.supplier = supplier
                    product.save()
                else:
                    product = Product.objects.create(
                        name_en=product_name,
                        name_ar=product_name,
                        sku=sku,
                        barcode=barcode,
                        product_type=Product.TYPE_PILLS if pps > 1 else Product.TYPE_DEFAULT,
                        pills_per_strip=pps,
                        strips_per_box=spb,
                        price_per_strip=price_strip,
                        price_per_box=price_box,
                        price=float(price_strip or price_box or 0),
                        purchase_price=float(cost),
                        category=category,
                        supplier=supplier,
                    )
                    product.branches.add(branch_id)
                    created += 1

                if batch_number or stock_qty > 0:
                    qty = to_canonical_qty(stock_qty, stock_unit, pps, spb)
                    batch_no = batch_number or f"IMP-{product.id}-{row_num}"
                    exp = expiry_date or (date.today() + timedelta(days=365))
                    Batch.objects.create(
                        product=product,
                        branch_id=branch_id,
                        batch_no=batch_no,
                        expiry_date=exp,
                        qty_on_hand=qty,
                        unit=Batch.UNIT_PILL,
                        unit_cost=cost,
                    )
                    batches_created += 1

            except Exception as e:
                errors.append({"row": row_num, "message": str(e)})

        return Response({
            "created": created,
            "updated": updated,
            "batches": batches_created,
            "errors": errors,
        })


class BatchImportViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        qs = BatchImport.objects.filter(synced=False).select_related(
            "supplier", "category", "branch"
        ).order_by("product_name", "batch_number")
        data = [
            {
                "id": b.id,
                "product_name": b.product_name,
                "batch_number": b.batch_number,
                "sku": b.sku,
                "barcode": b.barcode,
                "quantity": b.quantity,
                "expiry_date": str(b.expiry_date),
            }
            for b in qs
        ]
        return Response(data)


class BatchViewSet(viewsets.ModelViewSet):
    queryset = Batch.objects.select_related("product", "branch").all().order_by("id")
    serializer_class = BatchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if user.branch_id:
            qs = qs.filter(branch_id=user.branch_id)
        return qs

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

    def partial_update(self, request, *args, **kwargs):
        """Allow admin to upload payment_proof for transfer sales."""
        instance = self.get_object()
        payment_proof = request.FILES.get("payment_proof")
        if payment_proof:
            instance.payment_proof = payment_proof
            instance.save()
            return Response(self.get_serializer(instance).data)
        return super().partial_update(request, *args, **kwargs)

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
        try:
            branch_id = int(branch_id) if branch_id is not None else None
            cashier_id = int(cashier_id) if cashier_id is not None else None
        except (TypeError, ValueError):
            branch_id = cashier_id = None
        if not branch_id or not cashier_id:
            return Response({"detail": "Branch and cashier are required."}, status=400)

        payment_method = payload.get("payment_method") or SaleInvoice.PAYMENT_CASH
        if payment_method == SaleInvoice.PAYMENT_TRANSFER:
            payment_account_id = payload.get("payment_account")
            if payment_account_id is not None:
                try:
                    payment_account_id = int(payment_account_id)
                except (TypeError, ValueError):
                    payment_account_id = None
            transaction_number = (payload.get("transaction_number") or "").strip()
            payment_proof = request.FILES.get("payment_proof") if hasattr(request, "FILES") else None
            if not payment_account_id:
                return Response({"detail": "Payment account is required for transfer."}, status=400)
            if not transaction_number:
                return Response({"detail": "Transaction number is required for transfer."}, status=400)
            if not payment_proof:
                return Response({"detail": "Payment proof image is required for transfer."}, status=400)

        total = Decimal("0.00")
        for i, line in enumerate(lines):
            batch_id = line.get("batch")
            qty = int(line.get("qty", 0))
            if qty <= 0:
                return Response({"detail": "Qty must be positive."}, status=400)
            if batch_id is None:
                return Response({"detail": f"Line {i + 1}: batch is required."}, status=400)
            try:
                batch = Batch.objects.select_for_update().get(id=batch_id)
            except (Batch.DoesNotExist, ValueError, TypeError):
                return Response({"detail": f"Line {i + 1}: batch not found."}, status=400)
            if batch.branch_id != int(branch_id):
                return Response({"detail": "Batch branch mismatch."}, status=400)
            if batch.expiry_date < date.today():
                return Response(
                    {
                        "detail": "Expired batch.",
                        "batch_id": batch.id,
                        "batch_no": batch.batch_no,
                        "product_name": batch.product.name_en,
                        "product_name_ar": batch.product.name_ar,
                        "expiry_date": str(batch.expiry_date),
                    },
                    status=400,
                )
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
            payload["payment_account"] = payment_account_id
            payload["transaction_number"] = payload.get("transaction_number", "").strip()
            payload["payment_proof"] = request.FILES.get("payment_proof") if hasattr(request, "FILES") else None
        else:
            payload.pop("payment_account", None)
            payload.pop("transaction_number", None)
            payload.pop("payment_proof", None)

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
        if audit_type not in (StockCountLog.DAILY, StockCountLog.WEEKLY, StockCountLog.MONTHLY):
            return Response({"detail": "Invalid audit_type. Use daily, weekly, or monthly."}, status=400)
        branch_id = request.data.get("branch_id")
        counts = request.data.get("counts", [])
        if not branch_id:
            return Response({"detail": "branch_id required."}, status=400)
        try:
            branch_id = int(branch_id)
        except (TypeError, ValueError):
            return Response({"detail": "Invalid branch_id."}, status=400)
        if not Branch.objects.filter(pk=branch_id).exists():
            return Response({"detail": "Branch not found."}, status=400)
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
        try:
            batch = Batch.objects.select_for_update().get(id=data["batch_id"])
        except Batch.DoesNotExist:
            return Response({"detail": "Batch not found."}, status=400)
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
            if int(target_branch_id) == int(batch.branch_id):
                return Response({"detail": "Source and target branch must differ."}, status=400)
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

    @action(detail=False, methods=["post"], url_path="audit/import-excel")
    def audit_import_excel(self, request):
        """Upload Excel for inventory count. Returns preview. Body: file (Excel)."""
        import openpyxl

        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "file required."}, status=400)
        if not file.name.endswith((".xlsx", ".xls")):
            return Response({"detail": "Excel file (.xlsx) required."}, status=400)
        try:
            wb = openpyxl.load_workbook(file, read_only=True, data_only=True)
            ws = wb.active
            rows = list(ws.iter_rows(min_row=2, values_only=True))
        except Exception as e:
            return Response({"detail": str(e)}, status=400)
        preview = []
        for row in rows:
            if not row or (row[0] is None and row[1] is None):
                continue
            identifier = str(row[0] or "").strip()
            qty_val = row[1] if len(row) > 1 else None
            try:
                physical_qty = int(float(qty_val)) if qty_val is not None else 0
            except (TypeError, ValueError):
                physical_qty = 0
            batch = None
            if identifier.isdigit():
                batch = Batch.objects.filter(id=int(identifier)).select_related("product", "branch").first()
            if not batch:
                batch = Batch.objects.filter(batch_no__iexact=identifier).select_related("product", "branch").first()
            if not batch:
                batch = Batch.objects.filter(product__barcode=identifier).select_related("product", "branch").first()
            if not batch:
                batch = Batch.objects.filter(product__sku__iexact=identifier).select_related("product", "branch").first()
            if batch:
                preview.append({
                    "batch_id": batch.id,
                    "branch_id": batch.branch_id,
                    "product_name": batch.product.name_en,
                    "batch_no": batch.batch_no,
                    "branch_name": batch.branch.name_en,
                    "system_qty": batch.qty_on_hand,
                    "physical_qty": physical_qty,
                    "diff": physical_qty - batch.qty_on_hand,
                })
        return Response({"preview": preview})

    @action(detail=False, methods=["post"], url_path="audit/apply-excel")
    @transaction.atomic
    def audit_apply_excel(self, request):
        """Apply Excel import. Body: { counts: [{ batch_id, physical_qty }], audit_type, branch_id }."""
        counts = request.data.get("counts", [])
        audit_type = request.data.get("audit_type", "weekly")
        if audit_type not in (StockCountLog.DAILY, StockCountLog.WEEKLY, StockCountLog.MONTHLY):
            return Response({"detail": "Invalid audit_type. Use daily, weekly, or monthly."}, status=400)
        branch_id = request.data.get("branch_id")
        if not branch_id:
            return Response({"detail": "branch_id required."}, status=400)
        try:
            branch_id = int(branch_id)
        except (TypeError, ValueError):
            return Response({"detail": "Invalid branch_id."}, status=400)
        if not Branch.objects.filter(pk=branch_id).exists():
            return Response({"detail": "Branch not found."}, status=400)
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
        return Response({"detail": "Applied.", "adjusted": len(adjustments)})


class PurchaseInvoiceViewSet(viewsets.ModelViewSet):
    queryset = PurchaseInvoice.objects.select_related("supplier", "branch").prefetch_related(
        "lines__product", "due_dates"
    ).order_by("-purchase_date", "-id")
    serializer_class = PurchaseInvoiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action != "list":
            return qs
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        supplier_id = self.request.query_params.get("supplier_id")
        product_id = self.request.query_params.get("product_id")
        branch_id = self.request.query_params.get("branch_id")
        if date_from:
            qs = qs.filter(purchase_date__gte=date_from)
        if date_to:
            qs = qs.filter(purchase_date__lte=date_to)
        if supplier_id:
            qs = qs.filter(supplier_id=supplier_id)
        if product_id:
            qs = qs.filter(lines__product_id=product_id).distinct()
        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        return qs

    @action(detail=True, methods=["post"], url_path="pay-due-date")
    def pay_due_date(self, request, pk=None):
        """Mark a due date as paid with payment method and optional receipt."""
        from django.utils import timezone

        invoice = self.get_object()
        due_date_id = request.data.get("due_date_id")
        payment_method = request.data.get("payment_method", "CASH")
        payment_account_id = request.data.get("payment_account")
        if payment_account_id is not None:
            try:
                payment_account_id = int(payment_account_id)
            except (TypeError, ValueError):
                payment_account_id = None
        transaction_number = (request.data.get("transaction_number") or "").strip()
        payment_proof = request.FILES.get("payment_proof") if hasattr(request, "FILES") else None

        if not due_date_id:
            return Response({"detail": "due_date_id required."}, status=400)
        due_date = PurchaseDueDate.objects.filter(
            id=due_date_id, invoice=invoice
        ).first()
        if not due_date:
            return Response({"detail": "Due date not found."}, status=404)
        if due_date.paid:
            return Response({"detail": "Already paid."}, status=400)

        if payment_method == "TRANSFER":
            if not payment_account_id:
                return Response({"detail": "payment_account required for transfer."}, status=400)
            if not transaction_number:
                return Response({"detail": "transaction_number required for transfer."}, status=400)

        due_date.paid = True
        due_date.paid_at = timezone.now()
        due_date.payment_method = payment_method
        due_date.payment_account_id = payment_account_id if payment_method == "TRANSFER" else None
        due_date.transaction_number = transaction_number if payment_method == "TRANSFER" else ""
        if payment_proof:
            due_date.payment_proof = payment_proof
        due_date.save()

        all_paid = not PurchaseDueDate.objects.filter(invoice=invoice, paid=False).exists()
        if all_paid:
            invoice.credit_status = PurchaseInvoice.STATUS_PAID
            invoice.save()

        serializer = PurchaseInvoiceSerializer(invoice)
        return Response(serializer.data)


class NotificationViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        qs = Notification.objects.all().order_by("-created_at")[:50]
        data = [
            {
                "id": n.id,
                "notification_type": n.notification_type,
                "title": n.title,
                "message": n.message,
                "link": n.link,
                "related_id": n.related_id,
                "read": n.read,
                "created_at": n.created_at.isoformat(),
            }
            for n in qs
        ]
        return Response(data)

    def retrieve(self, request, pk=None):
        n = Notification.objects.filter(id=pk).first()
        if not n:
            return Response({"detail": "Not found."}, status=404)
        return Response({
            "id": n.id,
            "notification_type": n.notification_type,
            "title": n.title,
            "message": n.message,
            "link": n.link,
            "related_id": n.related_id,
            "read": n.read,
            "created_at": n.created_at.isoformat(),
        })

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        n = Notification.objects.filter(id=pk).first()
        if n:
            n.read = True
            n.save()
        return Response({"detail": "OK"})

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        Notification.objects.filter(read=False).update(read=True)
        return Response({"detail": "OK"})

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        count = Notification.objects.filter(read=False).count()
        return Response({"count": count})

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        """Lightweight summary for badge: unread count + low_stock + expiring counts."""
        from django.utils import timezone

        unread = Notification.objects.filter(read=False).count()
        low_stock = (
            Product.objects.annotate(stock=Coalesce(Sum("batches__qty_on_hand"), 0))
            .filter(stock__lte=5)
            .count()
        )
        cutoff = timezone.now().date() + timedelta(days=90)
        today = timezone.now().date()
        expiring = Batch.objects.filter(
            expiry_date__lte=cutoff,
            expiry_date__gte=today,
            qty_on_hand__gt=0,
        ).count()
        return Response({
            "unread": unread,
            "low_stock": low_stock,
            "expiring": expiring,
            "total": unread + low_stock + expiring,
        })


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
        today = _client_date(request)
        qs = SaleInvoice.objects.filter(created_at__date=today)
        total = qs.aggregate(total=Sum("grand_total"))["total"] or 0
        return Response({"count": qs.count(), "total": total})

    @action(detail=False, methods=["get"])
    def monthly_sales(self, request):
        today = _client_date(request)
        qs = SaleInvoice.objects.filter(created_at__year=today.year, created_at__month=today.month)
        total = qs.aggregate(total=Sum("grand_total"))["total"] or 0
        return Response({"count": qs.count(), "total": total})

    @action(detail=False, methods=["get"], url_path="dashboard-stats")
    def dashboard_stats(self, request):
        """Full system summary for dashboard: counts + sales + alerts."""
        today = _client_date(request)
        daily_sales = SaleInvoice.objects.filter(created_at__date=today)
        monthly_sales = SaleInvoice.objects.filter(
            created_at__year=today.year, created_at__month=today.month
        )
        daily_purchases = PurchaseInvoice.objects.filter(purchase_date=today)
        cutoff = today + timedelta(days=90)
        low_stock_qs = Product.objects.annotate(
            stock=Coalesce(Sum("batches__qty_on_hand"), 0)
        ).filter(stock__lte=F("min_quantity")).exclude(min_quantity=0)
        expiring_qs = Batch.objects.filter(
            expiry_date__lte=cutoff,
            expiry_date__gte=today,
            qty_on_hand__gt=0,
        )
        due_alerts = PurchaseDueDate.objects.filter(
            due_date__gte=today,
            due_date__lte=today + timedelta(days=7),
            paid=False,
        )
        return Response({
            "daily_sales": daily_sales.aggregate(total=Sum("grand_total"))["total"] or 0,
            "daily_sales_count": daily_sales.count(),
            "monthly_sales": monthly_sales.aggregate(total=Sum("grand_total"))["total"] or 0,
            "monthly_sales_count": monthly_sales.count(),
            "daily_purchases_count": daily_purchases.count(),
            "products_count": Product.objects.count(),
            "categories_count": Category.objects.count(),
            "batches_count": Batch.objects.count(),
            "branches_count": Branch.objects.count(),
            "suppliers_count": Supplier.objects.count(),
            "users_count": User.objects.count(),
            "customers_count": Customer.objects.count(),
            "payment_accounts_count": PaymentAccount.objects.count(),
            "low_stock_count": low_stock_qs.count(),
            "expiring_count": expiring_qs.count(),
            "due_alerts_count": due_alerts.count(),
        })

    @action(detail=False, methods=["get"])
    def expiring(self, request):
        """Near expiry: batches expiring within N days (default 90 = 3 months)."""
        days = int(request.query_params.get("days", 90))
        today = _client_date(request)
        cutoff = today + timedelta(days=days)
        qs = Batch.objects.select_related("product", "branch").filter(
            expiry_date__lte=cutoff, expiry_date__gte=today, qty_on_hand__gt=0
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

    @action(detail=False, methods=["get"])
    def alerts(self, request):
        """Purchase due dates approaching within N days (default 7)."""
        days = int(request.query_params.get("days", 7))
        today = _client_date(request)
        cutoff = today + timedelta(days=days)
        qs = (
            PurchaseDueDate.objects.filter(
                due_date__gte=today,
                due_date__lte=cutoff,
                paid=False,
            )
            .select_related("invoice__supplier", "invoice__branch")
            .order_by("due_date")
        )
        data = [
            {
                "id": dd.id,
                "invoice_id": dd.invoice_id,
                "invoice_no": dd.invoice.invoice_no,
                "supplier_name": dd.invoice.supplier.name_en,
                "supplier_name_ar": dd.invoice.supplier.name_ar,
                "branch_name": dd.invoice.branch.name_en,
                "due_date": str(dd.due_date),
                "amount": float(dd.amount) if dd.amount else None,
                "total": float(dd.invoice.total),
            }
            for dd in qs
        ]
        return Response(data)

    @action(detail=False, methods=["get"], url_path="user-attendance")
    def user_attendance(self, request):
        """User daily activity: login, logout, total hours per day."""
        date_from = request.query_params.get("date_from") or request.query_params.get("date")
        date_to = request.query_params.get("date_to")
        user_id = request.query_params.get("user_id")
        if not date_from:
            date_from = request.META.get("HTTP_X_CLIENT_DATE") or str(date.today())
        if not date_to:
            date_to = date_from
        qs = UserSession.objects.select_related("user", "user__branch").filter(
            login_at__date__gte=date_from,
            login_at__date__lte=date_to,
        ).order_by("user__name", "login_at")
        if user_id:
            qs = qs.filter(user_id=user_id)
        source_filter = request.query_params.get("source")
        if source_filter in ("admin", "app"):
            qs = qs.filter(source=source_filter)
        by_user_day = {}
        for s in qs:
            key = (s.user_id, s.login_at.date().isoformat())
            if key not in by_user_day:
                by_user_day[key] = {
                    "user_id": s.user_id,
                    "user_name": s.user.name,
                    "branch_name": (s.user.branch.name_ar or s.user.branch.name_en) if s.user.branch else None,
                    "date": s.login_at.date().isoformat(),
                    "sessions": [],
                    "total_minutes": 0,
                }
            mins = s.duration_minutes or 0
            by_user_day[key]["sessions"].append({
                "login_at": s.login_at.strftime("%H:%M"),
                "login_at_iso": s.login_at.isoformat(),
                "logout_at": s.logout_at.strftime("%H:%M") if s.logout_at else "-",
                "logout_at_iso": s.logout_at.isoformat() if s.logout_at else None,
                "minutes": mins,
                "source": s.source or "app",
            })
            by_user_day[key]["total_minutes"] += mins
        data = []
        for k, v in by_user_day.items():
            v["total_hours"] = round(v["total_minutes"] / 60, 2)
            data.append(v)
        return Response(sorted(data, key=lambda x: (x["date"], x["user_name"])))

    @action(detail=False, methods=["get"], url_path="my-daily-activity")
    def my_daily_activity(self, request):
        """Current user's daily report: sessions (login/logout) + sales for the date."""
        from datetime import datetime

        user = request.user
        date_str = request.query_params.get("date") or request.META.get("HTTP_X_CLIENT_DATE") or str(date.today())

        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            target_date = date.today()

        sessions = UserSession.objects.filter(
            user=user,
            login_at__date=target_date,
        ).order_by("login_at")
        sessions_data = [
            {
                "id": s.id,
                "login_at": s.login_at.strftime("%H:%M"),
                "login_at_iso": s.login_at.isoformat(),
                "logout_at": s.logout_at.strftime("%H:%M") if s.logout_at else None,
                "logout_at_iso": s.logout_at.isoformat() if s.logout_at else None,
                "source": s.source or "app",
                "minutes": s.duration_minutes,
            }
            for s in sessions
        ]
        total_minutes = sum(s.duration_minutes or 0 for s in sessions)

        sales = SaleInvoice.objects.filter(
            cashier=user,
            created_at__date=target_date,
        ).select_related("branch").order_by("created_at")
        sales_data = [
            {
                "id": inv.id,
                "invoice_no": str(inv.id),
                "time": inv.created_at.strftime("%H:%M"),
                "time_iso": inv.created_at.isoformat(),
                "grand_total": float(inv.grand_total),
                "payment_method": inv.payment_method,
            }
            for inv in sales
        ]
        sales_total = sum(float(inv.grand_total) for inv in sales)

        return Response({
            "date": date_str,
            "user_name": user.name,
            "sessions": sessions_data,
            "total_hours": round(total_minutes / 60, 2),
            "sales_count": len(sales_data),
            "sales_total": round(sales_total, 2),
            "sales": sales_data,
        })

    @action(detail=False, methods=["get"], url_path="credit-schedule")
    def credit_schedule(self, request):
        """Credit purchase due dates for export."""
        qs = (
            PurchaseDueDate.objects.filter(paid=False)
            .select_related("invoice__supplier", "invoice__branch")
            .order_by("due_date")
        )
        data = [
            {
                "invoice_id": dd.invoice_id,
                "invoice_no": dd.invoice.invoice_no,
                "supplier_name": dd.invoice.supplier.name_en,
                "supplier_name_ar": dd.invoice.supplier.name_ar,
                "branch_name": dd.invoice.branch.name_en,
                "due_date": str(dd.due_date),
                "amount": float(dd.amount) if dd.amount else None,
                "total": float(dd.invoice.total),
                "credit_status": dd.invoice.credit_status,
            }
            for dd in qs
        ]
        return Response(data)
