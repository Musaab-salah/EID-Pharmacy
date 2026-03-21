# Generated migration for BatchImport, ProductConflict, Batch.unit

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0008_pharmacy_enhancements"),
    ]

    operations = [
        migrations.AddField(
            model_name="batch",
            name="unit",
            field=models.CharField(
                choices=[("pill", "Pill"), ("strip", "Strip"), ("box", "Box")],
                default="pill",
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name="BatchImport",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("batch_number", models.CharField(max_length=100)),
                ("product_name", models.CharField(max_length=200)),
                ("sku", models.CharField(blank=True, max_length=100)),
                ("barcode", models.CharField(blank=True, max_length=100)),
                ("pills_per_strip", models.PositiveIntegerField(blank=True, default=1, null=True)),
                ("strips_per_box", models.PositiveIntegerField(blank=True, default=1, null=True)),
                ("price_per_strip", models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ("price_per_box", models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ("expiry_date", models.DateField()),
                ("cost", models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ("quantity", models.IntegerField(default=0)),
                ("unit", models.CharField(choices=[("pill", "Pill"), ("strip", "Strip"), ("box", "Box")], default="pill", max_length=20)),
                ("synced", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("branch", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="core.branch")),
                ("category", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="core.category")),
                ("supplier", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="core.supplier")),
            ],
        ),
        migrations.CreateModel(
            name="ProductConflict",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("product_identifier", models.CharField(max_length=255)),
                ("conflicting_batch_ids", models.JSONField(default=list)),
                ("conflicting_values", models.JSONField(default=dict)),
                ("resolved_values", models.JSONField(blank=True, null=True)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("resolved", "Resolved")], default="pending", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("product", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="conflicts", to="core.product")),
            ],
        ),
    ]
