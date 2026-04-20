from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0012_product_barcodes"),
    ]

    operations = [
        migrations.CreateModel(
            name="StockTransfer",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("status", models.CharField(choices=[("draft", "Draft"), ("approved", "Approved"), ("sent", "Sent"), ("received", "Received"), ("cancelled", "Cancelled")], default="draft", max_length=20)),
                ("notes", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("approved_at", models.DateTimeField(blank=True, null=True)),
                ("sent_at", models.DateTimeField(blank=True, null=True)),
                ("received_at", models.DateTimeField(blank=True, null=True)),
                ("approved_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="approved_transfers", to="core.user")),
                ("created_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="created_transfers", to="core.user")),
                ("from_branch", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="transfers_out", to="core.branch")),
                ("to_branch", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="transfers_in", to="core.branch")),
            ],
            options={"ordering": ["-id"]},
        ),
        migrations.CreateModel(
            name="StockTransferLine",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("qty", models.IntegerField()),
                ("batch_no", models.CharField(max_length=100)),
                ("expiry_date", models.DateField()),
                ("unit_cost", models.DecimalField(decimal_places=2, max_digits=10)),
                ("product", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to="core.product")),
                ("source_batch", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="transfer_lines", to="core.batch")),
                ("transfer", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="lines", to="core.stocktransfer")),
            ],
        ),
    ]

