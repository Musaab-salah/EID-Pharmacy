# Generated migration for UserSession source field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0010_purchase_due_payment_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="usersession",
            name="source",
            field=models.CharField(
                choices=[("admin", "Admin"), ("app", "App")],
                default="app",
                help_text="Where the user logged in: admin panel or POS app",
                max_length=20,
            ),
        ),
    ]
