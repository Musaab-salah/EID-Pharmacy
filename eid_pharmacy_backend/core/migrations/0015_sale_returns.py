from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0014_cashier_shifts"),
    ]

    operations = [
        migrations.CreateModel(
            name="SaleReturn",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("reason", models.CharField(blank=True, max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("branch", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="sale_returns", to="core.branch")),
                ("cashier", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="sale_returns", to="core.user")),
                ("original_invoice", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="returns", to="core.saleinvoice")),
            ],
        ),
        migrations.CreateModel(
            name="SaleReturnLine",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("qty", models.IntegerField()),
                ("unit_price", models.DecimalField(decimal_places=2, max_digits=10)),
                ("line_total", models.DecimalField(decimal_places=2, max_digits=10)),
                ("batch", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to="core.batch")),
                ("product", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to="core.product")),
                ("sale_line", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to="core.saleline")),
                ("sale_return", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="lines", to="core.salereturn")),
            ],
        ),
    ]

