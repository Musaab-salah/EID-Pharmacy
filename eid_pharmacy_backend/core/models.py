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


class Category(models.Model):
    code = models.CharField(max_length=20, unique=True)
    name_en = models.CharField(max_length=200)
    name_ar = models.CharField(max_length=200)

    def __str__(self) -> str:
        return self.name_en


class Supplier(models.Model):
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200)
    phone = models.CharField(max_length=50, blank=True)
    address = models.CharField(max_length=255, blank=True)

    def __str__(self) -> str:
        return self.name_en


class Product(models.Model):
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200)
    category = models.ForeignKey(
        Category, null=True, blank=True, on_delete=models.PROTECT, related_name="products"
    )
    supplier = models.ForeignKey(
        Supplier, null=True, blank=True, on_delete=models.SET_NULL, related_name="products"
    )
    branches = models.ManyToManyField(
        Branch, blank=True, related_name="products", help_text="Branches where this product is available"
    )
    barcode = models.CharField(max_length=100, blank=True)
    sku = models.CharField(max_length=100, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2)
    min_quantity = models.IntegerField(default=0, help_text="Minimum stock level for low-stock alerts")
    image = models.ImageField(upload_to="products/", null=True, blank=True)
    place_of_manufacture = models.CharField(max_length=200, blank=True, help_text="Country or place of origin")

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


class PaymentAccount(models.Model):
    TYPE_BANK = "bank"
    TYPE_WALLET = "wallet"
    TYPE_CHOICES = [(TYPE_BANK, "Bank"), (TYPE_WALLET, "Mobile Wallet")]

    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200)
    account_number = models.CharField(max_length=100)
    account_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_BANK)
    is_active = models.BooleanField(default=True)

    def __str__(self) -> str:
        return self.name_en


class SaleInvoice(models.Model):
    PAYMENT_CASH = "CASH"
    PAYMENT_TRANSFER = "TRANSFER"
    PAYMENT_CHOICES = [(PAYMENT_CASH, "Cash"), (PAYMENT_TRANSFER, "Transfer")]

    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, related_name="invoices")
    customer = models.ForeignKey(
        Customer, on_delete=models.SET_NULL, null=True, blank=True
    )
    cashier = models.ForeignKey(User, on_delete=models.PROTECT, related_name="sales")
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_method = models.CharField(
        max_length=20, choices=PAYMENT_CHOICES, default=PAYMENT_CASH
    )
    payment_account = models.ForeignKey(
        PaymentAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
    )
    payment_proof = models.ImageField(
        upload_to="payment_proofs/", null=True, blank=True
    )
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


class PurchaseInvoice(models.Model):
    invoice_no = models.CharField(max_length=100)
    supplier = models.ForeignKey(
        Supplier, on_delete=models.PROTECT, related_name="purchase_invoices"
    )
    branch = models.ForeignKey(
        Branch, on_delete=models.PROTECT, related_name="purchase_invoices"
    )
    purchase_date = models.DateField()
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"Purchase #{self.invoice_no}"


class PurchaseLine(models.Model):
    invoice = models.ForeignKey(
        PurchaseInvoice, on_delete=models.CASCADE, related_name="lines"
    )
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    qty = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    line_total = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self) -> str:
        return f"{self.product.name_en} x {self.qty}"


class StockCountLog(models.Model):
    """Log of inventory audit sessions (Daily/Weekly/Monthly)."""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    TYPE_CHOICES = [(DAILY, "Daily"), (WEEKLY, "Weekly"), (MONTHLY, "Monthly")]

    audit_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, related_name="stock_count_logs")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    adjustments = models.JSONField(default=list, help_text="List of {batch_id, old_qty, new_qty}")

    def __str__(self) -> str:
        return f"{self.get_audit_type_display()} audit @ {self.branch.name_en}"


class AuditLog(models.Model):
    entity = models.CharField(max_length=100)
    entity_id = models.IntegerField()
    action = models.CharField(max_length=50)
    before = models.JSONField(null=True, blank=True)
    after = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.entity} {self.action}"
