# Pharmacy Management System - Features & Reports

This document describes the reporting and management features added to the EID Pharmacy system.

---

## 1. Purchase Reports (تقارير المشتريات)

### Purpose
Help admin track purchases and suppliers easily.

### Location
**Admin Panel** → **Reports** → **Purchase Reports** tab  
**Admin Panel** → **Purchase Invoices** (to add new purchase records)

### Features
- **Report of all purchase invoices** with full details
- **Filters:**
  - **Date range** – Filter by purchase date (from / to)
  - **Supplier** – Filter by supplier
  - **Product** – Filter by product
- **Displayed data:**
  - Purchase date
  - Invoice number
  - Supplier name
  - Products purchased
  - Quantities
  - Purchase prices
  - Total purchase amount

### How to Use
1. Go to **Reports** → **Purchase Reports** tab
2. Use the date picker to set the date range
3. Optionally select a supplier and/or product
4. Click **Apply** to refresh the report
5. Use **Export CSV** to download the data

### Adding Purchase Invoices
1. Go to **Purchase Invoices** in the sidebar
2. Click **Add**
3. Enter invoice number, date, supplier, and branch
4. Add product lines (product, quantity, unit price)
5. Save

---

## 2. Sales Reports (تقارير المبيعات)

### Purpose
Help admin monitor sales performance clearly.

### Location
**Admin Panel** → **Reports** → **Sales Reports** tab

### Features
- **Daily sales summary** – Count and total for today
- **Monthly sales summary** – Count and total for current month
- **Detailed sales report** with filters:
  - **Date range** – Filter by sale date
  - **User (Cashier/Pharmacist)** – Filter by who made the sale
  - **Payment method** – Cash or Transfer
- **Displayed data:**
  - Sale date
  - Invoice number
  - Sold products
  - Quantities
  - Selling prices
  - Total sales amount

### How to Use
1. Go to **Reports** → **Sales Reports** tab
2. Use the date picker to set the date range
3. Optionally select a cashier and/or payment method
4. Click **Apply** to refresh
5. Use **Export CSV** to download

---

## 3. Low Stock & Near Expiry Reports

### A. Low Stock Report (تقرير نقص الكمية)

**Purpose:** Alert admin before products run out.

**Location:** **Admin Panel** → **Reports** → **Low Stock** tab

**Features:**
- Lists products where current quantity is below the defined minimum level
- **Display:**
  - Product name
  - Current quantity
  - Minimum quantity
- **Optional:** Override threshold – enter a number to see all products with stock at or below that level (instead of each product’s own minimum)

**How to Use:**
1. Set **Min quantity** on each product (Products → Edit → Min Qty)
2. Go to **Reports** → **Low Stock**
3. Optionally enter a custom threshold and click **Apply**
4. Use **Export CSV** to download

---

### B. Near Expiry Report (تقرير قرب انتهاء الصلاحية)

**Purpose:** Prevent losses from expired medicines.

**Location:** **Admin Panel** → **Reports** → **Near Expiry** tab

**Features:**
- Lists products/batches with expiry date within 3 months
- **Display:**
  - Product name
  - Batch number
  - Expiry date
  - Remaining quantity

**How to Use:**
1. Go to **Reports** → **Near Expiry**
2. Review the list and plan stock use or disposal
3. Use **Export CSV** to download

---

## 4. Supplier Field in Product Creation

### Purpose
- Easily track products by supplier
- Improve purchasing and inventory control
- Show supplier in purchase reports and inventory

### Location
**Admin Panel** → **Products** → Add/Edit product

### Features
- **Required field:** Supplier Name when adding or editing a product
- **Selection:** Supplier must be chosen from the existing suppliers list
- **Storage:** Supplier is stored with the product
- **Visibility:** Supplier appears in:
  - Purchase reports
  - Inventory and batch reports
  - Product list

### How to Use
1. Add suppliers first: **Suppliers** → **Add**
2. When adding or editing a product, select the supplier from the dropdown
3. Products without a supplier must have one assigned before saving

---

## General Requirements Met

- Simple and clear UI
- User-friendly reports
- Filters are easy to use
- Suitable for Admin users
- No technical complexity in explanations

---

## API Endpoints (for reference)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/reports/purchases/` | GET | Purchase report (params: date_from, date_to, supplier_id, product_id) |
| `/api/reports/sales/` | GET | Sales report (params: date_from, date_to, cashier_id, payment_method) |
| `/api/reports/low_stock/` | GET | Low stock (param: threshold, optional) |
| `/api/reports/expiring/` | GET | Near expiry (param: days, default 90) |
| `/api/suppliers/` | CRUD | Suppliers management |
| `/api/purchases/` | CRUD | Purchase invoices |
