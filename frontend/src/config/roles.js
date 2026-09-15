const item = (path, label, icon) => ({ path, label, icon });

export const ROLE_MENUS = {
  user: [
    item("/user", "Overview", "dashboard"), item("/user/payments", "Payments", "payment"), item("/user/invoices", "Invoices", "invoice"), item("/user/pending", "Pending Payments", "pending"), item("/user/history", "Payment History", "history"), item("/user/refunds", "Refunds", "refund"), item("/user/reports", "Reports", "report"), item("/user/notifications", "Notifications", "alert"),
  ],
  patient: [
    item("/patient", "Overview", "dashboard"), item("/patient/appointments", "My Appointments", "calendar"), item("/patient/book-appointment", "Book Appointment", "plus"), item("/patient/history", "Appointment History", "history"), item("/patient/records", "Medical Records", "records"), item("/patient/prescriptions", "Prescriptions", "prescription"), item("/patient/billing", "Payments & Billing", "payment"), item("/patient/reviews", "Reviews & Feedback", "star"), item("/patient/notifications", "Notifications", "alert"),
  ],
  doctor: [
    item("/doctor", "Overview", "dashboard"), item("/doctor/today", "Today's Appointments", "calendar"), item("/doctor/appointments", "All Appointments", "calendar"), item("/doctor/patients", "My Patients", "patients"), item("/doctor/records", "Patient Records", "records"), item("/doctor/treatment-plans", "Treatment Plans", "plan"), item("/doctor/prescriptions", "Prescriptions", "prescription"), item("/doctor/history", "Medical History", "history"), item("/doctor/messages", "Messages", "message"), item("/doctor/schedule", "Availability & Schedule", "schedule"), item("/doctor/notifications", "Notifications", "alert"),
  ],
  admin: [
    item("/admin", "Overview", "dashboard"), item("/admin/analytics", "Analytics", "report"), item("/admin/users", "User Management", "users"), item("/admin/patients", "Patient Management", "patients"), item("/admin/doctors", "Doctor Management", "doctors"), item("/admin/staff", "Staff Management", "receptionist"), item("/admin/appointments", "Appointment Management", "calendar"), item("/admin/payments", "Billing & Payments", "payment"), item("/admin/inventory", "Medicine & Inventory", "inventory"), item("/admin/suppliers", "Suppliers", "stock"), item("/admin/reports", "Reports", "report"), item("/admin/feedback", "Feedback & Complaints", "message"), item("/admin/notifications", "Notifications", "alert"), item("/admin/audit", "Audit Logs", "history"),
  ],
  receptionist: [
    item("/receptionist", "Overview", "dashboard"), item("/receptionist/register-patient", "Patient Registration", "register"), item("/receptionist/patients", "Patients", "patients"), item("/receptionist/appointments", "Appointments", "calendar"), item("/receptionist/book-appointment", "Book Appointment", "plus"), item("/receptionist/schedule", "Doctor Schedule", "schedule"), item("/receptionist/queue", "Check-in & Queue", "pending"), item("/receptionist/billing", "Billing", "invoice"), item("/receptionist/payments", "Payments", "payment"), item("/receptionist/notifications", "Notifications", "alert"),
  ],
  pharmacist: [
    item("/pharmacist", "Overview", "dashboard"), item("/pharmacist/prescriptions", "Prescriptions", "prescription"), item("/pharmacist/dispense", "Dispense Medicines", "dispensed"), item("/pharmacist/inventory", "Medicine Inventory", "inventory"), item("/pharmacist/low-stock", "Low Stock", "alert"), item("/pharmacist/suppliers", "Suppliers", "stock"), item("/pharmacist/transactions", "Stock Transactions", "history"), item("/pharmacist/history", "Medicine History", "history"), item("/pharmacist/reports", "Reports", "report"), item("/pharmacist/notifications", "Notifications", "alert"),
  ],
};

export function getRoleBadgeClass(role) {
  return `df-badge df-badge-${role}`;
}
