import AdminDashboard from "../../components/admin/AdminDashboard";
import {
  DeactivationRequestsView,
  FeedbackCenterView,
  InquiriesView,
  ScheduleAutomationView,
} from "../../components/admin/AdminModules";
import {
  ExpiryAlertsView,
  LowStockView,
  PurchaseOrdersView,
  PurchaseRequestsView,
} from "../../components/admin/AdminPharmacy";
import { AIReportsView } from "../../components/admin/AdminReports";
import AdminServicesView from "../../components/admin/AdminServices";
import AdminScheduleManagementView from "../../components/admin/AdminScheduleManagement";

export function renderAdminPage(page) {
  switch (page) {
    case "overview":
      return <AdminDashboard role="admin" />;
    case "schedules":
    case "schedule":
      return <AdminScheduleManagementView role="admin" />;
    case "deactivation-requests":
      return <DeactivationRequestsView role="admin" />;
    case "purchase-requests":
      return <PurchaseRequestsView role="admin" />;
    case "purchase-orders":
      return <PurchaseOrdersView role="admin" />;
    case "low-stock":
      return <LowStockView role="admin" />;
    case "expiry-alerts":
      return <ExpiryAlertsView role="admin" />;
    case "ai-reports":
      return <AIReportsView role="admin" />;
    case "inquiries":
      return <InquiriesView role="admin" />;
    case "schedule-automation":
      return <ScheduleAutomationView role="admin" />;
    case "feedback":
      return <FeedbackCenterView role="admin" />;
    case "services":
      return <AdminServicesView role="admin" />;
    default:
      return null;
  }
}