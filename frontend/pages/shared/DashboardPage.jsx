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
import servicesApi from "../../api/services";
import pharmacyApi from "../../api/pharmacy";
import medicalRecordsApi from "../../api/medicalRecords";
import treatmentPlanApi from "../../api/treatmentPlans";
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
  DoctorMedicalHistoryView,
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
  PharmacistPrescriptionsView,
  PharmacistDispenseView,
  PharmacistInventoryView,
  PharmacistLowStockView,
  PharmacistSuppliersView,
  PharmacistStockTransactionsView,
  PharmacistMedicineHistoryView,
  PharmacistReportsView,
  PharmacistPurchaseRequestsView,
  PharmacistDispensingView,
  StockTransactionsView,
} from "../../components/dashboard/views/PharmacistViews";
import {
  CashierBillingView,
  CashierPaymentsView,
  CashierInvoicesView,
  CashierPendingView,
  CashierHistoryView,
  CashierRefundsView,
} from "../../components/dashboard/views/CashierViews";
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
  MEDICAL_RECORDS,
  MEDICINES,
  PAYMENTS,
  PRESCRIPTIONS,
  REVIEWS,
} from "../../data/mockData";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { useDashboardData } from "../../context/DashboardDataContext";
import NotFound from "./NotFound";
import { renderAdminPage } from "../admin/AdminPageGate";
import { AccountPage } from "../profile/ProfilePage";
import "./DashboardPage.css";

let idCounter = 1000;
function createRecordId(prefix = "ITEM") {
  return `${prefix}-${Date.now().toString(36)}-${(++idCounter).toString(36)}`;
}

import ToothIllustration from "../../components/icons/ToothIllustration";

const formatDashboardDate = () => {
  const d = new Date();
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const parseDateBox = (dateStr) => {
  if (!dateStr) return { day: "25", month: "SEP" };
  try {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const day = String(d.getDate()).padStart(2, "0");
      const month = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
      return { day, month };
    }
  } catch {
    return { day: "25", month: "SEP" };
  }
  return { day: "25", month: "SEP" };
};

const STAT_ICONS = {
  calendar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  users: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  records: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  check: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  clock: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  alert: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  pill: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
      <path d="m8.5 8.5 7 7" />
    </svg>
  ),
  wallet: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  ),
  box: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  revenue: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  heart: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  tooth: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8.5 2 6 4.5 6 8c0 3 1.5 5.5 2.5 8 .8 2 1.5 4 3.5 4s2.7-2 3.5-4c1-2.5 2.5-5 2.5-8 0-3.5-2.5-6-6-6z" />
    </svg>
  ),
};

const samplePatientAppts = [
  {
    id: "APT-101",
    appointmentType: "Routine Dental Checkup",
    dentistName: "Dr. Sarah Jenkins",
    startTime: "10:00 AM",
    appointmentDate: "2026-09-25",
    status: "Confirmed",
  },
  {
    id: "APT-102",
    appointmentType: "Teeth Whitening Session",
    dentistName: "Dr. Michael Chen",
    startTime: "02:30 PM",
    appointmentDate: "2026-10-10",
    status: "Scheduled",
  },
  {
    id: "APT-103",
    appointmentType: "Orthodontic Follow-up",
    dentistName: "Dr. Emily Brooks",
    startTime: "11:15 AM",
    appointmentDate: "2026-11-02",
    status: "Pending",
  },
];

const patientActivities = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    title: "Appointment booked",
    time: "2 hours ago",
    color: "blue",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
        <path d="m8.5 8.5 7 7" />
      </svg>
    ),
    title: "Prescription updated",
    time: "1 day ago",
    color: "teal",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
    title: "Payment completed",
    time: "3 days ago",
    color: "green",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2C8.5 2 6 4.5 6 8c0 3 1.5 5.5 2.5 8 .8 2 1.5 4 3.5 4s2.7-2 3.5-4c1-2.5 2.5-5 2.5-8 0-3.5-2.5-6-6-6z" />
      </svg>
    ),
    title: "Dental record added",
    time: "5 days ago",
    color: "purple",
  },
];

const roleMeta = {
  user: {
    name: "Cashier Desk",
    accent: "blue",
    chart: "Billing & Collection Activity",
  },
  cashier: {
    name: "Cashier Desk",
    accent: "blue",
    chart: "Billing & Collection Activity",
  },
  patient: {
    name: "Patient",
    accent: "blue",
    chart: "Care & Health Activity",
  },
  doctor: {
    name: "Doctor & Specialist",
    accent: "blue",
    chart: "Patient Consultations",
  },
  admin: {
    name: "System Administrator",
    accent: "blue",
    chart: "Clinic Operating Activity",
  },
  receptionist: {
    name: "Front Desk Receptionist",
    accent: "blue",
    chart: "Patient Inflow & Flow",
  },
  pharmacist: {
    name: "Pharmacy Specialist",
    accent: "blue",
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
    data: [],
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
    data: [],
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
    data: [],
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
    data: [],
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

function getRecentMonths(count = 6) {
  const months = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString("en-US", { month: "short" });
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ label, yearMonth, value: 0 });
  }
  return months;
}

export function Overview({ role }) {
  const { user } = useAuth();
  const { notifications } = useNotifications();
  const { collections } = useDashboardData();
  const meta = roleMeta[role] || roleMeta.user;

  const [pharmacistStats, setPharmacistStats] = useState(null);
  const [pharmacistRecent, setPharmacistRecent] = useState(null);
  const [doctorStats, setDoctorStats] = useState(null);
  const [doctorRecent, setDoctorRecent] = useState(null);
  const [patientStats, setPatientStats] = useState(null);
  const [patientRecent, setPatientRecent] = useState(null);
  const [patientApptsList, setPatientApptsList] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [adminRecent, setAdminRecent] = useState(null);
  const [cashierStats, setCashierStats] = useState(null);
  const [cashierRecent, setCashierRecent] = useState(null);
  const [receptionistStats, setReceptionistStats] = useState(null);
  const [receptionistRecent, setReceptionistRecent] = useState(null);
  const [chartValues, setChartValues] = useState(() =>
    getRecentMonths().map(({ label, value }) => ({ label, value }))
  );

  useEffect(() => {
    let isMounted = true;
    const months = getRecentMonths();

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
          { label: "Total revenue", value: `LKR ${totalRev.toLocaleString()}`, icon: "✓", color: "success" },
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
        } else {
          setAdminRecent([]);
        }

        appts.forEach((a) => {
          const d = a.appointmentDate || a.date;
          if (!d) return;
          const ym = d.slice(0, 7);
          const found = months.find((m) => m.yearMonth === ym);
          if (found) found.value += 1;
        });
        setChartValues(months.map(({ label, value }) => ({ label, value })));
      });
    } else if (role === "doctor") {
      Promise.all([
        appointmentApi.getAllAppointments().catch(() => []),
        medicalRecordsApi.getAllMedicalRecords().catch(() => []),
        treatmentPlanApi.getAllTreatmentPlans().catch(() => []),
      ]).then(([appts, recs, plans]) => {
        if (!isMounted) return;
        const todayIso = new Date().toISOString().slice(0, 10);
        const todayAppts = appts.filter((a) => (a.appointmentDate || a.date) === todayIso);
        const patientsCount = new Set(appts.map((a) => a.patientId || a.patient).filter(Boolean)).size;
        setDoctorStats([
          { label: "Today's visits", value: String(todayAppts.length), icon: "◷", color: "primary" },
          { label: "My patients", value: String(patientsCount), icon: "◫", color: "primary" },
          { label: "Treatment plans", value: String(plans.length), icon: "✓", color: "success" },
          { label: "Medical records", value: String(recs.length), icon: "◈", color: "warning" },
        ]);
        setDoctorRecent(
          todayAppts.slice(0, 4).map((a) => ({
            patient: a.patientName || a.patient || "Patient",
            service: a.appointmentType || a.service || "Consultation",
            time: a.startTime || a.time || "09:00 AM",
            status: (a.status || "CONFIRMED").toLowerCase(),
          }))
        );

        appts.forEach((a) => {
          const d = a.appointmentDate || a.date;
          if (!d) return;
          const ym = d.slice(0, 7);
          const found = months.find((m) => m.yearMonth === ym);
          if (found) found.value += 1;
        });
        setChartValues(months.map(({ label, value }) => ({ label, value })));
      });
    } else if (role === "patient") {
      (async () => {
        try {
          let patientId = user?.patientId;
          if (!patientId && user?.id) {
            const p = await patientApi.getPatientByUserId(user.id).catch(() => null);
            if (p) patientId = p.id;
          }
          const [appts, recs, rxs, bills] = await Promise.all([
            patientId ? appointmentApi.getPatientAppointments(patientId).catch(() => []) : [],
            patientId ? medicalRecordsApi.getPatientMedicalRecords(patientId).catch(() => []) : [],
            pharmacyApi.getAllPrescriptions().catch(() => []),
            billingApi.getAllBills().catch(() => []),
          ]);
          if (!isMounted) return;
          const upcoming = appts.filter((a) => a.status === "CONFIRMED" || a.status === "PENDING" || a.status === "BOOKED").length;
          const myRxs = patientId ? rxs.filter((r) => r.patientId === patientId) : rxs;
          const activeRx = myRxs.filter((r) => r.status !== "COMPLETED" && r.status !== "DISPENSED").length;
          const myBills = patientId ? bills.filter((b) => b.patientId === patientId) : bills;
          const balance = myBills.reduce((acc, b) => acc + (Number(b.balanceAmount) || 0), 0);

          setPatientApptsList(appts);
          setPatientStats([
            {
              label: "Upcoming Appointments",
              value: String(upcoming),
              icon: STAT_ICONS.calendar,
              color: "primary",
              subtitle: upcoming > 0 ? `${upcoming} scheduled visit${upcoming > 1 ? "s" : ""}` : "No upcoming visits",
            },
            {
              label: "Dental Records",
              value: String(recs.length),
              icon: STAT_ICONS.tooth,
              color: "primary",
              subtitle: recs.length > 0 ? `${recs.length} clinical record${recs.length > 1 ? "s" : ""}` : "No records yet",
            },
            {
              label: "Active Prescriptions",
              value: String(activeRx),
              icon: STAT_ICONS.pill,
              color: "primary",
              badge: activeRx > 0 ? "Active" : "None",
              badgeType: activeRx > 0 ? "success" : "neutral",
              subtitle: activeRx > 0 ? "Active regimens" : "No active Rx",
            },
            {
              label: "Billing Balance",
              value: balance > 0 ? `LKR ${balance.toLocaleString()}` : "LKR 0",
              icon: STAT_ICONS.wallet,
              color: balance > 0 ? "warning" : "success",
              subtitle: balance > 0 ? "Outstanding balance" : "Fully settled",
            },
          ]);
          setPatientRecent(
            appts.slice(0, 4).map((a) => ({
              doctor: a.dentistName || a.doctor || "Attending Dentist",
              service: a.appointmentType || a.service || "General Checkup",
              date: a.appointmentDate || a.date || "-",
              status: (a.status || "CONFIRMED").toLowerCase(),
            }))
          );

          appts.forEach((a) => {
            const d = a.appointmentDate || a.date;
            if (!d) return;
            const ym = d.slice(0, 7);
            const found = months.find((m) => m.yearMonth === ym);
            if (found) found.value += 1;
          });
          setChartValues(months.map(({ label, value }) => ({ label, value })));
        } catch {
          // keep clean defaults
        }
      })();
    } else if (role === "pharmacist") {
      Promise.all([
        pharmacyApi.getAllMedicines().catch(() => []),
        pharmacyApi.getAllPrescriptions().catch(() => []),
        pharmacyApi.getAllPurchaseOrders().catch(() => []),
      ]).then(([meds, rxs, pos]) => {
        if (!isMounted) return;
        const ready = rxs.filter((r) => r.status !== "COMPLETED" && r.status !== "DISPENSED").length;
        const dispensed = rxs.filter((r) => r.status === "COMPLETED" || r.status === "DISPENSED").length;
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
        setPharmacistRecent(txRows.slice(0, 4));

        rxs.forEach((r) => {
          const d = r.prescriptionDate || r.date;
          if (!d) return;
          const ym = d.slice(0, 7);
          const found = months.find((m) => m.yearMonth === ym);
          if (found) found.value += 1;
        });
        setChartValues(months.map(({ label, value }) => ({ label, value })));
      });
    } else if (role === "user" || role === "cashier") {
      // Cashier
      Promise.all([
        billingApi.getAllBills().catch(() => []),
        billingApi.getAllPayments().catch(() => []),
      ]).then(([bills, payments]) => {
        if (!isMounted) return;
        const pendingCount = bills.filter(
          (b) => b.status === "UNPAID" || b.status === "PARTIALLY_PAID" || b.status === "pending"
        ).length;
        const paidCount = bills.filter((b) => b.status === "PAID" || b.status === "paid").length;
        const refundCount = payments.filter(
          (p) => p.status === "REFUNDED" || p.status === "REFUND_PENDING" || (p.refundAmount && p.refundAmount > 0)
        ).length;

        setCashierStats([
          { label: "Total Invoices", value: String(bills.length), icon: STAT_ICONS.records, color: "primary" },
          { label: "Pending Payments", value: String(pendingCount), icon: STAT_ICONS.clock, color: "warning" },
          { label: "Paid Invoices", value: String(paidCount), icon: STAT_ICONS.check, color: "success" },
          { label: "Refund Requests", value: String(refundCount), icon: STAT_ICONS.alert, color: "primary" },
        ]);

        const sortedBills = [...bills].sort((a, b) => {
          const dateA = a.billDate || a.date || "";
          const dateB = b.billDate || b.date || "";
          if (dateB !== dateA) return dateB.localeCompare(dateA);
          return (Number(b.id) || 0) - (Number(a.id) || 0);
        });

        setCashierRecent(
          sortedBills.slice(0, 4).map((b) => ({
            id: b.billNumber || b.billCode || String(b.id),
            patient: b.patientName || `Patient #${b.patientId || ""}`,
            amount: `LKR ${Number(b.totalAmount || 0).toLocaleString()}`,
            status: (b.status || "PENDING").toLowerCase(),
          }))
        );

        bills.forEach((b) => {
          const d = b.billDate || b.date;
          if (!d) return;
          const ym = d.slice(0, 7);
          const found = months.find((m) => m.yearMonth === ym);
          if (found) found.value += 1;
        });
        setChartValues(months.map(({ label, value }) => ({ label, value })));
      });
    } else if (role === "receptionist") {
      Promise.all([
        appointmentApi.getAllAppointments().catch(() => []),
        billingApi.getAllBills().catch(() => []),
      ]).then(([appts, bills]) => {
        if (!isMounted) return;
        const todayIso = new Date().toISOString().slice(0, 10);
        const inQueue = appts.filter(
          (a) => (a.appointmentDate || a.date) === todayIso && a.status === "CHECKED_IN"
        ).length;
        const checkedInToday = appts.filter(
          (a) =>
            (a.appointmentDate || a.date) === todayIso &&
            (a.status === "CHECKED_IN" || a.status === "IN_CONSULTATION" || a.status === "COMPLETED")
        ).length;
        const operationalPatients = new Set(appts.map((a) => a.patientId || a.patient).filter(Boolean)).size;
        const pendingBills = bills.filter(
          (b) => b.status === "UNPAID" || b.status === "PARTIALLY_PAID" || b.status === "pending"
        ).length;

        setReceptionistStats([
          { label: "Active queue", value: String(inQueue), icon: STAT_ICONS.clock, color: "primary" },
          { label: "Checked in today", value: String(checkedInToday), icon: STAT_ICONS.check, color: "success" },
          { label: "Registered patients", value: String(operationalPatients), icon: STAT_ICONS.users, color: "primary" },
          { label: "Pending bills", value: String(pendingBills), icon: STAT_ICONS.wallet, color: "warning" },
        ]);

        const todayAppts = appts.filter((a) => (a.appointmentDate || a.date) === todayIso);
        setReceptionistRecent(
          todayAppts.slice(0, 4).map((a, idx) => ({
            queueNumber: `Q-${idx + 1}`,
            patient: a.patientName || a.patient || "Patient",
            service: a.appointmentType || a.service || "General Checkup",
            status: (a.status || "CONFIRMED").toLowerCase(),
          }))
        );

        appts.forEach((a) => {
          const d = a.appointmentDate || a.date;
          if (!d) return;
          const ym = d.slice(0, 7);
          const found = months.find((m) => m.yearMonth === ym);
          if (found) found.value += 1;
        });
        setChartValues(months.map(({ label, value }) => ({ label, value })));
      });
    }

    return () => {
      isMounted = false;
    };
  }, [role, user?.id, user?.patientId]);

  const liveStats = useMemo(() => {
    switch (role) {
      case "cashier":
      case "user": {
        if (cashierStats) return cashierStats;
        return [
          { label: "Total Invoices", value: "0", icon: STAT_ICONS.records, color: "primary" },
          { label: "Pending Payments", value: "0", icon: STAT_ICONS.clock, color: "warning" },
          { label: "Paid Invoices", value: "0", icon: STAT_ICONS.check, color: "success" },
          { label: "Refund Requests", value: "0", icon: STAT_ICONS.alert, color: "primary" },
        ];
      }
      case "patient": {
        if (patientStats) return patientStats;
        return [
          {
            label: "Upcoming Appointments",
            value: "0",
            icon: STAT_ICONS.calendar,
            color: "primary",
            subtitle: "No upcoming visits",
          },
          {
            label: "Dental Records",
            value: "0",
            icon: STAT_ICONS.tooth,
            color: "primary",
            subtitle: "Clinical records",
          },
          {
            label: "Active Prescriptions",
            value: "0",
            icon: STAT_ICONS.pill,
            color: "primary",
            badge: "None",
            badgeType: "neutral",
            subtitle: "No active Rx",
          },
          {
            label: "Billing Balance",
            value: "LKR 0",
            icon: STAT_ICONS.wallet,
            color: "success",
            subtitle: "Fully settled",
          },
        ];
      }
      case "doctor": {
        if (doctorStats) return doctorStats;
        return [
          { label: "Today's visits", value: "0", icon: STAT_ICONS.calendar, color: "primary" },
          { label: "My patients", value: "0", icon: STAT_ICONS.users, color: "primary" },
          { label: "Treatment plans", value: "0", icon: STAT_ICONS.check, color: "success" },
          { label: "Medical records", value: "0", icon: STAT_ICONS.records, color: "warning" },
        ];
      }
      case "admin": {
        if (adminStats) return adminStats;
        return [
          { label: "Registered users", value: "0", icon: STAT_ICONS.users, color: "primary" },
          { label: "All appointments", value: "0", icon: STAT_ICONS.calendar, color: "primary" },
          { label: "Total revenue", value: "LKR 0", icon: STAT_ICONS.revenue, color: "success" },
          { label: "Low stock items", value: "0", icon: STAT_ICONS.alert, color: "success" },
        ];
      }
      case "receptionist": {
        if (receptionistStats) return receptionistStats;
        return [
          { label: "Active queue", value: "0", icon: STAT_ICONS.clock, color: "primary" },
          { label: "Checked in today", value: "0", icon: STAT_ICONS.check, color: "success" },
          { label: "Registered patients", value: "0", icon: STAT_ICONS.users, color: "primary" },
          { label: "Pending bills", value: "0", icon: STAT_ICONS.wallet, color: "warning" },
        ];
      }
      case "pharmacist": {
        if (pharmacistStats) return pharmacistStats;
        return [
          { label: "Ready to dispense", value: "0", icon: STAT_ICONS.clock, color: "primary" },
          { label: "Dispensed items", value: "0", icon: STAT_ICONS.check, color: "success" },
          { label: "Inventory catalog", value: "0", icon: STAT_ICONS.box, color: "primary" },
          { label: "Low stock alerts", value: "0", icon: STAT_ICONS.alert, color: "success" },
        ];
      }
      default:
        return [
          { label: "Activity", value: "Active", icon: STAT_ICONS.check, color: "primary" },
        ];
    }
  }, [role, cashierStats, patientStats, doctorStats, adminStats, receptionistStats, pharmacistStats]);

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
      case "cashier":
      case "user":
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
        title: "Recent Stock Transactions",
        columns: [
          { key: "medicine", label: "Medicine" },
          { key: "type", label: "Type" },
          { key: "quantity", label: "Qty" },
          { key: "status", label: "Status", type: "status" },
        ],
        rows: pharmacistRecent || [],
        link: `/${role}/transactions`,
      };
    }
    if (role === "admin") {
      return {
        title: "System Events & Audit Log",
        columns: [
          { key: "name", label: "Event" },
          { key: "detail", label: "Detail" },
          { key: "status", label: "Status", type: "status" },
        ],
        rows: adminRecent || [],
        link: `/${role}/audit`,
      };
    }
    if (role === "receptionist") {
      return {
        title: "Front Desk Patient Queue",
        columns: [
          { key: "queueNumber", label: "Token" },
          { key: "patient", label: "Patient" },
          { key: "service", label: "Service" },
          { key: "status", label: "Status", type: "status" },
        ],
        rows: receptionistRecent || [],
        link: `/${role}/queue`,
      };
    }
    if (role === "user" || role === "cashier") {
      return {
        title: "Recent Invoices & Transactions",
        columns: [
          { key: "id", label: "Invoice #" },
          { key: "patient", label: "Patient" },
          { key: "amount", label: "Amount" },
          { key: "status", label: "Status", type: "status" },
        ],
        rows: cashierRecent || [],
        link: `/${role === "cashier" ? "user" : role}/invoices`,
      };
    }
    if (role === "doctor") {
      return {
        title: "Today's Consultations & Visits",
        columns: [
          { key: "patient", label: "Patient" },
          { key: "service", label: "Service" },
          { key: "time", label: "Time" },
          { key: "status", label: "Status", type: "status" },
        ],
        rows: doctorRecent || [],
        link: `/${role}/today`,
      };
    }
    return {
      title: "Upcoming Appointments & Care",
      columns: [
        { key: "doctor", label: "Doctor" },
        { key: "service", label: "Service" },
        { key: "date", label: "Date" },
        { key: "status", label: "Status", type: "status" },
      ],
      rows: patientRecent || [],
      link: `/${role}/appointments`,
    };
  }, [role, pharmacistRecent, adminRecent, receptionistRecent, cashierRecent, doctorRecent, patientRecent]);

  const displayAppts = (patientApptsList && patientApptsList.length > 0) ? patientApptsList.slice(0, 3) : [];

  return (
    <div className={`df-role-page df-role-${meta.accent}`}>
      {role === "patient" ? (
        <header className="df-dashboard-welcome df-patient-welcome-banner">
          <div className="df-welcome-left-content">
            <div className="df-welcome-date-chip">
              <span className="df-pulse-dot" />
              <span>{formatDashboardDate()}</span>
            </div>
            <h1>Welcome back, {user?.name?.split(" ")[0] || "Sarah"}! 👋</h1>
            <p>Track your oral health, upcoming visits, and medical prescriptions in real time.</p>
            <div className="df-welcome-script-quote">
              “A confident smile for a brighter tomorrow.”
            </div>
          </div>
          <div className="df-welcome-promo-pill">
            <div className="df-promo-pill-sub">YOUR SMILE</div>
            <div className="df-promo-pill-title">Our Priority</div>
            <div className="df-promo-pill-brand">
              <span className="df-promo-sparkle">✦</span> DentaFlow Care
            </div>
          </div>
        </header>
      ) : (
        <header className="df-dashboard-welcome">
          <div>
            <span className="df-section-label">{meta.name} workspace</span>
            <h1>Welcome back, {user?.name?.split(" ")[0] || "User"} 👋</h1>
            <p>Real-time dental practice operations, patient records, and care priorities.</p>
          </div>
          <div className="df-welcome-date">
            <strong>Clinic Status</strong>
            <span>Operations active & synced</span>
          </div>
        </header>
      )}

      <div className="df-stat-grid">
        {liveStats.map((item) => (
          <StatCard
            key={item.label}
            label={item.label}
            value={item.value}
            icon={item.icon}
            color={item.color}
            trend={item.trend}
            trendLabel={item.trendLabel}
            badge={item.badge}
            badgeType={item.badgeType}
            subtitle={item.subtitle}
          />
        ))}
      </div>

      {role === "patient" ? (
        <div className="df-patient-dashboard-grid">
          {/* Col 1: Upcoming Appointments */}
          <section className="df-card df-upcoming-appts-card">
            <div className="df-card-body">
              <div className="df-card-title-row">
                <h3>Upcoming Appointments</h3>
                <Link to="/patient/appointments" className="df-text-link">
                  View All &gt;
                </Link>
              </div>
              <div className="df-appts-list">
                {displayAppts.length === 0 ? (
                  <div className="df-patient-empty">
                    <div className="df-patient-empty-icon">📅</div>
                    <strong>No upcoming appointments</strong>
                    <p>
                      You have no visits scheduled. Book a consultation with our dental surgeons.
                    </p>
                    <Link to="/patient/book-appointment" className="df-btn df-btn-primary df-btn-sm">
                      Book Appointment
                    </Link>
                  </div>
                ) : (
                  displayAppts.map((appt) => {
                    const { day, month } = parseDateBox(appt.appointmentDate || appt.date);
                    const st = (appt.status || "CONFIRMED").toLowerCase();
                    return (
                      <div className="df-appt-item" key={appt.id}>
                        <div className="df-appt-date-box">
                          <span className="df-date-day">{day}</span>
                          <span className="df-date-month">{month}</span>
                        </div>
                        <div className="df-appt-info">
                          <strong className="df-appt-title">{appt.appointmentType || appt.service || "Routine Dental Checkup"}</strong>
                          <span className="df-appt-doc">{appt.dentistName || appt.doctor || "Attending Dentist"}</span>
                          <span className="df-appt-time">🕒 {appt.startTime || appt.time || "10:00 AM"}</span>
                        </div>
                        <div className="df-appt-status-col">
                          <span className={`df-status-capsule df-status-${st}`}>
                            {st === "confirmed" ? "Confirmed" : st === "pending" ? "Pending" : "Scheduled"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          {/* Col 2: Recent Activities */}
          <section className="df-card df-recent-activities-card">
            <div className="df-card-body">
              <div className="df-card-title-row">
                <h3>Recent Activities</h3>
                <Link to="/patient/appointments" className="df-text-link">
                  View All &gt;
                </Link>
              </div>
              <div className="df-patient-activities-list">
                {patientRecent && patientRecent.length > 0 ? (
                  patientRecent.map((act, idx) => (
                    <div className="df-patient-activity-item" key={idx}>
                      <div className="df-activity-icon-sq df-act-blue">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                      </div>
                      <div className="df-activity-content">
                        <strong>{act.service || act.doctor}</strong>
                        <small>{act.date} · {act.status.toUpperCase()}</small>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="df-patient-empty">
                    <div className="df-patient-empty-icon">⏱</div>
                    <strong>No recent activity</strong>
                    <p>
                      Your clinical appointments and procedures will appear here once recorded.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Col 3: Quick Actions */}
          <section className="df-card df-patient-actions-card">
            <div className="df-card-body">
              <div className="df-card-title-row">
                <h3>Quick Actions</h3>
              </div>
              <div className="df-patient-actions-list">
                <Link to="/patient/book-appointment" className="df-patient-action-pill">
                  <div className="df-action-pill-left">
                    <span className="df-action-pill-icon df-pill-blue">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    </span>
                    <span className="df-action-pill-text">Book Appointment</span>
                  </div>
                  <span className="df-action-pill-arrow">›</span>
                </Link>
                <Link to="/patient/appointments" className="df-patient-action-pill">
                  <div className="df-action-pill-left">
                    <span className="df-action-pill-icon df-pill-blue">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    </span>
                    <span className="df-action-pill-text">View Appointments</span>
                  </div>
                  <span className="df-action-pill-arrow">›</span>
                </Link>
                <Link to="/patient/records" className="df-patient-action-pill">
                  <div className="df-action-pill-left">
                    <span className="df-action-pill-icon df-pill-blue">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                    </span>
                    <span className="df-action-pill-text">Medical Records</span>
                  </div>
                  <span className="df-action-pill-arrow">›</span>
                </Link>
                <Link to="/patient/prescriptions" className="df-patient-action-pill">
                  <div className="df-action-pill-left">
                    <span className="df-action-pill-icon df-pill-blue">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" /><path d="m8.5 8.5 7 7" /></svg>
                    </span>
                    <span className="df-action-pill-text">Prescriptions</span>
                  </div>
                  <span className="df-action-pill-arrow">›</span>
                </Link>
                <Link to="/patient/billing" className="df-patient-action-pill">
                  <div className="df-action-pill-left">
                    <span className="df-action-pill-icon df-pill-blue">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
                    </span>
                    <span className="df-action-pill-text">Payments & Billing</span>
                  </div>
                  <span className="df-action-pill-arrow">›</span>
                </Link>
                <Link to="/patient/reviews" className="df-patient-action-pill">
                  <div className="df-action-pill-left">
                    <span className="df-action-pill-icon df-pill-blue">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                    </span>
                    <span className="df-action-pill-text">Write Review</span>
                  </div>
                  <span className="df-action-pill-arrow">›</span>
                </Link>
              </div>
            </div>
          </section>

          {/* Col 4: Vertical Promo Card */}
          <section className="df-card df-patient-promo-vertical">
            <div className="df-promo-vertical-content">
              <h3 className="df-promo-script-title">
                A Healthier Smile,<br />A Happier You
              </h3>
              <p className="df-promo-subtitle">Precision dentistry designed around your unique comfort.</p>
              <div className="df-promo-illustration-wrapper">
                <ToothIllustration variant="promo" size={130} />
              </div>
              <Link to="/patient/book-appointment" className="df-promo-circle-btn" aria-label="Book appointment now">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>
          </section>
        </div>
      ) : (
        <>
          <div className="df-overview-grid">
            <MiniBarChart
              title={meta.chart}
              values={chartValues}
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
                  <h3>{recentData.title || "Recent activity"}</h3>
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
        </>
      )}
    </div>
  );
}

export { AccountPage };

export function AnalyticsView({ role }) {
  const meta = roleMeta[role] || roleMeta.admin;
  const [liveKpis, setLiveKpis] = useState(null);
  const [chartValues, setChartValues] = useState(() =>
    getRecentMonths().map(({ label, value }) => ({ label, value }))
  );
  const [serviceCategories, setServiceCategories] = useState([
    { name: "Orthodontics & Braces", share: 0, revenue: "LKR 0" },
    { name: "Dental Implants & Crowns", share: 0, revenue: "LKR 0" },
    { name: "Cosmetic & Teeth Whitening", share: 0, revenue: "LKR 0" },
    { name: "General Checkup & Scaling", share: 0, revenue: "LKR 0" },
  ]);

  useEffect(() => {
    let active = true;
    const months = getRecentMonths();

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
      const activePatients = new Set(appts.map((a) => a.patientId).filter(Boolean)).size;

      setLiveKpis([
        { label: "Total Revenue", value: formatLKR(totalPayments), icon: "✓", color: "success" },
        { label: "Total Appointments", value: String(appts.length), icon: "◷", color: "primary" },
        { label: "Active Patients", value: String(activePatients), icon: "◫", color: "primary" },
        { label: "Low-Stock Alerts", value: String(lowStock), icon: "◈", color: lowStock > 0 ? "warning" : "success" },
      ]);

      appts.forEach((a) => {
        const d = a.appointmentDate || a.date;
        if (!d) return;
        const ym = d.slice(0, 7);
        const found = months.find((m) => m.yearMonth === ym);
        if (found) found.value += 1;
      });
      setChartValues(months.map(({ label, value }) => ({ label, value })));

      if (bills.length > 0 && totalPayments > 0) {
        setServiceCategories([
          { name: "Orthodontics & Braces", share: 0, revenue: "LKR 0" },
          { name: "Dental Implants & Crowns", share: 0, revenue: "LKR 0" },
          { name: "Cosmetic & Teeth Whitening", share: 0, revenue: "LKR 0" },
          { name: "General Checkup & Scaling", share: 0, revenue: "LKR 0" },
        ]);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const kpis = liveKpis || [
    { label: "Total Revenue", value: "LKR 0", icon: "✓", color: "success" },
    { label: "Total Appointments", value: "0", icon: "◷", color: "primary" },
    { label: "Active Patients", value: "0", icon: "◫", color: "primary" },
    { label: "Low-Stock Alerts", value: "0", icon: "◈", color: "success" },
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
          values={chartValues}
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

  const [dentists, setDentists] = useState([]);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    age: "",
    gender: "Male",
    bloodGroup: "O+",
    doctor: "",
    allergies: "None reported",
  });
  const [submitting, setSubmitting] = useState(false);
  const [dbPatients, setDbPatients] = useState(null);

  useEffect(() => {
    let ignore = false;
    Promise.all([
      patientApi.getAllPatients().catch(() => null),
      dentistApi.getAllDentists().catch(() => []),
    ]).then(([patientsData, dentistsData]) => {
      if (!ignore) {
        if (patientsData) setDbPatients(patientsData);
        if (Array.isArray(dentistsData)) {
          const activeDentists = dentistsData.filter((d) => (d.status || "").toLowerCase() === "active");
          setDentists(activeDentists);
          if (activeDentists.length > 0) {
            setForm((prev) => ({
              ...prev,
              doctor: (prev.doctor && activeDentists.some((d) => d.name === prev.doctor))
                ? prev.doctor
                : (activeDentists[0].name || `Dr. ${activeDentists[0].firstName} ${activeDentists[0].lastName}`),
            }));
          } else {
            setForm((prev) => ({ ...prev, doctor: "" }));
          }
        }
      }
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
        doctor: dentists[0]?.name || "",
        allergies: "None reported",
      });
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.response?.data || err.message || "Failed to register patient in clinic database";
      addToast(typeof msg === "string" ? msg : "Registration failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const patientUsers = dbPatients !== null ? dbPatients : [];

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
                  {dentists.map((doc) => (
                    <option key={doc.id} value={doc.name || `Dr. ${doc.firstName} ${doc.lastName}`}>
                      {doc.name || `Dr. ${doc.firstName} ${doc.lastName}`} ({doc.specialization || "General Dentistry"})
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
  const [services, setServices] = useState([]);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [appointmentsList, setAppointmentsList] = useState([]);
  const [bookingWindow, setBookingWindow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const todayIso = useMemo(() => new Date().toISOString().split("T")[0], []);

  const [form, setForm] = useState({
    patient: role === "patient" ? user?.name || "Patient" : "",
    patientId: "",
    doctorId: "",
    serviceId: "",
    date: todayIso,
    time: "09:00 AM",
    notes: "",
    checkInNow: false,
  });

  // 1. Initial data load (Dentists, Patients, Booking Window, Initial Appointments)
  useEffect(() => {
    let mounted = true;

    async function loadInitialData() {
      // 1. Load Dentists
      let loadedDentists = [];
      try {
        const dList = await dentistApi.getAllDentists();
        if (mounted && Array.isArray(dList)) {
          const activeDocs = dList.filter((d) => (d.status || "").toLowerCase() === "active");
          loadedDentists = activeDocs;
          setDentists(loadedDentists);
          if (loadedDentists.length > 0) {
            setForm((prev) => ({
              ...prev,
              doctorId: (prev.doctorId && loadedDentists.some((d) => String(d.id) === String(prev.doctorId)))
                ? prev.doctorId
                : String(loadedDentists[0].id),
            }));
          } else {
            setForm((prev) => ({ ...prev, doctorId: "" }));
          }
        }
      } catch (dErr) {
        console.warn("Could not load dentists:", dErr);
      }

      // 2. Load Services
      try {
        const sList = await servicesApi.getServices();
        if (mounted && Array.isArray(sList) && sList.length > 0) {
          setServices(sList);
          setForm((prev) => ({
            ...prev,
            serviceId: prev.serviceId || String(sList[0].id),
          }));
        }
      } catch (sErr) {
        console.warn("Could not load services:", sErr);
      }

      // 3. Load Booking Window & smart default date
      try {
        const bw = await appointmentApi.getBookingWindow();
        if (mounted && bw) {
          setBookingWindow(bw);
          const currentHour = new Date().getHours();
          let defaultDate = bw.today || todayIso;
          // If past 5:00 PM (17:00), default to tomorrow if available
          if (currentHour >= 17) {
            const tmrw = new Date(Date.now() + 86400000).toISOString().split("T")[0];
            if (!bw.maximumBookingDate || tmrw <= bw.maximumBookingDate) {
              defaultDate = tmrw;
            }
          }
          setForm((prev) => ({ ...prev, date: prev.date || defaultDate }));
        }
      } catch (bwErr) {
        console.warn("Could not load booking window:", bwErr);
      }

      // 4. Load Patient details
      if (role === "patient") {
        if (user?.id) {
          try {
            const p = await patientApi.getPatientByUserId(user.id);
            if (mounted && p) {
              setCurrentPatient(p);
              setForm((prev) => ({
                ...prev,
                patient: p.name || user?.name || "Patient",
                patientId: String(p.id),
              }));
              const appts = await appointmentApi.getPatientAppointments(p.id).catch(() => []);
              if (mounted && Array.isArray(appts)) {
                const dLookup = {};
                loadedDentists.forEach((d) => { dLookup[d.id] = d; });
                const pLookup = { [p.id]: p };
                setAppointmentsList(appts.map((a) => normalizeAppointment(a, dLookup, pLookup)));
              }
            }
          } catch (pErr) {
            console.warn("Could not load patient profile:", pErr);
          }
        }
      } else {
        // Receptionist/Admin - load all patients
        try {
          const pList = await patientApi.getAllPatients();
          if (mounted && Array.isArray(pList) && pList.length > 0) {
            setPatients(pList);
            setForm((prev) => ({
              ...prev,
              patientId: prev.patientId || String(pList[0].id),
              patient: prev.patient || pList[0].name,
            }));
          }
          const appts = await appointmentApi.getAllAppointments().catch(() => []);
          if (mounted && Array.isArray(appts)) {
            const dLookup = {};
            loadedDentists.forEach((d) => { dLookup[d.id] = d; });
            const pLookup = {};
            (pList || []).forEach((p) => { pLookup[p.id] = p; });
            setAppointmentsList(appts.map((a) => normalizeAppointment(a, dLookup, pLookup)));
          }
        } catch (staffErr) {
          console.warn("Could not load staff booking data:", staffErr);
        }
      }
    }

    loadInitialData().finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [role, user?.id, user?.name, todayIso]);

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
      if (!currentPatient?.id && user?.id) {
        try {
          const resolved = await patientApi.getPatientByUserId(user.id);
          if (resolved?.id) {
            targetPatientId = resolved.id;
            setCurrentPatient(resolved);
          }
        } catch (rErr) {
          console.warn("Could not resolve patient:", rErr);
        }
      } else if (currentPatient?.id) {
        targetPatientId = currentPatient.id;
      }

      if (!targetPatientId) {
        addToast("Please complete your patient profile before booking appointments.", "error");
        return;
      }
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

    const doc = dentists.find((d) => String(d.id) === String(form.doctorId)) || dentists[0];
    const srv = services.find((s) => String(s.id) === String(form.serviceId)) || services[0] || { name: "Dental Consultation" };

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

  const currentAppointments = appointmentsList;

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
                  {services.length === 0 ? (
                    <option value="">General Dental Consultation</option>
                  ) : (
                    services.map((srv) => (
                      <option key={srv.id} value={srv.id}>
                        {srv.name} {srv.price ? `(${srv.price})` : ""}
                      </option>
                    ))
                  )}
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
          {currentAppointments.length === 0 ? (
            <EmptyState
              title="No Scheduled Appointments"
              description="No clinical appointments have been scheduled yet. Choose an available slot above to book your visit."
            />
          ) : (
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
          )}
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
  if (page === "overview") return role === "admin" ? renderAdminPage("overview") : <Overview role={role} />;
  if (page === "profile" || page === "settings") return <AccountPage role={role} section={page} />;
  if (page === "notifications") return <NotificationCenterView role={role} />;
  if (page === "analytics") return <AnalyticsView role={role} />;
  if (page === "register-patient") return <RegisterPatientView role={role} />;
  if (page === "book-appointment" || page === "book") return <DashboardBookingView role={role} />;
  if (page === "schedule" || page === "schedules" || page === "availability") return role === "admin" ? renderAdminPage("schedules") : <ScheduleView role={role} />;
  if (page === "treatment-plans") return <DoctorTreatmentPlansView role={role} />;
  if (page === "messages") return <DoctorMessagesView role={role} />;
  if (page === "queue") return <QueueBoardView role={role} />;
  // Pharmacist dedicated views (Strict page separation across all 8 modules)
  if (role === "pharmacist") {
    if (page === "prescriptions") return <PharmacistPrescriptionsView role={role} />;
    if (page === "dispense") return <PharmacistDispenseView role={role} />;
    if (page === "inventory") return <PharmacistInventoryView role={role} />;
    if (page === "purchase-requests" || page === "requests" || page === "medicine-requests") return <PharmacistPurchaseRequestsView role={role} />;
    if (page === "low-stock") return <PharmacistLowStockView role={role} />;
    if (page === "suppliers") return <PharmacistSuppliersView role={role} />;
    if (page === "stock-transactions" || page === "transactions") return <PharmacistStockTransactionsView role={role} />;
    if (page === "medicine-history" || page === "history") return <PharmacistMedicineHistoryView role={role} />;
    if (page === "reports") return <PharmacistReportsView role={role} />;
  }

  if (page === "suppliers") return <SuppliersView role={role} />;

  // Admin custom workspace pages (gate intercepts before legacy admin views)
  if (role === "admin") {
    const adminView = renderAdminPage(page);
    if (adminView) return adminView;
  }

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
  if ((role === "user" || role === "cashier") && page === "reports") return <CashierReports role={role} />;
  if (page === "reports") return <AdminReportsView role={role} />;

  if (page === "audit") return <AdminAuditLogsView role={role} />;
  if (page === "reviews" || page === "feedback") return <PatientReviewsView role={role} />;
  if (page === "patients") return <PatientDirectoryView role={role} />;

  // Doctor dedicated views
  if (role === "doctor" && page === "today") return <DoctorTodayView role={role} />;
  if (role === "doctor" && page === "appointments") return <DoctorAppointmentsView role={role} />;
  if (role === "doctor" && page === "records") return <DoctorRecordsView role={role} />;
  if (role === "doctor" && page === "history") return <DoctorMedicalHistoryView role={role} />;
  if (role === "doctor" && page === "prescriptions") return <DoctorPrescriptionsView role={role} />;

  // Patient dedicated views
  if (role === "patient" && (page === "appointments" || page === "history")) {
    return <PatientAppointmentsView role={role} isHistory={page === "history"} />;
  }
  if (role === "patient" && page === "prescriptions") return <PatientPrescriptionsView role={role} />;
  if (role === "patient" && page === "records") return <PatientRecordsView role={role} />;
  if (role === "patient" && (page === "billing" || page === "payments")) return <PatientBillingView role={role} />;

  // Receptionist & Admin dedicated appointment view
  if ((role === "receptionist" || role === "admin") && page === "appointments") {
    return <ReceptionistAppointmentsView role={role} />;
  }

  // Admin inventory views
  if (role === "admin" && page === "inventory") {
    return <PharmacistInventoryView role={role} />;
  }
  if (role === "admin" && page === "low-stock") {
    return <PharmacistLowStockView role={role} />;
  }

  // Cashier & Billing views (Separated per business responsibility)
  if (
    (role === "user" || role === "cashier" || role === "receptionist" || role === "admin") &&
    (page === "payments" || page === "invoices" || page === "pending" || page === "refunds" || page === "billing" || page === "history")
  ) {
    if (page === "invoices") return <CashierInvoicesView role={role} />;
    if (page === "pending") return <CashierPendingView role={role} />;
    if (page === "history") return <CashierHistoryView role={role} />;
    if (page === "refunds") return <CashierRefundsView role={role} />;
    return <CashierPaymentsView role={role} />;
  }

  return <ResourcePage role={role} page={page} />;
}
