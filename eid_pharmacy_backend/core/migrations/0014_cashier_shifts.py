from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0013_stock_transfers"),
    ]

    operations = [
        migrations.CreateModel(
            name="CashierShift",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("opened_at", models.DateTimeField(auto_now_add=True)),
                ("closed_at", models.DateTimeField(blank=True, null=True)),
                ("opening_cash", models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ("closing_cash", models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ("variance", models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ("branch", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="shifts", to="core.branch")),
                ("cashier", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="shifts", to="core.user")),
            ],
            options={"ordering": ["-opened_at"]},
        ),
        migrations.AddField(
            model_name="saleinvoice",
            name="shift",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="invoices", to="core.cashiershift"),
        ),
    ]

