from django.contrib import admin

from .models import Batch, Branch, Customer, Product, SaleInvoice, SaleLine, User

admin.site.register(User)
admin.site.register(Branch)
admin.site.register(Product)
admin.site.register(Batch)
admin.site.register(Customer)
admin.site.register(SaleInvoice)
admin.site.register(SaleLine)
