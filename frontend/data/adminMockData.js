// ==========================================================================
// DentaFlow — Admin Dashboard Mock Data
// --------------------------------------------------------------------------
// UI-only phase. These clean mock datasets model the REAL backend API shapes
// so they can later be swapped for Axios responses without touching the UI.
// ==========================================================================

export const ADMIN_DASHBOARD = {
  kpis: [
    { id: "patients", label: "Total Patients", value: "1,284", trend: "+6.2%", trendUp: true, spark: [40, 55, 48, 62, 70, 66, 78], icon: "patients" },
    { id: "dentists", label: "Dentists", value: "18", trend: "+2", trendUp: true, spark: [8, 10, 12, 11, 14, 16, 18], icon: "doctors" },
    { id: "staff", label: "Staff Members", value: "42", trend: "+4%", trendUp: true, spark: [30, 32, 33, 35, 38, 40, 42], icon: "staff" },
    { id: "appointments", label: "Today's Appointments", value: "27", trend: "12 left", trendUp: false, spark: [0, 0, 0, 0, 0, 0, 0], icon: "calendar" },
    { id: "revenue", label: "Today's Revenue", value: "LKR 248,500", trend: "+12.5%", trendUp: true, spark: [20, 35, 28, 45, 52, 60, 58], icon: "revenue" },
    { id: "lowStock", label: "Low Stock Medicines", value: "5", trend: "reorder", trendUp: false, icon: "alert", alert: true },
    { id: "expiry", label: "Near Expiry Medicines", value: "3", trend: "30 days", trendUp: false, icon: "expiry", alert: true },
    { id: "pending", label: "Pending Requests", value: "14", trend: "action needed", trendUp: false, icon: "pending", alert: true },
  ],
  summary: {
    totalRevenue: "LKR 1,284,500",
    growth: "+18.4%",
  },
};

export const REVENUE_TREND = [
  { label: "Apr", value: 780000 },
  { label: "May", value: 840000 },
  { label: "Jun", value: 795000 },
  { label: "Jul", value: 920000 },
  { label: "Aug", value: 1015000 },
  { label: "Sep", value: 1284500 },
];

export const TODAY_APPOINTMENTS = [
  { id: 1, time: "08:30 AM", patient: "Sarah Mitchell", doctor: "Dr. James Wilson", service: "General Checkup", status: "completed" },
  { id: 2, time: "09:00 AM", patient: "John Doe", doctor: "Dr. Emily Carter", service: "Braces Adjustment", status: "in-progress" },
  { id: 3, time: "09:30 AM", patient: "Maria Santos", doctor: "Dr. Daniel Brown", service: "Teeth Whitening", status: "scheduled" },
  { id: 4, time: "10:00 AM", patient: "David Chen", doctor: "Dr. Sophia Martin", service: "Root Canal", status: "scheduled" },
  { id: 5, time: "11:00 AM", patient: "Amanda Foster", doctor: "Dr. Robert Lee", service: "Gum Treatment", status: "scheduled" },
  { id: 6, time: "11:30 AM", patient: "Rajesh Kumar", doctor: "Dr. Priya Sharma", service: "Pediatric Checkup", status: "cancelled" },
];

export const ADMIN_ALERTS = [
  { id: 1, type: "low-stock", icon: "alert", title: "5 Low Stock Medicines", desc: "Stock below minimum level", time: "Updated 10 min ago", to: "/admin/low-stock" },
  { id: 2, type: "expiry", icon: "expiry", title: "3 Near Expiry Medicines", desc: "Expiring within 30 days", time: "Updated 1 hour ago", to: "/admin/expiry-alerts" },
  { id: 3, type: "expired", icon: "expiry", title: "2 Expired Medicines", desc: "Cannot be dispensed", time: "Updated today", to: "/admin/expiry-alerts" },
  { id: 4, type: "deactivation", icon: "shield", title: "4 Pending Deactivation Requests", desc: "Awaiting admin approval", time: "Updated 2 hours ago", to: "/admin/deactivation-requests" },
  { id: 5, type: "inquiry", icon: "message", title: "6 New Inquiries", desc: "Awaiting initial review", time: "Updated 30 min ago", to: "/admin/inquiries" },
  { id: 6, type: "feedback", icon: "star", title: "2 Negative Feedback Pending Review", desc: "Flagged for admin attention", time: "Updated 45 min ago", to: "/admin/feedback" },
];

export const PENDING_ACTIONS = [
  { id: 1, label: "Deactivation Requests", count: 4, icon: "shield", to: "/admin/deactivation-requests", tone: "danger" },
  { id: 2, label: "Purchase Requests", count: 3, icon: "purchase", to: "/admin/purchase-requests", tone: "primary" },
  { id: 3, label: "New Inquiries", count: 6, icon: "message", to: "/admin/inquiries", tone: "info" },
  { id: 4, label: "Negative Feedback", count: 2, icon: "star", to: "/admin/feedback", tone: "warning" },
];

export const RECENT_ACTIVITY = [
  { id: 1, type: "patient", text: "New patient registered", detail: "Emily Watson created an account via online registration", time: "12 min ago" },
  { id: 2, type: "pharmacy", text: "Medicine dispensed", detail: "Amoxicillin 500mg dispensed for RX-4521", time: "28 min ago" },
  { id: 3, type: "payment", text: "Payment received", detail: "INV-2026-091 settled via card — LKR 42,500", time: "43 min ago" },
  { id: 4, type: "feedback", text: "Feedback submitted", detail: "Maria Santos left 4-star feedback for Dr. Carter", time: "1 hour ago" },
  { id: 5, type: "purchase", text: "Purchase request created", detail: "Paracetamol 500mg — request from Pharmacist", time: "2 hours ago" },
  { id: 6, type: "user", text: "User created", detail: "Dr. Omar Hassan was added to the doctors list", time: "3 hours ago" },
  { id: 7, type: "deactivation", text: "Deactivation request submitted", detail: "Lisa Thompson requested account deactivation", time: "5 hours ago" },
];

export const AUTOMATION_STATUS = [
  { id: 1, name: "Weekly Schedule Generation", type: "Weekly · Every Sunday", lastRun: "Sun, Sep 13 — 12:00 AM", nextRun: "Sun, Sep 20 — 12:00 AM", status: "active" },
  { id: 2, name: "Inventory Low Stock Alert", type: "Daily · 7:00 AM", lastRun: "Today — 7:00 AM", nextRun: "Tomorrow — 7:00 AM", status: "active" },
  { id: 3, name: "Feedback Auto Response", type: "Event-based", lastRun: "Today — 9:14 AM", nextRun: "On next feedback", status: "active" },
  { id: 4, name: "Inquiry Acknowledgement", type: "Event-based", lastRun: "Today — 8:52 AM", nextRun: "On next inquiry", status: "active" },
  { id: 5, name: "Appointment Reminder Notifications", type: "Daily · 6:00 PM", lastRun: "Yesterday — 6:00 PM", nextRun: "Today — 6:00 PM", status: "active" },
];

export const MEDICINES = [
  { id: 1, name: "Amoxicillin 500mg", category: "Antibiotic", stock: 450, minStock: 100, unit: "capsules", supplier: "Ceylon Distributors", price: 35, status: "in-stock" },
  { id: 2, name: "Ibuprofen 400mg", category: "Analgesic", stock: 320, minStock: 100, unit: "tablets", supplier: "MediLink Pharma", price: 12, status: "in-stock" },
  { id: 3, name: "Chlorhexidine Mouthwash", category: "Oral Care", stock: 45, minStock: 50, unit: "bottles", supplier: "Ceylon Distributors", price: 650, status: "low-stock" },
  { id: 4, name: "Lidocaine 2%", category: "Anesthetic", stock: 80, minStock: 30, unit: "vials", supplier: "Sinha Medical", price: 180, status: "in-stock" },
  { id: 5, name: "Paracetamol 500mg", category: "Analgesic", stock: 15, minStock: 200, unit: "tablets", supplier: "MediLink Pharma", price: 8, status: "low-stock" },
  { id: 6, name: "Metronidazole 400mg", category: "Antibiotic", stock: 26, minStock: 80, unit: "tablets", supplier: "Sinha Medical", price: 22, status: "low-stock" },
  { id: 7, name: "Gloves (Latex)", category: "Medical Supplies", stock: 34, minStock: 60, unit: "boxes", supplier: "Ceylon Distributors", price: 1200, status: "low-stock" },
  { id: 8, name: "Orasept Mouthwash", category: "Oral Care", stock: 9, minStock: 40, unit: "bottles", supplier: "MediLink Pharma", price: 480, status: "low-stock" },
  { id: 9, name: "Cephalexin 250mg", category: "Antibiotic", stock: 210, minStock: 80, unit: "capsules", supplier: "Sinha Medical", price: 28, status: "in-stock" },
  { id: 10, name: "Mefenamic Acid 250mg", category: "Analgesic", stock: 140, minStock: 60, unit: "tablets", supplier: "MediLink Pharma", price: 15, status: "in-stock" },
];

export const LOW_STOCK_MEDICINES = MEDICINES.filter((m) => m.status === "low-stock").map((m, i) => {
  const requests = [
    { medicine: "Chlorhexidine Mouthwash", requestedQty: 120, purchaseStatus: "PENDING", key: "REQ-2026-108" },
    { medicine: "Paracetamol 500mg", requestedQty: 1000, purchaseStatus: "APPROVED", key: "REQ-2026-109" },
    { medicine: "Metronidazole 400mg", requestedQty: 400, purchaseStatus: "PENDING", key: "REQ-2026-110" },
    { medicine: "Gloves (Latex)", requestedQty: 120, purchaseStatus: "ORDERED", key: "REQ-2026-107" },
    { medicine: "Orasept Mouthwash", requestedQty: 90, purchaseStatus: "—", key: "—" },
  ];
  return {
    id: m.id,
    medicine: m.name,
    currentStock: m.stock,
    minStock: m.minStock,
    status: m.status,
    requestedQty: requests[i]?.requestedQty || "—",
    purchaseStatus: requests[i]?.purchaseStatus || "—",
    requestRef: requests[i]?.key || "—",
  };
});

export const EXPIRY_ALERTS = [
  { id: 1, medicine: "Amoxicillin 500mg", batch: "AMX-24-118", expiryDate: "2026-10-04", remainingQty: 450, status: "near-expiry" },
  { id: 2, medicine: "Lidocaine 2%", batch: "LID-24-031", expiryDate: "2026-10-18", remainingQty: 80, status: "near-expiry" },
  { id: 3, medicine: "Mefenamic Acid 250mg", batch: "MEF-23-207", expiryDate: "2026-10-27", remainingQty: 140, status: "near-expiry" },
  { id: 4, medicine: "Paracetamol 500mg", batch: "PRC-23-551", expiryDate: "2026-09-05", remainingQty: 60, status: "expired" },
  { id: 5, medicine: "Orasept Mouthwash", batch: "ORA-23-087", expiryDate: "2026-09-11", remainingQty: 12, status: "expired" },
];

export const PURCHASE_REQUESTS = [
  { id: "REQ-2026-108", medicine: "Chlorhexidine Mouthwash", currentStock: 45, requestedQty: 120, reason: "Stock below minimum reorder level", priority: "high", notes: "High clinic demand from hygiene protocol.", requestedBy: "Lisa Thompson", requestedByRole: "Pharmacist", date: "2026-09-18", status: "PENDING" },
  { id: "REQ-2026-109", medicine: "Paracetamol 500mg", currentStock: 15, requestedQty: 1000, reason: "Running at 8% of minimum stock", priority: "urgent", notes: "Re-stock to standard supply level.", requestedBy: "Lisa Thompson", requestedByRole: "Pharmacist", date: "2026-09-18", status: "PENDING" },
  { id: "REQ-2026-110", medicine: "Metronidazole 400mg", currentStock: 26, requestedQty: 400, reason: "Below reorder threshold", priority: "medium", notes: "", requestedBy: "Lisa Thompson", requestedByRole: "Pharmacist", date: "2026-09-17", status: "PENDING" },
  { id: "REQ-2026-107", medicine: "Gloves (Latex)", currentStock: 34, requestedQty: 120, reason: "Critical supply running low", priority: "urgent", notes: "Needed for upcoming surgical week.", requestedBy: "Lisa Thompson", requestedByRole: "Pharmacist", date: "2026-09-16", status: "APPROVED" },
  { id: "REQ-2026-106", medicine: "Orasept Mouthwash", currentStock: 9, requestedQty: 90, reason: "Stock below minimum", priority: "medium", notes: "", requestedBy: "Lisa Thompson", requestedByRole: "Pharmacist", date: "2026-09-15", status: "REJECTED" },
  { id: "REQ-2026-103", medicine: "Cephalexin 250mg", currentStock: 120, requestedQty: 300, reason: "Seasonal precautionary buffer", priority: "low", notes: "", requestedBy: "Lisa Thompson", requestedByRole: "Pharmacist", date: "2026-09-10", status: "ORDERED" },
  { id: "REQ-2026-101", medicine: "Ibuprofen 400mg", currentStock: 320, requestedQty: 500, reason: "Quarterly replenishment", priority: "low", notes: "", requestedBy: "Lisa Thompson", requestedByRole: "Pharmacist", date: "2026-09-02", status: "RECEIVED" },
  { id: "REQ-2026-094", medicine: "Lidocaine 2%", currentStock: 80, requestedQty: 60, reason: "Surgical consumption buffer", priority: "medium", notes: "", requestedBy: "Lisa Thompson", requestedByRole: "Pharmacist", date: "2026-08-20", status: "CANCELLED" },
];

export const PURCHASE_ORDERS = [
  { id: "PO-2026-041", supplier: "MediLink Pharma", items: "Paracetamol 500mg × 1,000", total: 120000, orderDate: "2026-09-19", expectedDate: "2026-09-24", status: "ORDERED" },
  { id: "PO-2026-040", supplier: "Ceylon Distributors", items: "Gloves (Latex) × 120", total: 144000, orderDate: "2026-09-18", expectedDate: "2026-09-22", status: "ORDERED" },
  { id: "PO-2026-039", supplier: "Ceylon Distributors", items: "Chlorhexidine Mouthwash × 120", total: 78000, orderDate: "2026-09-15", expectedDate: "2026-09-20", status: "ORDERED" },
  { id: "PO-2026-035", supplier: "Sinha Medical", items: "Cephalexin 250mg × 300", total: 84000, orderDate: "2026-09-08", expectedDate: "2026-09-12", status: "RECEIVED" },
  { id: "PO-2026-030", supplier: "MediLink Pharma", items: "Ibuprofen 400mg × 500", total: 60000, orderDate: "2026-08-28", expectedDate: "2026-09-02", status: "RECEIVED" },
];

export const SUPPLIERS = [
  { id: 1, name: "Ceylon Distributors", category: "Pharmaceutical & Medical Supplies", email: "orders@ceylon-distributors.com", phone: "+94 11 234 5678", status: "active" },
  { id: 2, name: "MediLink Pharma", category: "Pharmaceuticals", email: "sales@medilinkpharma.lk", phone: "+94 11 876 5432", status: "active" },
  { id: 3, name: "Sinha Medical", category: "Anesthetics & Surgical Consumables", email: "info@sinhamedical.lk", phone: "+94 77 445 6677", status: "active" },
];

export const FEEDBACK = [
  { id: 1, patient: "Amanda Foster", date: "2026-09-19", sentiment: "positive", text: "DentaFlow made my dental experience comfortable and stress-free. The staff is incredibly professional.", rating: 5, doctor: "Dr. James Wilson", autoResponse: "Thank you for your positive feedback. We're happy to know that you had a good experience with DentaFlow.", responseStatus: "sent", responseTime: "Immediately", adminResponse: null, status: "auto-responded" },
  { id: 2, patient: "Rajesh Kumar", date: "2026-09-18", sentiment: "positive", text: "Best dental clinic I've visited. Modern equipment and caring dentists. Highly recommended!", rating: 5, doctor: "Dr. Emily Carter", autoResponse: "Thank you for your positive feedback. We're happy to know that you had a good experience with DentaFlow.", responseStatus: "sent", responseTime: "Immediately", adminResponse: "Thank you for your kind words, Rajesh!", responseTimeAdmin: "2026-09-18", status: "reviewed" },
  { id: 3, patient: "Maria Santos", date: "2026-09-18", sentiment: "neutral", text: "Easy online booking and excellent treatment. Waiting time was a bit long.", rating: 3, doctor: "Dr. Emily Carter", autoResponse: null, responseStatus: "none", responseTime: null, adminResponse: null, status: "pending-review" },
  { id: 4, patient: "David Chen", date: "2026-09-17", sentiment: "negative", text: "I waited over 40 minutes past my slot. The billing desk rejected my insurance claim and I had to pay twice.", rating: 2, doctor: "Dr. Sophia Martin", autoResponse: "We're sorry that your experience did not meet your expectations. Your feedback is important to us.", responseStatus: "sent", responseTime: "Auto — immediate", adminResponse: null, status: "flagged-review", serious: true },
  { id: 5, patient: "Emily Watson", date: "2026-09-17", sentiment: "negative", text: "The front desk was rude when I asked about rescheduling.", rating: 2, doctor: "General", autoResponse: "We're sorry that your experience did not meet your expectations. Your feedback is important to us.", responseStatus: "sent", responseTime: "Auto — immediate", adminResponse: null, status: "pending-review" },
  { id: 6, patient: "Nimal Perera", date: "2026-09-15", sentiment: "positive", text: "Very smooth root canal, the doctor explained everything clearly.", rating: 5, doctor: "Dr. Sophia Martin", autoResponse: "Thank you for your positive feedback. We're happy to know that you had a good experience with DentaFlow.", responseStatus: "sent", responseTime: "Immediately", adminResponse: null, status: "auto-responded" },
];

export const INQUIRIES = [
  { id: 1, user: "Kavindi Silva", category: "Billing", question: "Do you accept corporate health insurance for dental implants?", date: "2026-09-19", status: "pending", autoAck: true, ackTime: "Immediate", adminResponse: null },
  { id: 2, user: "Ravi Fernando", category: "Appointments", question: "Can I reschedule my Saturday appointment without a fee?", date: "2026-09-19", status: "pending", autoAck: true, ackTime: "Immediate", adminResponse: null },
  { id: 3, user: "Tharindu Weerasinghe", category: "Services", question: "What is the recovery time after wisdom tooth removal?", date: "2026-09-18", status: "responded", autoAck: true, ackTime: "Immediate", adminResponse: "Typically 3–5 days of mild swelling; we'll schedule a review visit." },
  { id: 4, user: "Nadia Hussain", category: "Feedback", question: "Where can I submit feedback about my recent visit?", date: "2026-09-17", status: "closed", autoAck: true, ackTime: "Immediate", adminResponse: "You can use the Reviews & Feedback section in your patient portal." },
  { id: 5, user: "Harsha Abeykoon", category: "Pharmacy", question: "Are medicines available for collection on the same day?", date: "2026-09-16", status: "reopened", autoAck: true, ackTime: "Immediate", adminResponse: "Yes, standard prescriptions are prepared within 2 hours." },
];

export const NOTIFICATIONS = [
  { id: 1, category: "Low Stock", title: "Low stock alert", message: "Orasept Mouthwash is below minimum level.", time: "10 min ago", read: false },
  { id: 2, category: "Purchase Requests", title: "New purchase request", message: "REQ-2026-109 for Paracetamol 500mg pending approval.", time: "38 min ago", read: false },
  { id: 3, category: "Inquiries", title: "New inquiry received", message: "Kavindi Silva asked about insurance coverage.", time: "52 min ago", read: false },
  { id: 4, category: "Deactivation Requests", title: "Deactivation request", message: "Lisa Thompson requested account deactivation.", time: "1 hour ago", read: false },
  { id: 5, category: "Feedback", title: "Negative feedback flagged", message: "Serious feedback from David Chen requires review.", time: "2 hours ago", read: false },
  { id: 6, category: "Expiry", title: "Medicine expired", message: "Paracetamol 500mg batch PRC-23-551 has expired.", time: "Today, 7:00 AM", read: true },
  { id: 7, category: "Schedule Automation", title: "Weekly schedule generated", message: "Next week's doctor schedule was generated automatically.", time: "Yesterday", read: true },
  { id: 8, category: "System", title: "Backup completed", message: "Nightly database backup completed successfully.", time: "Yesterday, 3:00 AM", read: true },
];

export const AUDIT_LOGS = [
  { id: 1, date: "2026-09-19 09:02", user: "Admin", action: "Approved purchase request", module: "Pharmacy", description: "Approved REQ-2026-109 for Paracetamol 500mg", status: "success" },
  { id: 2, date: "2026-09-19 08:44", user: "System", action: "Feedback auto-response sent", module: "AI", description: "Auto-acknowledged positive feedback from Amanda Foster", status: "success" },
  { id: 3, date: "2026-09-18 17:32", user: "Admin", action: "User role changed", module: "User Management", description: "Changed role of Dilan Perera to Receptionist", status: "success" },
  { id: 4, date: "2026-09-18 15:10", user: "Admin", action: "Created Doctor", module: "User Management", description: "Created profile for Dr. Omar Hassan", status: "success" },
  { id: 5, date: "2026-09-18 11:22", user: "Admin", action: "Approved deactivation", module: "Accounts", description: "Approved deactivation request of James Carter", status: "success" },
  { id: 6, date: "2026-09-18 09:05", user: "Pharmacist", action: "Medicine updated", module: "Pharmacy", description: "Updated stock for Lidocaine 2%", status: "success" },
  { id: 7, date: "2026-09-17 16:40", user: "Admin", action: "Report generated", module: "Reports", description: "Generated August revenue report", status: "success" },
  { id: 8, date: "2026-09-17 14:12", user: "Admin", action: "Feedback reviewed", module: "AI", description: "Reviewed and responded to Rajesh Kumar feedback", status: "success" },
  { id: 9, date: "2026-09-17 10:48", user: "Admin", action: "Inquiry closed", module: "Inquiries", description: "Final response sent and inquiry closed for Nadia Hussain", status: "success" },
];

export const AI_REPORTS = {
  sections: [
    { id: "patient", label: "Patient Analysis" },
    { id: "revenue", label: "Revenue Analysis" },
    { id: "inventory", label: "Inventory Analysis" },
    { id: "staff", label: "Staff Analysis" },
    { id: "treatment", label: "Treatment Analysis" },
    { id: "prescription", label: "Prescription Analysis" },
    { id: "feedback", label: "Feedback Analysis" },
  ],
  insights: [
    { id: 1, title: "Patient growth accelerating", detail: "New patient registrations grew 22% in September driven primarily by orthodontics sign-ups.", tag: "patients" },
    { id: 2, title: "Revenue concentration risk", detail: "Orthodontics + Implants now represent 47% of revenue — consider diversifying service mix.", tag: "revenue" },
    { id: 3, title: "Amoxicillin high turnover", detail: "Amoxicillin 500mg has the fastest consumption rate; recommend raising reorder level.", tag: "inventory" },
    { id: 4, title: "Negative sentiment trend", detail: "Wait-time complaints increased 2× this month; correlated with afternoon appointment load.", tag: "feedback" },
  ],
};