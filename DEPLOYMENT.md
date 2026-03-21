# دليل نشر مشروع صيدلية عيد (EID Pharmacy)

هذا الدليل يساعدك على نشر المشروع على استضافة مجانية للوصول إليه من أي مكان.

---

## هيكل المشروع

| المكون | التقنية | الغرض |
|--------|---------|--------|
| Backend | Django + REST API + JWT | قاعدة البيانات والـ API |
| Admin | React + Vite | لوحة الإدارة |
| POS | React + Vite | نقطة البيع |

---

## الخيار 1: PythonAnywhere (الأسهل – كل شيء في مكان واحد)

**المميزات:** مجاني، يدعم SQLite، يمكن استضافة الـ Backend وملفات الـ Frontend معاً.

### المتطلبات
- حساب على [PythonAnywhere](https://www.pythonanywhere.com) (مجاني)
- حساب على [GitHub](https://github.com)

### الخطوات

#### 1. رفع المشروع على GitHub

```bash
cd "g:\EID Pharmacy"
git init
git add .
git commit -m "Initial commit"
# أنشئ مستودعاً على GitHub ثم:
git remote add origin https://github.com/YOUR_USERNAME/eid-pharmacy.git
git push -u origin main
```

#### 2. إنشاء مشروع جديد على PythonAnywhere

1. سجّل دخولك إلى PythonAnywhere
2. من تبويب **Web** اضغط **Add a new web app**
3. اختر **Manual configuration** ثم **Python 3.10** (أو أحدث)

#### 3. استنساخ المشروع

في تبويب **Consoles** → **Bash**:

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/eid-pharmacy.git
cd eid-pharmacy
```

#### 4. إعداد البيئة الافتراضية والاعتماديات

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r eid_pharmacy_backend/requirements.txt
pip install gunicorn
```

#### 5. تطبيق الترحيلات والبيانات الافتراضية

```bash
cd eid_pharmacy_backend
python manage.py migrate
python manage.py seed_data
python manage.py collectstatic --noinput
cd ..
```

#### 6. بناء واجهات React (Admin و POS)

```bash
cd ~/eid-pharmacy

# Admin
cd frontend-admin && npm install && npm run build && cd ..

# POS
cd frontend-app && npm install && npm run build && cd ..
```

#### 7. إعداد WSGI

في PythonAnywhere: **Web** → **Code** → **WSGI configuration file**، عدّل الملف ليكون:

```python
import sys
import os

path = '/home/YOUR_USERNAME/eid-pharmacy/eid_pharmacy_backend'
if path not in sys.path:
    sys.path.insert(0, path)

os.environ['DJANGO_SETTINGS_MODULE'] = 'eid_pharmacy_backend.settings'

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
```

(استبدل `YOUR_USERNAME` باسم المستخدم الخاص بك.)

#### 8. إعداد Static و Media

في **Web** → **Static files** أضف:

| URL | Directory |
|-----|-----------|
| /static/ | `/home/YOUR_USERNAME/eid-pharmacy/eid_pharmacy_backend/staticfiles` |
| /media/ | `/home/YOUR_USERNAME/eid-pharmacy/eid_pharmacy_backend/media` |

ملاحظة: Django يخدم لوحة الإدارة (`/admin`) ونقطة البيع (`/app`) تلقائياً، لا حاجة لإضافتها في Static files.

#### 9. إعداد متغير VITE_API_URL (اختياري)

لو تريد تشغيل الفرونت إند منفصل للاختبار، أنشئ ملف `.env` في كل من `frontend-admin` و `frontend-app`:

```
VITE_API_URL=https://YOUR_USERNAME.pythonanywhere.com/api
```

#### 10. إعادة التحميل

في **Web** → **Reload** اضغط لإعادة تحميل التطبيق.

**الرابط النهائي:** `https://YOUR_USERNAME.pythonanywhere.com`

---

## الخيار 2: Render + Vercel (احترافي ومجاني)

- **Backend (Django):** على Render
- **Frontend (React):** على Vercel
- **قاعدة البيانات:** PostgreSQL مجانية على Render

### أ. نشر الـ Backend على Render

1. أضف إلى `eid_pharmacy_backend/requirements.txt`:
   ```
   gunicorn
   dj-database-url
   psycopg2-binary
   whitenoise[brotli]
   ```

2. أنشئ `eid_pharmacy_backend/build.sh`:
   ```bash
   #!/usr/bin/env bash
   set -o errexit
   pip install -r requirements.txt
   python manage.py collectstatic --noinput
   python manage.py migrate --noinput
   python manage.py seed_data 2>/dev/null || true
   ```

3. أنشئ قاعدة بيانات PostgreSQL مجانية على Render من لوحة التحكم.

4. أنشئ Web Service جديد:
   - **Build Command:** `cd eid_pharmacy_backend && ./build.sh`
   - **Start Command:** `cd eid_pharmacy_backend && gunicorn eid_pharmacy_backend.wsgi:application`
   - **Environment:** أضف `DATABASE_URL` من قاعدة البيانات

5. عدّل `settings.py` لاستخدام `dj-database-url` و WhiteNoise وإعدادات الإنتاج.

### ب. نشر الـ Frontend على Vercel

1. أنشئ مشروعين على [Vercel](https://vercel.com): واحد لـ Admin وواحد لـ POS.

2. للمشروعين، عيّن متغير البيئة:
   - `VITE_API_URL` = `https://YOUR_BACKEND.onrender.com/api`

3. **Admin:** المجلد الأساسي = `frontend-admin`، أوامر البناء = `npm run build`
4. **POS:** المجلد الأساسي = `frontend-app`، أوامر البناء = `npm run build`

---

## إعدادات الإنتاج المهمة

قبل النشر في بيئة حقيقية:

1. **SECRET_KEY:** استخدم مفتاحاً عشوائياً قوياً ولا ترفعه إلى Git
2. **DEBUG:** ضع `DEBUG = False`
3. **ALLOWED_HOSTS:** أضف نطاقات الاستضافة (مثال: `['your-app.onrender.com', 'your-username.pythonanywhere.com']`)
4. **CORS:** حدّث `CORS_ALLOWED_ORIGINS` بعناوين الفرونت إند الفعلية

---

## روابط سريعة بعد النشر

| المكوّن | الرابط المحلي | بعد النشر |
|---------|---------------|-----------|
| API | http://localhost:8000/api/ | https://YOUR_DOMAIN/api/ |
| لوحة الإدارة | http://localhost:5173/admin | https://YOUR_DOMAIN/admin |
| نقطة البيع | http://localhost:5174/app | https://YOUR_DOMAIN/app |

---

## بيانات الدخول الافتراضية

- **البريد:** `admin@eidpharmacy.local`
- **كلمة المرور:** `Admin123!`

غيّرها فوراً بعد أول تسجيل دخول في بيئة الإنتاج.

---

## ملاحظات

- استضافة PythonAnywhere المجانية تناسب المشاريع الصغيرة وربما تتطلب زيارة الموقع كل ~3 أشهر لتفادي الإيقاف.
- طبقة Render المجانية تنطفئ بعد 15 دقيقة من عدم الاستخدام، وقد يأخذ التشغيل الأول دقيقة تقريباً.
- للملفات المرفوعة (media) على Render، قد تحتاج تخزين خارجي (مثل S3) للإنتاج طويل الأمد.
