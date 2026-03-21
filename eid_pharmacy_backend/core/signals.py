"""Signals for creating notifications when purchase due dates are approaching."""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import Notification, PurchaseDueDate


@receiver(post_save, sender=PurchaseDueDate)
def create_due_date_alert(sender, instance, created, **kwargs):
    """Create notification when a due date is within 7 days."""
    if not created or instance.paid:
        return
    today = timezone.now().date()
    days_until = (instance.due_date - today).days
    if 0 <= days_until <= 7:
        title = f"Purchase #{instance.invoice.invoice_no} due {instance.due_date}"
        amt = instance.amount or instance.invoice.total
        Notification.objects.get_or_create(
            notification_type=Notification.TYPE_PURCHASE_DUE,
            title=title,
            defaults={
                "message": f"Supplier {instance.invoice.supplier.name_en} - Amount: {amt}",
                "link": f"/admin/purchases",
                "related_id": instance.invoice_id,
            },
        )
