import { CashierBillingView } from "../../components/dashboard/views/CashierViews";
import { NotificationCenterView } from "../../components/dashboard/views/NotificationCenterView";
import CashierReports from "./CashierReports";

export { default as CashierReports } from "./CashierReports";

export function CashierPaymentsPage() {
  return <CashierBillingView role="user" page="payments" />;
}

export function CashierInvoicesPage() {
  return <CashierBillingView role="user" page="invoices" />;
}

export function CashierPendingPage() {
  return <CashierBillingView role="user" page="pending" />;
}

export function CashierHistoryPage() {
  return <CashierBillingView role="user" page="history" />;
}

export function CashierRefundsPage() {
  return <CashierBillingView role="user" page="refunds" />;
}

export function CashierReportsPage() {
  return <CashierReports role="user" />;
}

export function CashierNotificationsPage() {
  return <NotificationCenterView role="user" />;
}
