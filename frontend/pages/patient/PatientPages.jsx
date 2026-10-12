import {
  PatientAppointmentsView,
  PatientPrescriptionsView,
  PatientRecordsView,
  PatientBillingView,
  PatientReviewsView,
} from "../../components/dashboard/views/PatientViews";
import { NotificationCenterView } from "../../components/dashboard/views/NotificationCenterView";
import { Overview, DashboardBookingView } from "../shared/DashboardPage";
import ProfilePage from "../profile/ProfilePage";
import SettingsPage from "../profile/SettingsPage";

export function PatientDashboardPage() {
  return <Overview role="patient" />;
}

export function PatientAppointmentsPage() {
  return <PatientAppointmentsView role="patient" isHistory={false} />;
}

export function PatientBookAppointmentPage() {
  return <DashboardBookingView role="patient" />;
}

export function PatientHistoryPage() {
  return <PatientAppointmentsView role="patient" isHistory={true} />;
}

export function PatientRecordsPage() {
  return <PatientRecordsView role="patient" />;
}

export function PatientPrescriptionsPage() {
  return <PatientPrescriptionsView role="patient" />;
}

export function PatientBillingPage() {
  return <PatientBillingView role="patient" />;
}

export function PatientReviewsPage() {
  return <PatientReviewsView role="patient" />;
}

export function PatientNotificationsPage() {
  return <NotificationCenterView role="patient" />;
}

export function PatientProfilePage() {
  return <ProfilePage role="patient" />;
}

export function PatientSettingsPage() {
  return <SettingsPage role="patient" />;
}
