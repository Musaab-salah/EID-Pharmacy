from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0011_user_session_source"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProductBarcode",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.CharField(db_index=True, max_length=100)),
                ("barcode_type", models.CharField(choices=[("primary", "Primary"), ("alt", "Alternative"), ("internal", "Internal")], default="alt", max_length=20)),
                ("is_primary", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("product", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="barcodes", to="core.product")),
            ],
        ),
        migrations.AddConstraint(
            model_name="productbarcode",
            constraint=models.UniqueConstraint(models.functions.Lower("code"), name="uniq_product_barcode_code_ci"),
        ),
    ]

