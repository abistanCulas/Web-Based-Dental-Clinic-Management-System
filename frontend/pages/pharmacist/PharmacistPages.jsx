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
} from "../../components/dashboard/views/PharmacistViews";
import { NotificationCenterView } from "../../components/dashboard/views/NotificationCenterView";
import { Overview } from "../shared/DashboardPage";
import ProfilePage from "../profile/ProfilePage";
import SettingsPage from "../profile/SettingsPage";

export { PharmacistReportsView as PharmacistReports } from "../../components/dashboard/views/PharmacistViews";

export function PharmacistDashboardPage() {
  return <Overview role="pharmacist" />;
}

export function PharmacistPrescriptionsPage() {
  return <PharmacistPrescriptionsView role="pharmacist" />;
}

export function PharmacistDispensePage() {
  return <PharmacistDispenseView role="pharmacist" />;
}

export function PharmacistInventoryPage() {
  return <PharmacistInventoryView role="pharmacist" />;
}

export function PharmacistPurchaseRequestsPage() {
  return <PharmacistPurchaseRequestsView role="pharmacist" />;
}

export function PharmacistLowStockPage() {
  return <PharmacistLowStockView role="pharmacist" />;
}

export function PharmacistSuppliersPage() {
  return <PharmacistSuppliersView role="pharmacist" />;
}

export function PharmacistStockTransactionsPage() {
  return <PharmacistStockTransactionsView role="pharmacist" />;
}

export function PharmacistTransactionsPage() {
  return <PharmacistStockTransactionsView role="pharmacist" />;
}

export function PharmacistMedicineHistoryPage() {
  return <PharmacistMedicineHistoryView role="pharmacist" />;
}

export function PharmacistHistoryPage() {
  return <PharmacistMedicineHistoryView role="pharmacist" />;
}

export function PharmacistReportsPage() {
  return <PharmacistReportsView role="pharmacist" />;
}

export function PharmacistNotificationsPage() {
  return <NotificationCenterView role="pharmacist" />;
}

export function PharmacistProfilePage() {
  return <ProfilePage role="pharmacist" />;
}

export function PharmacistSettingsPage() {
  return <SettingsPage role="pharmacist" />;
}
