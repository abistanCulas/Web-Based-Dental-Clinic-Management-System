import {
  PharmacistDispensingView,
  PharmacistInventoryView,
  StockTransactionsView,
} from "../../components/dashboard/views/PharmacistViews";
import { SuppliersView } from "../../components/dashboard/views/AdminViews";
import { NotificationCenterView } from "../../components/dashboard/views/NotificationCenterView";
import PharmacistReports from "./PharmacistReports";
import { Overview } from "../shared/DashboardPage";
import ProfilePage from "../profile/ProfilePage";
import SettingsPage from "../profile/SettingsPage";

export { default as PharmacistReports } from "./PharmacistReports";

export function PharmacistDashboardPage() {
  return <Overview role="pharmacist" />;
}

export function PharmacistPrescriptionsPage() {
  return <PharmacistDispensingView role="pharmacist" page="prescriptions" />;
}

export function PharmacistDispensePage() {
  return <PharmacistDispensingView role="pharmacist" page="dispense" />;
}

export function PharmacistInventoryPage() {
  return <PharmacistInventoryView role="pharmacist" page="inventory" />;
}

export function PharmacistLowStockPage() {
  return <PharmacistInventoryView role="pharmacist" page="low-stock" />;
}

export function PharmacistSuppliersPage() {
  return <SuppliersView role="pharmacist" />;
}

export function PharmacistTransactionsPage() {
  return <StockTransactionsView role="pharmacist" page="transactions" />;
}

export function PharmacistHistoryPage() {
  return <StockTransactionsView role="pharmacist" page="history" />;
}

export function PharmacistReportsPage() {
  return <PharmacistReports role="pharmacist" />;
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
