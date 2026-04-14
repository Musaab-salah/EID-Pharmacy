import re
from decimal import Decimal

from django.core.validators import EmailValidator
from rest_framework import serializers

from .models import (
    AuditLog,
    Batch,
    Branch,
    Category,
    Customer,
    PaymentAccount,
    Product,
    PurchaseDueDate,
    PurchaseInvoice,
    PurchaseLine,
    SaleInvoice,
    SaleLine,
    Supplier,
    User,
)


def _strip_required(value, field_name: str):
    if value is None:
        raise serializers.ValidationError("This field is required.")
    s = str(value).strip()
    if not s:
        raise serializers.ValidationError("This field may not be blank.")
    return s


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = "__all__"

    def validate_name_ar(self, value):
        return _strip_required(value, "name_ar")

    def validate_name_en(self, value):
        return _strip_required(value, "name_en")


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            "id",
            "name",
            "email",
            "username",
            "role",
            "branch",
            "password",
            "is_active",
        ]
        extra_kwargs = {
            "name": {"allow_blank": False},
            "email": {"allow_blank": False},
            "username": {"allow_blank": False},
        }

    def validate_name(self, value):
        return _strip_required(value, "name")

    def validate_email(self, value):
        s = _strip_required(value, "email").lower()
        EmailValidator()(s)
        return s

    def validate_username(self, value):
        return _strip_required(value, "username")

    def validate(self, data):
        if "password" in data and (data["password"] is None or str(data["password"]).strip() == ""):
            data.pop("password", None)
        pwd = data.get("password")
        if pwd is not None and len(str(pwd)) < 8:
            raise serializers.ValidationError({"password": "Password must be at least 8 characters."})
        if self.instance is None and not data.get("password"):
            raise serializers.ValidationError({"password": "Password is required for new users."})
        return data

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        if password is not None and str(password).strip() == "":
            password = None
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"

    def validate_code(self, value):
        s = _strip_required(value, "code").upper()
        if len(s) > 20:
            raise serializers.ValidationError("Code is too long.")
        return s

    def validate_name_en(self, value):
        return _strip_required(value, "name_en")

    def validate_name_ar(self, value):
        return _strip_required(value, "name_ar")


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = "__all__"

    def validate_name_en(self, value):
        return _strip_required(value, "name_en")

    def validate_name_ar(self, value):
        return _strip_required(value, "name_ar")

    def validate_phone(self, value):
        if value is None or str(value).strip() == "":
            return ""
        s = str(value).strip()
        if len(s) > 50:
            raise serializers.ValidationError("Phone is too long.")
        if not re.match(r"^[\d+\-\s()]{5,50}$", s):
            raise serializers.ValidationError("Invalid phone format.")
        return s


class ProductSerializer(serializers.ModelSerializer):
    category_name_en = serializers.SerializerMethodField()
    category_name_ar = serializers.SerializerMethodField()
    category_code = serializers.SerializerMethodField()
    supplier_name_en = serializers.SerializerMethodField()
    supplier_name_ar = serializers.SerializerMethodField()
    branches = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Branch.objects.all(), required=False
    )

    def get_category_name_en(self, obj):
        return obj.category.name_en if obj.category else None

    def get_category_name_ar(self, obj):
        return obj.category.name_ar if obj.category else None

    def get_category_code(self, obj):
        return obj.category.code if obj.category else None

    def get_supplier_name_en(self, obj):
        return obj.supplier.name_en if obj.supplier else None

    def get_supplier_name_ar(self, obj):
        return obj.supplier.name_ar if obj.supplier else None

    class Meta:
        model = Product
        fields = "__all__"

    def validate_name_ar(self, value):
        return _strip_required(value, "name_ar")

    def validate_name_en(self, value):
        return _strip_required(value, "name_en")

    def validate_category(self, value):
        if value is None and self.instance is None:
            raise serializers.ValidationError("Category is required.")
        return value

    def validate_supplier(self, value):
        if value is None and self.instance is None:
            raise serializers.ValidationError("Supplier is required.")
        return value

    def validate_price(self, value):
        v = Decimal(str(value))
        if v < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return v

    def validate_purchase_price(self, value):
        v = Decimal(str(value))
        if v < 0:
            raise serializers.ValidationError("Purchase price cannot be negative.")
        return v

    def validate_min_quantity(self, value):
        if value is None:
            return 0
        if int(value) < 0:
            raise serializers.ValidationError("Minimum quantity cannot be negative.")
        return value

    def validate(self, data):
        inst = self.instance
        ptype = data.get("product_type", inst.product_type if inst else Product.TYPE_DEFAULT)
        if ptype == Product.TYPE_PILLS:
            spb = data.get("strips_per_box", inst.strips_per_box if inst else None)
            pps = data.get("pills_per_strip", inst.pills_per_strip if inst else None)
            spb = int(spb or 0)
            pps = int(pps or 0)
            if spb < 1:
                raise serializers.ValidationError({"strips_per_box": "Must be at least 1 for pill products."})
            if pps < 1:
                raise serializers.ValidationError({"pills_per_strip": "Must be at least 1 for pill products."})
            pstrip = data.get("price_per_strip", inst.price_per_strip if inst else None)
            if pstrip is None:
                raise serializers.ValidationError({"price_per_strip": "Price per strip is required for pill products."})
            if Decimal(str(pstrip)) < 0:
                raise serializers.ValidationError({"price_per_strip": "Cannot be negative."})
            pbox = data.get("price_per_box", inst.price_per_box if inst else None)
            if pbox is not None and str(pbox).strip() != "" and Decimal(str(pbox)) < 0:
                raise serializers.ValidationError({"price_per_box": "Cannot be negative."})
        return data

    def create(self, validated_data):
        from datetime import date, timedelta

        branches = validated_data.pop("branches", [])
        product = Product.objects.create(**validated_data)
        product.branches.set(branches)
        for branch in branches:
            Batch.objects.get_or_create(
                product=product,
                branch=branch,
                batch_no=f"INIT-{product.id}",
                defaults={
                    "expiry_date": date.today() + timedelta(days=365),
                    "qty_on_hand": 0,
                    "unit_cost": product.purchase_price,
                },
            )
        return product

    def update(self, instance, validated_data):
        from datetime import date, timedelta

        branches = validated_data.pop("branches", None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        if branches is not None:
            instance.branches.set(branches)
            for branch in branches:
                Batch.objects.get_or_create(
                    product=instance,
                    branch=branch,
                    batch_no=f"INIT-{instance.id}",
                    defaults={
                        "expiry_date": date.today() + timedelta(days=365),
                        "qty_on_hand": 0,
                        "unit_cost": instance.purchase_price,
                    },
                )
        return instance


class BatchSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name_en", read_only=True)
    branch_name = serializers.CharField(source="branch.name_en", read_only=True)

    class Meta:
        model = Batch
        fields = "__all__"

    def validate_batch_no(self, value):
        return _strip_required(value, "batch_no")

    def validate_qty_on_hand(self, value):
        if value is None:
            return 0
        if int(value) < 0:
            raise serializers.ValidationError("Quantity on hand cannot be negative.")
        return value

    def validate_unit_cost(self, value):
        v = Decimal(str(value))
        if v < 0:
            raise serializers.ValidationError("Unit cost cannot be negative.")
        return v


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = "__all__"

    def validate_name(self, value):
        return _strip_required(value, "name")

    def validate_phone(self, value):
        if value is None or str(value).strip() == "":
            return ""
        s = str(value).strip()
        if len(s) > 50:
            raise serializers.ValidationError("Phone is too long.")
        if not re.match(r"^[\d+\-\s()]{5,50}$", s):
            raise serializers.ValidationError("Invalid phone format.")
        return s

    def validate_email(self, value):
        if value is None or str(value).strip() == "":
            return ""
        s = str(value).strip()
        EmailValidator()(s)
        return s


class PaymentAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentAccount
        fields = "__all__"

    def validate_name_ar(self, value):
        return _strip_required(value, "name_ar")

    def validate_name_en(self, value):
        return _strip_required(value, "name_en")

    def validate_account_number(self, value):
        return _strip_required(value, "account_number")


class SaleLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaleLine
        fields = "__all__"


class PurchaseLineSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name_en", read_only=True)
    product_name_ar = serializers.CharField(source="product.name_ar", read_only=True)

    class Meta:
        model = PurchaseLine
        fields = "__all__"


class PurchaseLineCreateSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name_en", read_only=True)
    product_name_ar = serializers.CharField(source="product.name_ar", read_only=True)

    class Meta:
        model = PurchaseLine
        fields = ["id", "product", "product_name", "product_name_ar", "qty", "unit_price", "line_total"]
        extra_kwargs = {
            "line_total": {"required": False},
            "qty": {"min_value": 1},
            "unit_price": {"min_value": Decimal("0")},
        }


class PurchaseDueDateSerializer(serializers.ModelSerializer):
    payment_account_name = serializers.CharField(
        source="payment_account.name_en", read_only=True
    )

    class Meta:
        model = PurchaseDueDate
        fields = [
            "id", "due_date", "amount", "paid", "paid_at",
            "payment_method", "payment_account", "payment_account_name",
            "transaction_number", "payment_proof",
        ]


class PurchaseDueDateWriteSerializer(serializers.Serializer):
    due_date = serializers.DateField()
    amount = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )

    def validate_amount(self, value):
        if value is not None and value < Decimal("0"):
            raise serializers.ValidationError("Amount cannot be negative.")
        return value


class PurchaseInvoiceSerializer(serializers.ModelSerializer):
    lines = PurchaseLineCreateSerializer(many=True, required=False)
    due_dates = PurchaseDueDateWriteSerializer(many=True, required=False)
    supplier_name = serializers.CharField(source="supplier.name_en", read_only=True)
    supplier_name_ar = serializers.CharField(source="supplier.name_ar", read_only=True)
    branch_name = serializers.CharField(source="branch.name_en", read_only=True)

    class Meta:
        model = PurchaseInvoice
        fields = "__all__"

    def validate_invoice_no(self, value):
        return _strip_required(value, "invoice_no")

    def validate(self, data):
        instance = self.instance
        branch = data.get("branch", getattr(instance, "branch", None) if instance else None)
        inv_no = data.get("invoice_no", getattr(instance, "invoice_no", None) if instance else None)
        inv_no = (inv_no or "").strip() if inv_no else ""
        if branch is not None and inv_no:
            bid = branch.id if hasattr(branch, "id") else int(branch)
            qs = PurchaseInvoice.objects.filter(branch_id=bid, invoice_no__iexact=inv_no)
            if instance:
                qs = qs.exclude(pk=instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"invoice_no": "An invoice with this number already exists for this branch."}
                )

        lines_in = self.initial_data.get("lines")
        if instance is None:
            if not lines_in or not isinstance(lines_in, list) or len(lines_in) < 1:
                raise serializers.ValidationError({"lines": "At least one line item is required."})

        ptype = data.get("payment_type", getattr(instance, "payment_type", None) if instance else None)
        if ptype == PurchaseInvoice.PAYMENT_CREDIT:
            due_dates = data.get("due_dates") or []
            if not due_dates:
                raise serializers.ValidationError(
                    {"due_dates": "At least one due date is required for credit purchases."}
                )
        return data

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        if instance.pk:
            ret["due_dates"] = PurchaseDueDateSerializer(
                instance.due_dates.all(), many=True
            ).data
        return ret

    def create(self, validated_data):
        lines_data = validated_data.pop("lines", [])
        due_dates_data = validated_data.pop("due_dates", [])
        invoice = PurchaseInvoice.objects.create(**validated_data)
        total = Decimal("0.00")
        for line in lines_data:
            line_total = line["unit_price"] * line["qty"]
            line["line_total"] = line_total
            total += line_total
            PurchaseLine.objects.create(invoice=invoice, **line)
        invoice.total = total
        invoice.save()
        for dd in due_dates_data:
            PurchaseDueDate.objects.create(
                invoice=invoice,
                due_date=dd["due_date"],
                amount=dd.get("amount"),
            )
        return invoice

    def update(self, instance, validated_data):
        lines_data = validated_data.pop("lines", None)
        due_dates_data = validated_data.pop("due_dates", None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        if lines_data is not None:
            instance.lines.all().delete()
            total = Decimal("0.00")
            for line in lines_data:
                line_total = line["unit_price"] * line["qty"]
                line["line_total"] = line_total
                total += line_total
                PurchaseLine.objects.create(invoice=instance, **line)
            instance.total = total
            instance.save()
        if due_dates_data is not None:
            instance.due_dates.all().delete()
            for dd in due_dates_data:
                PurchaseDueDate.objects.create(
                    invoice=instance,
                    due_date=dd["due_date"],
                    amount=dd.get("amount"),
                )
        return instance


class SaleLineCreateSerializer(serializers.ModelSerializer):
    """For nested create: invoice is set by parent."""

    class Meta:
        model = SaleLine
        fields = ["product", "batch", "qty", "unit_price", "line_total"]
        extra_kwargs = {
            "qty": {"min_value": 1},
            "unit_price": {"min_value": Decimal("0")},
            "line_total": {"min_value": Decimal("0")},
        }


class SaleInvoiceSerializer(serializers.ModelSerializer):
    lines = SaleLineCreateSerializer(many=True)

    class Meta:
        model = SaleInvoice
        fields = "__all__"

    def validate_discount(self, value):
        v = Decimal(str(value or 0))
        if v < 0:
            raise serializers.ValidationError("Discount cannot be negative.")
        return v

    def validate_tax(self, value):
        v = Decimal(str(value or 0))
        if v < 0:
            raise serializers.ValidationError("Tax cannot be negative.")
        return v

    def validate(self, data):
        inst = self.instance
        pm = data.get("payment_method", getattr(inst, "payment_method", None) if inst else None)
        if pm == SaleInvoice.PAYMENT_TRANSFER:
            acc = data.get("payment_account", getattr(inst, "payment_account_id", None) if inst else None)
            if not acc:
                raise serializers.ValidationError(
                    {"payment_account": "Payment account is required for transfer payments."}
                )
            txn = data.get("transaction_number", getattr(inst, "transaction_number", None) if inst else None)
            if not (txn or "").strip():
                raise serializers.ValidationError(
                    {"transaction_number": "Transaction reference is required for transfer payments."}
                )
        return data

    def create(self, validated_data):
        lines_data = validated_data.pop("lines", [])
        invoice = SaleInvoice.objects.create(**validated_data)
        for line in lines_data:
            SaleLine.objects.create(invoice=invoice, **line)
        return invoice


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = "__all__"


class InventoryAdjustSerializer(serializers.Serializer):
    batch_id = serializers.IntegerField(min_value=1)
    qty = serializers.IntegerField(min_value=1)
    action = serializers.ChoiceField(choices=["add", "subtract", "transfer"])
    target_branch_id = serializers.IntegerField(required=False, allow_null=True, min_value=1)

    def validate(self, data):
        if data["action"] == "transfer":
            tid = data.get("target_branch_id")
            if not tid:
                raise serializers.ValidationError({"target_branch_id": "Target branch is required for transfer."})
        return data

