# System Alerts Feature — Pharmacy Management System

## Overview

The System Alerts feature helps pharmacy staff and admins avoid selling expired medicines and running out of stock. Alerts are shown in the dashboard, reports, and product lists, and can be configured by admins.

---

## 1. Expiry Date Alerts (تنبيهات قرب انتهاء الصلاحية)

### Purpose

- Avoid selling expired medicines
- Reduce losses from expired stock

### How It Works

- Alerts are based on **batches** (each batch has its own expiry date).
- The system checks batch expiry dates regularly.
- When a batch is within the configured alert period, an alert is created.

### Alert Rules

| Setting | Default | Description |
|--------|---------|-------------|
| Alert period | 90 days (3 months) | Alert when expiry date is within this period |
| Configurable options | 30 / 60 / 90 days | Admin can choose one of these (or similar) |

### What the User Sees

- **Dashboard**: Number of near-expiry batches and a link to the full list.
- **Reports**: Near-expiry items highlighted (e.g. yellow).
- **Product lists**: Near-expiry batches marked with a visual indicator.

### Alert Details Shown

- Product name
- Batch number
- Expiry date
- Remaining quantity

---

## 2. Low Stock Alerts (تنبيهات نقص الكمية)

### Purpose

- Avoid products going out of stock
- Support timely reordering

### How It Works

- Admin sets a **minimum stock level** for each product.
- The system compares current stock (sum of all batches) with this minimum.
- When stock is **equal to or below** the minimum, an alert is created.

### Alert Rules

- Alert when: `current quantity ≤ minimum quantity`
- Alerts update after each sale or stock change (add, subtract, transfer).

### What the User Sees

- **Dashboard**: Number of low-stock products and a link to the list.
- **Product lists**: Low-stock products marked with a visual indicator.
- **Reports**: Low-stock items highlighted (e.g. red).

### Alert Details Shown

- Product name
- Current quantity
- Minimum quantity set by admin

---

## 3. Admin Configuration (إعدادات الأدمن)

### Per Product

| Setting | Where | Description |
|--------|-------|-------------|
| Minimum stock level | Product create/edit form | Number below which a low-stock alert is triggered |
| Default | 0 | No alert if not set |

### Global (System-Wide)

| Setting | Where | Description |
|--------|-------|-------------|
| Expiry alert period | Settings / Configuration page | 30, 60, or 90 days (or similar) |
| Default | 90 days | Alert when expiry is within 3 months |
| Enable/disable alerts | Settings | Turn all alerts on or off |

### Optional: Per-Product Override

- Admin can optionally override the global expiry period for specific products (e.g. 30 days for some items).
- If not configured, the global setting applies.

---

## 4. Alert Behavior & UX

### Visibility

- Alerts are visible but not blocking.
- Users can continue working while alerts are shown.

### Visual Design

| Alert type | Color | Use |
|------------|-------|-----|
| Near expiry | Yellow / Amber | Warning |
| Low stock | Orange / Red | Critical |
| Expired | Red | Blocked from sale |

### Sales Behavior

- **Near expiry**: User can still sell; product is highlighted in the list.
- **Low stock**: User can still sell; product is highlighted.
- **Expired**: User cannot sell; product is blocked from selection.

### Expired Products

- Products are blocked from sale when:
  - The expiry date of the batch is in the past.
- The POS shows a clear message when the user tries to add an expired product.

---

## 5. Report Integration

### Near-Expiry Report

- Lists batches expiring within the configured period.
- Includes: product name, batch number, expiry date, remaining quantity.
- Filter by alert status (e.g. “near expiry only”).

### Low Stock Report

- Lists products where current quantity ≤ minimum quantity.
- Includes: product name, current quantity, minimum quantity.
- Filter by alert status (e.g. “low stock only”).

### Combined View

- Admin can filter reports by:
  - Near expiry only
  - Low stock only
  - Both

---

## 6. Dashboard Summary

### Suggested Layout

```
┌─────────────────────────────────────────────────────────┐
│  Dashboard                                               │
├─────────────────────────────────────────────────────────┤
│  [Near Expiry: 5 batches]  [Low Stock: 3 products]       │
│  [View all] [View all]                                   │
└─────────────────────────────────────────────────────────┘
```

### Behavior

- Each alert type shows a count and a link to the full list.
- Counts update in real time.
- Optional: show a small list of the most critical items on the dashboard.

---

## 7. User Workflow Summary

| User | Action |
|------|--------|
| Admin | Set minimum stock per product when creating/editing |
| Admin | Configure expiry alert period (e.g. 30/60/90 days) |
| Admin | Enable or disable alerts in settings |
| All users | See dashboard alerts |
| All users | See highlighted items in product lists and reports |
| Cashier | Cannot sell expired products |

---

## 8. Technical Notes (for Implementation)

- **Expiry check**: Compare batch expiry date with today + alert period.
- **Low stock check**: Sum of product quantities across all batches vs minimum.
- **Real-time updates**: Recalculate alerts after sales, stock changes, and purchases.
- **Blocking expired sales**: Validate batch expiry before adding to cart.

---

*Document version: 1.0*  
*Last updated: March 2025*
