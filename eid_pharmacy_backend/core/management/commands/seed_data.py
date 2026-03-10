from datetime import date, timedelta

from django.core.management.base import BaseCommand

from core.models import Batch, Branch, Customer, Product, User


class Command(BaseCommand):
    help = "Seed initial data for local development."

    def handle(self, *args, **options):
        branch, _ = Branch.objects.get_or_create(
            name_ar="الفرع الرئيسي - صيدلية عيد",
            defaults={
                "name_en": "Main Branch - Eid Pharmacy",
                "address": "Main Street",
            },
        )
        if branch.name_en != "Main Branch - Eid Pharmacy":
            branch.name_en = "Main Branch - Eid Pharmacy"
            branch.save()

        admin_user, created = User.objects.get_or_create(
            email="admin@eidpharmacy.local",
            defaults={
                "username": "admin",
                "name": "Admin",
                "role": User.ROLE_ADMIN,
                "branch": branch,
                "is_active": True,
            },
        )
        if created:
            admin_user.set_password("Admin123!")
            admin_user.save()

        products = [
            ("Panadol", "بنادول"),
            ("Vitamin C", "فيتامين سي"),
            ("Augmentin", "اوجمنتين"),
            ("Iron Supplement", "مكمل الحديد"),
            ("Zinc Tablets", "أقراص الزنك"),
        ]

        for idx, (name_en, name_ar) in enumerate(products, start=1):
            product, _ = Product.objects.get_or_create(
                name_en=name_en,
                defaults={
                    "name_ar": name_ar,
                    "barcode": f"12345{idx}",
                    "sku": f"SKU-{idx}",
                    "price": 10 + idx,
                    "purchase_price": 7 + idx,
                },
            )
            Batch.objects.get_or_create(
                product=product,
                branch=branch,
                batch_no=f"BATCH-{idx}",
                defaults={
                    "expiry_date": date.today() + timedelta(days=365),
                    "qty_on_hand": 50,
                    "unit_cost": product.purchase_price,
                },
            )

        Customer.objects.get_or_create(
            name="عميل تجريبي",
            defaults={"phone": "0500000000", "email": "customer@example.com"},
        )

        self.stdout.write(self.style.SUCCESS("Seed data created."))
