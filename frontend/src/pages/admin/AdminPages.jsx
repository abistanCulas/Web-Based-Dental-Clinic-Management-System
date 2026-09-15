import {
  AdminUsersView,
  AdminReportsView,
  AdminAuditLogsView,
  SuppliersView,
} from "../../components/dashboard/views/AdminViews";
import { PatientDirectoryView } from "../../components/dashboard/views/PatientDirectoryView";
import { ReceptionistAppointmentsView } from "../../components/dashboard/views/ReceptionistViews";
import { CashierBillingView } from "../../components/dashboard/views/CashierViews";
import { PharmacistInventoryView } from "../../components/dashboard/views/PharmacistViews";
import { NotificationCenterView } from "../../components/dashboard/views/NotificationCenterView";
import AdminFeedback from "./AdminFeedback";

export { default as AdminFeedback } from "./AdminFeedback";

export function AdminUsersPage() {
  return <AdminUsersView role="admin" filterRole="all" />;
}

export function AdminDoctorsPage() {
  return <AdminUsersView role="admin" filterRole="dentist" />;
}

export function AdminStaffPage() {
  return <AdminUsersView role="admin" filterRole="staff" />;
}

export function AdminPatientsPage() {
  return <PatientDirectoryView role="admin" />;
}

export function AdminAppointmentsPage() {
  return <ReceptionistAppointmentsView role="admin" />;
}

export function AdminPaymentsPage() {
  return <CashierBillingView role="admin" />;
}

export function AdminInventoryPage() {
  return <PharmacistInventoryView role="admin" />;
}

export function AdminSuppliersPage() {
  return <SuppliersView role="admin" />;
}

export function AdminReportsPage() {
  return <AdminReportsView role="admin" />;
}

export function AdminFeedbackPage() {
  return <AdminFeedback role="admin" />;
}

export function AdminAuditLogsPage() {
  return <AdminAuditLogsView role="admin" />;
}

export function AdminNotificationsPage() {
  return <NotificationCenterView role="admin" />;
}
