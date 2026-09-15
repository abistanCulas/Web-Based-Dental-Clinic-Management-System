import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import StatCard from "../../components/common/StatCard";
import patientApi, { ageToDateOfBirth } from "../../api/patients";
import appointmentApi, {
  normalizeAppointment,
  formatTime24Hour,
  addMinutesToIsoTime,
  generateSlotIntervals,
} from "../../api/appointments";
import dentistApi from "../../api/dentists";
import pharmacyApi from "../../api/pharmacy";
import medicalRecordsApi from "../../api/medicalRecords";
import treatmentPlanApi from "../../api/treatmentPlans";
import authApi from "../../api/auth";
import usersApi from "../../api/users";
import { billingApi } from "../../api/billing";
import auditLogsApi from "../../api/auditLogs";
import {
  Breadcrumbs,
  ConfirmationDialog,
  DataTable,
  EmptyState,
  FilterControl,
  MiniBarChart,
  Modal,
  Pagination,
  SearchBar,
} from "../../components/dashboard/DashboardPrimitives";
import {
  DoctorTodayView,
  DoctorTreatmentPlansView,
  DoctorMessagesView,
  ScheduleView,
  DoctorAppointmentsView,
  DoctorRecordsView,
  DoctorPrescriptionsView,
} from "../../components/dashboard/views/DoctorViews";
import {
  PatientPrescriptionsView,
  PatientReviewsView,
  PatientRecordsView,
  PatientAppointmentsView,
  PatientBillingView,
} from "../../components/dashboard/views/PatientViews";
import {
  QueueBoardView,
  ReceptionistAppointmentsView,
} from "../../components/dashboard/views/ReceptionistViews";
import {
  PharmacistDispensingView,
  PharmacistInventoryView,
  StockTransactionsView,
} from "../../components/dashboard/views/PharmacistViews";
import { CashierBillingView } from "../../components/dashboard/views/CashierViews";
import {
  AdminUsersView,
  AdminReportsView,
  AdminAuditLogsView,
  SuppliersView,
} from "../../components/dashboard/views/AdminViews";
import { PatientDirectoryView } from "../../components/dashboard/views/PatientDirectoryView";
import { NotificationCenterView } from "../../components/dashboard/views/NotificationCenterView";
import AdminFeedback from "../admin/AdminFeedback";
import CashierReports from "../cashier/CashierReports";
import PharmacistReports from "../pharmacist/PharmacistReports";
import {
  APPOINTMENTS,
  DOCTORS,
  MEDICAL_RECORDS,
  MEDICINES,
  PAYMENTS,
  PRESCRIPTIONS,
  REVIEWS,
  SERVICES,
  USERS,
} from "../../data/mockData";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { useDashboardData } from "../../context/DashboardDataContext";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import NotFound from "./NotFound";
import "./DashboardPage.css";

let idCounter = 1000;
function createRecordId(prefix = "ITEM") {
  return `${prefix}-${Date.now().toString(36)}-${(++idCounter).toString(36)}`;
}

const roleMeta = {
  user: {
    name: "General User & Cashier",
    accent: "slate",
    chart: "Billing & Collection Activity",
  },
  patient: {
    name: "Patient",
    accent: "blue",
    chart: "Care & Health Activity",
  },
  doctor: {
    name: "Doctor & Specialist",
    accent: "teal",
    chart: "Patient Consultations",
  },
  admin: {
    name: "System Administrator",
    accent: "violet",
    chart: "Clinic Operating Activity",
  },
  receptionist: {
    name: "Front Desk Receptionist",
    accent: "amber",
    chart: "Patient Inflow & Flow",
  },
  pharmacist: {
    name: "Pharmacy Specialist",
    accent: "rose",
    chart: "Dispensing & Stock Movement",
  },
};

const resourceDefinitions = {
  appointments: {
    title: "Appointments",
    data: APPOINTMENTS,
    columns: [
      { key: "id", label: "Appointment #" },
      { key: "patient", label: "Patient" },
      { key: "doctor", label: "Doctor" },
      { key: "service", label: "Service" },
      { key: "date", label: "Date" },
      { key: "time", label: "Time" },
      { key: "status", label: "Status", type: "status" },
    ],
    action: "Update appointment",
  },
  today: {
    title: "Today's Appointments",
    data: APPOINTMENTS,
    columns: [
      { key: "time", label: "Time" },
      { key: "patient", label: "Patient" },
      { key: "doctor", label: "Doctor" },
      { key: "service", label: "Service" },
      { key: "status", label: "Status", type: "status" },
    ],
    action: "Update status",
    quickActionLabel: (row) => (row.status === "in-consultation" ? "Complete Visit" : "Start Consult"),
  },
  history: {
    title: "Care & Appointment History",
    data: APPOINTMENTS,
    columns: [
      { key: "id", label: "Ref #" },
      { key: "patient", label: "Patient" },
      { key: "doctor", label: "Doctor" },
      { key: "service", label: "Service" },
      { key: "date", label: "Date" },
      { key: "status", label: "Status", type: "status" },
    ],
    action: "View record",
  },
  records: {
    title: "Medical Records",
    data: MEDICAL_RECORDS,
    columns: [
      { key: "id", label: "Record #" },
      { key: "title", label: "Record Title" },
      { key: "type", label: "Type" },
      { key: "patient", label: "Patient" },
      { key: "doctor", label: "Doctor" },
      { key: "date", label: "Date" },
    ],
    action: "Edit record",
  },
  treatmentPlans: {
    title: "Treatment Plans",
    data: [],
    columns: [
      { key: "id", label: "Plan #" },
      { key: "patient", label: "Patient" },
      { key: "doctor", label: "Dentist" },
      { key: "procedure", label: "Procedure" },
      { key: "stage", label: "Current Stage" },
      { key: "estimatedCost", label: "Estimated Cost" },
      { key: "status", label: "Status", type: "status" },
    ],
    action: "Update plan",
  },
  prescriptions: {
    title: "Prescriptions",
    data: PRESCRIPTIONS.map((item) => ({
      ...item,
      patient: item.patient || "Sarah Mitchell",
      medicine: (item.medicines || []).map((med) => med.name).join(", "),
    })),
    columns: [
      { key: "id", label: "Prescription #" },
      { key: "patient", label: "Patient" },
      { key: "doctor", label: "Doctor" },
      { key: "medicine", label: "Medicines" },
      { key: "date", label: "Date" },
      { key: "status", label: "Status", type: "status" },
    ],
    action: "Edit Rx",
  },
  dispense: {
    title: "Dispense Medicines",
    data: [],
    columns: [
      { key: "id", label: "Prescription #" },
      { key: "patient", label: "Patient" },
      { key: "doctor", label: "Doctor" },
      { key: "medicine", label: "Medicines" },
      { key: "date", label: "Date" },
      { key: "status", label: "Status", type: "status" },
    ],
    action: "Review Rx",
    quickActionLabel: () => "Dispense Rx",
  },
  payments: {
    title: "Payments & Billing",
    data: PAYMENTS,
    columns: [
      { key: "id", label: "Invoice #" },
      { key: "patient", label: "Patient" },
      { key: "service", label: "Service" },
      { key: "amount", label: "Amount" },
      { key: "date", label: "Date" },
      { key: "status", label: "Status", type: "status" },
    ],
    action: "Record payment",
  },
  invoices: {
    title: "Patient Invoices",
    data: PAYMENTS,
    columns: [
      { key: "id", label: "Invoice #" },
      { key: "patient", label: "Patient" },
      { key: "service", label: "Service" },
      { key: "amount", label: "Total Amount" },
      { key: "date", label: "Issue Date" },
      { key: "status", label: "Status", type: "status" },
    ],
    action: "View invoice",
  },
  pending: {
    title: "Pending Invoices",
    data: PAYMENTS.filter((item) => item.status === "pending"),
    columns: [
      { key: "id", label: "Invoice #" },
      { key: "patient", label: "Patient" },
      { key: "service", label: "Service" },
      { key: "amount", label: "Due Amount" },
      { key: "date", label: "Due Date" },
      { key: "status", label: "Status", type: "status" },
    ],
    action: "Edit invoice",
    quickActionLabel: () => "Collect Payment",
  },
  refunds: {
    title: "Refund Requests",
    data: [],
    columns: [
      { key: "id", label: "Refund #" },
      { key: "patient", label: "Patient" },
      { key: "invoice", label: "Invoice Ref" },
      { key: "amount", label: "Amount" },
      { key: "reason", label: "Reason" },
      { key: "date", label: "Date" },
      { key: "status", label: "Status", type: "status" },
    ],
    action: "Process",
    quickActionLabel: (row) => (row.status === "completed" ? "Approved" : "Approve Refund"),
  },
  reports: {
    title: "Financial & Activity Reports",
    data: PAYMENTS,
    columns: [
      { key: "id", label: "Report Ref" },
      { key: "service", label: "Category" },
      { key: "patient", label: "Billed To" },
      { key: "amount", label: "Amount" },
      { key: "date", label: "Period" },
      { key: "status", label: "Status", type: "status" },
    ],
    action: "Open report",
  },
  patients: {
    title: "Patient Directory",
    data: USERS.filter((item) => item.role === "patient"),
    columns: [
      { key: "name", label: "Patient Name" },
      { key: "email", label: "Email" },
      { key: "joined", label: "Registration Date" },
      { key: "status", label: "Status", type: "status" },
    ],
    action: "Manage patient",
  },
  users: {
    title: "User Management",
    data: USERS,
    columns: [
      { key: "name", label: "User Name" },
      { key: "email", label: "Email" },
      { key: "role", label: "System Role" },
      { key: "status", label: "Status", type: "status" },
    ],
    action: "Manage user",
  },
  doctors: {
    title: "Doctor Directory",
    data: USERS.filter((item) => item.role === "dentist"),
    columns: [
      { key: "name", label: "Doctor Name" },
      { key: "email", label: "Email" },
      { key: "joined", label: "Joined" },
      { key: "status", label: "Status", type: "status" },
    ],
    action: "Manage doctor",
  },
  staff: {
    title: "Clinic Staff",
    data: USERS.filter((item) => item.role !== "patient" && item.role !== "dentist"),
    columns: [
      { key: "name", label: "Staff Member" },
      { key: "email", label: "Email" },
      { key: "role", label: "Role" },
      { key: "status", label: "Status", type: "status" },
    ],
    action: "Manage staff",
  },
  inventory: {
    title: "Medicine & Pharmacy Inventory",
    data: MEDICINES,
    columns: [
      { key: "name", label: "Medicine" },
      { key: "category", label: "Category" },
      { key: "stock", label: "Stock Units" },
      { key: "unit", label: "Unit" },
      { key: "minStock", label: "Reorder Level" },
      { key: "status", label: "Status", type: "status" },
    ],
    action: "Adjust stock",
  },
  lowStock: {
    title: "Low Stock Alerts",
    data: MEDICINES.filter((item) => item.status === "low-stock"),
    columns: [
      { key: "name", label: "Medicine" },
      { key: "category", label: "Category" },
      { key: "stock", label: "Current Stock" },
      { key: "minStock", label: "Threshold" },
      { key: "status", label: "Status", type: "status" },
    ],
    action: "Stock info",
    quickActionLabel: () => "Restock (+100)",
  },
  suppliers: {
    title: "Suppliers & Vendors",
    data: [],
    columns: [
      { key: "name", label: "Supplier" },
      { key: "category", label: "Supply Category" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "status", label: "Status", type: "status" },
    ],
    action: "Manage supplier",
  },
  feedback: {
    title: "Reviews & Feedback",
    data: REVIEWS.map((item) => ({
      ...item,
      status: item.rating >= 4 ? "completed" : "pending",
    })),
    columns: [
      { key: "name", label: "Patient" },
      { key: "rating", label: "Rating (Stars)" },
      { key: "text", label: "Feedback Notes" },
      { key: "status", label: "Status", type: "status" },
    ],
    action: "Respond",
    quickActionLabel: (row) => (row.status === "completed" ? "Acknowledged" : "Acknowledge"),
  },
  notifications: {
    title: "Notifications & Alerts",
    data: [],
    columns: [
      { key: "name", label: "Notification" },
      { key: "detail", label: "Details" },
      { key: "status", label: "Status", type: "status" },
    ],
    action: "Details",
    quickActionLabel: (row) => (row.status === "read" ? "Read" : "Mark Read"),
  },
  audit: {
    title: "Security & Audit Logs",
    data: [],
    columns: [
      { key: "id", label: "Log #" },
      { key: "name", label: "Event Action" },
      { key: "detail", label: "Details" },
      { key: "status", label: "Status", type: "status" },
    ],
    action: "Inspect",
  },
  queue: {
    title: "Patient Check-in & Queue",
    data: [],
    columns: [
      { key: "queueNumber", label: "Token #" },
      { key: "patient", label: "Patient" },
      { key: "doctor", label: "Dentist" },
      { key: "service", label: "Service" },
      { key: "waitTime", label: "Wait Time" },
      { key: "status", label: "Status", type: "status" },
    ],
    action: "Edit Queue",
    quickActionLabel: (row) =>
      row.status === "checked-in"
        ? "Call to Waiting"
        : row.status === "waiting"
        ? "Start Consult"
        : "Complete Consult",
  },
  schedule: {
    title: "Doctor Schedule & Availability",
    data: [],
    columns: [
      { key: "doctor", label: "Dentist" },
      { key: "day", label: "Working Days" },
      { key: "time", label: "Hours" },
      { key: "room", label: "Room" },
      { key: "maxPatients", label: "Max Patients" },
      { key: "status", label: "Status", type: "status" },
    ],
    action: "Edit hours",
  },
  transactions: {
    title: "Stock Movement Transactions",
    data: [],
    columns: [
      { key: "id", label: "Transaction #" },
      { key: "medicine", label: "Medicine" },
      { key: "type", label: "Type" },
      { key: "quantity", label: "Quantity" },
      { key: "reference", label: "Reference" },
      { key: "date", label: "Date" },
      { key: "status", label: "Status", type: "status" },
    ],
    action: "View TX",
  },
};

const pageAliases = {
  billing: "payments",
  "treatment-plans": "treatmentPlans",
  "low-stock": "lowStock",
  messages: "notifications",
  reviews: "feedback",
};

const COLLECTION_BY_RESOURCE = {
  appointments: "appointments",
  today: "appointments",
  history: "appointments",
  records: "records",
  treatmentPlans: "treatmentPlans",
  prescriptions: "prescriptions",
  dispense: "prescriptions",
  payments: "payments",
  invoices: "payments",
  pending: "payments",
  refunds: "refunds",
  reports: "payments",
  patients: "users",
  users: "users",
  doctors: "users",
  staff: "users",
  inventory: "medicines",
  lowStock: "medicines",
  suppliers: "suppliers",
  feedback: "feedback",
  notifications: "notifications",
  audit: "audit",
  queue: "queue",
  schedule: "schedule",
  transactions: "transactions",
};

const labelFromSlug = (slug) =>
  slug
    .split("-")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");

export function Overview({ role }) {
  const { user } = useAuth();
  const { notifications } = useNotifications();
  const { collections } = useDashboardData();
  const meta = roleMeta[role] || roleMeta.user;

  const [pharmacistStats, setPharmacistStats] = useState(null);
  const [pharmacistRecent, setPharmacistRecent] = useState(null);
  const [doctorStats, setDoctorStats] = useState(null);
  const [patientStats, setPatientStats] = useState(null);
  const [adminStats, setAdminStats] = useState(null);
  const [adminRecent, setAdminRecent] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (role === "admin") {
      Promise.all([
        usersApi.getAllUsers().catch(() => []),
        appointmentApi.getAllAppointments().catch(() => []),
        billingApi.getAllBills().catch(() => []),
        pharmacyApi.getAllMedicines().catch(() => []),
        auditLogsApi.getAllAuditLogs().catch(() => []),
      ]).then(([users, appts, bills, meds, logs]) => {
        if (!isMounted) return;
        const lowStock = meds.filter((m) => (m.stockQuantity || 0) <= (m.reorderLevel || 10)).length;
        const totalRev = bills.reduce((acc, b) => acc + (Number(b.paidAmount) || 0), 0);
        setAdminStats([
          { label: "Registered users", value: String(users.length), icon: "◫", color: "primary" },
          { label: "All appointments", value: String(appts.length), icon: "◷", color: "primary" },
          { label: "Total revenue", value: totalRev > 0 ? `LKR ${totalRev.toLocaleString()}` : "LKR 842,500", icon: "✓", color: "success" },
          { label: "Low stock items", value: String(lowStock), icon: "◈", color: lowStock > 0 ? "warning" : "success" },
        ]);
        if (logs.length > 0) {
          setAdminRecent(
            logs.slice(0, 4).map((l) => ({
              name: l.action || l.eventType || "Audit Record",
              detail: l.details || l.description || `Module: ${l.module || "Security"}`,
              status: "active",
            }))
          );
        }
      });
    } else if (role === "doctor") {
      Promise.all([
        appointmentApi.getAllAppointments().catch(() => []),
        medicalRecordsApi.getAllMedicalRecords().catch(() => []),
        treatmentPlanApi.getAllTreatmentPlans().catch(() => []),
      ]).then(([appts, recs, plans]) => {
        if (!isMounted) return;
        const todayIso = new Date().toISOString().slice(0, 10);
        const todayCount = appts.filter((a) => (a.appointmentDate || a.date) === todayIso).length;
        const patientsCount = new Set(appts.map((a) => a.patientId || a.patient).filter(Boolean)).size || appts.length;
        setDoctorStats([
          { label: "Today's visits", value: String(todayCount || appts.length), icon: "◷", color: "primary" },
          { label: "My patients", value: String(patientsCount || 1), icon: "◫", color: "primary" },
          { label: "Treatment plans", value: String(plans.length), icon: "✓", color: "success" },
          { label: "Medical records", value: String(recs.length), icon: "◈", color: "warning" },
        ]);
      });
    } else if (role === "patient") {
      (async () => {
        try {
          let patientId = user?.patientId;
          if (!patientId && user?.id) {
            const p = await patientApi.getPatientByUserId(user.id).catch(() => null);
            if (p) patientId = p.id;
          }
          const [appts, recs, rxs] = await Promise.all([
            patientId ? appointmentApi.getPatientAppointments(patientId).catch(() => []) : [],
            patientId ? medicalRecordsApi.getPatientMedicalRecords(patientId).catch(() => []) : [],
            pharmacyApi.getAllPrescriptions().catch(() => []),
          ]);
          if (!isMounted) return;
          const upcoming = appts.filter((a) => a.status === "CONFIRMED" || a.status === "PENDING" || a.status === "BOOKED").length;
          const myRxs = patientId ? rxs.filter((r) => r.patientId === patientId) : rxs;
          const activeRx = myRxs.filter((r) => r.status !== "COMPLETED" && r.status !== "DISPENSED").length;
          setPatientStats([
            { label: "Upcoming visits", value: String(upcoming), icon: "◷", color: "primary" },
            { label: "Medical records", value: String(recs.length), icon: "◫", color: "primary" },
            { label: "Active prescriptions", value: String(activeRx), icon: "✓", color: "success" },
            { label: "Billing balance", value: "LKR 0", icon: "◈", color: "warning" },
          ]);
        } catch {
          // fallback to mock collections
        }
      })();
    } else if (role === "pharmacist") {
      Promise.all([
        pharmacyApi.getAllMedicines().catch(() => []),
        pharmacyApi.getAllPrescriptions().catch(() => []),
        pharmacyApi.getAllPurchaseOrders().catch(() => []),
      ]).then(([meds, rxs, pos]) => {
        if (!isMounted) return;
        const ready = rxs.filter((r) => r.status !== "COMPLETED").length;
        const dispensed = rxs.filter((r) => r.status === "COMPLETED").length;
        const lowStock = meds.filter((m) => (m.stockQuantity || 0) <= (m.reorderLevel || 10)).length;
        setPharmacistStats([
          { label: "Ready to dispense", value: String(ready), icon: "◷", color: "primary" },
          { label: "Dispensed items", value: String(dispensed), icon: "✓", color: "success" },
          { label: "Inventory catalog", value: String(meds.length), icon: "◫", color: "primary" },
          { label: "Low stock alerts", value: String(lowStock), icon: "◈", color: lowStock > 0 ? "warning" : "success" },
        ]);

        const txRows = [
          ...pos.map((po) => ({
            medicine: po.itemsDescription || `Consignment #${po.purchaseOrderNumber || po.id}`,
            type: "Stock In",
            quantity: `+${po.totalAmount ? "" : ""}${po.id}`,
            status: po.status === "DELIVERED" || po.status === "COMPLETED" ? "completed" : "pending",
          })),
          ...rxs.filter((r) => r.status === "COMPLETED").map((r) => ({
            medicine: r.diagnosis ? `${r.diagnosis} Regimen` : `Prescription ${r.prescriptionCode || r.id}`,
            type: "Dispensed",
            quantity: "-1",
            status: "dispensed",
          })),
        ];
        if (txRows.length > 0) {
          setPharmacistRecent(txRows.slice(0, 4));
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [role, user?.id, user?.patientId]);

  const liveStats = useMemo(() => {
    switch (role) {
      case "user": {
        const pendingCount = (collections.payments || []).filter((p) => p.status === "pending").length;
        const paidCount = (collections.payments || []).filter(
          (p) => p.status === "paid" || p.status === "completed"
        ).length;
        return [
          { label: "Total Invoices", value: String((collections.payments || []).length), icon: "◫", color: "primary" },
          { label: "Pending Payments", value: String(pendingCount), icon: "◷", color: "warning" },
          { label: "Paid Invoices", value: String(paidCount), icon: "✓", color: "success" },
          { label: "Refund Requests", value: String((collections.refunds || []).length), icon: "◈", color: "primary" },
        ];
      }
      case "patient": {
        if (patientStats) return patientStats;
        const upcoming = (collections.appointments || []).filter(
          (a) => a.status === "confirmed" || a.status === "pending"
        ).length;
        const activeRx = (collections.prescriptions || []).filter((p) => p.status !== "dispensed").length;
        return [
          { label: "Upcoming visits", value: String(upcoming), icon: "◷", color: "primary" },
          { label: "Medical records", value: String((collections.records || []).length), icon: "◫", color: "primary" },
          { label: "Active prescriptions", value: String(activeRx), icon: "✓", color: "success" },
          { label: "Billing balance", value: "LKR 25,000", icon: "◈", color: "warning" },
        ];
      }
      case "doctor": {
        if (doctorStats) return doctorStats;
        const todayCount = (collections.appointments || []).slice(0, 4).length;
        const patientsCount = new Set((collections.appointments || []).map((a) => a.patient).filter(Boolean)).size || 18;
        return [
          { label: "Today's visits", value: String(todayCount), icon: "◷", color: "primary" },
          { label: "My patients", value: String(patientsCount), icon: "◫", color: "primary" },
          { label: "Treatment plans", value: String((collections.treatmentPlans || []).length), icon: "✓", color: "success" },
          { label: "Pending notes", value: "3", icon: "◈", color: "warning" },
        ];
      }
      case "admin": {
        if (adminStats) return adminStats;
        const lowStock = (collections.medicines || []).filter(
          (m) => m.status === "low-stock" || m.stock <= m.minStock
        ).length;
        return [
          { label: "Registered users", value: String((collections.users || []).length), icon: "◫", color: "primary" },
          { label: "All appointments", value: String((collections.appointments || []).length), icon: "◷", color: "primary" },
          { label: "Monthly revenue", value: "LKR 842K", icon: "✓", color: "success" },
          { label: "Low stock items", value: String(lowStock), icon: "◈", color: lowStock > 0 ? "warning" : "success" },
        ];
      }
      case "receptionist": {
        const inQueue = (collections.queue || []).filter((q) => q.status !== "completed").length;
        const registered = (collections.users || []).filter((u) => u.role === "patient").length;
        const pendingBills = (collections.payments || []).filter((p) => p.status === "pending").length;
        return [
          { label: "Active queue", value: String(inQueue), icon: "◷", color: "primary" },
          { label: "Checked in today", value: String((collections.queue || []).length), icon: "◫", color: "primary" },
          { label: "Registered patients", value: String(registered), icon: "✓", color: "success" },
          { label: "Pending bills", value: String(pendingBills), icon: "◈", color: "warning" },
        ];
      }
      case "pharmacist": {
        if (pharmacistStats) return pharmacistStats;
        const ready = (collections.prescriptions || []).filter((p) => p.status !== "dispensed").length;
        const dispensed = (collections.prescriptions || []).filter((p) => p.status === "dispensed").length;
        const lowStock = (collections.medicines || []).filter(
          (m) => m.status === "low-stock" || m.stock <= m.minStock
        ).length;
        return [
          { label: "Ready to dispense", value: String(ready), icon: "◷", color: "primary" },
          { label: "Dispensed items", value: String(dispensed), icon: "✓", color: "success" },
          { label: "Inventory catalog", value: String((collections.medicines || []).length), icon: "◫", color: "primary" },
          { label: "Low stock alerts", value: String(lowStock), icon: "◈", color: lowStock > 0 ? "warning" : "success" },
        ];
      }
      default:
        return [
          { label: "Activity", value: "Active", icon: "✓", color: "primary" },
        ];
    }
  }, [role, collections, pharmacistStats, doctorStats, patientStats, adminStats]);

  const quickActions = useMemo(() => {
    switch (role) {
      case "patient":
        return [
          ["Book appointment", "book-appointment"],
          ["My appointments", "appointments"],
          ["View prescriptions", "prescriptions"],
          ["Billing & invoices", "billing"],
        ];
      case "doctor":
        return [
          ["Today's visits", "today"],
          ["Patient directory", "patients"],
          ["Treatment plans", "treatment-plans"],
          ["Availability schedule", "schedule"],
        ];
      case "receptionist":
        return [
          ["Register new patient", "register-patient"],
          ["Check-in & queue", "queue"],
          ["Book appointment", "book-appointment"],
          ["Billing collection", "billing"],
        ];
      case "pharmacist":
        return [
          ["Dispense medicines", "dispense"],
          ["Review low stock", "low-stock"],
          ["Medicine inventory", "inventory"],
          ["Stock transactions", "transactions"],
        ];
      case "admin":
        return [
          ["Analytics dashboard", "analytics"],
          ["User management", "users"],
          ["Inventory control", "inventory"],
          ["System audit logs", "audit"],
        ];
      default:
        return [
          ["Pending payments", "pending"],
          ["Payment invoices", "invoices"],
          ["Refund requests", "refunds"],
          ["Financial reports", "reports"],
        ];
    }
  }, [role]);

  const recentData = useMemo(() => {
    if (role === "pharmacist") {
      return {
        columns: [
          { key: "medicine", label: "Medicine" },
          { key: "type", label: "Type" },
          { key: "quantity", label: "Qty" },
          { key: "status", label: "Status", type: "status" },
        ],
        rows: pharmacistRecent || (collections.transactions || []).slice(0, 4),
        link: `/${role}/transactions`,
      };
    }
    if (role === "admin") {
      return {
        columns: [
          { key: "name", label: "Event" },
          { key: "detail", label: "Detail" },
          { key: "status", label: "Status", type: "status" },
        ],
        rows: adminRecent || (collections.audit || []).slice(0, 4),
        link: `/${role}/audit`,
      };
    }
    if (role === "receptionist") {
      return {
        columns: [
          { key: "queueNumber", label: "Token" },
          { key: "patient", label: "Patient" },
          { key: "service", label: "Service" },
          { key: "status", label: "Status", type: "status" },
        ],
        rows: (collections.queue || []).slice(0, 4),
        link: `/${role}/queue`,
      };
    }
    if (role === "user") {
      return {
        columns: [
          { key: "id", label: "Invoice #" },
          { key: "patient", label: "Patient" },
          { key: "amount", label: "Amount" },
          { key: "status", label: "Status", type: "status" },
        ],
        rows: (collections.payments || []).slice(0, 4),
        link: `/${role}/payments`,
      };
    }
    return {
      columns: [
        { key: "patient", label: "Patient" },
        { key: "doctor", label: "Doctor" },
        { key: "service", label: "Service" },
        { key: "status", label: "Status", type: "status" },
      ],
      rows: (collections.appointments || []).slice(0, 4),
      link: `/${role}/appointments`,
    };
  }, [role, collections, pharmacistRecent, adminRecent]);

  return (
    <div className={`df-role-page df-role-${meta.accent}`}>
      <header className="df-dashboard-welcome">
        <div>
          <span className="df-section-label">{meta.name} workspace</span>
          <h1>Welcome back, {user?.name?.split(" ")[0] || "User"}</h1>
          <p>Real-time dental practice operations, patient records, and care priorities.</p>
        </div>
        <div className="df-welcome-date">
          <strong>Clinic Status</strong>
          <span>Operations active & synced</span>
        </div>
      </header>

      <div className="df-stat-grid">
        {liveStats.map((item) => (
          <StatCard
            key={item.label}
            label={item.label}
            value={item.value}
            icon={<span aria-hidden="true">{item.icon}</span>}
            color={item.color}
          />
        ))}
      </div>

      <div className="df-overview-grid">
        <MiniBarChart
          title={meta.chart}
          values={[
            { label: "Oct", value: 28 },
            { label: "Nov", value: 34 },
            { label: "Dec", value: 41 },
            { label: "Jan", value: 46 },
            { label: "Feb", value: 52 },
            { label: "Mar", value: 68 },
          ]}
        />
        <section className="df-card">
          <div className="df-card-body">
            <div className="df-card-title-row">
              <h3>Quick actions</h3>
            </div>
            <div className="df-quick-actions">
              {quickActions.map(([label, path]) => (
                <Link key={path} className="df-quick-action" to={`/${role}/${path}`}>
                  <span>{label}</span>
                  <b aria-hidden="true">→</b>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="df-overview-grid df-overview-bottom">
        <section className="df-card">
          <div className="df-card-body">
            <div className="df-card-title-row">
              <h3>Recent activity</h3>
              <Link to={recentData.link} className="df-text-link">
                View all
              </Link>
            </div>
            <DataTable columns={recentData.columns} rows={recentData.rows} />
          </div>
        </section>

        <section className="df-card">
          <div className="df-card-body">
            <div className="df-card-title-row">
              <h3>Notifications & Alerts</h3>
              <span className="df-badge df-badge-warning">
                {(notifications || []).filter((item) => !item.read).length} unread
              </span>
            </div>
            <div className="df-activity-list">
              {(notifications || []).slice(0, 4).map((item) => (
                <div className="df-activity-item" key={item.id}>
                  <span className="df-activity-dot" />
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.message}</p>
                    <small>{item.time}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export function AccountPage({ role, section }) {
  const { user, updateUser } = useAuth();
  const { addToast } = useNotifications();
  const { theme, setTheme } = useTheme();
  const { lang, setLanguage, t } = useLanguage();

  const [tab, setTab] = useState(section === "profile" ? "Profile" : "Account");
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "+94 77 123 4567");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [density, setDensity] = useState("comfortable");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);

  useEffect(() => {
    let active = true;
    authApi
      .getMe()
      .then((profile) => {
        if (!active || !profile) return;
        const fullName = `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || profile.email;
        if (fullName) setName(fullName);
        if (profile.email) setEmail(profile.email);
        if (profile.phone) setPhone(profile.phone);
      })
      .catch(() => null);
    return () => {
      active = false;
    };
  }, []);

  const tabs =
    section === "profile"
      ? ["Profile", "Security"]
      : ["Account", "Security", "Appearance", "Language", "Notifications"];

  const save = async (event) => {
    event.preventDefault();
    if (password) {
      if (password !== confirmPassword) {
        addToast("Passwords do not match", "error");
        return;
      }
      try {
        await authApi.changePassword("demo123", password);
        addToast("Password changed successfully in backend!", "success");
      } catch (err) {
        console.warn("Could not change password on backend:", err);
      }
    }
    updateUser({ name, email, phone });
    addToast("Account preferences updated successfully", "success");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className={`df-role-page df-role-${roleMeta[role]?.accent || "slate"}`}>
      <Breadcrumbs
        items={[
          { label: "Dashboard", to: `/${role}` },
          { label: section === "profile" ? "Profile" : "Settings" },
        ]}
      />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">{roleMeta[role]?.name || "User"} workspace</span>
          <h1>{section === "profile" ? "User Profile" : "Account & Preferences"}</h1>
          <p>Manage your personal profile, credentials, visual themes, and alerts.</p>
        </div>
      </header>

      <div className="df-settings-layout">
        <aside className="df-card">
          <div className="df-settings-tabs">
            {tabs.map((item) => (
              <button
                key={item}
                className={`df-settings-tab ${tab === item ? "active" : ""}`}
                onClick={() => setTab(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </aside>

        <section className="df-card">
          <div className="df-card-body">
            <h3>{tab} Settings</h3>
            <p className="df-settings-copy">
              Configure your personal workspace and platform configuration.
            </p>

            <form onSubmit={save}>
              {(tab === "Profile" || tab === "Account") && (
                <div className="df-form-2col">
                  <div className="df-form-group">
                    <label className="df-label" htmlFor="account-name">
                      Full Name
                    </label>
                    <input
                      id="account-name"
                      className="df-input"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                    />
                  </div>
                  <div className="df-form-group">
                    <label className="df-label" htmlFor="account-email">
                      Email Address
                    </label>
                    <input
                      id="account-email"
                      className="df-input"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </div>
                  <div className="df-form-group">
                    <label className="df-label" htmlFor="account-phone">
                      Phone Number
                    </label>
                    <input
                      id="account-phone"
                      className="df-input"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                  </div>
                  <div className="df-form-group">
                    <label className="df-label" htmlFor="account-role">
                      Assigned Role
                    </label>
                    <input
                      id="account-role"
                      className="df-input"
                      value={user?.role?.toUpperCase() || role.toUpperCase()}
                      disabled
                      style={{ background: "var(--df-gray-100)" }}
                    />
                  </div>
                </div>
              )}

              {tab === "Security" && (
                <div className="df-form-2col">
                  <div className="df-form-group">
                    <label className="df-label" htmlFor="new-password">
                      New Password
                    </label>
                    <input
                      id="new-password"
                      className="df-input"
                      type="password"
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <div className="df-form-group">
                    <label className="df-label" htmlFor="confirm-password">
                      Confirm New Password
                    </label>
                    <input
                      id="confirm-password"
                      className="df-input"
                      type="password"
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {tab === "Appearance" && (
                <div className="df-form-2col">
                  <div className="df-form-group">
                    <label className="df-label" htmlFor="theme-select">
                      Color Theme
                    </label>
                    <select
                      id="theme-select"
                      className="df-select"
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                    >
                      <option value="light">Light Mode</option>
                      <option value="dark">Dark Mode</option>
                      <option value="system">System Preference</option>
                    </select>
                  </div>
                  <div className="df-form-group">
                    <label className="df-label" htmlFor="density-select">
                      Table Density
                    </label>
                    <select
                      id="density-select"
                      className="df-select"
                      value={density}
                      onChange={(e) => setDensity(e.target.value)}
                    >
                      <option value="comfortable">Comfortable</option>
                      <option value="compact">Compact</option>
                    </select>
                  </div>
                </div>
              )}

              {tab === "Language" && (
                <div className="df-form-group" style={{ maxWidth: 360 }}>
                  <label className="df-label" htmlFor="lang-select">
                    Select Interface Language
                  </label>
                  <select
                    id="lang-select"
                    className="df-select"
                    value={lang}
                    onChange={(e) => {
                      setLanguage(e.target.value);
                      addToast(`Language switched to ${e.target.value.toUpperCase()}`, "info");
                    }}
                  >
                    <option value="en">English (US / UK)</option>
                    <option value="si">සිංහල (Sinhala)</option>
                    <option value="ta">தமிழ் (Tamil)</option>
                  </select>
                  <small style={{ color: "var(--df-text-secondary)", marginTop: 6, display: "block" }}>
                    Active localized strings: {t("nav.home")}, {t("nav.services")}, {t("nav.doctors")}.
                  </small>
                </div>
              )}

              {tab === "Notifications" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <label className="df-toggle-row">
                    <input
                      type="checkbox"
                      checked={emailAlerts}
                      onChange={(e) => setEmailAlerts(e.target.checked)}
                    />
                    Email notifications for appointment reminders and invoice receipts
                  </label>
                  <label className="df-toggle-row">
                    <input
                      type="checkbox"
                      checked={smsAlerts}
                      onChange={(e) => setSmsAlerts(e.target.checked)}
                    />
                    SMS reminders for patient queue updates and prescription dispensing
                  </label>
                </div>
              )}

              <div style={{ marginTop: 24 }}>
                <button className="df-btn df-btn-primary" type="submit">
                  Save preferences
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

export function AnalyticsView({ role }) {
  const { collections } = useDashboardData();
  const meta = roleMeta[role] || roleMeta.admin;
  const [liveKpis, setLiveKpis] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      billingApi.getAllBills().catch(() => []),
      appointmentApi.getAllAppointments().catch(() => []),
      usersApi.getAllUsers().catch(() => []),
      pharmacyApi.getAllMedicines().catch(() => []),
    ]).then(([bills, appts, users, meds]) => {
      if (!active) return;
      const totalPayments = bills.reduce((acc, b) => acc + (Number(b.paidAmount) || 0), 0);
      const lowStock = meds.filter((m) => (m.stockQuantity || 0) <= (m.reorderLevel || 10)).length;
      const formatLKR = (num) => `LKR ${num.toLocaleString()}`;
      setLiveKpis([
        { label: "Total Revenue", value: totalPayments > 0 ? formatLKR(totalPayments) : "LKR 842,500", icon: "✓", color: "success" },
        { label: "Total Appointments", value: String(appts.length || (collections.appointments || []).length), icon: "◷", color: "primary" },
        { label: "Active Patients", value: String(users.filter((u) => (u.role || "").toUpperCase() === "PATIENT").length || 1), icon: "◫", color: "primary" },
        { label: "Low-Stock Alerts", value: String(lowStock), icon: "◈", color: lowStock > 0 ? "warning" : "success" },
      ]);
    });
    return () => {
      active = false;
    };
  }, [collections.appointments]);

  const totalPayments = (collections.payments || []).reduce((acc, curr) => {
    const num = parseInt(String(curr.amount || "").replace(/[^0-9]/g, ""), 10) || 0;
    return acc + num;
  }, 0);

  const formatLKR = (num) => `LKR ${num.toLocaleString()}`;

  const kpis = liveKpis || [
    { label: "Total Revenue", value: formatLKR(totalPayments || 842500), icon: "✓", color: "success" },
    { label: "Total Appointments", value: String((collections.appointments || []).length), icon: "◷", color: "primary" },
    { label: "Active Patients", value: String((collections.users || []).filter((u) => u.role === "patient").length), icon: "◫", color: "primary" },
    { label: "Low-Stock Alerts", value: String((collections.medicines || []).filter((m) => m.status === "low-stock").length), icon: "◈", color: "warning" },
  ];

  const serviceCategories = [
    { name: "Orthodontics & Braces", share: 38, revenue: "LKR 320,000" },
    { name: "Dental Implants & Crowns", share: 27, revenue: "LKR 228,000" },
    { name: "Cosmetic & Teeth Whitening", share: 20, revenue: "LKR 168,500" },
    { name: "General Checkup & Scaling", share: 15, revenue: "LKR 126,000" },
  ];

  return (
    <div className={`df-role-page df-role-${meta.accent}`}>
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Analytics" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">{meta.name} workspace</span>
          <h1>Clinical & Financial Analytics</h1>
          <p>Executive performance overview, department revenue, and operational velocity.</p>
        </div>
      </header>

      <div className="df-stat-grid">
        {kpis.map((kpi) => (
          <StatCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            icon={<span aria-hidden="true">{kpi.icon}</span>}
            color={kpi.color}
          />
        ))}
      </div>

      <div className="df-overview-grid">
        <MiniBarChart
          title="Monthly Clinical Consultations"
          values={[
            { label: "Oct", value: 112 },
            { label: "Nov", value: 145 },
            { label: "Dec", value: 180 },
            { label: "Jan", value: 195 },
            { label: "Feb", value: 210 },
            { label: "Mar", value: 248 },
          ]}
        />

        <section className="df-card">
          <div className="df-card-body">
            <div className="df-card-title-row">
              <h3>Revenue by Treatment Department</h3>
            </div>
            <div className="df-progress-list">
              {serviceCategories.map((item) => (
                <div key={item.name} className="df-progress-item">
                  <div className="df-progress-label">
                    <span>{item.name}</span>
                    <strong>{item.revenue} ({item.share}%)</strong>
                  </div>
                  <div className="df-progress-track">
                    <div className="df-progress-fill" style={{ width: `${item.share}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="df-overview-grid df-overview-bottom">
        <section className="df-card">
          <div className="df-card-body">
            <div className="df-card-title-row">
              <h3>Operational Efficiency Indicators</h3>
            </div>
            <div className="df-analytics-grid">
              <div className="df-card" style={{ background: "var(--df-gray-50)", padding: 16 }}>
                <strong>Average Consultation Time</strong>
                <h2 style={{ color: "var(--df-primary-600)", margin: "8px 0" }}>32 mins</h2>
                <small style={{ color: "var(--df-text-secondary)" }}>Optimal dental chair turnover</small>
              </div>
              <div className="df-card" style={{ background: "var(--df-gray-50)", padding: 16 }}>
                <strong>On-Time Arrival Rate</strong>
                <h2 style={{ color: "var(--df-success)", margin: "8px 0" }}>94.6%</h2>
                <small style={{ color: "var(--df-text-secondary)" }}>Supported by automated SMS</small>
              </div>
              <div className="df-card" style={{ background: "var(--df-gray-50)", padding: 16 }}>
                <strong>Rx Fulfillment Speed</strong>
                <h2 style={{ color: "var(--df-primary-600)", margin: "8px 0" }}>7.5 mins</h2>
                <small style={{ color: "var(--df-text-secondary)" }}>Fast pharmacy dispatch</small>
              </div>
            </div>
          </div>
        </section>

        <section className="df-card">
          <div className="df-card-body">
            <div className="df-card-title-row">
              <h3>Inventory Turnover Highlights</h3>
            </div>
            <div className="df-activity-list">
              <div className="df-activity-item">
                <span className="df-activity-dot" />
                <div>
                  <strong>Antibiotics & Analgesics</strong>
                  <p>Highest consumption rate. Reorder triggered for Amoxicillin.</p>
                </div>
              </div>
              <div className="df-activity-item">
                <span className="df-activity-dot" />
                <div>
                  <strong>Anesthetics & Sedatives</strong>
                  <p>Stock levels optimal across all 5 consultation rooms.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export function RegisterPatientView({ role }) {
  const { saveRecord, collections } = useDashboardData();
  const { addToast } = useNotifications();
  const meta = roleMeta[role] || roleMeta.receptionist;

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    age: "",
    gender: "Male",
    bloodGroup: "O+",
    doctor: DOCTORS[0]?.name || "Dr. James Wilson",
    allergies: "None reported",
  });
  const [submitting, setSubmitting] = useState(false);
  const [dbPatients, setDbPatients] = useState(null);

  useEffect(() => {
    let ignore = false;
    patientApi.getAllPatients()
      .then((data) => {
        if (!ignore) setDbPatients(data);
      })
      .catch(() => {
        if (!ignore) setDbPatients(null);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.phone.trim()) {
      addToast("Please complete all required fields", "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        dateOfBirth: ageToDateOfBirth(form.age || 28),
        gender: form.gender,
        bloodGroup: form.bloodGroup,
        allergies: form.allergies?.trim() || "None reported",
        medicalConditions: "None",
        currentMedications: "None",
        status: "ACTIVE",
      };

      const saved = await patientApi.createPatient(payload);
      addToast(`Patient ${saved.name} registered successfully! Assigned Code: ${saved.patientCode}`, "success");

      // Update both database patient list and local collections
      setDbPatients((prev) => [saved, ...(prev || [])]);
      saveRecord("users", {
        id: saved.id,
        patientCode: saved.patientCode,
        name: saved.name,
        email: saved.email,
        phone: saved.phone,
        role: "patient",
        status: "active",
        joined: saved.joined,
      });

      setForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        age: "",
        gender: "Male",
        bloodGroup: "O+",
        doctor: DOCTORS[0]?.name || "Dr. James Wilson",
        allergies: "None reported",
      });
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Failed to register patient in clinic database";
      addToast(typeof msg === "string" ? msg : "Registration failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const patientUsers = dbPatients !== null ? dbPatients : (collections.users || []).filter((u) => u.role === "patient");

  return (
    <div className={`df-role-page df-role-${meta.accent}`}>
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Patient Registration" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">{meta.name} workspace</span>
          <h1>Patient Registration & Intake</h1>
          <p>Register new clinic patients with verified medical profiles and assigned doctors.</p>
        </div>
      </header>

      <section className="df-card" style={{ marginBottom: 32 }}>
        <div className="df-card-body">
          <div className="df-card-title-row">
            <h3>New Patient Intake Form</h3>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="df-form-2col">
              <div className="df-form-group">
                <label className="df-label" htmlFor="reg-fname">First Name *</label>
                <input
                  id="reg-fname"
                  className="df-input"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  placeholder="e.g. Kasun"
                  required
                  disabled={submitting}
                />
              </div>
              <div className="df-form-group">
                <label className="df-label" htmlFor="reg-lname">Last Name *</label>
                <input
                  id="reg-lname"
                  className="df-input"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  placeholder="e.g. Perera"
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="df-form-2col" style={{ marginTop: 16 }}>
              <div className="df-form-group">
                <label className="df-label" htmlFor="reg-email">Email Address *</label>
                <input
                  id="reg-email"
                  type="email"
                  className="df-input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="kasun@example.com"
                  required
                  disabled={submitting}
                />
              </div>
              <div className="df-form-group">
                <label className="df-label" htmlFor="reg-phone">Phone Number *</label>
                <input
                  id="reg-phone"
                  className="df-input"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+94 77 000 0000"
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="df-form-3col" style={{ marginTop: 16 }}>
              <div className="df-form-group">
                <label className="df-label" htmlFor="reg-age">Age</label>
                <input
                  id="reg-age"
                  type="number"
                  className="df-input"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: e.target.value })}
                  placeholder="30"
                  disabled={submitting}
                />
              </div>
              <div className="df-form-group">
                <label className="df-label" htmlFor="reg-gender">Gender</label>
                <select
                  id="reg-gender"
                  className="df-select"
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  disabled={submitting}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="df-form-group">
                <label className="df-label" htmlFor="reg-blood">Blood Group</label>
                <select
                  id="reg-blood"
                  className="df-select"
                  value={form.bloodGroup}
                  onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                  disabled={submitting}
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>

            <div className="df-form-2col" style={{ marginTop: 16 }}>
              <div className="df-form-group">
                <label className="df-label" htmlFor="reg-doctor">Assigned Dentist</label>
                <select
                  id="reg-doctor"
                  className="df-select"
                  value={form.doctor}
                  onChange={(e) => setForm({ ...form, doctor: e.target.value })}
                  disabled={submitting}
                >
                  {DOCTORS.map((doc) => (
                    <option key={doc.id} value={doc.name}>
                      {doc.name} ({doc.specialty})
                    </option>
                  ))}
                </select>
              </div>
              <div className="df-form-group">
                <label className="df-label" htmlFor="reg-allergies">Allergies / Special Notes</label>
                <input
                  id="reg-allergies"
                  className="df-input"
                  value={form.allergies}
                  onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                  placeholder="e.g. Penicillin allergy, diabetic"
                  disabled={submitting}
                />
              </div>
            </div>

            <div style={{ marginTop: 24 }}>
              <button className="df-btn df-btn-primary df-btn-lg" type="submit" disabled={submitting}>
                {submitting ? "Registering Patient..." : "✓ Complete Patient Registration"}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="df-card">
        <div className="df-card-body">
          <div className="df-card-title-row">
            <h3>Registered Patients Directory</h3>
            <span className="df-badge df-badge-primary">{patientUsers.length} total</span>
          </div>
          <DataTable
            columns={[
              { key: "patientCode", label: "Patient Code" },
              { key: "name", label: "Patient" },
              { key: "email", label: "Email" },
              { key: "phone", label: "Phone" },
              { key: "bloodGroup", label: "Blood" },
              { key: "status", label: "Status", type: "status" },
            ]}
            rows={patientUsers}
          />
        </div>
      </section>
    </div>
  );
}

export function DashboardBookingView({ role }) {
  const { user } = useAuth();
  const { saveRecord, collections } = useDashboardData();
  const { addToast } = useNotifications();
  const meta = roleMeta[role] || roleMeta.patient;

  const [dentists, setDentists] = useState([]);
  const [patients, setPatients] = useState([]);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [bookingWindow, setBookingWindow] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [appointmentsList, setAppointmentsList] = useState([]);

  const todayIso = useMemo(() => new Date().toISOString().split("T")[0], []);

  const [form, setForm] = useState({
    patient: role === "patient" ? user?.name || "Patient" : "",
    patientId: "",
    doctorId: "",
    serviceId: SERVICES[0]?.id || 1,
    date: todayIso,
    time: "09:00 AM",
    notes: "",
    checkInNow: false,
  });

  // 1. Initial data load (Dentists, Patients, Booking Window, Initial Appointments)
  useEffect(() => {
    let mounted = true;

    async function loadInitialData() {
      try {
        // Load Dentists
        const dList = await dentistApi.getAllDentists();
        if (mounted && dList.length > 0) {
          setDentists(dList);
          setForm((prev) => ({
            ...prev,
            doctorId: prev.doctorId || String(dList[0].id),
          }));
        }

        // Load Booking Window
        try {
          const bw = await appointmentApi.getBookingWindow();
          if (mounted && bw) {
            setBookingWindow(bw);
            if (bw.today) {
              setForm((prev) => ({ ...prev, date: bw.today }));
            }
          }
        } catch (bwErr) {
          console.warn("Could not load booking window:", bwErr);
        }

        // Load Patient details
        if (role === "patient" && user?.id) {
          const p = await patientApi.getPatientByUserId(user.id);
          if (mounted && p) {
            setCurrentPatient(p);
            setForm((prev) => ({
              ...prev,
              patient: p.name || user?.name || "Patient",
              patientId: String(p.id),
            }));
            // Load patient appointments
            const appts = await appointmentApi.getPatientAppointments(p.id);
            if (mounted) {
              const dLookup = {};
              dList.forEach((d) => { dLookup[d.id] = d; });
              const pLookup = { [p.id]: p };
              setAppointmentsList(appts.map((a) => normalizeAppointment(a, dLookup, pLookup)));
            }
          }
        } else {
          // Receptionist/Admin - load all patients
          const pList = await patientApi.getAllPatients();
          if (mounted && pList.length > 0) {
            setPatients(pList);
            setForm((prev) => ({
              ...prev,
              patientId: prev.patientId || String(pList[0].id),
              patient: prev.patient || pList[0].name,
            }));
          }
          // Load all appointments
          const appts = await appointmentApi.getAllAppointments();
          if (mounted) {
            const dLookup = {};
            dList.forEach((d) => { dLookup[d.id] = d; });
            const pLookup = {};
            pList.forEach((p) => { pLookup[p.id] = p; });
            setAppointmentsList(appts.map((a) => normalizeAppointment(a, dLookup, pLookup)));
          }
        }
      } catch (err) {
        console.error("Failed to load initial booking data:", err);
      }
    }

    loadInitialData();
    return () => { mounted = false; };
  }, [role, user?.id, todayIso]);

  // 2. Fetch available slots when selected doctor or date changes
  useEffect(() => {
    let mounted = true;
    if (!form.doctorId || !form.date) return;

    async function fetchSlots() {
      try {
        setLoadingSlots(true);
        const ranges = await appointmentApi.getAvailableSlots(form.doctorId, form.date);
        if (mounted) {
          const discreteSlots = generateSlotIntervals(ranges, form.date, 30);
          setAvailableSlots(discreteSlots);
          if (discreteSlots.length > 0) {
            setForm((prev) => ({
              ...prev,
              time: discreteSlots[0].displayTime,
            }));
          } else {
            setForm((prev) => ({
              ...prev,
              time: "",
            }));
          }
        }
      } catch (err) {
        console.warn("Could not load slots for doctor/date:", err);
        if (mounted) setAvailableSlots([]);
      } finally {
        if (mounted) setLoadingSlots(false);
      }
    }

    fetchSlots();
    return () => { mounted = false; };
  }, [form.doctorId, form.date]);

  const refreshAppointments = async () => {
    try {
      const dLookup = {};
      dentists.forEach((d) => { dLookup[d.id] = d; });

      if (role === "patient" && currentPatient?.id) {
        const appts = await appointmentApi.getPatientAppointments(currentPatient.id);
        const pLookup = { [currentPatient.id]: currentPatient };
        setAppointmentsList(appts.map((a) => normalizeAppointment(a, dLookup, pLookup)));
      } else {
        const pLookup = {};
        patients.forEach((p) => { pLookup[p.id] = p; });
        const appts = await appointmentApi.getAllAppointments();
        setAppointmentsList(appts.map((a) => normalizeAppointment(a, dLookup, pLookup)));
      }
    } catch (err) {
      console.warn("Error refreshing appointments list:", err);
    }
  };

  const handleBook = async (e) => {
    e.preventDefault();

    let targetPatientId = form.patientId;
    if (role === "patient") {
      if (!currentPatient?.id) {
        addToast("Please complete your patient profile before booking appointments.", "error");
        return;
      }
      targetPatientId = currentPatient.id;
    }

    if (!targetPatientId) {
      addToast("Please select a registered patient for booking.", "error");
      return;
    }

    if (!form.doctorId) {
      addToast("Please select a consulting dentist.", "error");
      return;
    }

    if (!form.date) {
      addToast("Please select a valid appointment date.", "error");
      return;
    }

    if (!form.time) {
      addToast("No valid time slot selected. Please choose another date or doctor.", "error");
      return;
    }

    const doc = dentists.find((d) => d.id === Number(form.doctorId)) || dentists[0];
    const srv = SERVICES.find((s) => s.id === Number(form.serviceId)) || SERVICES[0];

    const matchingSlot = availableSlots.find((s) => s.displayTime === form.time);
    const startTime = matchingSlot ? matchingSlot.startTime : formatTime24Hour(form.time);
    const endTime = matchingSlot ? matchingSlot.endTime : addMinutesToIsoTime(startTime, 30);

    const payload = {
      patientId: Number(targetPatientId),
      dentistId: Number(form.doctorId),
      appointmentDate: form.date,
      startTime,
      endTime,
      appointmentType: srv.name,
      reason: form.notes ? form.notes.trim() : srv.name,
      notes: form.notes ? form.notes.trim() : null,
      bookingSource: role === "patient" ? "ONLINE" : "RECEPTION",
    };

    try {
      setSubmitting(true);
      const savedAppt = await appointmentApi.createAppointment(payload);

      // Also sync to DashboardDataContext mock collections for views still relying on it
      const createdApptDisplay = {
        id: savedAppt.id,
        appointmentCode: savedAppt.appointmentCode,
        patient: form.patient || `Patient #${targetPatientId}`,
        doctor: doc?.name || `Dr. Dentist #${form.doctorId}`,
        doctorId: doc?.id || Number(form.doctorId),
        service: srv.name,
        serviceId: srv.id,
        date: form.date,
        time: form.time,
        status: "confirmed",
        notes: form.notes,
      };
      saveRecord("appointments", createdApptDisplay);

      if (role === "receptionist") {
        const newQueueToken = {
          id: createRecordId("Q"),
          queueNumber: `Q-${Math.floor(10 + Math.random() * 90)}`,
          patient: form.patient,
          doctor: doc?.name || "Assigned Doctor",
          service: srv.name,
          waitTime: "10 mins",
          status: "waiting",
        };
        saveRecord("queue", newQueueToken);
      }

      addToast(`Appointment scheduled successfully with ${doc?.name || "the dentist"} on ${form.date} at ${form.time}!`, "success");

      // Reset form fields
      setForm((prev) => ({
        ...prev,
        notes: "",
        time: availableSlots[0]?.displayTime || "09:00 AM",
      }));

      await refreshAppointments();
    } catch (err) {
      console.error("Appointment booking error:", err);
      const msg = err.response?.data?.message || err.response?.data || err.message || "Failed to book appointment";
      addToast(typeof msg === "string" ? msg : "Booking failed due to a schedule conflict", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const currentAppointments = appointmentsList.length > 0 ? appointmentsList : (collections.appointments || []);

  return (
    <div className={`df-role-page df-role-${meta.accent}`}>
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Book Appointment" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">{meta.name} workspace</span>
          <h1>Book Clinical Appointment</h1>
          <p>Schedule an appointment with specialized dental surgeons and consultants.</p>
        </div>
      </header>

      <section className="df-card" style={{ marginBottom: 32 }}>
        <div className="df-card-body">
          <div className="df-card-title-row">
            <h3>Appointment Booking Form</h3>
            {bookingWindow && (
              <span className="df-badge df-badge-info">
                Window: {bookingWindow.today} to {bookingWindow.maximumBookingDate}
              </span>
            )}
          </div>
          <form onSubmit={handleBook}>
            <div className="df-form-2col">
              {role === "patient" ? (
                <div className="df-form-group">
                  <label className="df-label" htmlFor="book-patient">Patient Full Name</label>
                  <input
                    id="book-patient"
                    className="df-input"
                    value={form.patient}
                    readOnly
                    style={{ backgroundColor: "var(--df-bg-muted)", cursor: "not-allowed" }}
                  />
                  {currentPatient?.patientCode && (
                    <small style={{ color: "var(--df-text-muted)", marginTop: 4, display: "block" }}>
                      Patient Record: {currentPatient.patientCode}
                    </small>
                  )}
                </div>
              ) : (
                <div className="df-form-group">
                  <label className="df-label" htmlFor="book-patient-select">Select Patient *</label>
                  <select
                    id="book-patient-select"
                    className="df-select"
                    value={form.patientId}
                    onChange={(e) => {
                      const sel = patients.find((p) => String(p.id) === e.target.value);
                      setForm({
                        ...form,
                        patientId: e.target.value,
                        patient: sel?.name || "",
                      });
                    }}
                    required
                  >
                    {patients.length === 0 ? (
                      <option value="">Loading patients...</option>
                    ) : (
                      patients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.patientCode || `ID ${p.id}`})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              <div className="df-form-group">
                <label className="df-label" htmlFor="book-service">Select Dental Service *</label>
                <select
                  id="book-service"
                  className="df-select"
                  value={form.serviceId}
                  onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
                >
                  {SERVICES.map((srv) => (
                    <option key={srv.id} value={srv.id}>
                      {srv.name} ({srv.price})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="df-form-3col" style={{ marginTop: 16 }}>
              <div className="df-form-group">
                <label className="df-label" htmlFor="book-doctor">Consulting Doctor *</label>
                <select
                  id="book-doctor"
                  className="df-select"
                  value={form.doctorId}
                  onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
                  required
                >
                  {dentists.length === 0 ? (
                    <option value="">No dentists available</option>
                  ) : (
                    dentists.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name} ({doc.specialization})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="df-form-group">
                <label className="df-label" htmlFor="book-date">Appointment Date (within 15 days) *</label>
                <input
                  id="book-date"
                  type="date"
                  className="df-input"
                  value={form.date}
                  min={bookingWindow?.today || todayIso}
                  max={bookingWindow?.maximumBookingDate}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>

              <div className="df-form-group">
                <label className="df-label" htmlFor="book-time">
                  Available Time Slot * {loadingSlots && <span style={{ fontSize: 11 }}> (loading...)</span>}
                </label>
                <select
                  id="book-time"
                  className="df-select"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  disabled={availableSlots.length === 0}
                  required
                >
                  {availableSlots.length === 0 ? (
                    <option value="">
                      {loadingSlots ? "Checking slots..." : "No available slots on this date"}
                    </option>
                  ) : (
                    availableSlots.map((slot) => (
                      <option key={slot.startTime} value={slot.displayTime}>
                        {slot.label}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="df-form-group" style={{ marginTop: 16 }}>
              <label className="df-label" htmlFor="book-notes">Symptoms / Patient Notes</label>
              <input
                id="book-notes"
                className="df-input"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="e.g. Tooth sensitivity, regular cleaning checkup"
              />
            </div>

            <div style={{ marginTop: 24 }}>
              <button
                className="df-btn df-btn-primary df-btn-lg"
                type="submit"
                disabled={submitting || (availableSlots.length === 0 && !loadingSlots)}
              >
                {submitting ? "Booking Appointment..." : "✓ Confirm Appointment Booking"}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="df-card">
        <div className="df-card-body">
          <div className="df-card-title-row">
            <h3>Scheduled Appointments</h3>
            <span className="df-badge df-badge-primary">{currentAppointments.length} total</span>
          </div>
          <DataTable
            columns={[
              { key: "id", label: "Ref #" },
              { key: "patient", label: "Patient" },
              { key: "doctor", label: "Doctor" },
              { key: "service", label: "Service" },
              { key: "date", label: "Date" },
              { key: "time", label: "Time" },
              { key: "status", label: "Status", type: "status" },
            ]}
            rows={currentAppointments}
          />
        </div>
      </section>
    </div>
  );
}

function ResourcePage({ page, role }) {
  const resource = pageAliases[page] || page;
  const definition =
    resourceDefinitions[resource] || {
      title: labelFromSlug(page),
      data: APPOINTMENTS,
      columns: [
        { key: "doctor", label: "Assigned Doctor" },
        { key: "service", label: "Service" },
        { key: "date", label: "Date" },
        { key: "status", label: "Status", type: "status" },
      ],
      action: "Manage",
    };

  const { collections, saveRecord, removeRecord } = useDashboardData();
  const { addToast } = useNotifications();

  const activeCollectionKey = COLLECTION_BY_RESOURCE[resource] || "appointments";

  const records = useMemo(() => {
    const raw = collections[activeCollectionKey] || definition.data || [];
    return raw.filter((record) => {
      if (resource === "pending") return record.status === "pending";
      if (resource === "dispense") return record.status !== "dispensed";
      if (resource === "patients") return record.role === "patient";
      if (resource === "doctors") return record.role === "dentist";
      if (resource === "staff") return record.role !== "patient" && record.role !== "dentist";
      if (resource === "lowStock") return record.status === "low-stock" || record.stock <= record.minStock;
      return true;
    });
  }, [collections, activeCollectionKey, definition.data, resource]);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [pageNumber, setPageNumber] = useState(1);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [removing, setRemoving] = useState(null);

  const filtered = useMemo(() => {
    return records.filter((record) => {
      const valuesMatch = Object.values(record).join(" ").toLowerCase().includes(query.toLowerCase());
      const statusMatch = status === "all" || record.status === status;
      return valuesMatch && statusMatch;
    });
  }, [records, query, status]);

  const perPage = 5;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const visible = filtered.slice((pageNumber - 1) * perPage, pageNumber * perPage);
  const statuses = [...new Set(records.map((record) => record.status).filter(Boolean))];

  const editableFields = definition.columns.filter((c) => c.key !== "status" && c.key !== "id").slice(0, 5);

  const openEditor = (record = null) => {
    setEditing(record || {});
    if (record) {
      setDraft(record);
    } else {
      const initial = {};
      editableFields.forEach((c) => {
        initial[c.key] = c.key === "date" ? "2026-03-15" : "";
      });
      setDraft(initial);
    }
    setFormErrors({});
  };

  const handleSave = () => {
    const errors = {};
    editableFields.forEach((c) => {
      if (!String(draft[c.key] || "").trim()) {
        errors[c.key] = "Required";
      }
    });

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      addToast("Please fill all required fields", "error");
      return;
    }

    const record = {
      ...editing,
      ...draft,
      id: editing?.id || createRecordId(resource.slice(0, 3).toUpperCase()),
      status: editing?.status || "pending",
    };

    saveRecord(activeCollectionKey, record);
    addToast(`${definition.title} ${editing?.id ? "updated" : "created"} successfully`, "success");
    setEditing(null);
  };

  const handleRemove = () => {
    if (!removing) return;
    removeRecord(activeCollectionKey, removing.id);
    addToast(`Record ${removing.name || removing.id} removed`, "info");
    setRemoving(null);
  };

  const handleQuickAction = (row) => {
    if (resource === "dispense" || activeCollectionKey === "prescriptions") {
      saveRecord("prescriptions", { ...row, status: "dispensed" });
      const tx = {
        id: createRecordId("TX"),
        medicine: row.medicine || "Prescribed Medicine",
        type: "Dispensed",
        quantity: "-1 Unit",
        reference: row.id,
        date: "2026-03-15",
        status: "dispensed",
      };
      saveRecord("transactions", tx);
      addToast(`Prescription ${row.id} dispensed for ${row.patient}!`, "success");
      return;
    }

    if (resource === "pending" || activeCollectionKey === "payments") {
      saveRecord("payments", { ...row, status: "paid" });
      addToast(`Payment collected for Invoice ${row.id} (${row.amount})!`, "success");
      return;
    }

    if (resource === "lowStock" || resource === "inventory") {
      const newStock = (parseInt(row.stock, 10) || 0) + 100;
      saveRecord("medicines", { ...row, stock: newStock, status: "in-stock" });
      const tx = {
        id: createRecordId("TX"),
        medicine: row.name,
        type: "Restocked",
        quantity: "+100 Units",
        reference: `PO-${createRecordId("ORD")}`,
        date: "2026-03-15",
        status: "completed",
      };
      saveRecord("transactions", tx);
      addToast(`Restocked ${row.name}: new stock is ${newStock} units!`, "success");
      return;
    }

    if (resource === "queue") {
      const nextStatus =
        row.status === "checked-in"
          ? "waiting"
          : row.status === "waiting"
          ? "in-consultation"
          : "completed";
      saveRecord("queue", { ...row, status: nextStatus });
      addToast(`Patient ${row.patient} status updated to '${nextStatus}'`, "info");
      return;
    }

    if (resource === "refunds") {
      saveRecord("refunds", { ...row, status: "completed" });
      addToast(`Refund ${row.id} approved for ${row.patient}!`, "success");
      return;
    }

    if (resource === "feedback") {
      saveRecord("feedback", { ...row, status: "completed" });
      addToast(`Review from ${row.name} marked as acknowledged!`, "success");
      return;
    }

    if (resource === "notifications") {
      saveRecord("notifications", { ...row, status: "read" });
      addToast(`Notification '${row.name}' marked as read.`, "info");
      return;
    }

    if (resource === "today" || resource === "appointments") {
      const nextStatus = row.status === "in-consultation" ? "completed" : "in-consultation";
      saveRecord("appointments", { ...row, status: nextStatus });
      addToast(`Appointment ${row.id} updated to '${nextStatus}'`, "success");
      return;
    }

    // Default quick action
    saveRecord(activeCollectionKey, { ...row, status: "completed" });
    addToast(`Record ${row.id || row.name} processed`, "success");
  };

  return (
    <div className={`df-role-page df-role-${roleMeta[role]?.accent || "slate"}`}>
      <Breadcrumbs
        items={[
          { label: "Dashboard", to: `/${role}` },
          { label: definition.title },
        ]}
      />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">{roleMeta[role]?.name || "Workspace"}</span>
          <h1>{definition.title}</h1>
          <p>Filter, search, inspect, and manage active records in real time.</p>
        </div>
        <button className="df-btn df-btn-primary" onClick={() => openEditor()}>
          + Add record
        </button>
      </header>

      <section className="df-card">
        <div className="df-card-body">
          <div className="df-toolbar">
            <SearchBar
              value={query}
              onChange={(val) => {
                setQuery(val);
                setPageNumber(1);
              }}
              placeholder={`Search ${definition.title.toLowerCase()}...`}
            />

            {statuses.length > 0 && (
              <FilterControl
                value={status}
                onChange={(val) => {
                  setStatus(val);
                  setPageNumber(1);
                }}
                label="Status"
                options={[
                  { value: "all", label: "All statuses" },
                  ...statuses.map((item) => ({
                    value: item,
                    label: labelFromSlug(item),
                  })),
                ]}
              />
            )}
          </div>

          {filtered.length ? (
            <>
              <DataTable
                columns={definition.columns}
                rows={visible}
                actionLabel={definition.action}
                onEdit={openEditor}
                onDelete={setRemoving}
                onQuickAction={definition.quickActionLabel ? handleQuickAction : null}
                quickActionLabel={definition.quickActionLabel}
              />
              <Pagination page={pageNumber} total={totalPages} onChange={setPageNumber} />
            </>
          ) : (
            <EmptyState
              title={`No ${definition.title.toLowerCase()} found`}
              message="No records match your filter criteria or search query."
            />
          )}
        </div>
      </section>

      {editing && (
        <Modal
          title={editing.id ? definition.action : `Add ${definition.title}`}
          onClose={() => setEditing(null)}
          footer={
            <>
              <button className="df-btn df-btn-secondary" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="df-btn df-btn-primary" onClick={handleSave}>
                Save changes
              </button>
            </>
          }
        >
          {editableFields.map((col) => (
            <div className="df-form-group" key={col.key}>
              <label className="df-label" htmlFor={`field-${col.key}`}>
                {col.label}
              </label>
              <input
                id={`field-${col.key}`}
                className="df-input"
                type={col.key === "date" ? "date" : col.key === "email" ? "email" : "text"}
                value={draft[col.key] ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, [col.key]: event.target.value }))
                }
                aria-invalid={Boolean(formErrors[col.key])}
              />
              {formErrors[col.key] && (
                <small className="df-field-error">{formErrors[col.key]}</small>
              )}
            </div>
          ))}
        </Modal>
      )}

      {removing && (
        <ConfirmationDialog
          title="Remove record?"
          message={`Remove ${removing.name || removing.id} from this workspace?`}
          onCancel={() => setRemoving(null)}
          onConfirm={handleRemove}
        />
      )}
    </div>
  );
}

export default function DashboardPage({ role, page = "overview" }) {
  if (page === "not-found") return <NotFound />;
  if (page === "overview") return <Overview role={role} />;
  if (page === "profile" || page === "settings") return <AccountPage role={role} section={page} />;
  if (page === "notifications") return <NotificationCenterView role={role} />;
  if (page === "analytics") return <AnalyticsView role={role} />;
  if (page === "register-patient") return <RegisterPatientView role={role} />;
  if (page === "book-appointment") return <DashboardBookingView role={role} />;
  if (page === "schedule") return <ScheduleView role={role} />;
  if (page === "treatment-plans") return <DoctorTreatmentPlansView role={role} />;
  if (page === "messages") return <DoctorMessagesView role={role} />;
  if (page === "queue") return <QueueBoardView role={role} />;
  if (page === "suppliers") return <SuppliersView role={role} />;

  // Admin dedicated views
  if (role === "admin" && page === "feedback") return <AdminFeedback role={role} />;
  if (role === "admin" && (page === "users" || page === "doctors" || page === "staff")) {
    const filterRole = page === "doctors" ? "dentist" : page === "staff" ? "staff" : "all";
    return <AdminUsersView role={role} filterRole={filterRole} />;
  }
  if (role === "admin" && page === "appointments") {
    return <ReceptionistAppointmentsView role={role} />;
  }

  // Reports
  if (role === "user" && page === "reports") return <CashierReports role={role} />;
  if (role === "pharmacist" && page === "reports") return <PharmacistReports role={role} />;
  if (page === "reports") return <AdminReportsView role={role} />;

  if (page === "audit") return <AdminAuditLogsView role={role} />;
  if (page === "reviews" || page === "feedback") return <PatientReviewsView role={role} />;
  if (page === "patients") return <PatientDirectoryView role={role} />;

  // Doctor dedicated views
  if (role === "doctor" && page === "today") return <DoctorTodayView role={role} />;
  if (role === "doctor" && page === "appointments") return <DoctorAppointmentsView role={role} />;
  if (role === "doctor" && (page === "records" || page === "history")) {
    return <DoctorRecordsView role={role} isHistory={page === "history"} />;
  }
  if (role === "doctor" && page === "prescriptions") return <DoctorPrescriptionsView role={role} />;

  // Patient dedicated views
  if (role === "patient" && (page === "appointments" || page === "history")) {
    return <PatientAppointmentsView role={role} isHistory={page === "history"} />;
  }
  if (role === "patient" && page === "prescriptions") return <PatientPrescriptionsView role={role} />;
  if (role === "patient" && page === "records") return <PatientRecordsView role={role} />;
  if (role === "patient" && page === "billing") return <PatientBillingView role={role} />;

  // Receptionist & Admin dedicated appointment view
  if ((role === "receptionist" || role === "admin") && page === "appointments") {
    return <ReceptionistAppointmentsView role={role} />;
  }

  // Pharmacist dedicated views
  if (role === "pharmacist" && (page === "dispense" || page === "prescriptions")) {
    return <PharmacistDispensingView role={role} page={page} />;
  }
  if ((role === "pharmacist" || role === "admin") && (page === "inventory" || page === "low-stock")) {
    return <PharmacistInventoryView role={role} page={page} />;
  }
  if (role === "pharmacist" && (page === "transactions" || page === "history")) {
    return <StockTransactionsView role={role} page={page} />;
  }

  // Cashier & Billing views
  if (
    (role === "user" || role === "receptionist" || role === "admin") &&
    (page === "payments" || page === "invoices" || page === "pending" || page === "refunds" || page === "billing" || page === "history")
  ) {
    return <CashierBillingView role={role} page={page} />;
  }

  return <ResourcePage role={role} page={page} />;
}
