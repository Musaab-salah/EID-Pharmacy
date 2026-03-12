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
    category_name_en = serializers.CharField(source="category.name_en", read_only=True)
    category_name_ar = serializers.CharField(source="category.name_ar", read_only=True)
    category_code = serializers.CharField(source="category.code", read_only=True)
    supplier_name_en = serializers.CharField(
        source="supplier.name_en", read_only=True, allow_null=True
    )
    supplier_name_ar = serializers.CharField(
        source="supplier.name_ar", read_only=True, allow_null=True
    )
    branches = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Branch.objects.all(), required=False
    )

    class Meta:
        model = Product
        fields = "__all__"

    def create(self, validated_data):
        from datetime import date, timedelta

        branches_data = validated_data.pop("branches", [])
        product = Product.objects.create(**validated_data)
        product.branches.set(branches_data)
        for branch in branches_data:
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

        branches_data = validated_data.pop("branches", None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()
        if branches_data is not None:
            instance.branches.set(branches_data)
            for branch in branches_data:
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
        fields = ["product", "product_name", "product_name_ar", "qty", "unit_price", "line_total"]
        extra_kwargs = {"line_total": {"required": False}}


class PurchaseInvoiceSerializer(serializers.ModelSerializer):
    lines = PurchaseLineCreateSerializer(many=True, required=False)
    supplier_name = serializers.CharField(source="supplier.name_en", read_only=True)
    supplier_name_ar = serializers.CharField(source="supplier.name_ar", read_only=True)
    branch_name = serializers.CharField(source="branch.name_en", read_only=True)

    class Meta:
        model = PurchaseInvoice
        fields = "__all__"

    def create(self, validated_data):
        lines_data = validated_data.pop("lines", [])
        invoice = PurchaseInvoice.objects.create(**validated_data)
        total = Decimal("0.00")
        for line in lines_data:
            line_total = line["unit_price"] * line["qty"]
            line["line_total"] = line_total
            total += line_total
            PurchaseLine.objects.create(invoice=invoice, **line)
        invoice.total = total
        invoice.save()
        return invoice


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

