from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0016_einvoice_submission"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="branches",
            field=models.ManyToManyField(blank=True, help_text="Branches the user can operate on. If empty, falls back to `branch`.", related_name="users", to="core.branch"),
        ),
    ]

