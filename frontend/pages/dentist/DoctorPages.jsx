import {
  DoctorTodayView,
  DoctorAppointmentsView,
  DoctorRecordsView,
  DoctorMedicalHistoryView,
  DoctorTreatmentPlansView,
  DoctorPrescriptionsView,
  DoctorMessagesView,
  ScheduleView,
} from "../../components/dashboard/views/DoctorViews";
import { PatientDirectoryView } from "../../components/dashboard/views/PatientDirectoryView";
import { NotificationCenterView } from "../../components/dashboard/views/NotificationCenterView";

export function DoctorTodayPage() {
  return <DoctorTodayView role="doctor" />;
}

export function DoctorAppointmentsPage() {
  return <DoctorAppointmentsView role="doctor" />;
}

export function DoctorPatientsPage() {
  return <PatientDirectoryView role="doctor" />;
}

export function DoctorRecordsPage() {
  return <DoctorRecordsView role="doctor" />;
}

export function DoctorHistoryPage() {
  return <DoctorMedicalHistoryView role="doctor" />;
}

export function DoctorTreatmentPlansPage() {
  return <DoctorTreatmentPlansView role="doctor" />;
}

export function DoctorPrescriptionsPage() {
  return <DoctorPrescriptionsView role="doctor" />;
}

export function DoctorMessagesPage() {
  return <DoctorMessagesView role="doctor" />;
}

export function DoctorSchedulePage() {
  return <ScheduleView role="doctor" />;
}

export function DoctorNotificationsPage() {
  return <NotificationCenterView role="doctor" />;
}
