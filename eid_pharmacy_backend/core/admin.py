from django.contrib import admin

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

admin.site.register(User)
admin.site.register(Supplier)
admin.site.register(Branch)
admin.site.register(Category)
admin.site.register(PaymentAccount)
admin.site.register(Product)
admin.site.register(Batch)
admin.site.register(Customer)
admin.site.register(SaleInvoice)
admin.site.register(SaleLine)
admin.site.register(PurchaseInvoice)
admin.site.register(PurchaseLine)
admin.site.register(StockCountLog)
