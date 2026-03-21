from decimal import Decimal

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


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = "__all__"


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

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


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = "__all__"


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


class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = "__all__"


class PaymentAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentAccount
        fields = "__all__"


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
        extra_kwargs = {"line_total": {"required": False}}


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


class PurchaseInvoiceSerializer(serializers.ModelSerializer):
    lines = PurchaseLineCreateSerializer(many=True, required=False)
    due_dates = PurchaseDueDateWriteSerializer(many=True, required=False)
    supplier_name = serializers.CharField(source="supplier.name_en", read_only=True)
    supplier_name_ar = serializers.CharField(source="supplier.name_ar", read_only=True)
    branch_name = serializers.CharField(source="branch.name_en", read_only=True)

    class Meta:
        model = PurchaseInvoice
        fields = "__all__"

    def validate(self, data):
        if data.get("payment_type") == PurchaseInvoice.PAYMENT_CREDIT:
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


class SaleInvoiceSerializer(serializers.ModelSerializer):
    lines = SaleLineCreateSerializer(many=True)

    class Meta:
        model = SaleInvoice
        fields = "__all__"

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
    batch_id = serializers.IntegerField()
    qty = serializers.IntegerField()
    action = serializers.ChoiceField(choices=["add", "subtract", "transfer"])
    target_branch_id = serializers.IntegerField(required=False)

