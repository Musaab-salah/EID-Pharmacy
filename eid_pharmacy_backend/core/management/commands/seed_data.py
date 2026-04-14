from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.db.models import Q

from core.models import Batch, Branch, Category, Customer, Product, User


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

        categories = [
            ("RX", "Prescription Medicines", "الأدوية بوصفة طبية"),
            ("OTC", "OTC Medicines", "أدوية بدون وصفة طبية"),
            ("CTRL", "Controlled / Restricted Drugs", "أدوية خاضعة للرقابة"),
            ("VIT", "Vitamins & Supplements", "الفيتامينات والمكملات الغذائية"),
            ("PED", "Pediatric Products", "منتجات وأدوية الأطفال"),
            ("CHR", "Chronic Disease Medicines", "أدوية الأمراض المزمنة"),
            ("MEDSUP", "Medical Supplies & Devices", "المستلزمات والأجهزة الطبية"),
            ("CARE", "Personal Care & Hygiene", "منتجات العناية الشخصية"),
            ("COSM", "Medical Cosmetics", "مستحضرات التجميل الطبية"),
            ("TOP", "Topical Medicines", "الأدوية الموضعية"),
            ("EMR", "First Aid & Emergency", "الإسعافات الأولية والطوارئ"),
            ("SERV", "Pharmacy Services", "خدمات الصيدلية"),
        ]
        category_map = {}
        for code, name_en, name_ar in categories:
            category, _ = Category.objects.get_or_create(
                code=code, defaults={"name_en": name_en, "name_ar": name_ar}
            )
            if category.name_en != name_en or category.name_ar != name_ar:
                category.name_en = name_en
                category.name_ar = name_ar
                category.save()
            category_map[code] = category

        products = [
            ("Panadol", "بنادول", "OTC"),
            ("Vitamin C", "فيتامين سي", "VIT"),
            ("Augmentin", "اوجمنتين", "RX"),
            ("Iron Supplement", "مكمل الحديد", "VIT"),
            ("Zinc Tablets", "أقراص الزنك", "VIT"),
        ]

        for idx, (name_en, name_ar, category_code) in enumerate(products, start=1):
            sku = f"SKU-{idx}"
            barcode = f"12345{idx}"
            category = category_map.get(category_code)
            # Prefer stable seed key (sku); name_en is not unique — duplicates break get_or_create.
            product = Product.objects.filter(sku=sku).first()
            if product is None:
                product = Product.objects.filter(name_en=name_en).order_by("id").first()
            if product is None:
                product = Product.objects.create(
                    name_en=name_en,
                    name_ar=name_ar,
                    category=category,
                    barcode=barcode,
                    sku=sku,
                    price=10 + idx,
                    purchase_price=7 + idx,
                )
            else:
                product.name_en = name_en
                product.name_ar = name_ar
                product.category = category
                product.barcode = barcode or product.barcode
                product.sku = sku
                product.price = 10 + idx
                product.purchase_price = 7 + idx
                product.save()
            batch, _created = Batch.objects.get_or_create(
                product=product,
                branch=branch,
                batch_no=f"BATCH-{idx}",
                defaults={
                    "expiry_date": date.today() + timedelta(days=365),
                    "qty_on_hand": 50,
                    "unit_cost": product.purchase_price,
                },
            )
            # إن كانت الدفعة قديمة من تشغيل سابق، جدّد الصلاحية حتى لا يفشل البيع
            if batch.expiry_date < date.today():
                batch.expiry_date = date.today() + timedelta(days=365)
                if batch.qty_on_hand < 1:
                    batch.qty_on_hand = 50
                batch.save(update_fields=["expiry_date", "qty_on_hand"])

        Customer.objects.get_or_create(
            name="عميل تجريبي",
            defaults={"phone": "0500000000", "email": "customer@example.com"},
        )

        # دفعات BATCH-* و INIT-* الناتجة عن الإضافة التلقائية: تمديد الصلاحية إن انتهت (بيئة تطوير)
        for b in (
            Batch.objects.filter(branch=branch, expiry_date__lt=date.today())
            .filter(Q(batch_no__startswith="BATCH-") | Q(batch_no__startswith="INIT-"))
        ):
            b.expiry_date = date.today() + timedelta(days=365)
            if b.qty_on_hand < 1:
                b.qty_on_hand = 50
            b.save(update_fields=["expiry_date", "qty_on_hand"])

        self.stdout.write(self.style.SUCCESS("Seed data created."))
