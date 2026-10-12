import { useState, useEffect, useMemo } from "react";
import StatCard from "../../components/common/StatCard";
import { Breadcrumbs, DataTable, Modal } from "../../components/dashboard/DashboardPrimitives";
import { useDashboardData } from "../../context/DashboardDataContext";
import { useNotifications } from "../../context/NotificationContext";
import reportsApi from "../../api/reports";
import billingApi, { normalizePayment, formatLkr, parseLkr } from "../../api/billing";

export default function CashierReports({ role = "user" }) {
  const { collections } = useDashboardData();
  const { addToast } = useNotifications();

  const [shift, setShift] = useState("all-day");
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [liveRevenue, setLiveRevenue] = useState(null);
  const [livePayments, setLivePayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    let active = true;
    async function fetchCashierReport() {
      try {
        setLoading(true);
        const [revData, rawPayments, rawBills] = await Promise.all([
          reportsApi.getAIReportRevenue({ date: reportDate }).catch(() => null),
          billingApi.getAllPayments().catch(() => []),
          billingApi.getAllBills().catch(() => []),
        ]);
        if (!active) return;
        if (revData) setLiveRevenue(revData);

        const billMap = {};
        if (Array.isArray(rawBills)) {
          rawBills.forEach((b) => {
            billMap[b.id] = b;
          });
        }

        if (Array.isArray(rawPayments)) {
          setLivePayments(rawPayments.map((p) => normalizePayment(p, billMap)));
        }
      } catch (err) {
        console.warn("Could not fetch cashier live reports:", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchCashierReport();
    return () => {
      active = false;
    };
  }, [reportDate]);

  const payments = useMemo(() => {
    return livePayments.length > 0 ? livePayments : (collections.payments || []);
  }, [livePayments, collections.payments]);

  // Filter payments by selected date if provided
  const dateFilteredPayments = useMemo(() => {
    if (!reportDate) return payments;
    return payments.filter((p) => {
      const pDate = p.date ? String(p.date).slice(0, 10) : "";
      return !pDate || pDate === reportDate;
    });
  }, [payments, reportDate]);

  const cashAmount = useMemo(() => {
    const list = reportDate ? dateFilteredPayments : payments;
    return list
      .filter((p) => (p.status === "paid" || p.rawStatus === "SUCCESS") && String(p.method || "").toLowerCase().includes("cash"))
      .reduce((acc, p) => acc + (p.rawAmount || parseLkr(p.amount) || 0), 0);
  }, [reportDate, dateFilteredPayments, payments]);

  const cardAmount = useMemo(() => {
    const list = reportDate ? dateFilteredPayments : payments;
    return list
      .filter((p) => (p.status === "paid" || p.rawStatus === "SUCCESS") && !String(p.method || "").toLowerCase().includes("cash"))
      .reduce((acc, p) => acc + (p.rawAmount || parseLkr(p.amount) || 0), 0);
  }, [reportDate, dateFilteredPayments, payments]);

  const refundSum = useMemo(() => {
    if (liveRevenue?.refundTotals != null && Number(liveRevenue.refundTotals) > 0) {
      return Number(liveRevenue.refundTotals);
    }
    const list = reportDate ? dateFilteredPayments : payments;
    return list
      .filter((p) => p.status === "refunded" || p.rawStatus === "REFUNDED" || p.rawStatus === "REFUND_PENDING")
      .reduce((acc, p) => acc + (p.refundAmount || 0), 0);
  }, [liveRevenue, reportDate, dateFilteredPayments, payments]);

  const totalCollections = useMemo(() => {
    if (liveRevenue?.totalRevenue != null && Number(liveRevenue.totalRevenue) > 0) {
      return formatLkr(liveRevenue.totalRevenue);
    }
    return formatLkr(cashAmount + cardAmount);
  }, [liveRevenue, cashAmount, cardAmount]);

  const cashCollections = formatLkr(cashAmount);
  const cardCollections = formatLkr(cardAmount);
  const totalRefunds = formatLkr(refundSum);

  const handleExportReconciliation = async () => {
    try {
      const blob = await reportsApi.exportReportCSV("payments", {
        startDate: reportDate,
        endDate: reportDate,
      });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `cashier-reconciliation-${reportDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast("Exported Daily Cashier Reconciliation Ledger (CSV)", "success");
    } catch (err) {
      console.warn("CSV export error:", err);
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to export reconciliation ledger";
      addToast(typeof msg === "string" ? msg : "Failed to export reconciliation ledger", "error");
    }
  };

  const handlePrintZReport = () => {
    window.print();
    addToast("Cashier Shift Z-Report sent to receipt printer", "info");
  };

  const rows = useMemo(() => {
    const list = reportDate ? dateFilteredPayments : payments;
    return list.map((p) => ({
      id: p.id,
      time: p.date ? `${p.date}` : "09:00 AM",
      patient: p.patient || p.patientName || "Patient",
      service: p.service || (p.invoice ? `Invoice #${p.invoice}` : "Dental Procedure"),
      method: p.method || "Cash",
      amount: typeof p.amount === "number" ? formatLkr(p.amount) : (p.amount || formatLkr(p.rawAmount || 0)),
      status: p.status || p.rawStatus || "COMPLETED",
      rawRecord: p,
    }));
  }, [reportDate, dateFilteredPayments, payments]);

  return (
    <div className="df-role-page df-role-blue">
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

      {loading && (
        <div style={{ padding: "8px 0", color: "var(--df-text-muted)", fontSize: 13 }}>
          Syncing live cashier reconciliation ledger from database...
        </div>
      )}

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
              <input
                type="date"
                className="df-input"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="df-stat-grid">
        <StatCard label="Total Register Collections" value={totalCollections} icon="✓" color="success" />
        <StatCard label="Cash in Drawer" value={cashCollections} icon="◫" color="primary" />
        <StatCard label="POS Card Terminal" value={cardCollections} icon="◈" color="primary" />
        <StatCard label="Refunds Disbursed" value={totalRefunds} icon="◷" color="warning" />
      </div>

      <section className="df-card">
        <div className="df-card-body">
          <div className="df-card-title-row">
            <h3>Shift Transaction Journal</h3>
            <span className="df-badge df-badge-primary">Reconciled Batch #{shift}</span>
          </div>

          {loading ? (
            <div style={{ padding: "48px 0", textAlign: "center", color: "var(--df-text-secondary)" }}>
              <div className="df-spinner" style={{ margin: "0 auto 12px", width: 28, height: 28 }} />
              <div>Loading shift transaction journal...</div>
            </div>
          ) : (
            <DataTable
              columns={[
                { key: "id", label: "Payment Ref #" },
                { key: "time", label: "Date" },
                { key: "patient", label: "Patient" },
                { key: "service", label: "Dental Procedure" },
                { key: "method", label: "Channel" },
                { key: "amount", label: "Collected Amount" },
                { key: "status", label: "Settlement Status", type: "status" },
              ]}
              rows={rows}
              actionLabel="View Receipt"
              onEdit={(row) => setSelectedReceipt(row.rawRecord || row)}
            />
          )}
        </div>
      </section>

      {selectedReceipt && (
        <Modal
          title={`Payment Receipt: ${selectedReceipt.id || selectedReceipt.paymentReference}`}
          onClose={() => setSelectedReceipt(null)}
          footer={
            <>
              <button
                className="df-btn df-btn-secondary"
                onClick={() => {
                  window.print();
                  addToast("Receipt sent to printer", "info");
                }}
              >
                🖨 Print
              </button>
              <button className="df-btn df-btn-primary" onClick={() => setSelectedReceipt(null)}>
                Done
              </button>
            </>
          }
        >
          <div className="df-receipt">
            <div className="df-receipt-stamp">PAID</div>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>DentaFlow Dental Hospital</h3>
              <small style={{ color: "var(--df-text-secondary)" }}>123 Dental Avenue, Colombo · +94 11 234 5678</small>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 12 }}>
              <div>
                <strong>Billed To:</strong> {selectedReceipt.patient || "Patient"}
              </div>
              <div>
                <strong>Receipt #:</strong> {selectedReceipt.id}
              </div>
            </div>

            <table className="df-receipt-items">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{selectedReceipt.service || "Dental Consultation & Treatment"}</td>
                  <td>{typeof selectedReceipt.amount === "number" ? formatLkr(selectedReceipt.amount) : selectedReceipt.amount}</td>
                </tr>
              </tbody>
            </table>

            <div className="df-receipt-total">
              <span>Total Paid:</span>
              <span>{typeof selectedReceipt.amount === "number" ? formatLkr(selectedReceipt.amount) : selectedReceipt.amount}</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--df-text-muted)", marginTop: 8 }}>
              Payment Channel: {selectedReceipt.method || "Cash"}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
