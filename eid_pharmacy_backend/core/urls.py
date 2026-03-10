from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BatchViewSet,
    BranchViewSet,
    CustomerViewSet,
    InventoryViewSet,
    ProductViewSet,
    ReportViewSet,
    SaleInvoiceViewSet,
    SaleLineViewSet,
    UserViewSet,
)

router = DefaultRouter()
router.register("branches", BranchViewSet)
router.register("users", UserViewSet)
router.register("products", ProductViewSet)
router.register("batches", BatchViewSet)
router.register("customers", CustomerViewSet)
router.register("sales", SaleInvoiceViewSet)
router.register("sale-lines", SaleLineViewSet)
router.register("inventory", InventoryViewSet, basename="inventory")
router.register("reports", ReportViewSet, basename="reports")

urlpatterns = [
    path("", include(router.urls)),
]
