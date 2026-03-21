# Generated migration for PurchaseDueDate payment fields

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0009_batch_import_sync"),
    ]

    operations = [
        migrations.AddField(
            model_name="purchaseduedate",
            name="payment_method",
            field=models.CharField(blank=True, choices=[("CASH", "Cash"), ("TRANSFER", "Transfer")], max_length=20),
        ),
        migrations.AddField(
            model_name="purchaseduedate",
            name="transaction_number",
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name="purchaseduedate",
            name="payment_account",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="purchase_due_payments",
                to="core.paymentaccount",
            ),
        ),
        migrations.AddField(
            model_name="purchaseduedate",
            name="payment_proof",
            field=models.ImageField(blank=True, null=True, upload_to="purchase_payment_proofs/"),
        ),
    ]
