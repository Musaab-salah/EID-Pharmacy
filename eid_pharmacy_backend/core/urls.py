from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BatchViewSet,
    BranchViewSet,
    CategoryViewSet,
    CustomerViewSet,
    InventoryViewSet,
    PaymentAccountViewSet,
    ProductViewSet,
    PurchaseInvoiceViewSet,
    ReportViewSet,
    SaleInvoiceViewSet,
    SaleLineViewSet,
    SupplierViewSet,
    UserViewSet,
)

router = DefaultRouter()
router.register("branches", BranchViewSet)
router.register("categories", CategoryViewSet)
router.register("suppliers", SupplierViewSet)
router.register("purchases", PurchaseInvoiceViewSet)
router.register("payment-accounts", PaymentAccountViewSet)
router.register("users", UserViewSet)
router.register("products", ProductViewSet)
router.register("batches", BatchViewSet)
router.register("customers", CustomerViewSet)
router.register("sales", SaleInvoiceViewSet)
router.register("sale-lines", SaleLineViewSet)
router.register("inventory", InventoryViewSet, basename="inventory")
router.register("reports", ReportViewSet, basename="reports")

urlpatterns = [
    path("orders/create/", SaleInvoiceViewSet.as_view({"post": "create"})),
    path("", include(router.urls)),
]
