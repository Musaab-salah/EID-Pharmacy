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
    branches = models.ManyToManyField(
        Branch,
        blank=True,
        related_name="users",
        help_text="Branches the user can operate on. If empty, falls back to `branch`.",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.email})"


class UserSession(models.Model):
    """Tracks user login/logout for attendance reporting (admin + app)."""
    SOURCE_ADMIN = "admin"
    SOURCE_APP = "app"
    SOURCE_CHOICES = [(SOURCE_ADMIN, "Admin"), (SOURCE_APP, "App")]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sessions")
    login_at = models.DateTimeField()
    logout_at = models.DateTimeField(null=True, blank=True)
    source = models.CharField(
        max_length=20, choices=SOURCE_CHOICES, default=SOURCE_APP,
        help_text="Where the user logged in: admin panel or POS app"
    )

    class Meta:
        ordering = ["-login_at"]

    def __str__(self) -> str:
        return f"{self.user.name} {self.login_at.date()}"

    @property
    def duration_minutes(self):
        if self.logout_at:
            delta = self.logout_at - self.login_at
            return int(delta.total_seconds() / 60)
        return None


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
    TYPE_DEFAULT = "default"
    TYPE_PILLS = "pills"
    TYPE_CHOICES = [(TYPE_DEFAULT, "Default"), (TYPE_PILLS, "Pills")]

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

    # Pills-specific fields (when product_type = "pills")
    product_type = models.CharField(
        max_length=20, choices=TYPE_CHOICES, default=TYPE_DEFAULT
    )
    strips_per_box = models.PositiveIntegerField(default=1, blank=True)
    pills_per_strip = models.PositiveIntegerField(default=1, blank=True)
    price_per_strip = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    price_per_box = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )

    def __str__(self) -> str:
        return self.name_en


class ProductBarcode(models.Model):
    TYPE_PRIMARY = "primary"
    TYPE_ALT = "alt"
    TYPE_INTERNAL = "internal"
    TYPE_CHOICES = [
        (TYPE_PRIMARY, "Primary"),
        (TYPE_ALT, "Alternative"),
        (TYPE_INTERNAL, "Internal"),
    ]

    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="barcodes"
    )
    code = models.CharField(max_length=100, db_index=True)
    barcode_type = models.CharField(
        max_length=20, choices=TYPE_CHOICES, default=TYPE_ALT
    )
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                models.functions.Lower("code"),
                name="uniq_product_barcode_code_ci",
            )
        ]

    def __str__(self) -> str:
        return f"{self.code} ({self.product_id})"

class Batch(models.Model):
    UNIT_PILL = "pill"
    UNIT_STRIP = "strip"
    UNIT_BOX = "box"
    UNIT_CHOICES = [(UNIT_PILL, "Pill"), (UNIT_STRIP, "Strip"), (UNIT_BOX, "Box")]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="batches")
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name="batches")
    batch_no = models.CharField(max_length=100)
    expiry_date = models.DateField()
    qty_on_hand = models.IntegerField(default=0)
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES, default=UNIT_PILL)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self) -> str:
        return f"{self.product.name_en} - {self.batch_no}"


class BatchImport(models.Model):
    """Staging table for batch data with product metadata. Sync creates Product + Batch from these."""

    batch_number = models.CharField(max_length=100)
    product_name = models.CharField(max_length=200)
    sku = models.CharField(max_length=100, blank=True)
    barcode = models.CharField(max_length=100, blank=True)
    pills_per_strip = models.PositiveIntegerField(default=1, null=True, blank=True)
    strips_per_box = models.PositiveIntegerField(default=1, null=True, blank=True)
    price_per_strip = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    price_per_box = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    expiry_date = models.DateField()
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    quantity = models.IntegerField(default=0)
    unit = models.CharField(max_length=20, choices=Batch.UNIT_CHOICES, default=Batch.UNIT_PILL)
    supplier = models.ForeignKey(
        Supplier, null=True, blank=True, on_delete=models.SET_NULL
    )
    category = models.ForeignKey(
        Category, null=True, blank=True, on_delete=models.SET_NULL
    )
    branch = models.ForeignKey(
        Branch, null=True, blank=True, on_delete=models.SET_NULL
    )
    synced = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.product_name} - {self.batch_number}"


class ProductConflict(models.Model):
    """Conflicts from sync: differing pills_per_strip, strips_per_box, or pricing across batches."""

    STATUS_PENDING = "pending"
    STATUS_RESOLVED = "resolved"
    STATUS_CHOICES = [(STATUS_PENDING, "Pending"), (STATUS_RESOLVED, "Resolved")]

    product_identifier = models.CharField(max_length=255)
    product = models.ForeignKey(
        Product, null=True, blank=True, on_delete=models.SET_NULL, related_name="conflicts"
    )
    conflicting_batch_ids = models.JSONField(default=list)
    conflicting_values = models.JSONField(default=dict)
    resolved_values = models.JSONField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"Conflict: {self.product_identifier}"


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
    transaction_number = models.CharField(
        max_length=100, blank=True,
        help_text="Required when payment is Account Transfer"
    )
    payment_proof = models.ImageField(
        upload_to="payment_proofs/", null=True, blank=True
    )
    shift = models.ForeignKey(
        "CashierShift",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices",
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
    PAYMENT_CASH = "CASH"
    PAYMENT_CREDIT = "CREDIT"
    PAYMENT_CHOICES = [(PAYMENT_CASH, "Cash"), (PAYMENT_CREDIT, "Credit")]

    STATUS_PENDING = "pending"
    STATUS_PARTIALLY_PAID = "partially_paid"
    STATUS_PAID = "paid"
    CREDIT_STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_PARTIALLY_PAID, "Partially Paid"),
        (STATUS_PAID, "Paid"),
    ]

    invoice_no = models.CharField(max_length=100)
    supplier = models.ForeignKey(
        Supplier, on_delete=models.PROTECT, related_name="purchase_invoices"
    )
    branch = models.ForeignKey(
        Branch, on_delete=models.PROTECT, related_name="purchase_invoices"
    )
    purchase_date = models.DateField()
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_type = models.CharField(
        max_length=20, choices=PAYMENT_CHOICES, default=PAYMENT_CASH
    )
    credit_status = models.CharField(
        max_length=20, choices=CREDIT_STATUS_CHOICES, default=STATUS_PENDING, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"Purchase #{self.invoice_no}"


class PurchaseDueDate(models.Model):
    """Due dates for credit purchases."""
    PAYMENT_CASH = "CASH"
    PAYMENT_TRANSFER = "TRANSFER"
    PAYMENT_CHOICES = [(PAYMENT_CASH, "Cash"), (PAYMENT_TRANSFER, "Transfer")]

    invoice = models.ForeignKey(
        PurchaseInvoice, on_delete=models.CASCADE, related_name="due_dates"
    )
    due_date = models.DateField()
    amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Optional amount for this installment"
    )
    paid = models.BooleanField(default=False)
    paid_at = models.DateTimeField(null=True, blank=True)
    payment_method = models.CharField(
        max_length=20, choices=PAYMENT_CHOICES, blank=True
    )
    payment_account = models.ForeignKey(
        PaymentAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="purchase_due_payments",
    )
    transaction_number = models.CharField(max_length=100, blank=True)
    payment_proof = models.ImageField(
        upload_to="purchase_payment_proofs/", null=True, blank=True
    )

    class Meta:
        ordering = ["due_date"]

    def __str__(self) -> str:
        return f"Invoice {self.invoice_id} due {self.due_date}"


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


class StockTransfer(models.Model):
    STATUS_DRAFT = "draft"
    STATUS_APPROVED = "approved"
    STATUS_SENT = "sent"
    STATUS_RECEIVED = "received"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = [
        (STATUS_DRAFT, "Draft"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_SENT, "Sent"),
        (STATUS_RECEIVED, "Received"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    from_branch = models.ForeignKey(
        Branch, on_delete=models.PROTECT, related_name="transfers_out"
    )
    to_branch = models.ForeignKey(
        Branch, on_delete=models.PROTECT, related_name="transfers_in"
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT
    )
    created_by = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="created_transfers"
    )
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_transfers",
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    received_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-id"]

    def __str__(self) -> str:
        return f"Transfer {self.id} {self.from_branch_id}->{self.to_branch_id}"


class StockTransferLine(models.Model):
    transfer = models.ForeignKey(
        StockTransfer, on_delete=models.CASCADE, related_name="lines"
    )
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    source_batch = models.ForeignKey(
        Batch, on_delete=models.PROTECT, related_name="transfer_lines"
    )
    qty = models.IntegerField()
    batch_no = models.CharField(max_length=100)
    expiry_date = models.DateField()
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self) -> str:
        return f"T{self.transfer_id} {self.product_id} x{self.qty}"


class CashierShift(models.Model):
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, related_name="shifts")
    cashier = models.ForeignKey(User, on_delete=models.PROTECT, related_name="shifts")
    opened_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    opening_cash = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    closing_cash = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    variance = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        ordering = ["-opened_at"]

    @property
    def is_open(self):
        return self.closed_at is None

    def __str__(self) -> str:
        return f"Shift {self.id} {self.cashier_id}@{self.branch_id}"


class SaleReturn(models.Model):
    original_invoice = models.ForeignKey(
        SaleInvoice, on_delete=models.PROTECT, related_name="returns"
    )
    branch = models.ForeignKey(Branch, on_delete=models.PROTECT, related_name="sale_returns")
    cashier = models.ForeignKey(User, on_delete=models.PROTECT, related_name="sale_returns")
    reason = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"Return {self.id} for invoice {self.original_invoice_id}"


class SaleReturnLine(models.Model):
    sale_return = models.ForeignKey(
        SaleReturn, on_delete=models.CASCADE, related_name="lines"
    )
    sale_line = models.ForeignKey(SaleLine, on_delete=models.PROTECT)
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    batch = models.ForeignKey(Batch, on_delete=models.PROTECT)
    qty = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    line_total = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self) -> str:
        return f"ReturnLine {self.id} x{self.qty}"


class EInvoiceSubmission(models.Model):
    STATUS_PENDING = "pending"
    STATUS_SUBMITTED = "submitted"
    STATUS_FAILED = "failed"
    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_SUBMITTED, "Submitted"),
        (STATUS_FAILED, "Failed"),
    ]

    invoice = models.OneToOneField(
        SaleInvoice, on_delete=models.CASCADE, related_name="e_invoice"
    )
    provider = models.CharField(max_length=50, default="dummy")
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING
    )
    uuid = models.CharField(max_length=100, blank=True)
    qr_text = models.TextField(blank=True)
    payload = models.JSONField(null=True, blank=True)
    response = models.JSONField(null=True, blank=True)
    error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        return f"EInvoice {self.invoice_id} {self.status}"

class Notification(models.Model):
    """System alerts (e.g. purchase due date approaching)."""
    TYPE_PURCHASE_DUE = "purchase_due"
    TYPE_CHOICES = [(TYPE_PURCHASE_DUE, "Purchase Due Date")]

    notification_type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    title = models.CharField(max_length=200)
    message = models.TextField(blank=True)
    link = models.CharField(max_length=255, blank=True)
    related_id = models.IntegerField(null=True, blank=True)
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title
