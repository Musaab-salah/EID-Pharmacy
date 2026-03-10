from rest_framework import serializers

from .models import (
    AuditLog,
    Batch,
    Branch,
    Customer,
    Product,
    SaleInvoice,
    SaleLine,
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


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = "__all__"


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


class SaleLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaleLine
        fields = "__all__"


class SaleInvoiceSerializer(serializers.ModelSerializer):
    lines = SaleLineSerializer(many=True)

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

