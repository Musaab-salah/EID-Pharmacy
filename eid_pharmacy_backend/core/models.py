from django.contrib.auth.models import AbstractUser
from django.db import models


class Branch(models.Model):
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200)
    address = models.CharField(max_length=255, blank=True)

    def __str__(self) -> str:
        return self.name_en


class User(AbstractUser):
    ROLE_ADMIN = "admin"
    ROLE_PHARMACIST = "pharmacist"
    ROLE_CASHIER = "cashier"
    ROLE_CHOICES = [
        (ROLE_ADMIN, "Admin"),
        (ROLE_PHARMACIST, "Pharmacist"),
        (ROLE_CASHIER, "Cashier"),
    ]

    name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_CASHIER)
    branch = models.ForeignKey(Branch, null=True, blank=True, on_delete=models.SET_NULL)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.email})"


class Product(models.Model):
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200)
    barcode = models.CharField(max_length=100, blank=True)
    sku = models.CharField(max_length=100, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.ImageField(upload_to="products/", null=True, blank=True)

    def __str__(self) -> str:
        return self.name_en


class Batch(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="batches")
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name="batches")
    batch_no = models.CharField(max_length=100)
    expiry_date = models.DateField()
    qty_on_hand = models.IntegerField(default=0)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self) -> str:
        return f"{self.product.name_en} - {self.batch_no}"


class Customer(models.Model):
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)

    def __str__(self) -> str:
        return self.name


class SaleInvoice(models.Model):
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, related_name="invoices")
    customer = models.ForeignKey(
        Customer, on_delete=models.SET_NULL, null=True, blank=True
    )
    cashier = models.ForeignKey(User, on_delete=models.PROTECT, related_name="sales")
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"Invoice {self.id}"


class SaleLine(models.Model):
    invoice = models.ForeignKey(
        SaleInvoice, on_delete=models.CASCADE, related_name="lines"
    )
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    batch = models.ForeignKey(Batch, on_delete=models.PROTECT)
    qty = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    line_total = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self) -> str:
        return f"{self.product.name_en} x {self.qty}"


class AuditLog(models.Model):
    entity = models.CharField(max_length=100)
    entity_id = models.IntegerField()
    action = models.CharField(max_length=50)
    before = models.JSONField(null=True, blank=True)
    after = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.entity} {self.action}"
