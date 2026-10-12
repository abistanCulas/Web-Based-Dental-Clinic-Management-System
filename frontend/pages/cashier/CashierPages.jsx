import {
  CashierPaymentsView,
  CashierInvoicesView,
  CashierPendingView,
  CashierHistoryView,
  CashierRefundsView,
} from "../../components/dashboard/views/CashierViews";
import { NotificationCenterView } from "../../components/dashboard/views/NotificationCenterView";
import CashierReports from "./CashierReports";

export { default as CashierReports } from "./CashierReports";

export function CashierPaymentsPage() {
  return <CashierPaymentsView role="user" />;
}

export function CashierInvoicesPage() {
  return <CashierInvoicesView role="user" />;
}

export function CashierPendingPage() {
  return <CashierPendingView role="user" />;
}

export function CashierHistoryPage() {
  return <CashierHistoryView role="user" />;
}

export function CashierRefundsPage() {
  return <CashierRefundsView role="user" />;
}

export function CashierReportsPage() {
  return <CashierReports role="user" />;
}

export function CashierNotificationsPage() {
  return <NotificationCenterView role="user" />;
}
