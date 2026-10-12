const item = (path, label, icon, badge) => ({ path, label, icon, badge });

// --------------------------------------------------------------------------
// Admin navigation (grouped). This is the single source of truth — the admin
// sidebar renders these groups directly and ROLE_MENUS.admin is derived from
// the flattened items so App.jsx route generation keeps working.
// --------------------------------------------------------------------------
const adminGroup = (label, items, icon) => ({ label, items, icon });

export const ADMIN_NAV = [
  adminGroup("Overview", [
    item("/admin", "Dashboard", "dashboard"),
    item("/admin/analytics", "Analytics", "report"),
  ]),
  adminGroup("User Management", [
    item("/admin/users", "User Management", "users"),
    item("/admin/patients", "Patients", "patients"),
    item("/admin/doctors", "Doctors / Dentists", "doctors"),
    item("/admin/staff", "Staff Management", "receptionist"),
    item("/admin/deactivation-requests", "Deactivation Requests", "shield", "deactivation"),
  ]),
  adminGroup("Clinic Operations", [
    item("/admin/appointments", "Appointments", "calendar"),
    item("/admin/schedules", "Schedule Management", "schedule"),
    item("/admin/services", "Dental Services", "services"),
    item("/admin/messages", "Messages", "message", "messages"),
    item("/admin/billing", "Billing & Payments", "payment"),
  ]),
  adminGroup("Pharmacy & Inventory", [
    item("/admin/inventory", "Inventory", "inventory"),
    item("/admin/suppliers", "Suppliers", "stock"),
    item("/admin/purchase-requests", "Purchase Requests", "purchase", "purchase"),
    item("/admin/purchase-orders", "Purchase Orders", "box"),
    item("/admin/low-stock", "Low Stock", "alert"),
    item("/admin/expiry-alerts", "Expiry Alerts", "expiry", "expiry"),
  ]),
  adminGroup("Reports & Analytics", [
    item("/admin/reports", "Reports", "report"),
    item("/admin/ai-reports", "AI Reports", "ai"),
  ]),
  adminGroup("Feedback & Communication", [
    item("/admin/feedback", "Feedback & Reviews", "message", "negative"),
    item("/admin/inquiries", "Inquiries", "inquiry", "inquiry"),
    item("/admin/notifications", "Notifications", "alert", "notifications"),
  ]),
  adminGroup("Automation & Governance", [
    item("/admin/schedule-automation", "Schedule Automation", "automation"),
    item("/admin/audit", "Audit Logs", "history"),
  ]),
  adminGroup("Account", [
    item("/admin/profile", "Profile", "settings"),
    item("/admin/settings", "Settings", "settings"),
  ]),
];

export const ROLE_MENUS = {
  cashier: [
    item("/user", "Overview", "dashboard"), item("/user/payments", "Payments", "payment"), item("/user/invoices", "Invoices", "invoice"), item("/user/pending", "Pending Payments", "pending"), item("/user/messages", "Messages", "message", "messages"), item("/user/history", "Payment History", "history"), item("/user/refunds", "Refunds", "refund"), item("/user/reports", "Reports", "report"), item("/user/notifications", "Notifications", "alert"),
  ],
  user: [
    item("/user", "Overview", "dashboard"), item("/user/payments", "Payments", "payment"), item("/user/invoices", "Invoices", "invoice"), item("/user/pending", "Pending Payments", "pending"), item("/user/messages", "Messages", "message", "messages"), item("/user/history", "Payment History", "history"), item("/user/refunds", "Refunds", "refund"), item("/user/reports", "Reports", "report"), item("/user/notifications", "Notifications", "alert"),
  ],
  patient: [
    item("/patient", "Overview", "dashboard"), item("/patient/appointments", "My Appointments", "calendar"), item("/patient/book-appointment", "Book Appointment", "plus"), item("/patient/history", "Appointment History", "history"), item("/patient/records", "Medical Records", "records"), item("/patient/prescriptions", "Prescriptions", "prescription"), item("/patient/messages", "Messages", "message", "messages"), item("/patient/billing", "Payments & Billing", "payment"), item("/patient/reviews", "Reviews & Feedback", "star"), item("/patient/notifications", "Notifications", "alert"),
  ],
  doctor: [
    item("/doctor", "Overview", "dashboard"), item("/doctor/today", "Today's Appointments", "calendar"), item("/doctor/appointments", "All Appointments", "calendar"), item("/doctor/patients", "My Patients", "patients"), item("/doctor/records", "Patient Records", "records"), item("/doctor/treatment-plans", "Treatment Plans", "plan"), item("/doctor/prescriptions", "Prescriptions", "prescription"), item("/doctor/history", "Medical History", "history"), item("/doctor/messages", "Messages", "message", "messages"), item("/doctor/schedule", "Availability & Schedule", "schedule"), item("/doctor/notifications", "Notifications", "alert"),
  ],
  admin: ADMIN_NAV.flatMap((group) => group.items),
  receptionist: [
    item("/receptionist", "Overview", "dashboard"), item("/receptionist/register-patient", "Patient Registration", "register"), item("/receptionist/patients", "Patients", "patients"), item("/receptionist/appointments", "Appointments", "calendar"), item("/receptionist/book-appointment", "Book Appointment", "plus"), item("/receptionist/schedule", "Doctor Schedule", "schedule"), item("/receptionist/queue", "Check-in & Queue", "pending"), item("/receptionist/billing", "Billing", "invoice"), item("/receptionist/payments", "Payments", "payment"), item("/receptionist/messages", "Messages", "message", "messages"), item("/receptionist/notifications", "Notifications", "alert"),
  ],
  pharmacist: [
    item("/pharmacist", "Overview", "dashboard"),
    item("/pharmacist/prescriptions", "Prescriptions", "prescription"),
    item("/pharmacist/dispense", "Dispense Medicines", "dispensed"),
    item("/pharmacist/inventory", "Medicine Inventory", "inventory"),
    item("/pharmacist/purchase-requests", "My Requests", "purchase"),
    item("/pharmacist/low-stock", "Low Stock", "alert"),
    item("/pharmacist/suppliers", "Suppliers", "stock"),
    item("/pharmacist/stock-transactions", "Stock Transactions", "history"),
    item("/pharmacist/medicine-history", "Medicine History", "history"),
    item("/pharmacist/reports", "Reports", "report"),
    item("/pharmacist/messages", "Messages", "message", "messages"),
    item("/pharmacist/notifications", "Notifications", "alert"),
  ],
};

export function getRoleBadgeClass(role) {
  return `df-badge df-badge-${role}`;
}
