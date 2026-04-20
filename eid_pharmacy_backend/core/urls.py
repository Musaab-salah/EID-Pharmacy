from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BatchImportViewSet,
    BatchViewSet,
    BranchViewSet,
    CategoryViewSet,
    CustomerViewSet,
    InventoryViewSet,
    NotificationViewSet,
    PaymentAccountViewSet,
    ProductViewSet,
    PurchaseInvoiceViewSet,
    ReportViewSet,
    SaleInvoiceViewSet,
    SaleLineViewSet,
    SupplierViewSet,
    UserViewSet,
    StockTransferViewSet,
    CashierShiftViewSet,
    SaleReturnViewSet,
    AuditLogViewSet,
)

router = DefaultRouter()
router.register("branches", BranchViewSet)
router.register("categories", CategoryViewSet)
router.register("suppliers", SupplierViewSet)
router.register("purchases", PurchaseInvoiceViewSet)
router.register("payment-accounts", PaymentAccountViewSet)
router.register("users", UserViewSet)
router.register("products", ProductViewSet)
router.register("batch-imports", BatchImportViewSet, basename="batch-imports")
router.register("batches", BatchViewSet)
router.register("customers", CustomerViewSet)
router.register("sales", SaleInvoiceViewSet)
router.register("sale-lines", SaleLineViewSet)
router.register("inventory", InventoryViewSet, basename="inventory")
router.register("notifications", NotificationViewSet, basename="notifications")
router.register("reports", ReportViewSet, basename="reports")
router.register("transfers", StockTransferViewSet)
router.register("shifts", CashierShiftViewSet, basename="shifts")
router.register("returns", SaleReturnViewSet)
router.register("audit-logs", AuditLogViewSet)

urlpatterns = [
    path("orders/create/", SaleInvoiceViewSet.as_view({"post": "create"})),
    path("", include(router.urls)),
]
