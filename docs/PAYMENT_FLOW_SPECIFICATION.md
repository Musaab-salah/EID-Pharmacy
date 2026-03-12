# Payment Flow Specification
## Pharmacy Management System (POS + Web)

**Version:** 1.0  
**Target Users:** Pharmacists, Cashiers  
**Language:** Simple, user-friendly  
**Focus:** Clarity, error prevention, auditability  

---

## 1. Overview

This document describes the payment flow for the Pharmacy Management System. The system supports **only two** payment methods: **Cash** and **Bank / Account Transfer**. All payments must follow strict validation rules to ensure accuracy and auditability.

---

## 2. Payment Methods (Mandatory)

| # | Method | Arabic | Description |
|---|--------|--------|-------------|
| 1 | Cash | نقدًا | Payment received in physical currency |
| 2 | Bank Transfer / Account Transfer | تحويل إلى رقم حساب | Payment via bank transfer or mobile wallet to a pre-defined account |

**Important:** No other payment methods are allowed in the system.

---

## 3. Admin Responsibilities (Web – Admin Panel)

### 3.1 Payment Account Management

The Admin must be able to:

- **Add** payment accounts  
- **Edit** payment accounts  
- **Disable / Enable** payment accounts  

### 3.2 Payment Account Fields

Each payment account must include:

| Field | Description | Example |
|-------|-------------|---------|
| Account Name | Bank or wallet name | "البنك الأهلي" / "STC Pay" |
| Account Number / IBAN | Account identifier | IBAN or wallet number |
| Account Type | Bank or Mobile Wallet | Bank / Mobile Wallet |
| Status | Active or Inactive | Active / Inactive |

### 3.3 Rules

- **Only ACTIVE accounts** appear to users during payment  
- **Users CANNOT** manually enter account numbers — they must select from the admin-defined list  

---

## 4. User Payment Flow (POS + Web)

### 4.1 Page: Payment Method Selection

**Step 1 – Choose Payment Type**

The user sees two options:

1. **Cash** (نقدًا) — with a clear cash icon  
2. **Transfer to Account** (تحويل إلى رقم حساب) — with a transfer icon  

**UX Guidelines:**
- Use large, distinct icons for each option  
- Highlight the selected option clearly  
- Provide a brief description under each option  

---

## 5. Payment Type: CASH

### 5.1 Flow

1. User selects **Cash**  
2. System displays:
   - **Amount received** — input field (required)  
   - **Total due** — read-only (from order)  
   - **Change amount** — auto-calculated (Amount received − Total due)  

### 5.2 Rules

- Amount received must be ≥ Total due  
- No attachment required  
- Change is displayed for user reference (e.g., to give back to customer)  

### 5.3 Validation

- Amount received cannot be empty  
- Amount received cannot be less than total due  
- Show error message if validation fails  

---

## 6. Payment Type: TRANSFER TO ACCOUNT

### 6.1 Flow

1. User selects **Transfer to Account**  
2. System displays a list of **ACTIVE** admin-defined accounts:
   - Account Name  
   - Account Number (or IBAN)  
   - Account Type (Bank / Mobile Wallet)  

3. User selects **ONE account only**  

4. User must **upload payment proof** (receipt or screenshot)  
   - Image only (JPG / PNG)  
   - Must be clearly visible  

5. Optional: User may enter a **Reference number** (text)  

### 6.2 Mandatory Requirements for Transfer

| Requirement | Description |
|-------------|-------------|
| Account selection | User must select one account from the list |
| Payment proof image | **Mandatory** — JPG or PNG only |
| Image visibility | Image must be clearly visible (not blurred or cropped) |

### 6.3 Validation

- **Transfer payment WITHOUT image → BLOCK transaction**  
- User cannot proceed to confirmation without uploading proof  
- Show clear warning: *"Uploading payment proof is mandatory for transfers"*  

### 6.4 Rules

- User cannot manually enter account numbers  
- Disabled accounts are NOT visible to the user  
- Only one account per transaction  

---

## 7. Confirmation Page

### 7.1 Display

| Element | Shown When |
|---------|------------|
| Payment type | Always |
| Selected account (name + number) | Transfer only |
| Payment proof thumbnail | Transfer only |
| Total amount | Always |
| Amount received / Change | Cash only |
| Confirmation message | Always |

### 7.2 Actions

- **Confirm payment** — Finalizes the transaction  
- **Print receipt** — Prints the sale receipt  
- **Start new sale** — Clears cart and begins a new sale  

### 7.3 Locking

- **Payment screen is locked after confirmation**  
- Payment method cannot be changed after confirmation  

---

## 8. Validation Rules (Summary)

| Rule | Description |
|------|-------------|
| Transfer without image | Block transaction — show error |
| Disabled account | Not visible to user |
| Post-confirmation | Payment method cannot be changed |
| Amount (Cash) | Must be ≥ total due |
| Account selection (Transfer) | Required — one account only |

---

## 9. Reporting & Audit (Admin)

### 9.1 Required Capabilities

The Admin must be able to:

- **View transfer payments separately** from cash payments  
- **Open payment proof image** for any transfer payment  
- **Filter sales by:**
  - Payment method (Cash / Transfer)  
  - Account used (for transfers)  
  - Date range  

### 9.2 Optional Enhancement

- Admin can mark a transfer payment as **"Verified"** after reviewing the proof  

---

## 10. Best Practice Recommendations

### 10.1 Visual Design

1. **Use distinct icons** for Cash and Transfer to reduce mistakes  
2. **Highlight selected account** clearly (e.g., border, background color)  
3. **Show payment proof thumbnail** after upload for quick verification  

### 10.2 Messaging

1. **Clear warning:** *"Uploading payment proof is mandatory for transfers"* — visible when Transfer is selected  
2. **Confirmation message:** *"Payment completed successfully"* before allowing new sale  

### 10.3 Behavior

1. **Lock payment screen** after confirmation  
2. **Disable "Confirm" button** until all validations pass  
3. **Show change amount** prominently for cash payments  

### 10.4 Admin

1. **Review transfer payments** with proof images in a dedicated view  
2. **Filter and export** for audit purposes  

---

## 11. Flow Diagram (Summary)

```
┌─────────────────────────────────────────────────────────────┐
│                  PAYMENT METHOD SELECTION                    │
│                                                              │
│   [ Cash ]              [ Transfer to Account ]             │
└────────┬────────────────────────────┬────────────────────────┘
         │                            │
         ▼                            ▼
┌─────────────────────┐    ┌─────────────────────────────────┐
│   CASH FLOW         │    │   TRANSFER FLOW                  │
│                     │    │                                  │
│ • Enter amount      │    │ • Select account (from list)     │
│ • Show change       │    │ • Upload payment proof (required)│
│ • No attachment     │    │ • Optional: Reference number     │
└────────┬────────────┘    └────────────┬────────────────────┘
         │                              │
         └──────────────┬───────────────┘
                        ▼
         ┌──────────────────────────────┐
         │     CONFIRMATION PAGE         │
         │                               │
         │ • Review details              │
         │ • Confirm / Print / New Sale  │
         │ • Lock after confirm          │
         └──────────────────────────────┘
```

---

## 12. Page-by-Page Summary

| Page | Purpose | Key Elements |
|------|---------|--------------|
| Payment Method Selection | Choose Cash or Transfer | Two large buttons with icons |
| Cash Payment | Enter amount, show change | Amount input, change display |
| Transfer Payment | Select account, upload proof | Account list, file upload, optional reference |
| Confirmation | Review and confirm | Summary, proof thumbnail, actions |
| Admin – Payment Accounts | Manage accounts | Add, edit, enable/disable |
| Admin – Transfer Report | Audit transfers | Filter, view proof, verify |

---

## 13. Glossary

| Term | Meaning |
|------|---------|
| Payment proof | Image (receipt/screenshot) showing the transfer was made |
| Account | Bank or wallet account defined by Admin |
| Active account | Account visible and selectable by users |
| Inactive account | Account hidden from users, kept for records |

---

*End of Payment Flow Specification*
