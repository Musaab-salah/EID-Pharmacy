# Eid Pharmacy (صيدلية عيد)

Local-only development setup for a simple pharmacy system with:
- Backend: Django 4 + DRF + JWT + SQLite
- Frontend Admin: React + Vite + TypeScript + Ant Design
- Frontend POS: React + Vite + TypeScript
- Full Arabic/English support with RTL

## Run Backend (Local)
1) `cd eid_pharmacy_backend`  
2) `pip install -r requirements.txt`  
3) `python manage.py migrate`  
4) `python manage.py seed_data`  
5) `python manage.py runserver 8000`

API base: `http://localhost:8000/api/`

## Run Admin Portal
1) `cd frontend-admin`  
2) `npm install`  
3) `npm run dev` → `http://localhost:5173/admin`

## Run POS Portal
1) `cd frontend-app`  
2) `npm install`  
3) `npm run dev` → `http://localhost:5174/app`

## Default Credentials
- Email: `admin@eidpharmacy.local`
- Password: `Admin123!`

## Seed Data
The command `python manage.py seed_data` creates:
- Main branch: "الفرع الرئيسي - صيدلية عيد"
- Admin user
- 5 products
- 1 customer
- Batches for products

## Assumptions
- `Batch` is linked to a `Branch` to support per-branch inventory and transfers.
- Local time zone set to `Asia/Riyadh`.
- POS uses FEFO: the earliest expiry batch is selected automatically for each product.
- Thermal receipt printing uses the browser print dialog with 80mm width.

## Notes
- CORS is open for local development.
- Product images are optional and currently a placeholder field in the backend.
