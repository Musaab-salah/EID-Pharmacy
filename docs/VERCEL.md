# نشر واجهة صيدلية عيد على Vercel

## لماذا ظهر 404؟

1. **المجلد الجذر (Root Directory):** إذا ربطت المستودع كاملاً دون تحديد مجلد، Vercel لا يجد مشروع Vite في الجذر → **404**.
2. **مسار `base`:** التطبيق كان مبنياً على `/admin` أو `/app` بينما Vercel يعرض الموقع من `/` → الملفات لا تُجد.
3. **SPA:** تحديث الصفحة على `/login` يحتاج **rewrite** إلى `index.html`.

تم ضبط: `base: '/'` تلقائياً عند البناء على Vercel (`VERCEL=1`) + ملف `vercel.json` + إصلاح `BrowserRouter`.

## خطوات صحيحة (مشروعان منفصلان أو واحد)

### لوحة الإدارة (Admin)

1. Vercel → **Add New Project** → استورد نفس الـ repo.
2. **Root Directory:** اختر `frontend-admin` (مهم جداً).
3. Framework: **Vite** (يُكتشف تلقائياً).
4. **Environment Variables:**
   - `VITE_API_URL` = عنوان الـ API الكامل، مثال: `https://your-api.onrender.com/api`
5. Deploy.

افتح: `https://your-project.vercel.app/` (الجذر يعمل).

### نقطة البيع (POS)

كرر الخطوات مع **Root Directory:** `frontend-app` ونفس `VITE_API_URL` (أو حسب نشر الـ backend).

## ملاحظة مهمة

**Vercel يستضيف الواجهة فقط (HTML/JS).** الـ **Django API** يجب أن يعمل على **Render** أو **PythonAnywhere** أو غيره، ثم تربطه بـ `VITE_API_URL`.

بدون backend عام على الإنترنت، الواجهة تفتح لكن تسجيل الدخول والبيانات لن تعمل.

## التحقق المحلي من بناء Vercel

```bash
cd frontend-admin
set VERCEL=1
npm run build
npx vite preview
```

على PowerShell: `$env:VERCEL=1; npm run build`
