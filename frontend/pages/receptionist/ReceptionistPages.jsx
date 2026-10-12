import {
  QueueBoardView,
  ReceptionistAppointmentsView,
} from "../../components/dashboard/views/ReceptionistViews";
import { PatientDirectoryView } from "../../components/dashboard/views/PatientDirectoryView";
import { CashierBillingView } from "../../components/dashboard/views/CashierViews";
import { ScheduleView } from "../../components/dashboard/views/DoctorViews";
import { NotificationCenterView } from "../../components/dashboard/views/NotificationCenterView";
import {
  Overview,
  RegisterPatientView,
  DashboardBookingView,
} from "../shared/DashboardPage";
import ProfilePage from "../profile/ProfilePage";
import SettingsPage from "../profile/SettingsPage";

export function ReceptionistDashboardPage() {
  return <Overview role="receptionist" />;
}

export function ReceptionistRegisterPatientPage() {
  return <RegisterPatientView role="receptionist" />;
}

export function ReceptionistPatientsPage() {
  return <PatientDirectoryView role="receptionist" />;
}

export function ReceptionistAppointmentsPage() {
  return <ReceptionistAppointmentsView role="receptionist" />;
}

export function ReceptionistBookAppointmentPage() {
  return <DashboardBookingView role="receptionist" />;
}

export function ReceptionistSchedulePage() {
  return <ScheduleView role="receptionist" />;
}

export function ReceptionistQueuePage() {
  return <QueueBoardView role="receptionist" />;
}

export function ReceptionistBillingPage() {
  return <CashierBillingView role="receptionist" page="billing" />;
}

export function ReceptionistPaymentsPage() {
  return <CashierBillingView role="receptionist" page="payments" />;
}

export function ReceptionistNotificationsPage() {
  return <NotificationCenterView role="receptionist" />;
}

export function ReceptionistProfilePage() {
  return <ProfilePage role="receptionist" />;
}

export function ReceptionistSettingsPage() {
  return <SettingsPage role="receptionist" />;
}
