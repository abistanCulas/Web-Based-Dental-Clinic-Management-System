import { useState } from "react";
import StatCard from "../../components/common/StatCard";
import { Breadcrumbs, DataTable } from "../../components/dashboard/DashboardPrimitives";
import { useDashboardData } from "../../context/DashboardDataContext";
import { useNotifications } from "../../context/NotificationContext";

export default function CashierReports({ role = "user" }) {
  const { collections } = useDashboardData();
  const { addToast } = useNotifications();

  const [shift, setShift] = useState("all-day");
  const payments = collections.payments || [];

  const handleExportReconciliation = () => {
    addToast("Exported Daily Cashier Reconciliation Ledger (CSV)", "success");
  };

  const handlePrintZReport = () => {
    addToast("Cashier Shift Z-Report sent to receipt printer", "info");
  };

  const rows = payments.map((p, idx) => ({
    id: p.id,
    time: ["09:15 AM", "11:30 AM", "02:20 PM", "04:10 PM"][idx % 4],
    patient: p.patient,
    service: p.service,
    method: idx % 2 === 0 ? "POS Card Terminal" : "Cash Drawer",
    amount: p.amount,
    status: p.status,
  }));

  return (
    <div className="df-role-page df-role-slate">
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Reports" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Cashier Station & POS Reconciliation</span>
          <h1>Daily Cashier Financial Reconciliation</h1>
          <p>Reconcile cash drawer balances, POS electronic card settlements, and shift collections.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="df-btn df-btn-secondary" onClick={handleExportReconciliation}>
            📥 Export CSV
          </button>
          <button className="df-btn df-btn-primary" onClick={handlePrintZReport}>
            🖨 Print Z-Report
          </button>
        </div>
      </header>

      <section className="df-card" style={{ marginBottom: 24 }}>
        <div className="df-card-body">
          <div className="df-form-2col">
            <div className="df-form-group">
              <label className="df-label">Cashier Shift Roster</label>
              <select className="df-select" value={shift} onChange={(e) => setShift(e.target.value)}>
                <option value="all-day">Full Day Register (08:00 AM - 08:00 PM)</option>
                <option value="morning">Morning Shift (08:00 AM - 02:00 PM)</option>
                <option value="evening">Evening Shift (02:00 PM - 08:00 PM)</option>
              </select>
            </div>
            <div className="df-form-group">
              <label className="df-label">Accounting Date</label>
              <input type="date" className="df-input" defaultValue="2026-03-15" />
            </div>
          </div>
        </div>
      </section>

      <div className="df-stat-grid">
        <StatCard label="Total Register Collections" value="LKR 42,500" icon="✓" color="success" />
        <StatCard label="Cash in Drawer" value="LKR 14,500" icon="◫" color="primary" />
        <StatCard label="POS Card Terminal" value="LKR 28,000" icon="◈" color="primary" />
        <StatCard label="Refunds Disbursed" value="LKR 2,500" icon="◷" color="warning" />
      </div>

      <section className="df-card">
        <div className="df-card-body">
          <div className="df-card-title-row">
            <h3>Shift Transaction Journal</h3>
            <span className="df-badge df-badge-primary">Reconciled Batch #892</span>
          </div>

          <DataTable
            columns={[
              { key: "id", label: "Invoice #" },
              { key: "time", label: "Time" },
              { key: "patient", label: "Patient" },
              { key: "service", label: "Dental Procedure" },
              { key: "method", label: "Channel" },
              { key: "amount", label: "Collected Amount" },
              { key: "status", label: "Settlement Status", type: "status" },
            ]}
            rows={rows}
            actionLabel="View Receipt"
            onEdit={(row) => addToast(`Viewing receipt for ${row.id} (${row.amount})`, "info")}
          />
        </div>
      </section>
    </div>
  );
}
