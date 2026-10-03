# Web-Based Dental Clinic Management System
## Dental Supplies & Inventory Management Module (US01 – US04)

**Member:** IT25102201 – Abilash S.  
**Group ID:** Y2-S1-MLB-B12G1-04  
**Course:** SE2030 – Software Engineering (SLIIT Y2S1 2026)

---

## 🎯 Role-Based Capabilities & Business Rules

### 1. 🏥 Nurse Portal (Clinical Stock Dispensing & Safety)
- **View Stock:** Nurse can browse dental materials, current stock levels, units, and dates.
- **Take / Dispense Item:** Nurse can dispense materials for clinical procedures (e.g., extractions, fillings).
- **CRITICAL SAFETY VALIDATION:**
  - If an item has **EXPIRED**, the system **strictly blocks the nurse from taking or dispensing it**.
  - System error: `This item has EXPIRED! You cannot take or dispense this item.`
  - The UI highlights expired items with an alert banner and disables dispensing to protect patient safety.
- **Dispose Expired Stock:** Nurse can safely remove/dispose expired items from clinic shelves.

### 2. 🚚 Supplier Portal (Supplier Stock Registration with Security Key)
- **View Stock:** Supplier can view current clinic inventory quantities.
- **Security Key Validation:**
  - To register new stock or items, the supplier **must provide the clinic security authorization key**.
  - Default Demo Key: `DENTAL-SUPPLIER-KEY-2026`
  - **Validation:** If the security key is wrong:
    - System error: `Security key was wrong! Please try again.`
- **Quantity Validation:**
  - Supplier **cannot add items with 0 or less than 0 quantity** (must be $> 0$).
  - System error: `Supplier cannot add item with 0 or less than zero quantity. Quantity must be greater than 0.`

### 3. 📦 Inventory Manager (Complete Inventory Operations)
- **Create, Read, Update, Delete (CRUD):** Manage all dental materials and equipment.
- **Remove Unwanted Items:** Soft-delete / deactivate obsolete or discontinued materials.
- **Remove Expired Items:** Remove expired materials from inventory tracking.
- **Stock Level Adjustments:** Quick stock counts and threshold monitoring.

### 4. 🏢 Supplier Manager / Administrator (Full Vendor CRUD)
- **Create New Supplier:** Register pharmaceutical vendors and dental manufacturers.
- **Read & Search Suppliers:** Search by company name or contact person.
- **Update Supplier:** Modify contact details, phone, address, registration numbers.
- **Remove Supplier:** Deactivate supplier records while preserving purchase history.

---

## 🛡️ Complete Validations Summary

| Feature / Rule | Condition | Error Message |
|---|---|---|
| **Supplier Security Key** | Key must match `DENTAL-SUPPLIER-KEY-2026` | `Security key was wrong! Please try again.` |
| **Supplier Quantity** | Quantity must be $> 0$ | `Supplier cannot add item with 0 or less than zero quantity.` |
| **Nurse Dispense Expired Item** | Item expiry date $< \text{today}$ | `This item has EXPIRED! You cannot take or dispense this item.` |
| **Nurse Dispense Quantity** | Dispense Qty $\le$ Available Stock | `Cannot dispense X items. Only Y available in stock.` |
| **Manufacture Date** | Mfg Date $\le \text{today}$ | `Manufacture date cannot be in the future.` |
| **Expiry Date vs Mfg Date** | Exp Date $\ge$ Mfg Date | `Expiry date must be after manufacture date.` |
| **Supplier Phone** | Exactly 10 digits numeric | `Phone number must be exactly 10 digits (e.g. 0771234567)` |
| **Supplier Email** | Valid RFC email & unique in DB | `Supplier with email already exists.` |

---

## 👥 Demo Logins (1-Click Switchers Available on Login Page)

| Role | Username | Password | Purpose / Testing Scope |
|---|---|---|---|
| **Inventory Manager** | `manager` | `password123` | Full inventory CRUD, remove unwanted items, adjust stock |
| **Supplier Manager / Admin** | `admin` | `password123` | Full supplier CRUD (create, read, update, remove suppliers) |
| **Nurse** | `nurse` | `password123` | View stock, take/dispense items, blocked on expired items, dispose expired |
| **Supplier** | `supplier` | `password123` | View stock, add new stock using security key (`DENTAL-SUPPLIER-KEY-2026`) |
| **Pharmacist** | `pharmacist` | `password123` | Daily stock counting and quick adjustments |

---

## 🚀 How to Run

### Backend (Spring Boot + MySQL)
```bash
cd backend
mvn spring-boot:run
```
> Runs at `http://localhost:8080`. Automatically creates tables and seeds demo accounts and materials.

### Frontend (React + Vite)
```bash
cd frontend
npm run dev
```
> Runs at `http://localhost:5173`.
