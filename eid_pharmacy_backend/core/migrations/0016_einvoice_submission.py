from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0015_sale_returns"),
    ]

    operations = [
        migrations.CreateModel(
            name="EInvoiceSubmission",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("provider", models.CharField(default="dummy", max_length=50)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("submitted", "Submitted"), ("failed", "Failed")], default="pending", max_length=20)),
                ("uuid", models.CharField(blank=True, max_length=100)),
                ("qr_text", models.TextField(blank=True)),
                ("payload", models.JSONField(blank=True, null=True)),
                ("response", models.JSONField(blank=True, null=True)),
                ("error", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("submitted_at", models.DateTimeField(blank=True, null=True)),
                ("invoice", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="e_invoice", to="core.saleinvoice")),
            ],
        ),
    ]

