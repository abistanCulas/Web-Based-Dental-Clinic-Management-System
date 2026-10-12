import { useState, useMemo, useEffect, useCallback } from "react";
import StatCard from "../../common/StatCard";
import StatusBadge from "../../common/StatusBadge";
import { Breadcrumbs, DataTable, Modal } from "../DashboardPrimitives";
import { useNotifications } from "../../../context/NotificationContext";
import billingApi, {
  formatLkr,
  parseLkr,
  normalizeBill,
  normalizePayment,
  getReceiptStatusConfig,
} from "../../../api/billing";
import patientApi from "../../../api/patients";
import appointmentApi from "../../../api/appointments";

/* ==========================================================================
   SHARED HELPERS & MODALS
   ========================================================================== */

function isToday(dateStr) {
  if (!dateStr) return false;
  const today = new Date().toISOString().slice(0, 10);
  return String(dateStr).slice(0, 10) === today;
}

function StampedReceiptModal({ receipt, onClose }) {
  if (!receipt) return null;

  const statusConfig = receipt.statusConfig || getReceiptStatusConfig(receipt);

  return (
    <Modal
      title={`Official Receipt: ${receipt.receiptNo || receipt.paymentReference || receipt.id}`}
      onClose={onClose}
      actions={
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="df-btn df-btn-secondary"
            onClick={() => window.print()}
          >
            🖨️ Print Receipt
          </button>
          <button type="button" className="df-btn df-btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      }
    >
      <div className="df-receipt df-receipt-glass">
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #3b82f6", paddingBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, color: "var(--df-primary-600)", fontSize: 20, fontWeight: 800 }}>DentaFlow Dental Clinic</h2>
            <div style={{ fontSize: 12, color: "var(--df-text-secondary)", marginTop: 4 }}>
              Premier Dental Care & Oral Surgery Clinic
            </div>
            <div style={{ fontSize: 12, color: "var(--df-text-secondary)" }}>
              74 Dental Health Avenue, Colombo 03 • Tel: +94 11 234 5678
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--df-primary-500)" }}>
              RECEIPT
            </div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>
              #{receipt.receiptNo || receipt.paymentReference || receipt.id}
            </div>
            <div style={{ fontSize: 12, color: "var(--df-text-secondary)" }}>
              Date: {receipt.date || new Date().toISOString().slice(0, 10)}
            </div>
          </div>
        </div>

        <div className="df-receipt-banner" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, margin: "16px 0" }}>
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", color: "#64748b", fontWeight: 700 }}>
              Billed To
            </div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{receipt.patient}</div>
            {receipt.patientId && (
              <div style={{ fontSize: 12, color: "#64748b" }}>Patient ID: #{receipt.patientId}</div>
            )}
            {receipt.doctor && (
              <div style={{ fontSize: 12, color: "#64748b" }}>Doctor: {receipt.doctor}</div>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", color: "#64748b", fontWeight: 700 }}>
              Payment Method
            </div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{receipt.method || "Cash / Counter"}</div>
            {receipt.transactionId && (
              <div style={{ fontSize: 12, color: "#64748b" }}>Txn Ref: {receipt.transactionId}</div>
            )}
            {receipt.invoice && (
              <div style={{ fontSize: 12, color: "#64748b" }}>Invoice Ref: {receipt.invoice}</div>
            )}
            <div style={{ marginTop: 6, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, textTransform: "uppercase", color: "#64748b", fontWeight: 700 }}>
                Payment Status:
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 700,
                  backgroundColor: statusConfig.badgeBg,
                  color: statusConfig.stampColor,
                  border: `1px solid ${statusConfig.stampColor}40`,
                }}
              >
                {statusConfig.displayStatus}
              </span>
            </div>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", margin: "16px 0" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #cbd5e1", textAlign: "left", fontSize: 12, color: "#64748b" }}>
              <th style={{ padding: "8px 0" }}>Description / Service</th>
              <th style={{ padding: "8px 0", textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #f1f5f9", fontSize: 14 }}>
              <td style={{ padding: "10px 0" }}>{receipt.service || receipt.notes || "Clinical Dental Consultation & Treatment"}</td>
              <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600 }}>
                {receipt.amount}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td style={{ paddingTop: 14, fontSize: 15, fontWeight: 700 }}>{statusConfig.amountLabel}</td>
              <td style={{ paddingTop: 14, textAlign: "right", fontSize: 16, fontWeight: 800, color: statusConfig.amountColor }}>
                {receipt.amount}
              </td>
            </tr>
          </tfoot>
        </table>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, borderTop: "1px dashed #cbd5e1", paddingTop: 16 }}>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>
            {statusConfig.footerNote}
          </div>
          <div
            style={{
              display: "inline-block",
              border: statusConfig.stampBorder,
              color: statusConfig.stampColor,
              padding: "4px 12px",
              borderRadius: 4,
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              transform: "rotate(-3deg)",
            }}
          >
            {statusConfig.stampText}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function PayHereModal({ data, onClose, onSimulate, simulating }) {
  if (!data) return null;

  return (
    <Modal
      title="PayHere Online Payment Gateway (Sandbox)"
      onClose={onClose}
      actions={
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="df-btn df-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="df-btn df-btn-success"
            onClick={onSimulate}
            disabled={simulating}
          >
            {simulating ? "Verifying..." : "⚡ Simulate Gateway Success (Sandbox)"}
          </button>
        </div>
      }
    >
      <div style={{ padding: 12 }}>
        <div style={{ padding: 12, background: "rgba(59, 130, 246, 0.08)", borderRadius: 6, border: "1px solid #bfdbfe", marginBottom: 16, fontSize: 13 }}>
          Backend generated an authoritative cryptographically signed MD5 hash for order #{data.orderId}. Merchant credentials remain secured on the server.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13, marginBottom: 16 }}>
          <div>Order ID: <strong>{data.orderId}</strong></div>
          <div>Merchant ID: <strong>{data.merchantId}</strong></div>
          <div>Currency & Amount: <strong style={{ color: "#2563eb" }}>{data.currency} {parseFloat(data.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong></div>
          <div>Payment ID: <strong style={{ color: "#16a34a" }}>#{data.paymentId}</strong></div>
          <div>Item: <strong>{data.itemTitle}</strong></div>
          <div>Webhook: <code>{data.notifyUrl}</code></div>
        </div>

        <form action={data.actionUrl} method="POST" target="_blank" style={{ marginBottom: 10 }}>
          <input type="hidden" name="merchant_id" value={data.merchantId} />
          <input type="hidden" name="return_url" value={data.returnUrl} />
          <input type="hidden" name="cancel_url" value={data.cancelUrl} />
          <input type="hidden" name="notify_url" value={data.notifyUrl} />
          <input type="hidden" name="first_name" value={data.firstName || "Valued"} />
          <input type="hidden" name="last_name" value={data.lastName || "Patient"} />
          <input type="hidden" name="email" value={data.email || "patient@dentaflow.com"} />
          <input type="hidden" name="phone" value={data.phone || "0771234567"} />
          <input type="hidden" name="address" value={data.address || "DentaFlow Colombo"} />
          <input type="hidden" name="city" value={data.city || "Colombo"} />
          <input type="hidden" name="country" value={data.country || "Sri Lanka"} />
          <input type="hidden" name="order_id" value={data.orderId} />
          <input type="hidden" name="items" value={data.itemTitle} />
          <input type="hidden" name="currency" value={data.currency} />
          <input type="hidden" name="amount" value={data.amount} />
          <input type="hidden" name="hash" value={data.hash} />
          <button type="submit" className="df-btn df-btn-primary" style={{ width: "100%" }}>
            ↗ Open PayHere Hosted Checkout Window
          </button>
        </form>
      </div>
    </Modal>
  );
}

/* ==========================================================================
   1. PAYMENTS VIEW — MAIN CASHIER CHECKOUT ONLY
   ========================================================================== */
export function CashierPaymentsView({ role = "user" }) {
  const { addToast } = useNotifications();

  // Search & Checkout State
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutSummary, setCheckoutSummary] = useState(null);
  const [checkoutError, setCheckoutError] = useState(null);

  // Lists & Stats State
  const [patientsList, setPatientsList] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [stats, setStats] = useState({
    todayCount: 0,
    pendingInvoicesCount: 0,
    collectedAmount: "LKR 0",
    successfulCount: 0,
  });

  // Action State
  const [cashAmount, setCashAmount] = useState("");
  const [cashNotes, setCashNotes] = useState("");
  const [cashSubmitting, setCashSubmitting] = useState(false);

  const [onlineInitiating, setOnlineInitiating] = useState(false);
  const [payhereModalData, setPayhereModalData] = useState(null);
  const [simulatingPayment, setSimulatingPayment] = useState(false);

  const [receiptModal, setReceiptModal] = useState(null);

  // Load Initial Patient List & Stats
  const loadInitialData = useCallback(async () => {
    try {
      setInitialLoading(true);
      const [patients, bills, payments] = await Promise.all([
        patientApi.getAllPatients().catch(() => []),
        billingApi.getAllBills().catch(() => []),
        billingApi.getAllPayments().catch(() => []),
      ]);

      setPatientsList(patients);

      // Compute Payments KPI cards
      const today = new Date().toISOString().slice(0, 10);
      const todayPayments = payments.filter((p) => String(p.paymentDate || "").slice(0, 10) === today);
      const successfulPayments = payments.filter((p) => p.status === "SUCCESS");
      const pendingBills = bills.filter(
        (b) => b.status === "UNPAID" || b.status === "PARTIALLY_PAID" || b.status === "ISSUED" || b.status === "pending"
      );

      const todayCollectedSum = todayPayments
        .filter((p) => p.status === "SUCCESS")
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      setStats({
        todayCount: todayPayments.length,
        pendingInvoicesCount: pendingBills.length,
        collectedAmount: formatLkr(todayCollectedSum),
        successfulCount: successfulPayments.length,
      });

      // Recent 10 payments
      const patientLookup = {};
      (patients || []).forEach((p) => {
        patientLookup[p.id] = p.name || `${p.firstName || ""} ${p.lastName || ""}`.trim();
      });

      const billLookup = {};
      bills.forEach((b) => {
        billLookup[b.id] = normalizeBill(b, patientLookup);
      });
      const normPayments = payments.map((p) => normalizePayment(p, billLookup));
      normPayments.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      setRecentPayments(normPayments.slice(0, 8));
    } catch (err) {
      console.error("Failed to load initial payments data:", err);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load Patient Checkout Summary
  const handleLoadPatientCheckout = async (targetId) => {
    const rawId = targetId || selectedPatientId || patientSearchQuery;
    if (!rawId) {
      addToast("Please enter or select a Patient ID to load", "warning");
      return;
    }

    try {
      setCheckoutLoading(true);
      setCheckoutError(null);

      let resolvedPatientId = null;

      if (/^\d+$/.test(String(rawId).trim())) {
        resolvedPatientId = Number(String(rawId).trim());
      } else {
        const matches = await billingApi.lookupPatients(String(rawId).trim());
        if (matches && matches.length > 0) {
          resolvedPatientId = matches[0].id;
        } else {
          setCheckoutError(`No patient found matching "${rawId}". Try entering a numeric ID.`);
          setCheckoutLoading(false);
          return;
        }
      }

      const summary = await billingApi.getPatientCheckoutSummary(resolvedPatientId);
      setCheckoutSummary(summary);
      setSelectedPatientId(resolvedPatientId);

      // Pre-fill cash amount with balance due
      if (summary?.balanceAmount != null) {
        setCashAmount(String(summary.balanceAmount));
      } else if (summary?.grandTotal != null) {
        setCashAmount(String(summary.grandTotal));
      }

      addToast(`Loaded checkout data for ${summary?.patient?.name || `Patient #${resolvedPatientId}`}`, "success");
    } catch (err) {
      console.error("Error loading patient checkout:", err);
      const msg = err.response?.data?.message || err.response?.data || err.message || "Failed to load patient checkout";
      setCheckoutError(typeof msg === "string" ? msg : "Failed to load checkout summary");
      addToast(typeof msg === "string" ? msg : "Patient checkout lookup failed", "error");
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Process Cash Payment
  const handleConfirmCashPayment = async () => {
    if (!checkoutSummary?.patient?.id) {
      addToast("No active patient loaded for payment", "error");
      return;
    }

    const payAmt = parseFloat(cashAmount);
    if (isNaN(payAmt) || payAmt <= 0) {
      addToast("Please enter a valid payment amount greater than zero", "warning");
      return;
    }

    try {
      setCashSubmitting(true);
      const result = await billingApi.payCash(checkoutSummary.patient.id, payAmt, cashNotes || "Cash counter payment");

      addToast(`Payment of ${formatLkr(payAmt)} collected successfully via Cash!`, "success");

      // Auto-display official stamped receipt
      setReceiptModal({
        id: result?.id ? `PAY-${result.id}` : `PAY-${Date.now().toString().slice(-6)}`,
        receiptNo: `REC-${Date.now().toString().slice(-6)}`,
        amount: formatLkr(payAmt),
        rawAmount: payAmt,
        patient: checkoutSummary.patient?.name || `Patient #${checkoutSummary.patient?.id}`,
        patientId: checkoutSummary.patient?.id,
        doctor: checkoutSummary.doctor?.name || "Attending Dentist",
        date: new Date().toISOString().slice(0, 10),
        method: "Cash",
        status: "SUCCESS",
        invoice: checkoutSummary.bill?.billNumber || (checkoutSummary.bill?.id ? `INV-${checkoutSummary.bill.id}` : `INV-${checkoutSummary.patient?.id}`),
        service: `Treatment (${formatLkr(checkoutSummary.treatmentCost || 0)}) + Pharmacy (${formatLkr(checkoutSummary.pharmacyCost || 0)})`,
        notes: cashNotes || "Counter Cash Settlement",
      });

      // Reload live summary
      await handleLoadPatientCheckout(checkoutSummary.patient.id);
      await loadInitialData();
      setCashNotes("");
    } catch (err) {
      console.error("Cash payment failed:", err);
      const msg = err.response?.data?.message || err.response?.data || err.message || "Payment processing failed";
      addToast(typeof msg === "string" ? msg : "Cash payment failed", "error");
    } finally {
      setCashSubmitting(false);
    }
  };

  // Initiate Online PayHere Checkout
  const handleInitiateOnlinePayment = async () => {
    if (!checkoutSummary?.patient?.id) {
      addToast("No active patient loaded for payment", "error");
      return;
    }

    let billId = checkoutSummary.bill?.id;
    if (!billId) {
      // Auto-generate authoritative bill first
      try {
        const generated = await billingApi.generateCombinedBill(checkoutSummary.patient.id);
        billId = generated.id;
      } catch (err) {
        addToast("Failed to prepare authoritative bill for online payment", "error");
        return;
      }
    }

    const payAmt = parseFloat(cashAmount) || checkoutSummary.balanceAmount || checkoutSummary.grandTotal;

    try {
      setOnlineInitiating(true);
      const checkoutData = await billingApi.initiatePayHereCheckout({
        billId,
        amount: payAmt,
        patientId: checkoutSummary.patient.id,
      });

      setPayhereModalData(checkoutData);
    } catch (err) {
      console.error("Online payment initiation failed:", err);
      const msg = err.response?.data?.message || err.response?.data || err.message || "Failed to initiate PayHere checkout";
      addToast(typeof msg === "string" ? msg : "PayHere checkout initiation failed", "error");
    } finally {
      setOnlineInitiating(false);
    }
  };

  // Simulate Sandbox PayHere Success
  const handleSimulatePaymentSuccess = async () => {
    if (!payhereModalData?.paymentId) return;

    try {
      setSimulatingPayment(true);
      await billingApi.simulatePayHereSuccess(payhereModalData.paymentId);
      addToast(`PayHere payment #${payhereModalData.paymentId} verified and settled successfully!`, "success");

      // Auto-display official stamped receipt
      setReceiptModal({
        id: `PAY-${payhereModalData.paymentId}`,
        receiptNo: `REC-${payhereModalData.paymentId}`,
        amount: formatLkr(payhereModalData.amount || 0),
        rawAmount: payhereModalData.amount,
        patient: checkoutSummary?.patient?.name || "Patient",
        patientId: checkoutSummary?.patient?.id,
        doctor: checkoutSummary?.doctor?.name || "Attending Dentist",
        date: new Date().toISOString().slice(0, 10),
        method: "PayHere Online (Visa/Mastercard)",
        status: "SUCCESS",
        invoice: `INV-${payhereModalData.billId || checkoutSummary?.bill?.id || "ONLINE"}`,
        service: `Treatment (${formatLkr(checkoutSummary?.treatmentCost || 0)}) + Pharmacy (${formatLkr(checkoutSummary?.pharmacyCost || 0)})`,
        notes: "Online Payment Settlement",
      });

      setPayhereModalData(null);

      if (checkoutSummary?.patient?.id) {
        await handleLoadPatientCheckout(checkoutSummary.patient.id);
      }
      await loadInitialData();
    } catch (err) {
      console.error("PayHere simulation failed:", err);
      addToast("Failed to verify PayHere sandbox callback", "error");
    } finally {
      setSimulatingPayment(false);
    }
  };

  return (
    <div className="df-role-page df-cashier-page">
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Payments" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Cashier Desk</span>
          <h1>Payment Collection</h1>
          <p>Process patient payments and complete checkout.</p>
        </div>
      </header>

      {/* Relevant KPI Cards */}
      <div className="df-stat-grid">
        <StatCard label="Payments Today" value={String(stats.todayCount)} icon="✓" color="primary" />
        <StatCard label="Pending Collection" value={String(stats.pendingInvoicesCount)} icon="◷" color="warning" />
        <StatCard label="Collected Amount" value={stats.collectedAmount} icon="💰" color="success" />
        <StatCard label="Successful Payments" value={String(stats.successfulCount)} icon="◫" color="primary" />
      </div>

      {/* ========================================================= */}
      {/* EXCLUSIVE TO PAYMENTS: FULL PATIENT CLINICAL BILLING DESK */}
      {/* ========================================================= */}
      <section className="df-card df-cashier-glass-card df-cashier-checkout-hero">
        <div
          className="df-card-header"
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--df-border, #e2e8f0)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="df-badge df-badge-primary">Core Cashier Desk</span>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--df-text-main, #0f172a)" }}>
                Patient Clinical Billing & Instant Checkout
              </h2>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--df-text-secondary, #64748b)" }}>
              Enter or select a Patient ID to pull Doctor Treatment Plan, Prescription, and actual Pharmacy Dispensing charges.
            </p>
          </div>
          {checkoutSummary && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="df-btn df-btn-secondary df-btn-sm"
                onClick={() => {
                  setReceiptModal({
                    id: checkoutSummary.bill?.billNumber || `INV-${checkoutSummary.bill?.id || checkoutSummary.patient?.id}`,
                    receiptNo: `REC-${checkoutSummary.bill?.id || checkoutSummary.patient?.id}`,
                    amount: formatLkr(checkoutSummary.paidAmount > 0 ? checkoutSummary.paidAmount : checkoutSummary.grandTotal),
                    patient: checkoutSummary.patient?.name || "Patient",
                    patientId: checkoutSummary.patient?.id,
                    doctor: checkoutSummary.doctor?.name || "Attending Dentist",
                    date: new Date().toISOString().slice(0, 10),
                    method: checkoutSummary.paidAmount > 0 ? "Settled" : "Invoice Preview",
                    status: (checkoutSummary.balanceAmount <= 0 && checkoutSummary.paidAmount > 0) ? "SUCCESS" : "PENDING",
                    invoice: checkoutSummary.bill?.billNumber || `INV-${checkoutSummary.bill?.id || checkoutSummary.patient?.id}`,
                    service: `Treatment (${formatLkr(checkoutSummary.treatmentCost || 0)}) + Pharmacy Dispensing (${formatLkr(checkoutSummary.pharmacyCost || 0)})`,
                    notes: "Official Clinical Invoice / Receipt",
                  });
                }}
              >
                🧾 View Invoice / Receipt
              </button>
              <button
                type="button"
                className="df-btn df-btn-secondary df-btn-sm"
                onClick={() => handleLoadPatientCheckout()}
                disabled={checkoutLoading}
              >
                🔄 Refresh Live Data
              </button>
            </div>
          )}
        </div>

        <div className="df-card-body" style={{ padding: 20 }}>
          {/* Patient Search & Selection Bar */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 20 }}>
            <div style={{ flex: "1 1 240px" }}>
              <label className="df-label" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Search Patient ID / Code / Name:
              </label>
              <input
                type="text"
                className="df-input"
                style={{ width: "100%" }}
                placeholder="e.g. 9 or P0001 or Sarah..."
                value={patientSearchQuery}
                onChange={(e) => setPatientSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleLoadPatientCheckout(patientSearchQuery);
                  }
                }}
              />
            </div>

            <div style={{ flex: "1 1 240px" }}>
              <label className="df-label" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Or Select from Active Patients:
              </label>
              <select
                className="df-select"
                style={{ width: "100%" }}
                value={selectedPatientId}
                onChange={(e) => {
                  setSelectedPatientId(e.target.value);
                  if (e.target.value) handleLoadPatientCheckout(e.target.value);
                }}
              >
                <option value="">-- Choose patient --</option>
                {patientsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.patientCode ? `[${p.patientCode}] ` : `[#${p.id}] `}
                    {p.firstName} {p.lastName} {p.phone ? `(${p.phone})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="df-btn df-btn-primary"
              onClick={() => handleLoadPatientCheckout()}
              disabled={checkoutLoading || (!patientSearchQuery && !selectedPatientId)}
            >
              {checkoutLoading ? "Loading..." : "Search & Load"}
            </button>
          </div>

          {/* Checkout Error */}
          {checkoutError && (
            <div style={{ padding: 14, background: "#fee2e2", color: "#b91c1c", borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
              ⚠️ {checkoutError}
            </div>
          )}

          {/* Checkout Summary Details */}
          {checkoutSummary && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Patient Banner */}
              <div
                className="df-cashier-patient-banner"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "var(--df-primary-600)" }}>
                    {checkoutSummary.patient?.name || "Patient"}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--df-text-secondary)", marginTop: 2 }}>
                    ID: <strong>#{checkoutSummary.patient?.id}</strong> • Code: <strong>{checkoutSummary.patient?.patientCode || "N/A"}</strong> • Phone: <strong>{checkoutSummary.patient?.phone || "N/A"}</strong>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--df-text-heading)" }}>
                    Attending Doctor: {checkoutSummary.doctor?.name || "Clinic Dentist"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--df-text-secondary)" }}>
                    Appointment #{checkoutSummary.appointment?.id || "None"} • {checkoutSummary.appointment?.date || "Today"}
                  </div>
                </div>
              </div>

              {/* Clinical Breakdown: Treatment + Prescription + Pharmacy */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                {/* Treatment Card */}
                <div className="df-cashier-breakdown-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--df-text-secondary)" }}>1. Treatment Plan</span>
                    <span className="df-badge df-badge-primary">{checkoutSummary.treatmentPlan?.status || "PLANNED"}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--df-text-heading)" }}>
                    {checkoutSummary.treatmentPlan?.title || "Standard Dental Procedure"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--df-text-secondary)", margin: "6px 0" }}>
                    {checkoutSummary.treatmentPlan?.notes || "Dental clinical care"}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--df-text-heading)", marginTop: 8 }}>
                    Treatment Cost: <span style={{ color: "var(--df-primary-500)", fontWeight: 800 }}>{formatLkr(checkoutSummary.treatmentCost || 0)}</span>
                  </div>
                </div>

                {/* Prescription Card */}
                <div className="df-cashier-breakdown-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--df-text-secondary)" }}>2. Prescription</span>
                    <span className="df-badge df-badge-cyan">Rx #{checkoutSummary.prescription?.id || "N/A"}</span>
                  </div>
                  {checkoutSummary.prescribedMedicines && checkoutSummary.prescribedMedicines.length > 0 ? (
                    <ul style={{ margin: "6px 0", paddingLeft: 16, fontSize: 12, color: "var(--df-text)" }}>
                      {checkoutSummary.prescribedMedicines.map((m, idx) => (
                        <li key={idx}>
                          <strong>{m.medicineName || m.name}</strong> — {m.dosage || "Standard"} ({m.quantity || 1} units)
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--df-text-muted)", fontStyle: "italic", margin: "8px 0" }}>
                      No medicines prescribed for this visit.
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "var(--df-text-secondary)", marginTop: 6 }}>
                    Prescription alone does NOT incur charges until dispensed by pharmacy.
                  </div>
                </div>

                {/* Pharmacy Dispensing Card */}
                <div className="df-cashier-breakdown-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "var(--df-text-secondary)" }}>3. Pharmacy Purchase</span>
                    <span className={`df-badge ${checkoutSummary.hasPharmacyPurchase ? "df-badge-success" : "df-badge-gray"}`}>
                      {checkoutSummary.pharmacyDispensingStatus || (checkoutSummary.hasPharmacyPurchase ? "DISPENSED" : "NOT PURCHASED")}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--df-text)", margin: "6px 0" }}>
                    {checkoutSummary.hasPharmacyPurchase
                      ? "✓ Patient purchased medicines from DentaFlow Pharmacy."
                      : "Patient has not purchased from DentaFlow Pharmacy. Charge = LKR 0."}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--df-text-heading)", marginTop: 8 }}>
                    Pharmacy Charge:{" "}
                    <span style={{ color: checkoutSummary.hasPharmacyPurchase ? "#16a34a" : "var(--df-text-secondary)", fontWeight: 800 }}>
                      {formatLkr(checkoutSummary.pharmacyCost || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Authoritative Financial Total & Payment Action Section */}
              <div
                className="df-cashier-billing-summary"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: 18,
                }}
              >
                {/* Summary Table */}
                <div>
                  <h4 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "var(--df-text-heading)" }}>
                    Authoritative Billing Summary
                  </h4>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: "var(--df-text-secondary)" }}>Treatment Cost:</span>
                    <strong>{formatLkr(checkoutSummary.treatmentCost || 0)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                    <span style={{ color: "var(--df-text-secondary)" }}>Pharmacy Dispensing Cost:</span>
                    <strong style={{ color: checkoutSummary.hasPharmacyPurchase ? "#16a34a" : "var(--df-text-secondary)" }}>
                      {formatLkr(checkoutSummary.pharmacyCost || 0)}
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 800, borderTop: "2px solid var(--df-border)", paddingTop: 8, marginTop: 8, color: "var(--df-primary-600)" }}>
                    <span>Grand Total:</span>
                    <span>{formatLkr(checkoutSummary.grandTotal || 0)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 6, color: "#16a34a" }}>
                    <span>Amount Paid:</span>
                    <strong>{formatLkr(checkoutSummary.paidAmount || 0)}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 800, marginTop: 6, color: (checkoutSummary.balanceAmount || 0) > 0 ? "#dc2626" : "#16a34a" }}>
                    <span>Balance Due:</span>
                    <span>{formatLkr(checkoutSummary.balanceAmount || 0)}</span>
                  </div>
                </div>

                {/* Payment Collection Form */}
                <div style={{ borderLeft: "1px solid var(--df-border)", paddingLeft: 16 }}>
                  <h4 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "var(--df-text-heading)" }}>
                    Collect Payment
                  </h4>

                  {(checkoutSummary.balanceAmount || 0) <= 0 ? (
                    <div style={{ padding: 14, background: "rgba(34, 197, 94, 0.15)", color: "#16a34a", border: "1px solid rgba(34, 197, 94, 0.3)", borderRadius: 8, fontWeight: 700, fontSize: 13 }}>
                      ✓ This visit / bill is fully paid! No outstanding balance.
                    </div>
                  ) : (
                    <div>
                      <div style={{ marginBottom: 12 }}>
                        <label className="df-label" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                          Amount to Pay (LKR):
                        </label>
                        <input
                          type="number"
                          className="df-input"
                          style={{ width: "100%", fontWeight: 700 }}
                          value={cashAmount}
                          onChange={(e) => setCashAmount(e.target.value)}
                          max={checkoutSummary.balanceAmount || checkoutSummary.grandTotal}
                          min={1}
                        />
                      </div>

                      <div style={{ marginBottom: 14 }}>
                        <label className="df-label" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                          Notes / Reference:
                        </label>
                        <input
                          type="text"
                          className="df-input"
                          style={{ width: "100%" }}
                          placeholder="e.g. Counter checkout collection"
                          value={cashNotes}
                          onChange={(e) => setCashNotes(e.target.value)}
                        />
                      </div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="df-btn df-btn-success"
                          style={{ flex: "1 1 140px" }}
                          onClick={handleConfirmCashPayment}
                          disabled={cashSubmitting}
                        >
                          {cashSubmitting ? "Processing..." : `💵 Collect Cash (${formatLkr(parseFloat(cashAmount) || 0)})`}
                        </button>

                        <button
                          type="button"
                          className="df-btn df-btn-primary"
                          style={{ flex: "1 1 140px" }}
                          onClick={handleInitiateOnlinePayment}
                          disabled={onlineInitiating}
                        >
                          {onlineInitiating ? "Initiating..." : "💳 PayHere Online"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Recent Payments Section */}
      <section className="df-card">
        <div className="df-card-header" style={{ padding: "16px 20px" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            Recent Payment Transactions
          </h3>
        </div>
        <div className="df-card-body" style={{ padding: 0 }}>
          {initialLoading ? (
            <div style={{ padding: "48px 0", textAlign: "center", color: "var(--df-text-secondary)" }}>
              <div className="df-spinner" style={{ margin: "0 auto 12px", width: 28, height: 28 }} />
              <div>Loading recent payment transactions...</div>
            </div>
          ) : (
            <DataTable
              columns={[
                { key: "id", label: "Payment #" },
                { key: "patient", label: "Patient" },
                { key: "invoice", label: "Invoice Ref" },
                { key: "amount", label: "Amount" },
                { key: "method", label: "Method" },
                { key: "date", label: "Date" },
                { key: "status", label: "Status", type: "status" },
              ]}
              rows={recentPayments}
              searchable={false}
              rowActions={(row) => (
                <button
                  type="button"
                  className="df-btn df-btn-secondary df-btn-sm"
                  onClick={() => setReceiptModal(row)}
                >
                  🧾 Receipt
                </button>
              )}
            />
          )}
        </div>
      </section>

      {/* PayHere Modal */}
      {payhereModalData && (
        <PayHereModal
          data={payhereModalData}
          onClose={() => setPayhereModalData(null)}
          onSimulate={handleSimulatePaymentSuccess}
          simulating={simulatingPayment}
        />
      )}

      {/* Stamped Receipt Modal */}
      {receiptModal && (
        <StampedReceiptModal receipt={receiptModal} onClose={() => setReceiptModal(null)} />
      )}
    </div>
  );
}

/* ==========================================================================
   2. INVOICES VIEW — INVOICE CRUD ONLY
   ========================================================================== */
export function CashierInvoicesView({ role = "user" }) {
  const { addToast } = useNotifications();

  const [bills, setBills] = useState([]);
  const [patientsList, setPatientsList] = useState([]);
  const [appointmentsList, setAppointmentsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newInvoiceData, setNewInvoiceData] = useState({
    patientId: "",
    appointmentId: "",
    billDate: new Date().toISOString().slice(0, 10),
    subtotal: "",
    discount: "0",
    tax: "0",
    notes: "",
    items: [
      { itemType: "TREATMENT", itemName: "", quantity: 1, unitPrice: "" },
    ],
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);

  const [editModalInvoice, setEditModalInvoice] = useState(null);
  const [editFormData, setEditFormData] = useState({
    subtotal: "",
    discount: "0",
    tax: "0",
    notes: "",
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState(null);

  const [detailsModalInvoice, setDetailsModalInvoice] = useState(null);
  const [invoicePaymentsList, setInvoicePaymentsList] = useState([]);
  const [invoiceItemsList, setInvoiceItemsList] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const [cancelModalInvoice, setCancelModalInvoice] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const [deleteModalInvoice, setDeleteModalInvoice] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [receiptModal, setReceiptModal] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [rawBills, patients, appointments] = await Promise.all([
        billingApi.getAllBills().catch(() => []),
        patientApi.getAllPatients().catch(() => []),
        appointmentApi.getAllAppointments().catch(() => []),
      ]);

      setPatientsList(patients);
      setAppointmentsList(appointments);

      const patientLookup = {};
      patients.forEach((p) => {
        patientLookup[p.id] = p;
      });

      const appointmentLookup = {};
      appointments.forEach((a) => {
        appointmentLookup[a.id] = a;
      });

      const normalized = rawBills.map((b) => normalizeBill(b, patientLookup, appointmentLookup));
      normalized.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      setBills(normalized);
    } catch (err) {
      console.error("Failed to load invoices data:", err);
      addToast("Failed to fetch invoices", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Invoice KPI calculations
  const totalInvoices = bills.length;
  const issuedCount = bills.filter((b) => b.rawStatus === "UNPAID" || b.rawStatus === "ISSUED").length;
  const paidCount = bills.filter((b) => b.rawStatus === "PAID" || b.status === "paid").length;
  const totalOutstandingSum = bills
    .filter((b) => b.rawStatus !== "PAID" && b.rawStatus !== "CANCELLED")
    .reduce((sum, b) => sum + (Number(b.balanceAmount) || 0), 0);

  // Filtered invoices
  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const matchSearch =
        !searchQuery ||
        (b.id && b.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.patient && b.patient.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (b.service && b.service.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "paid" && (b.status === "paid" || b.rawStatus === "PAID")) ||
        (statusFilter === "unpaid" && (b.status === "pending" || b.rawStatus === "UNPAID" || b.rawStatus === "ISSUED")) ||
        (statusFilter === "partially_paid" && b.rawStatus === "PARTIALLY_PAID") ||
        (statusFilter === "cancelled" && (b.status === "cancelled" || b.rawStatus === "CANCELLED"));

      return matchSearch && matchStatus;
    });
  }, [bills, searchQuery, statusFilter]);

  // Line item helpers for Create Modal
  const handleItemChange = (index, field, value) => {
    const updated = [...newInvoiceData.items];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate subtotal when items have quantity and unit price
    const sum = updated.reduce((acc, it) => {
      const q = parseFloat(it.quantity) || 0;
      const p = parseFloat(it.unitPrice) || 0;
      return acc + (q * p);
    }, 0);

    setNewInvoiceData((prev) => ({
      ...prev,
      items: updated,
      subtotal: sum > 0 ? String(sum) : prev.subtotal,
    }));
  };

  const handleAddItem = () => {
    setNewInvoiceData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { itemType: "TREATMENT", itemName: "", quantity: 1, unitPrice: "" },
      ],
    }));
  };

  const handleRemoveItem = (index) => {
    const updated = newInvoiceData.items.filter((_, i) => i !== index);
    const sum = updated.reduce((acc, it) => {
      const q = parseFloat(it.quantity) || 0;
      const p = parseFloat(it.unitPrice) || 0;
      return acc + (q * p);
    }, 0);

    setNewInvoiceData((prev) => ({
      ...prev,
      items: updated.length > 0 ? updated : [{ itemType: "TREATMENT", itemName: "", quantity: 1, unitPrice: "" }],
      subtotal: sum > 0 ? String(sum) : prev.subtotal,
    }));
  };

  // Handle Create Invoice
  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    setCreateError(null);

    if (!newInvoiceData.patientId) {
      setCreateError("Please select a patient");
      return;
    }
    const sub = parseFloat(newInvoiceData.subtotal);
    if (isNaN(sub) || sub < 0) {
      setCreateError("Please enter a valid subtotal amount");
      return;
    }

    try {
      setCreateSubmitting(true);
      const cleanItems = (newInvoiceData.items || [])
        .filter((it) => it.itemName && it.itemName.trim())
        .map((it) => {
          const q = parseFloat(it.quantity) || 1;
          const p = parseFloat(it.unitPrice) || 0;
          return {
            itemType: it.itemType || "TREATMENT",
            itemName: it.itemName.trim(),
            quantity: q,
            unitPrice: p,
            totalPrice: q * p,
          };
        });

      const payload = {
        patientId: Number(newInvoiceData.patientId),
        appointmentId: newInvoiceData.appointmentId ? Number(newInvoiceData.appointmentId) : null,
        billDate: newInvoiceData.billDate ? `${newInvoiceData.billDate}T10:00:00` : null,
        subtotal: sub,
        discount: parseFloat(newInvoiceData.discount) || 0,
        tax: parseFloat(newInvoiceData.tax) || 0,
        status: "UNPAID",
        notes: newInvoiceData.notes || "",
        items: cleanItems.length > 0 ? cleanItems : undefined,
      };

      await billingApi.createBill(payload);
      addToast("Invoice created successfully!", "success");
      setCreateModalOpen(false);
      setNewInvoiceData({
        patientId: "",
        appointmentId: "",
        billDate: new Date().toISOString().slice(0, 10),
        subtotal: "",
        discount: "0",
        tax: "0",
        notes: "",
        items: [{ itemType: "TREATMENT", itemName: "", quantity: 1, unitPrice: "" }],
      });
      await loadData();
    } catch (err) {
      console.error("Failed to create invoice:", err);
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || "Failed to create invoice";
      setCreateError(typeof msg === "string" ? msg : "Creation failed");
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Handle Edit Invoice
  const handleOpenEdit = (inv) => {
    if (inv.rawStatus === "PAID" || inv.status === "paid") {
      addToast("Paid invoices cannot be modified. Issue a refund if adjustments are required.", "warning");
      return;
    }
    setEditModalInvoice(inv);
    setEditFormData({
      subtotal: String(inv.subtotal || inv.rawAmount || ""),
      discount: String(inv.discount || 0),
      tax: String(inv.tax || 0),
      notes: inv.notes || "",
    });
    setEditError(null);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editModalInvoice) return;
    setEditError(null);

    const sub = parseFloat(editFormData.subtotal);
    if (isNaN(sub) || sub < 0) {
      setEditError("Please enter a valid subtotal amount");
      return;
    }

    try {
      setEditSubmitting(true);
      const payload = {
        subtotal: sub,
        discount: parseFloat(editFormData.discount) || 0,
        tax: parseFloat(editFormData.tax) || 0,
        notes: editFormData.notes || "",
      };

      await billingApi.updateBill(editModalInvoice.rawId, payload);
      addToast(`Invoice ${editModalInvoice.id} updated successfully!`, "success");
      setEditModalInvoice(null);
      await loadData();
    } catch (err) {
      console.error("Failed to update invoice:", err);
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || "Failed to update invoice";
      setEditError(typeof msg === "string" ? msg : "Update failed");
    } finally {
      setEditSubmitting(false);
    }
  };

  // Handle View Details & Payments
  const handleOpenDetails = async (inv) => {
    setDetailsModalInvoice(inv);
    try {
      setLoadingDetails(true);
      const [pList, fullBill] = await Promise.all([
        billingApi.getPaymentsForBill(inv.rawId).catch(() => []),
        billingApi.getBillById(inv.rawId).catch(() => null),
      ]);
      setInvoicePaymentsList(pList || []);
      setInvoiceItemsList(fullBill?.items || []);
    } catch (err) {
      console.error("Failed to load invoice details:", err);
      setInvoicePaymentsList([]);
      setInvoiceItemsList([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Handle Cancel Invoice (Void, mark as CANCELLED, preserve DB row)
  const handleConfirmCancel = async () => {
    if (!cancelModalInvoice) return;

    if ((cancelModalInvoice.paidAmount || 0) > 0) {
      addToast("Cannot cancel an invoice with recorded payments. Process a refund first.", "error");
      setCancelModalInvoice(null);
      return;
    }

    try {
      setCancelLoading(true);
      await billingApi.cancelBill(cancelModalInvoice.rawId);
      addToast(`Invoice ${cancelModalInvoice.id} cancelled successfully!`, "success");
      setCancelModalInvoice(null);
      await loadData();
    } catch (err) {
      console.error("Failed to cancel invoice:", err);
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Action not allowed";
      addToast(typeof msg === "string" ? msg : "Could not cancel invoice", "error");
    } finally {
      setCancelLoading(false);
    }
  };

  // Handle Delete Invoice (Permanent hard deletion for unpaid drafts)
  const handleConfirmDelete = async () => {
    if (!deleteModalInvoice) return;

    if ((deleteModalInvoice.paidAmount || 0) > 0) {
      addToast("Cannot delete an invoice with recorded payments. Process a refund first.", "error");
      setDeleteModalInvoice(null);
      return;
    }

    try {
      setDeleteLoading(true);
      await billingApi.deleteBill(deleteModalInvoice.rawId);
      addToast(`Invoice ${deleteModalInvoice.id} permanently deleted.`, "success");
      setDeleteModalInvoice(null);
      await loadData();
    } catch (err) {
      console.error("Failed to delete invoice:", err);
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Action not allowed";
      addToast(typeof msg === "string" ? msg : "Could not delete invoice", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="df-role-page df-cashier-page">
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Invoices" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Billing Desk</span>
          <h1>Invoice Management</h1>
          <p>Create, view and manage patient invoices.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className="df-btn df-btn-primary"
            onClick={() => setCreateModalOpen(true)}
          >
            + Create Invoice
          </button>
        </div>
      </header>

      {/* Relevant KPI Cards */}
      <div className="df-stat-grid">
        <StatCard label="Total Invoices" value={String(totalInvoices)} icon="◫" color="primary" />
        <StatCard label="Issued / Unpaid" value={String(issuedCount)} icon="◷" color="warning" />
        <StatCard label="Paid" value={String(paidCount)} icon="✓" color="success" />
        <StatCard label="Outstanding" value={formatLkr(totalOutstandingSum)} icon="💰" color="primary" />
      </div>

      {/* Main Section: Invoice List */}
      <section className="df-card df-cashier-glass-card">
        <div className="df-card-header df-invoices-card-header">
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Patient Invoices</h3>
          <div className="df-invoices-filter-group">
            <input
              type="text"
              className="df-input df-invoices-search-input"
              placeholder="Search invoice, patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select
              className="df-select df-invoices-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="unpaid">Unpaid / Issued</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="df-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: "48px 0", textAlign: "center", color: "var(--df-text-secondary)" }}>
              <div className="df-spinner" style={{ margin: "0 auto 12px", width: 28, height: 28 }} />
              <div>Loading invoices...</div>
            </div>
          ) : (
            <DataTable
              className="df-invoices-table-wrap"
              tableClassName="df-invoices-table"
              columns={[
                {
                  key: "id",
                  label: "Invoice ID",
                  width: "125px",
                  align: "left",
                  className: "df-col-invoice-id",
                  render: (row) => <span className="df-invoice-id-badge">{row.id}</span>,
                },
                {
                  key: "patient",
                  label: "Patient",
                  width: "165px",
                  align: "left",
                  className: "df-col-patient",
                  render: (row) => (
                    <div className="df-invoice-patient-cell" title={row.patient}>
                      {row.patient}
                    </div>
                  ),
                },
                {
                  key: "service",
                  label: "Doctor / Service",
                  width: "260px",
                  align: "left",
                  className: "df-col-service",
                  render: (row) => (
                    <div className="df-invoice-service-cell" title={row.service}>
                      {row.service}
                    </div>
                  ),
                },
                {
                  key: "date",
                  label: "Date",
                  width: "110px",
                  align: "left",
                  className: "df-col-date",
                  render: (row) => <span className="df-invoice-date">{row.date}</span>,
                },
                {
                  key: "amount",
                  label: "Total",
                  width: "115px",
                  align: "right",
                  className: "df-col-total",
                  render: (row) => (
                    <span className="df-money-cell df-money-total">
                      {formatLkr(row.rawAmount != null ? row.rawAmount : row.amount)}
                    </span>
                  ),
                },
                {
                  key: "paidAmount",
                  label: "Paid",
                  width: "115px",
                  align: "right",
                  className: "df-col-paid",
                  render: (row) => (
                    <span className="df-money-cell df-money-paid">
                      {formatLkr(row.paidAmount || 0)}
                    </span>
                  ),
                },
                {
                  key: "balanceAmount",
                  label: "Balance",
                  width: "115px",
                  align: "right",
                  className: "df-col-balance",
                  render: (row) => (
                    <span
                      className={`df-money-cell ${(row.balanceAmount || 0) > 0 ? "df-balance-due" : "df-balance-settled"}`}
                    >
                      {formatLkr(row.balanceAmount || 0)}
                    </span>
                  ),
                },
                {
                  key: "status",
                  label: "Status",
                  type: "status",
                  width: "110px",
                  align: "center",
                  className: "df-col-status",
                },
              ]}
              rows={filteredBills}
              searchable={false}
              actionsWidth="340px"
              actionsAlign="left"
              rowActions={(row) => (
                <div className="df-invoice-actions-group">
                  <button
                    type="button"
                    className="df-btn df-btn-secondary df-btn-sm df-invoice-action-btn"
                    onClick={() => handleOpenDetails(row)}
                    title="View Statement, Line Items & Payments"
                  >
                    👁️ Details
                  </button>
                  {row.rawStatus !== "PAID" && row.status !== "paid" && (
                    <button
                      type="button"
                      className="df-btn df-btn-ghost df-btn-sm df-invoice-action-btn"
                      onClick={() => handleOpenEdit(row)}
                      title="Edit Invoice"
                    >
                      ✏️ Edit
                    </button>
                  )}
                  <button
                    type="button"
                    className="df-btn df-btn-ghost df-btn-sm df-invoice-action-btn"
                    onClick={() => setReceiptModal(row)}
                    title="Print Stamped Statement"
                  >
                    🖨️ Receipt
                  </button>
                  {row.rawStatus !== "CANCELLED" && (
                    <button
                      type="button"
                      className="df-btn df-btn-warning df-btn-sm df-invoice-action-btn"
                      onClick={() => setCancelModalInvoice(row)}
                      title="Cancel Invoice (Mark as CANCELLED, preserve DB audit trail)"
                    >
                      ✕ Cancel
                    </button>
                  )}
                  {((row.paidAmount || 0) === 0 || row.rawStatus === "CANCELLED") && (
                    <button
                      type="button"
                      className="df-btn df-btn-danger df-btn-sm df-invoice-action-btn"
                      onClick={() => setDeleteModalInvoice(row)}
                      title="Permanently Delete Unpaid Draft"
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              )}
            />
          )}
        </div>
      </section>

      {/* Create Invoice Modal */}
      {createModalOpen && (
        <Modal
          title="Create New Patient Invoice"
          onClose={() => setCreateModalOpen(false)}
          actions={
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setCreateModalOpen(false)}
                disabled={createSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="df-btn df-btn-primary"
                onClick={handleCreateInvoice}
                disabled={createSubmitting}
              >
                {createSubmitting ? "Creating..." : "Create Invoice"}
              </button>
            </div>
          }
        >
          <form onSubmit={handleCreateInvoice} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {createError && (
              <div style={{ padding: 10, background: "#fee2e2", color: "#b91c1c", borderRadius: 4, fontSize: 13 }}>
                {createError}
              </div>
            )}

            <div>
              <label className="df-label" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Select Patient: *
              </label>
              <select
                className="df-select"
                style={{ width: "100%" }}
                value={newInvoiceData.patientId}
                onChange={(e) => setNewInvoiceData({ ...newInvoiceData, patientId: e.target.value })}
                required
              >
                <option value="">-- Choose patient --</option>
                {patientsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.patientCode ? `[${p.patientCode}] ` : `[#${p.id}] `}
                    {p.firstName} {p.lastName} {p.phone ? `(${p.phone})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="df-label" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                  Appointment (Optional):
                </label>
                <select
                  className="df-select"
                  style={{ width: "100%" }}
                  value={newInvoiceData.appointmentId}
                  onChange={(e) => setNewInvoiceData({ ...newInvoiceData, appointmentId: e.target.value })}
                >
                  <option value="">-- None / Direct Visit --</option>
                  {appointmentsList
                    .filter((a) => !newInvoiceData.patientId || String(a.patientId) === String(newInvoiceData.patientId))
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        Appt #{a.id} ({a.appointmentDate || a.date}) - {a.appointmentType || "Visit"}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="df-label" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                  Bill Date:
                </label>
                <input
                  type="date"
                  className="df-input"
                  style={{ width: "100%" }}
                  value={newInvoiceData.billDate}
                  onChange={(e) => setNewInvoiceData({ ...newInvoiceData, billDate: e.target.value })}
                />
              </div>
            </div>

            {/* Line Items Section */}
            <div style={{ background: "var(--df-glass-panel, rgba(248, 250, 252, 0.7))", padding: 12, borderRadius: 8, border: "1px solid var(--df-border, #e2e8f0)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label className="df-label" style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>
                  Invoice Line Items
                </label>
                <button
                  type="button"
                  className="df-btn df-btn-secondary df-btn-sm"
                  onClick={handleAddItem}
                  style={{ fontSize: 11 }}
                >
                  + Add Line Item
                </button>
              </div>

              {newInvoiceData.items.map((item, idx) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "110px 1.5fr 60px 90px 80px 30px", gap: 6, alignItems: "center", marginBottom: 6 }}>
                  <select
                    className="df-select"
                    style={{ fontSize: 12, padding: "4px 6px" }}
                    value={item.itemType}
                    onChange={(e) => handleItemChange(idx, "itemType", e.target.value)}
                  >
                    <option value="TREATMENT">Treatment</option>
                    <option value="MEDICATION">Medication</option>
                    <option value="CONSULTATION">Consultation</option>
                    <option value="LAB_TEST">Lab Test</option>
                    <option value="EQUIPMENT">Equipment</option>
                  </select>

                  <input
                    type="text"
                    className="df-input"
                    style={{ fontSize: 12, padding: "4px 8px" }}
                    placeholder="Description / Service name"
                    value={item.itemName}
                    onChange={(e) => handleItemChange(idx, "itemName", e.target.value)}
                  />

                  <input
                    type="number"
                    className="df-input"
                    style={{ fontSize: 12, padding: "4px 6px", textAlign: "center" }}
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                    min={1}
                  />

                  <input
                    type="number"
                    className="df-input"
                    style={{ fontSize: 12, padding: "4px 6px", textAlign: "right" }}
                    placeholder="Price"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(idx, "unitPrice", e.target.value)}
                    min={0}
                  />

                  <div style={{ fontSize: 11, fontWeight: 600, textAlign: "right", color: "var(--df-text-secondary, #475569)" }}>
                    {formatLkr((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0))}
                  </div>

                  {newInvoiceData.items.length > 1 ? (
                    <button
                      type="button"
                      className="df-btn df-btn-ghost df-btn-sm"
                      style={{ padding: "2px 6px", color: "#ef4444" }}
                      onClick={() => handleRemoveItem(idx)}
                      title="Remove Item"
                    >
                      ✕
                    </button>
                  ) : <div />}
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <label className="df-label" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                  Subtotal (LKR): *
                </label>
                <input
                  type="number"
                  className="df-input"
                  style={{ width: "100%", fontWeight: 700 }}
                  placeholder="0.00"
                  value={newInvoiceData.subtotal}
                  onChange={(e) => setNewInvoiceData({ ...newInvoiceData, subtotal: e.target.value })}
                  min={0}
                  required
                />
              </div>

              <div>
                <label className="df-label" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                  Discount (LKR):
                </label>
                <input
                  type="number"
                  className="df-input"
                  style={{ width: "100%" }}
                  placeholder="0.00"
                  value={newInvoiceData.discount}
                  onChange={(e) => setNewInvoiceData({ ...newInvoiceData, discount: e.target.value })}
                  min={0}
                />
              </div>

              <div>
                <label className="df-label" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                  Tax (LKR):
                </label>
                <input
                  type="number"
                  className="df-input"
                  style={{ width: "100%" }}
                  placeholder="0.00"
                  value={newInvoiceData.tax}
                  onChange={(e) => setNewInvoiceData({ ...newInvoiceData, tax: e.target.value })}
                  min={0}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--df-glass-panel, #f1f5f9)", padding: "8px 12px", borderRadius: 6, fontSize: 13, fontWeight: 700 }}>
              <span>Calculated Total:</span>
              <span style={{ color: "var(--df-primary-600, #2563eb)", fontSize: 15 }}>
                {formatLkr(Math.max(0, (parseFloat(newInvoiceData.subtotal) || 0) - (parseFloat(newInvoiceData.discount) || 0) + (parseFloat(newInvoiceData.tax) || 0)))}
              </span>
            </div>

            <div>
              <label className="df-label" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Clinical Notes / Procedure Description:
              </label>
              <textarea
                className="df-input"
                style={{ width: "100%", height: 60 }}
                placeholder="e.g. Tooth restoration, cleaning, consultation..."
                value={newInvoiceData.notes}
                onChange={(e) => setNewInvoiceData({ ...newInvoiceData, notes: e.target.value })}
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Invoice Modal */}
      {editModalInvoice && (
        <Modal
          title={`Edit Invoice: ${editModalInvoice.id}`}
          onClose={() => setEditModalInvoice(null)}
          actions={
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setEditModalInvoice(null)}
                disabled={editSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="df-btn df-btn-primary"
                onClick={handleSaveEdit}
                disabled={editSubmitting}
              >
                {editSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          }
        >
          <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {editError && (
              <div style={{ padding: 10, background: "#fee2e2", color: "#b91c1c", borderRadius: 4, fontSize: 13 }}>
                {editError}
              </div>
            )}

            <div>
              <strong>Patient:</strong> {editModalInvoice.patient}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <label className="df-label" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                  Subtotal (LKR):
                </label>
                <input
                  type="number"
                  className="df-input"
                  style={{ width: "100%" }}
                  value={editFormData.subtotal}
                  onChange={(e) => setEditFormData({ ...editFormData, subtotal: e.target.value })}
                  min={0}
                  required
                />
              </div>

              <div>
                <label className="df-label" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                  Discount (LKR):
                </label>
                <input
                  type="number"
                  className="df-input"
                  style={{ width: "100%" }}
                  value={editFormData.discount}
                  onChange={(e) => setEditFormData({ ...editFormData, discount: e.target.value })}
                  min={0}
                />
              </div>

              <div>
                <label className="df-label" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                  Tax (LKR):
                </label>
                <input
                  type="number"
                  className="df-input"
                  style={{ width: "100%" }}
                  value={editFormData.tax}
                  onChange={(e) => setEditFormData({ ...editFormData, tax: e.target.value })}
                  min={0}
                />
              </div>
            </div>

            <div>
              <label className="df-label" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Notes / Statement Details:
              </label>
              <textarea
                className="df-input"
                style={{ width: "100%", height: 70 }}
                value={editFormData.notes}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Invoice Details & Associated Payments Modal */}
      {detailsModalInvoice && (
        <Modal
          title={`Invoice Statement: ${detailsModalInvoice.id}`}
          onClose={() => setDetailsModalInvoice(null)}
          actions={
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setReceiptModal(detailsModalInvoice)}
              >
                🖨️ Print Statement
              </button>
              <button
                type="button"
                className="df-btn df-btn-primary"
                onClick={() => setDetailsModalInvoice(null)}
              >
                Close
              </button>
            </div>
          }
        >
          <div style={{ padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, color: "var(--df-primary-600, #2563eb)" }}>{detailsModalInvoice.id}</h3>
                <div style={{ fontSize: 13, color: "var(--df-text-secondary, #64748b)", marginTop: 2 }}>
                  Patient: <strong>{detailsModalInvoice.patient}</strong> • Date: <strong>{detailsModalInvoice.date}</strong>
                </div>
              </div>
              <StatusBadge status={detailsModalInvoice.status} />
            </div>

            {/* Line Items Table if present */}
            {invoiceItemsList && invoiceItemsList.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <h4 style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 700 }}>Itemized Services & Medications</h4>
                <div style={{ border: "1px solid var(--df-border, #e2e8f0)", borderRadius: 8, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "var(--df-glass-panel, #f8fafc)", textAlign: "left", color: "var(--df-text-secondary, #64748b)" }}>
                        <th style={{ padding: "6px 10px" }}>Item / Description</th>
                        <th style={{ padding: "6px 10px" }}>Type</th>
                        <th style={{ padding: "6px 10px", textAlign: "center" }}>Qty</th>
                        <th style={{ padding: "6px 10px", textAlign: "right" }}>Unit Price</th>
                        <th style={{ padding: "6px 10px", textAlign: "right" }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceItemsList.map((item, idx) => (
                        <tr key={item.id || idx} style={{ borderTop: "1px solid var(--df-border, #f1f5f9)" }}>
                          <td style={{ padding: "6px 10px", fontWeight: 600 }}>{item.itemName}</td>
                          <td style={{ padding: "6px 10px", fontSize: 11, color: "#64748b" }}>{item.itemType}</td>
                          <td style={{ padding: "6px 10px", textAlign: "center" }}>{item.quantity}</td>
                          <td style={{ padding: "6px 10px", textAlign: "right" }}>{formatLkr(item.unitPrice)}</td>
                          <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700 }}>{formatLkr(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Breakdown Table */}
            <div style={{ background: "var(--df-glass-panel, rgba(248, 250, 252, 0.8))", padding: 14, borderRadius: 10, border: "1px solid var(--df-border, #e2e8f0)", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span>Subtotal:</span>
                <span>{formatLkr(detailsModalInvoice.subtotal ?? detailsModalInvoice.rawAmount)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4, color: "#16a34a" }}>
                <span>Discount:</span>
                <span>- {formatLkr(detailsModalInvoice.discount || 0)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span>Tax:</span>
                <span>+ {formatLkr(detailsModalInvoice.tax || 0)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, borderTop: "1px solid var(--df-border, #cbd5e1)", paddingTop: 6, marginTop: 4 }}>
                <span>Grand Total:</span>
                <span style={{ color: "var(--df-primary-600, #2563eb)" }}>{detailsModalInvoice.amount}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 4, color: "#16a34a", fontWeight: 600 }}>
                <span>Paid Amount:</span>
                <span>{formatLkr(detailsModalInvoice.paidAmount || 0)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginTop: 4, fontWeight: 700, color: detailsModalInvoice.balanceAmount > 0 ? "#dc2626" : "#16a34a" }}>
                <span>Balance Due:</span>
                <span>{formatLkr(detailsModalInvoice.balanceAmount || 0)}</span>
              </div>
            </div>

            {/* Payment Transactions for this invoice */}
            <div>
              <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700 }}>
                Recorded Payments for this Invoice
              </h4>
              {loadingDetails ? (
                <div style={{ fontSize: 12, color: "var(--df-text-secondary, #64748b)" }}>Loading payment history...</div>
              ) : invoicePaymentsList.length > 0 ? (
                <div style={{ border: "1px solid var(--df-border, #e2e8f0)", borderRadius: 10, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "var(--df-glass-panel, #f8fafc)", textAlign: "left", color: "var(--df-text-secondary, #64748b)" }}>
                        <th style={{ padding: "8px 12px" }}>Ref</th>
                        <th style={{ padding: "8px 12px" }}>Date</th>
                        <th style={{ padding: "8px 12px" }}>Method</th>
                        <th style={{ padding: "8px 12px" }}>Amount</th>
                        <th style={{ padding: "8px 12px" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoicePaymentsList.map((p) => (
                        <tr key={p.id} style={{ borderTop: "1px solid var(--df-border, #f1f5f9)" }}>
                          <td style={{ padding: "6px 10px", fontWeight: 600 }}>{p.paymentReference || `#${p.id}`}</td>
                          <td style={{ padding: "6px 10px" }}>{String(p.paymentDate || "").slice(0, 10)}</td>
                          <td style={{ padding: "6px 10px" }}>{p.paymentMethod}</td>
                          <td style={{ padding: "6px 10px", fontWeight: 700 }}>{formatLkr(p.amount)}</td>
                          <td style={{ padding: "6px 10px" }}>
                            <span style={{ color: p.status === "SUCCESS" ? "#16a34a" : "#ca8a04", fontWeight: 600 }}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
                  No payment records recorded for this invoice yet.
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Cancel Invoice Confirmation Modal */}
      {cancelModalInvoice && (
        <Modal
          title={`Cancel Invoice: ${cancelModalInvoice.id}`}
          onClose={() => setCancelModalInvoice(null)}
          actions={
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setCancelModalInvoice(null)}
                disabled={cancelLoading}
              >
                Back
              </button>
              {(cancelModalInvoice.paidAmount || 0) <= 0 && (
                <button
                  type="button"
                  className="df-btn df-btn-warning"
                  onClick={handleConfirmCancel}
                  disabled={cancelLoading}
                >
                  {cancelLoading ? "Cancelling..." : "Confirm Cancel"}
                </button>
              )}
            </div>
          }
        >
          <div style={{ padding: 12 }}>
            {(cancelModalInvoice.paidAmount || 0) > 0 ? (
              <div style={{ padding: 12, background: "#fef3c7", color: "#92400e", borderRadius: 6, fontSize: 13 }}>
                ⚠️ <strong>Financial Protection Rule:</strong> Invoice <strong>{cancelModalInvoice.id}</strong> has recorded payments totaling <strong>{formatLkr(cancelModalInvoice.paidAmount)}</strong>. It cannot be cancelled. Please process a refund through the Refunds module instead.
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 14, margin: "0 0 12px" }}>
                  Are you sure you want to cancel invoice <strong>{cancelModalInvoice.id}</strong> for patient <strong>{cancelModalInvoice.patient}</strong>?
                </p>
                <div style={{ fontSize: 13, color: "#64748b", background: "var(--df-glass-panel, #f8fafc)", padding: 10, borderRadius: 6 }}>
                  Total Invoiced: <strong>{cancelModalInvoice.amount}</strong> • Balance: <strong>{formatLkr(cancelModalInvoice.balanceAmount)}</strong>
                  <div style={{ marginTop: 6, fontSize: 12, color: "#475569" }}>
                    <em>Status will be updated to CANCELLED. The record will remain in the database for auditing and reporting, but will be excluded from pending collection.</em>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Permanently Delete Invoice Confirmation Modal */}
      {deleteModalInvoice && (
        <Modal
          title={`Permanently Delete Invoice: ${deleteModalInvoice.id}`}
          onClose={() => setDeleteModalInvoice(null)}
          actions={
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setDeleteModalInvoice(null)}
                disabled={deleteLoading}
              >
                Back
              </button>
              {(deleteModalInvoice.paidAmount || 0) <= 0 && (
                <button
                  type="button"
                  className="df-btn df-btn-danger"
                  onClick={handleConfirmDelete}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? "Deleting..." : "Confirm Permanent Deletion"}
                </button>
              )}
            </div>
          }
        >
          <div style={{ padding: 12 }}>
            {(deleteModalInvoice.paidAmount || 0) > 0 ? (
              <div style={{ padding: 12, background: "#fee2e2", color: "#991b1b", borderRadius: 6, fontSize: 13 }}>
                🛑 <strong>Financial Accounting Rule:</strong> Invoice <strong>{deleteModalInvoice.id}</strong> has recorded payments totaling <strong>{formatLkr(deleteModalInvoice.paidAmount)}</strong>. Hard deletion is strictly blocked to preserve audit integrity. Please process a refund instead.
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 14, margin: "0 0 12px" }}>
                  Are you sure you want to permanently delete invoice <strong>{deleteModalInvoice.id}</strong>?
                </p>
                <div style={{ fontSize: 13, color: "#dc2626", background: "#fef2f2", padding: 10, borderRadius: 6, border: "1px solid #fecaca" }}>
                  ⚠️ <strong>Warning:</strong> This will permanently delete the invoice record from the database. This action cannot be undone. Only eligible for unpaid drafts.
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Receipt Modal */}
      {receiptModal && (
        <StampedReceiptModal receipt={receiptModal} onClose={() => setReceiptModal(null)} />
      )}
    </div>
  );
}

/* ==========================================================================
   3. PENDING PAYMENTS VIEW — PENDING COLLECTION ONLY
   ========================================================================== */
export function CashierPendingView({ role = "user" }) {
  const { addToast } = useNotifications();

  const [pendingBills, setPendingBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Collect Payment Modal
  const [collectModalBill, setCollectModalBill] = useState(null);
  const [collectAmount, setCollectAmount] = useState("");
  const [collectMethod, setCollectMethod] = useState("Cash");
  const [collectNotes, setCollectNotes] = useState("");
  const [collecting, setCollecting] = useState(false);
  const [collectError, setCollectError] = useState(null);

  const [detailsModalBill, setDetailsModalBill] = useState(null);
  const [cancelModalBill, setCancelModalBill] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [deleteModalBill, setDeleteModalBill] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadPendingData = useCallback(async () => {
    try {
      setLoading(true);
      const [rawBills, patients, appointments] = await Promise.all([
        billingApi.getAllBills().catch(() => []),
        patientApi.getAllPatients().catch(() => []),
        appointmentApi.getAllAppointments().catch(() => []),
      ]);

      const patientLookup = {};
      patients.forEach((p) => {
        patientLookup[p.id] = p;
      });

      const appointmentLookup = {};
      appointments.forEach((a) => {
        appointmentLookup[a.id] = a;
      });

      const normalized = rawBills.map((b) => normalizeBill(b, patientLookup, appointmentLookup));

      // CRITICAL: Filter ONLY invoices that still require payment!
      const uncollected = normalized.filter(
        (b) =>
          (b.rawStatus === "UNPAID" ||
            b.rawStatus === "PARTIALLY_PAID" ||
            b.rawStatus === "ISSUED" ||
            b.status === "pending") &&
          (b.balanceAmount || 0) > 0
      );

      uncollected.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      setPendingBills(uncollected);
    } catch (err) {
      console.error("Failed to load pending payments:", err);
      addToast("Failed to fetch pending collection queue", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadPendingData();
  }, [loadPendingData]);

  // Specific KPI Cards for Pending Payments
  const pendingCount = pendingBills.length;
  const totalOutstandingSum = pendingBills.reduce((sum, b) => sum + (Number(b.balanceAmount) || 0), 0);
  const partiallyPaidCount = pendingBills.filter((b) => b.rawStatus === "PARTIALLY_PAID").length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const dueTodayCount = pendingBills.filter((b) => String(b.date || "").slice(0, 10) === todayStr).length;

  // Search filter
  const filteredPending = useMemo(() => {
    if (!searchQuery) return pendingBills;
    const q = searchQuery.toLowerCase();
    return pendingBills.filter(
      (b) =>
        (b.id && b.id.toLowerCase().includes(q)) ||
        (b.patient && b.patient.toLowerCase().includes(q)) ||
        (b.service && b.service.toLowerCase().includes(q))
    );
  }, [pendingBills, searchQuery]);

  // Open Collect Payment Modal
  const handleOpenCollect = (bill) => {
    setCollectModalBill(bill);
    setCollectAmount(String(bill.balanceAmount || bill.rawAmount || ""));
    setCollectMethod("Cash");
    setCollectNotes("");
    setCollectError(null);
  };

  // Submit Payment Collection
  const handleSubmitCollection = async (e) => {
    e.preventDefault();
    if (!collectModalBill) return;
    setCollectError(null);

    const amt = parseFloat(collectAmount);
    if (isNaN(amt) || amt <= 0) {
      setCollectError("Please enter a valid payment amount greater than zero");
      return;
    }
    if (amt > collectModalBill.balanceAmount) {
      setCollectError(`Amount cannot exceed the remaining balance (${formatLkr(collectModalBill.balanceAmount)})`);
      return;
    }

    try {
      setCollecting(true);
      await billingApi.processPaymentAndVerify({
        billId: collectModalBill.rawId,
        amount: amt,
        paymentMethod: collectMethod,
        transactionId: `COLLECT-${Date.now()}`,
        notes: collectNotes || `Queue payment collection (${collectMethod})`,
      });

      addToast(`Payment of ${formatLkr(amt)} collected successfully for invoice ${collectModalBill.id}!`, "success");
      setCollectModalBill(null);
      await loadPendingData();
    } catch (err) {
      console.error("Failed to collect payment:", err);
      const msg = err.response?.data?.message || err.response?.data || err.message || "Payment collection failed";
      setCollectError(typeof msg === "string" ? msg : "Collection failed");
    } finally {
      setCollecting(false);
    }
  };

  // Handle Cancel Bill from Pending Queue
  const handleConfirmCancelBill = async () => {
    if (!cancelModalBill) return;
    if ((cancelModalBill.paidAmount || 0) > 0) {
      addToast("Cannot cancel an invoice with recorded payments. Process a refund first.", "error");
      setCancelModalBill(null);
      return;
    }

    try {
      setCancelLoading(true);
      await billingApi.cancelBill(cancelModalBill.rawId);
      addToast(`Invoice ${cancelModalBill.id} cancelled successfully!`, "success");
      setCancelModalBill(null);
      await loadPendingData();
    } catch (err) {
      console.error("Failed to cancel bill:", err);
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to cancel invoice";
      addToast(typeof msg === "string" ? msg : "Could not cancel invoice", "error");
    } finally {
      setCancelLoading(false);
    }
  };

  // Handle Permanent Delete Bill from Pending Queue
  const handleConfirmDeleteBill = async () => {
    if (!deleteModalBill) return;
    if ((deleteModalBill.paidAmount || 0) > 0) {
      addToast("Cannot delete an invoice with recorded payments. Process a refund first.", "error");
      setDeleteModalBill(null);
      return;
    }

    try {
      setDeleteLoading(true);
      await billingApi.deleteBill(deleteModalBill.rawId);
      addToast(`Invoice ${deleteModalBill.id} permanently deleted.`, "success");
      setDeleteModalBill(null);
      await loadPendingData();
    } catch (err) {
      console.error("Failed to delete bill:", err);
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to delete invoice";
      addToast(typeof msg === "string" ? msg : "Could not delete invoice", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="df-role-page df-cashier-page">
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Pending Payments" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Collection Queue</span>
          <h1>Pending Payments</h1>
          <p>Track and collect outstanding patient balances.</p>
        </div>
      </header>

      {/* Relevant KPI Cards */}
      <div className="df-stat-grid">
        <StatCard label="Pending Invoices" value={String(pendingCount)} icon="◷" color="warning" />
        <StatCard label="Total Outstanding" value={formatLkr(totalOutstandingSum)} icon="💰" color="primary" />
        <StatCard label="Partially Paid" value={String(partiallyPaidCount)} icon="◈" color="primary" />
        <StatCard label="Due Today" value={String(dueTodayCount)} icon="📅" color="success" />
      </div>

      {/* Main Section: Pending Collections Table */}
      <section className="df-card df-cashier-glass-card">
        <div
          className="df-card-header"
          style={{
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Uncollected Invoices Queue</h3>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
              Only unpaid and partially-paid invoices requiring collection are displayed.
            </p>
          </div>
          <input
            type="text"
            className="df-input"
            style={{ width: 240, fontSize: 13 }}
            placeholder="Search patient, invoice..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="df-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: "48px 0", textAlign: "center", color: "var(--df-text-secondary)" }}>
              <div className="df-spinner" style={{ margin: "0 auto 12px", width: 28, height: 28 }} />
              <div>Loading pending collection queue...</div>
            </div>
          ) : (
            <DataTable
              columns={[
                { key: "id", label: "Invoice ID" },
                { key: "patient", label: "Patient" },
                { key: "service", label: "Doctor / Service" },
                { key: "amount", label: "Total" },
                {
                  key: "paidAmount",
                  label: "Paid",
                  render: (row) => formatLkr(row.paidAmount || 0),
                },
                {
                  key: "balanceAmount",
                  label: "Outstanding Balance",
                  render: (row) => (
                    <span style={{ fontWeight: 800, color: "#dc2626", fontSize: 14 }}>
                      {formatLkr(row.balanceAmount || 0)}
                    </span>
                  ),
                },
                { key: "date", label: "Bill Date" },
                { key: "status", label: "Status", type: "status" },
              ]}
              rows={filteredPending}
              searchable={false}
              rowActions={(row) => (
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    className="df-btn df-btn-secondary df-btn-sm"
                    onClick={() => setDetailsModalBill(row)}
                    title="View Statement Breakdown"
                  >
                    👁️ View
                  </button>
                  <button
                    type="button"
                    className="df-btn df-btn-success df-btn-sm"
                    onClick={() => handleOpenCollect(row)}
                    style={{ fontWeight: 700 }}
                    title="Collect Balance"
                  >
                    ✓ Collect
                  </button>
                  {row.rawStatus !== "CANCELLED" && (
                    <button
                      type="button"
                      className="df-btn df-btn-warning df-btn-sm"
                      onClick={() => setCancelModalBill(row)}
                      title="Cancel Uncollected Invoice"
                    >
                      ✕ Cancel
                    </button>
                  )}
                  {((row.paidAmount || 0) === 0 || row.rawStatus === "CANCELLED") && (
                    <button
                      type="button"
                      className="df-btn df-btn-danger df-btn-sm"
                      onClick={() => setDeleteModalBill(row)}
                      title="Permanently Delete Draft"
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              )}
            />
          )}
        </div>
      </section>

      {/* Collect Payment Modal */}
      {collectModalBill && (
        <Modal
          title={`Collect Payment: ${collectModalBill.id}`}
          onClose={() => setCollectModalBill(null)}
          actions={
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setCollectModalBill(null)}
                disabled={collecting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="df-btn df-btn-success"
                onClick={handleSubmitCollection}
                disabled={collecting}
              >
                {collecting ? "Processing..." : `✓ Confirm Payment (${formatLkr(parseFloat(collectAmount) || 0)})`}
              </button>
            </div>
          }
        >
          <form onSubmit={handleSubmitCollection} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {collectError && (
              <div style={{ padding: 10, background: "#fee2e2", color: "#b91c1c", borderRadius: 4, fontSize: 13 }}>
                {collectError}
              </div>
            )}

            <div style={{ padding: 14, background: "var(--df-glass-panel, rgba(241, 245, 249, 0.7))", border: "1px solid var(--df-border, #e2e8f0)", borderRadius: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{collectModalBill.patient}</div>
              <div style={{ fontSize: 12, color: "var(--df-text-secondary, #64748b)" }}>Invoice #{collectModalBill.id} • {collectModalBill.service}</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 13 }}>
                <span>Total Amount: <strong>{collectModalBill.amount}</strong></span>
                <span>Already Paid: <strong>{formatLkr(collectModalBill.paidAmount)}</strong></span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 15, fontWeight: 800, color: "#dc2626" }}>
                <span>Outstanding Balance:</span>
                <span>{formatLkr(collectModalBill.balanceAmount)}</span>
              </div>
            </div>

            <div>
              <label className="df-label" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Collection Amount (LKR): *
              </label>
              <input
                type="number"
                className="df-input"
                style={{ width: "100%", fontWeight: 700, fontSize: 15 }}
                value={collectAmount}
                onChange={(e) => setCollectAmount(e.target.value)}
                max={collectModalBill.balanceAmount}
                min={1}
                required
              />
              <span style={{ fontSize: 11, color: "var(--df-text-secondary, #64748b)" }}>
                Prefilled with the exact outstanding balance. Adjust for partial payments.
              </span>
            </div>

            <div>
              <label className="df-label" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Payment Method:
              </label>
              <select
                className="df-select"
                style={{ width: "100%" }}
                value={collectMethod}
                onChange={(e) => setCollectMethod(e.target.value)}
              >
                <option value="Cash">Cash</option>
                <option value="Credit / Debit Card">Credit / Debit Card</option>
                <option value="Bank Transfer / Online Portal">Bank Transfer / Online Portal</option>
              </select>
            </div>

            <div>
              <label className="df-label" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Reference / Notes:
              </label>
              <input
                type="text"
                className="df-input"
                style={{ width: "100%" }}
                placeholder="e.g. Counter payment receipt"
                value={collectNotes}
                onChange={(e) => setCollectNotes(e.target.value)}
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Details Modal */}
      {detailsModalBill && (
        <Modal
          title={`Invoice Details: ${detailsModalBill.id}`}
          onClose={() => setDetailsModalBill(null)}
          actions={
            <button type="button" className="df-btn df-btn-primary" onClick={() => setDetailsModalBill(null)}>
              Close
            </button>
          }
        >
          <div style={{ padding: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--df-primary-600, #2563eb)", marginBottom: 4 }}>
              {detailsModalBill.id}
            </div>
            <div style={{ fontSize: 13, color: "var(--df-text-secondary, #64748b)", marginBottom: 12 }}>
              Patient: <strong>{detailsModalBill.patient}</strong> • Service: <strong>{detailsModalBill.service}</strong>
            </div>

            <div style={{ background: "var(--df-glass-panel, #f8fafc)", border: "1px solid var(--df-border, #e2e8f0)", padding: 12, borderRadius: 10, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span>Total Invoiced:</span>
                <strong>{detailsModalBill.amount}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, color: "#16a34a" }}>
                <span>Paid So Far:</span>
                <strong>{formatLkr(detailsModalBill.paidAmount)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 800, color: "#dc2626" }}>
                <span>Remaining Balance Due:</span>
                <span>{formatLkr(detailsModalBill.balanceAmount)}</span>
              </div>
            </div>

            <button
              type="button"
              className="df-btn df-btn-success"
              style={{ width: "100%" }}
              onClick={() => {
                const target = detailsModalBill;
                setDetailsModalBill(null);
                handleOpenCollect(target);
              }}
            >
              ✓ Proceed to Collect Payment
            </button>
          </div>
        </Modal>
      )}

      {/* Cancel Bill Confirmation Modal */}
      {cancelModalBill && (
        <Modal
          title={`Cancel Invoice: ${cancelModalBill.id}`}
          onClose={() => setCancelModalBill(null)}
          actions={
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setCancelModalBill(null)}
                disabled={cancelLoading}
              >
                Back
              </button>
              {(cancelModalBill.paidAmount || 0) <= 0 && (
                <button
                  type="button"
                  className="df-btn df-btn-warning"
                  onClick={handleConfirmCancelBill}
                  disabled={cancelLoading}
                >
                  {cancelLoading ? "Cancelling..." : "Confirm Cancel"}
                </button>
              )}
            </div>
          }
        >
          <div style={{ padding: 12 }}>
            {(cancelModalBill.paidAmount || 0) > 0 ? (
              <div style={{ padding: 12, background: "#fef3c7", color: "#92400e", borderRadius: 6, fontSize: 13 }}>
                ⚠️ <strong>Financial Protection Rule:</strong> Invoice <strong>{cancelModalBill.id}</strong> has recorded payments totaling <strong>{formatLkr(cancelModalBill.paidAmount)}</strong>. It cannot be cancelled. Please process a refund through the Refunds module instead.
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 14, margin: "0 0 12px" }}>
                  Are you sure you want to cancel uncollected invoice <strong>{cancelModalBill.id}</strong> for patient <strong>{cancelModalBill.patient}</strong>?
                </p>
                <div style={{ fontSize: 13, color: "#64748b", background: "var(--df-glass-panel, #f8fafc)", padding: 10, borderRadius: 6 }}>
                  Total Invoiced: <strong>{cancelModalBill.amount}</strong> • Balance: <strong>{formatLkr(cancelModalBill.balanceAmount)}</strong>
                  <div style={{ marginTop: 6, fontSize: 12, color: "#475569" }}>
                    <em>Status will be updated to CANCELLED. The invoice will be removed from this collection queue while keeping audit integrity in the database.</em>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Permanently Delete Bill Confirmation Modal */}
      {deleteModalBill && (
        <Modal
          title={`Permanently Delete Invoice: ${deleteModalBill.id}`}
          onClose={() => setDeleteModalBill(null)}
          actions={
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setDeleteModalBill(null)}
                disabled={deleteLoading}
              >
                Back
              </button>
              {(deleteModalBill.paidAmount || 0) <= 0 && (
                <button
                  type="button"
                  className="df-btn df-btn-danger"
                  onClick={handleConfirmDeleteBill}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? "Deleting..." : "Confirm Permanent Deletion"}
                </button>
              )}
            </div>
          }
        >
          <div style={{ padding: 12 }}>
            {(deleteModalBill.paidAmount || 0) > 0 ? (
              <div style={{ padding: 12, background: "#fee2e2", color: "#991b1b", borderRadius: 6, fontSize: 13 }}>
                🛑 <strong>Financial Accounting Rule:</strong> Invoice <strong>{deleteModalBill.id}</strong> has recorded payments totaling <strong>{formatLkr(deleteModalBill.paidAmount)}</strong>. Hard deletion is strictly blocked to preserve audit integrity. Please process a refund instead.
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 14, margin: "0 0 12px" }}>
                  Are you sure you want to permanently delete draft invoice <strong>{deleteModalBill.id}</strong>?
                </p>
                <div style={{ fontSize: 13, color: "#dc2626", background: "#fef2f2", padding: 10, borderRadius: 6, border: "1px solid #fecaca" }}>
                  ⚠️ <strong>Warning:</strong> This will permanently delete the invoice record from the database. This action cannot be undone.
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ==========================================================================
   4. PAYMENT HISTORY VIEW — TRANSACTION HISTORY ONLY
   ========================================================================== */
export function CashierHistoryView({ role = "user" }) {
  const { addToast } = useNotifications();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [datePreset, setDatePreset] = useState("all");

  const [detailsModalPayment, setDetailsModalPayment] = useState(null);
  const [receiptModal, setReceiptModal] = useState(null);

  const [refundModalPayment, setRefundModalPayment] = useState(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundMode, setRefundMode] = useState("instant");
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundError, setRefundError] = useState(null);

  const [cancelModalPayment, setCancelModalPayment] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const [deleteModalPayment, setDeleteModalPayment] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadPaymentsHistory = useCallback(async () => {
    try {
      setLoading(true);
      const [rawPayments, rawBills, patients] = await Promise.all([
        billingApi.getAllPayments().catch(() => []),
        billingApi.getAllBills().catch(() => []),
        patientApi.getAllPatients().catch(() => []),
      ]);

      const patientLookup = {};
      patients.forEach((p) => {
        patientLookup[p.id] = p;
      });

      const billLookup = {};
      rawBills.forEach((b) => {
        billLookup[b.id] = normalizeBill(b, patientLookup);
      });

      const normalized = rawPayments.map((p) => normalizePayment(p, billLookup));
      normalized.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      setPayments(normalized);
    } catch (err) {
      console.error("Failed to load payment history:", err);
      addToast("Failed to fetch payment history", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadPaymentsHistory();
  }, [loadPaymentsHistory]);

  // Payment History Specific KPI Cards
  const totalTransactions = payments.length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTransactions = payments.filter((p) => String(p.date || "").slice(0, 10) === todayStr).length;

  const totalCollectedSum = payments
    .filter((p) => p.rawStatus === "SUCCESS" || p.status === "paid")
    .reduce((sum, p) => sum + (Number(p.rawAmount) || 0), 0);

  const onlinePaymentsCount = payments.filter(
    (p) =>
      p.method?.toLowerCase().includes("online") ||
      p.method?.toLowerCase().includes("bank") ||
      p.transactionId?.startsWith("TXN-")
  ).length;

  // Filter Payments
  const filteredPayments = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    return payments.filter((p) => {
      // Search
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !searchQuery ||
        (p.id && p.id.toLowerCase().includes(q)) ||
        (p.patient && p.patient.toLowerCase().includes(q)) ||
        (p.invoice && p.invoice.toLowerCase().includes(q)) ||
        (p.transactionId && p.transactionId.toLowerCase().includes(q));

      // Method
      const matchMethod =
        methodFilter === "all" ||
        (methodFilter === "cash" && p.method?.toLowerCase().includes("cash")) ||
        (methodFilter === "card" && p.method?.toLowerCase().includes("card")) ||
        (methodFilter === "online" &&
          (p.method?.toLowerCase().includes("online") || p.method?.toLowerCase().includes("bank")));

      // Status
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "success" && (p.rawStatus === "SUCCESS" || p.status === "paid")) ||
        (statusFilter === "pending" && (p.rawStatus === "PENDING" || p.status === "pending")) ||
        (statusFilter === "refunded" && (p.rawStatus === "REFUNDED" || p.status === "completed")) ||
        (statusFilter === "failed" && (p.rawStatus === "FAILED" || p.status === "failed")) ||
        (statusFilter === "cancelled" && (p.rawStatus === "CANCELLED" || p.status === "cancelled"));

      // Date Preset
      let matchDate = true;
      if (datePreset === "today") {
        matchDate = String(p.date || "").slice(0, 10) === today;
      }

      return matchSearch && matchMethod && matchStatus && matchDate;
    });
  }, [payments, searchQuery, methodFilter, statusFilter, datePreset]);

  // Open Quick Refund Modal from History
  const handleOpenRefundModal = (p) => {
    setRefundModalPayment(p);
    const maxAvail = (p.rawAmount || 0) - (p.refundAmount || 0);
    setRefundAmount(String(maxAvail > 0 ? maxAvail : ""));
    setRefundReason("");
    setRefundMode("instant");
    setRefundError(null);
  };

  const handleSubmitRefund = async (e) => {
    e.preventDefault();
    if (!refundModalPayment) return;
    setRefundError(null);

    const amt = parseFloat(refundAmount);
    if (isNaN(amt) || amt <= 0) {
      setRefundError("Please enter a valid refund amount");
      return;
    }
    const maxAvail = (refundModalPayment.rawAmount || 0) - (refundModalPayment.refundAmount || 0);
    if (amt > maxAvail) {
      setRefundError(`Refund amount cannot exceed available balance (${formatLkr(maxAvail)})`);
      return;
    }
    if (!refundReason.trim()) {
      setRefundError("Please provide a refund reason");
      return;
    }

    try {
      setRefundSubmitting(true);
      if (refundMode === "request") {
        await billingApi.requestRefund(refundModalPayment.rawId, amt, refundReason.trim());
        addToast(`Refund request of ${formatLkr(amt)} submitted for review!`, "success");
      } else {
        await billingApi.refundPayment(refundModalPayment.rawId, amt, refundReason.trim());
        addToast(`Refund of ${formatLkr(amt)} processed successfully!`, "success");
      }
      setRefundModalPayment(null);
      await loadPaymentsHistory();
    } catch (err) {
      console.error("Failed to process refund:", err);
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Refund failed";
      setRefundError(typeof msg === "string" ? msg : "Refund failed");
    } finally {
      setRefundSubmitting(false);
    }
  };

  const handleConfirmCancelPayment = async () => {
    if (!cancelModalPayment) return;
    try {
      setCancelLoading(true);
      await billingApi.cancelPayment(cancelModalPayment.rawId);
      addToast(`Payment ${cancelModalPayment.id} voided / cancelled.`, "success");
      setCancelModalPayment(null);
      await loadPaymentsHistory();
    } catch (err) {
      console.error("Failed to cancel payment:", err);
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to cancel payment";
      addToast(typeof msg === "string" ? msg : "Cancel failed", "error");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleConfirmDeletePayment = async () => {
    if (!deleteModalPayment) return;
    try {
      setDeleteLoading(true);
      await billingApi.deletePayment(deleteModalPayment.rawId);
      addToast(`Payment record ${deleteModalPayment.id} deleted.`, "success");
      setDeleteModalPayment(null);
      await loadPaymentsHistory();
    } catch (err) {
      console.error("Failed to delete payment:", err);
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to delete payment";
      addToast(typeof msg === "string" ? msg : "Delete failed", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="df-role-page df-cashier-page">
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Payment History" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Financial Ledger</span>
          <h1>Payment History</h1>
          <p>View completed payment transactions and receipts.</p>
        </div>
      </header>

      {/* Relevant KPI Cards */}
      <div className="df-stat-grid">
        <StatCard label="Total Transactions" value={String(totalTransactions)} icon="◫" color="primary" />
        <StatCard label="Today's Transactions" value={String(todayTransactions)} icon="📅" color="success" />
        <StatCard label="Total Collected" value={formatLkr(totalCollectedSum)} icon="💰" color="primary" />
        <StatCard label="Online Payments" value={String(onlinePaymentsCount)} icon="💳" color="primary" />
      </div>

      {/* Main Section: Payment Transactions Table */}
      <section className="df-card df-cashier-glass-card">
        <div
          className="df-card-header"
          style={{
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Settled Payment Transactions</h3>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
              Authoritative transaction records from database payments ledger.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              type="text"
              className="df-input"
              style={{ width: 200, fontSize: 13 }}
              placeholder="Search ref, patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <select
              className="df-select"
              style={{ fontSize: 13 }}
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="online">Online / Bank</option>
            </select>

            <select
              className="df-select"
              style={{ fontSize: 13 }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="success">Success</option>
              <option value="pending">Pending</option>
              <option value="refunded">Refunded</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              className="df-select"
              style={{ fontSize: 13 }}
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
            >
              <option value="all">All Dates</option>
              <option value="today">Today Only</option>
            </select>
          </div>
        </div>

        <div className="df-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: "48px 0", textAlign: "center", color: "var(--df-text-secondary)" }}>
              <div className="df-spinner" style={{ margin: "0 auto 12px", width: 28, height: 28 }} />
              <div>Loading payment history...</div>
            </div>
          ) : (
            <DataTable
              className="df-history-table-wrap"
              tableClassName="df-history-table"
              columns={[
                {
                  key: "id",
                  label: "Payment ID",
                  width: "125px",
                  align: "left",
                  className: "df-col-history-id",
                  render: (row) => <span className="df-history-id-badge">{row.id}</span>,
                },
                {
                  key: "patient",
                  label: "Patient",
                  width: "165px",
                  align: "left",
                  className: "df-col-patient",
                  render: (row) => (
                    <div className="df-history-patient-cell" title={row.patient}>
                      {row.patient}
                    </div>
                  ),
                },
                {
                  key: "invoice",
                  label: "Invoice ID",
                  width: "125px",
                  align: "left",
                  className: "df-col-invoice",
                  render: (row) => (
                    <span className="df-history-invoice-cell">{row.invoice}</span>
                  ),
                },
                {
                  key: "amount",
                  label: "Amount",
                  width: "135px",
                  align: "right",
                  className: "df-col-amount",
                  render: (row) => (
                    <span className="df-history-amount-cell">{row.amount}</span>
                  ),
                },
                {
                  key: "method",
                  label: "Payment Method",
                  width: "145px",
                  align: "left",
                  className: "df-col-method",
                  render: (row) => (
                    <span className="df-history-method-cell">{row.method}</span>
                  ),
                },
                {
                  key: "transactionId",
                  label: "Gateway TXN",
                  width: "185px",
                  align: "left",
                  className: "df-col-txn",
                  render: (row) => (
                    <span className="df-history-txn-cell" title={row.transactionId || "—"}>
                      {row.transactionId || "—"}
                    </span>
                  ),
                },
                {
                  key: "date",
                  label: "Date",
                  width: "115px",
                  align: "left",
                  className: "df-col-date",
                  render: (row) => (
                    <span className="df-history-date-cell">{row.date}</span>
                  ),
                },
                {
                  key: "status",
                  label: "Status",
                  width: "125px",
                  align: "center",
                  className: "df-col-status",
                  type: "status",
                },
              ]}
              rows={filteredPayments}
              searchable={false}
              actionsWidth="245px"
              actionsAlign="left"
              rowActions={(row) => (
                <div className="df-history-actions-group">
                  <button
                    type="button"
                    className="df-btn df-btn-secondary df-btn-sm df-history-action-btn"
                    onClick={() => setDetailsModalPayment(row)}
                    title="View Details"
                  >
                    👁️ Details
                  </button>
                  <button
                    type="button"
                    className="df-btn df-btn-ghost df-btn-sm df-history-action-btn"
                    onClick={() => setReceiptModal(row)}
                    title="Official Receipt"
                  >
                    🧾 Receipt
                  </button>
                  {(row.rawStatus === "SUCCESS" || row.status === "paid") && (row.rawAmount - (row.refundAmount || 0)) > 0 && (
                    <button
                      type="button"
                      className="df-btn df-btn-warning df-btn-sm df-history-action-btn"
                      onClick={() => handleOpenRefundModal(row)}
                      title="Process / Request Refund"
                    >
                      ↺ Refund
                    </button>
                  )}
                  {row.rawStatus === "PENDING" && (
                    <button
                      type="button"
                      className="df-btn df-btn-danger df-btn-sm df-history-action-btn"
                      onClick={() => setCancelModalPayment(row)}
                      title="Void Pending Payment"
                    >
                      ✕ Void
                    </button>
                  )}
                  {(row.rawStatus === "FAILED" || row.rawStatus === "CANCELLED") && (
                    <button
                      type="button"
                      className="df-btn df-btn-ghost df-btn-sm df-history-action-btn"
                      style={{ color: "#dc2626" }}
                      onClick={() => setDeleteModalPayment(row)}
                      title="Delete Payment Record"
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              )}
            />
          )}
        </div>
      </section>

      {/* Payment Details Modal */}
      {detailsModalPayment && (
        <Modal
          title={`Payment Transaction: ${detailsModalPayment.id}`}
          onClose={() => setDetailsModalPayment(null)}
          actions={
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setReceiptModal(detailsModalPayment)}
              >
                🖨️ Stamped Receipt
              </button>
              <button
                type="button"
                className="df-btn df-btn-primary"
                onClick={() => setDetailsModalPayment(null)}
              >
                Close
              </button>
            </div>
          }
        >
          <div style={{ padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, color: "var(--df-primary-600, #2563eb)" }}>{detailsModalPayment.id}</h3>
                <div style={{ fontSize: 13, color: "var(--df-text-secondary, #64748b)" }}>Date: {detailsModalPayment.date}</div>
              </div>
              <StatusBadge status={detailsModalPayment.status} />
            </div>

            <div style={{ background: "var(--df-glass-panel, rgba(241, 245, 249, 0.7))", border: "1px solid var(--df-border, #e2e8f0)", padding: 14, borderRadius: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13, marginBottom: 14 }}>
              <div>Patient: <strong>{detailsModalPayment.patient}</strong></div>
              <div>Invoice Ref: <strong>{detailsModalPayment.invoice}</strong></div>
              <div>Amount: <strong style={{ color: (detailsModalPayment.status === "paid" || String(detailsModalPayment.rawStatus).toUpperCase() === "SUCCESS") ? "#16a34a" : "#d97706", fontSize: 15 }}>{detailsModalPayment.amount}</strong></div>
              <div>Method: <strong>{detailsModalPayment.method}</strong></div>
              <div>Gateway Txn: <strong>{detailsModalPayment.transactionId || "Counter Payment"}</strong></div>
              <div>Status: <strong>{detailsModalPayment.rawStatus}</strong></div>
            </div>

            {detailsModalPayment.refundAmount > 0 && (
              <div style={{ padding: 12, background: "#fef3c7", borderRadius: 6, fontSize: 13, marginBottom: 12 }}>
                <div>Refunded: <strong>{formatLkr(detailsModalPayment.refundAmount)}</strong></div>
                {detailsModalPayment.refundReference && (
                  <div>Refund Ref: <strong>{detailsModalPayment.refundReference}</strong></div>
                )}
                {detailsModalPayment.refundReason && (
                  <div>Reason: <em>{detailsModalPayment.refundReason}</em></div>
                )}
              </div>
            )}

            {detailsModalPayment.notes && (
              <div style={{ fontSize: 13, color: "#475569" }}>
                <strong>Notes:</strong> {detailsModalPayment.notes}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Stamped Receipt Modal */}
      {receiptModal && (
        <StampedReceiptModal receipt={receiptModal} onClose={() => setReceiptModal(null)} />
      )}

      {/* Quick Refund Modal */}
      {refundModalPayment && (
        <Modal
          title={`Process Refund: ${refundModalPayment.id}`}
          onClose={() => setRefundModalPayment(null)}
          actions={
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setRefundModalPayment(null)}
                disabled={refundSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="df-btn df-btn-danger"
                onClick={handleSubmitRefund}
                disabled={refundSubmitting}
              >
                {refundSubmitting ? "Processing..." : `Confirm Refund (${formatLkr(parseFloat(refundAmount) || 0)})`}
              </button>
            </div>
          }
        >
          <form onSubmit={handleSubmitRefund} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {refundError && (
              <div style={{ padding: 10, background: "#fee2e2", color: "#b91c1c", borderRadius: 4, fontSize: 13 }}>
                {refundError}
              </div>
            )}

            <div style={{ background: "var(--df-glass-panel, rgba(241, 245, 249, 0.7))", border: "1px solid var(--df-border, #e2e8f0)", padding: 12, borderRadius: 8, fontSize: 13 }}>
              <div>Patient: <strong>{refundModalPayment.patient}</strong></div>
              <div>Invoice: <strong>{refundModalPayment.invoice}</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span>Paid Amount: <strong>{refundModalPayment.amount}</strong></span>
                <span>Already Refunded: <strong>{formatLkr(refundModalPayment.refundAmount || 0)}</strong></span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontWeight: 700, color: "var(--df-primary-600, #2563eb)" }}>
                <span>Available for Refund:</span>
                <span>{formatLkr(refundModalPayment.rawAmount - (refundModalPayment.refundAmount || 0))}</span>
              </div>
            </div>

            <div>
              <label className="df-label" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Processing Action:
              </label>
              <select
                className="df-select"
                style={{ width: "100%" }}
                value={refundMode}
                onChange={(e) => setRefundMode(e.target.value)}
              >
                <option value="instant">Process & Settle Immediately (Direct Refund)</option>
                <option value="request">Submit Request for Review (Pending Review)</option>
              </select>
            </div>

            <div>
              <label className="df-label" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Refund Amount (LKR): *
              </label>
              <input
                type="number"
                className="df-input"
                style={{ width: "100%", fontWeight: 700 }}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                min={1}
                max={refundModalPayment.rawAmount - (refundModalPayment.refundAmount || 0)}
                required
              />
            </div>

            <div>
              <label className="df-label" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Reason for Refund: *
              </label>
              <textarea
                className="df-input"
                style={{ width: "100%", height: 70 }}
                placeholder="e.g. Patient requested appointment refund, billing adjustment..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                required
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Void / Cancel Pending Payment Modal */}
      {cancelModalPayment && (
        <Modal
          title={`Void Payment: ${cancelModalPayment.id}`}
          onClose={() => setCancelModalPayment(null)}
          actions={
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setCancelModalPayment(null)}
                disabled={cancelLoading}
              >
                Back
              </button>
              <button
                type="button"
                className="df-btn df-btn-danger"
                onClick={handleConfirmCancelPayment}
                disabled={cancelLoading}
              >
                {cancelLoading ? "Voiding..." : "Confirm Void"}
              </button>
            </div>
          }
        >
          <div style={{ padding: 12 }}>
            <p style={{ fontSize: 14, margin: "0 0 10px" }}>
              Are you sure you want to void / cancel pending payment <strong>{cancelModalPayment.id}</strong> ({cancelModalPayment.amount})?
            </p>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              This will mark the payment status as CANCELLED.
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Failed/Cancelled Payment Record Modal */}
      {deleteModalPayment && (
        <Modal
          title={`Delete Payment Record: ${deleteModalPayment.id}`}
          onClose={() => setDeleteModalPayment(null)}
          actions={
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setDeleteModalPayment(null)}
                disabled={deleteLoading}
              >
                Back
              </button>
              <button
                type="button"
                className="df-btn df-btn-danger"
                onClick={handleConfirmDeletePayment}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          }
        >
          <div style={{ padding: 12 }}>
            <p style={{ fontSize: 14, margin: "0 0 10px" }}>
              Are you sure you want to delete payment record <strong>{deleteModalPayment.id}</strong>?
            </p>
            <div style={{ fontSize: 12, color: "#dc2626" }}>
              Only failed or cancelled transaction attempts can be removed.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ==========================================================================
   5. REFUNDS VIEW — REFUND MANAGEMENT ONLY
   ========================================================================== */
export function CashierRefundsView({ role = "user" }) {
  const { addToast } = useNotifications();

  const [refunds, setRefunds] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Create Refund Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundMode, setRefundMode] = useState("instant");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [refundError, setRefundError] = useState(null);

  const [detailsModalRefund, setDetailsModalRefund] = useState(null);

  const loadRefundsData = useCallback(async () => {
    try {
      setLoading(true);
      const [rawPayments, rawBills, patients] = await Promise.all([
        billingApi.getAllPayments().catch(() => []),
        billingApi.getAllBills().catch(() => []),
        patientApi.getAllPatients().catch(() => []),
      ]);

      const patientLookup = {};
      patients.forEach((p) => {
        patientLookup[p.id] = p;
      });

      const billLookup = {};
      rawBills.forEach((b) => {
        billLookup[b.id] = normalizeBill(b, patientLookup);
      });

      const normPayments = rawPayments.map((p) => normalizePayment(p, billLookup));
      setAllPayments(normPayments);

      // Filter ONLY refund records
      const refundRecords = normPayments.filter(
        (p) =>
          p.refundAmount > 0 ||
          p.rawStatus === "REFUNDED" ||
          p.rawStatus === "REFUND_PENDING" ||
          p.rawStatus === "REFUND_FAILED" ||
          p.rawStatus === "PARTIALLY_REFUNDED" ||
          Boolean(p.refundReference)
      );

      refundRecords.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      setRefunds(refundRecords);
    } catch (err) {
      console.error("Failed to load refunds:", err);
      addToast("Failed to fetch refund records", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadRefundsData();
  }, [loadRefundsData]);

  // Specific KPI Cards for Refunds
  const totalRefundRequests = refunds.length;
  const pendingRefundsCount = refunds.filter((r) => r.rawStatus === "REFUND_PENDING" || r.status === "pending").length;
  const approvedRefundsCount = refunds.filter((r) => r.rawStatus === "REFUNDED" || r.status === "completed").length;
  const totalRefundedSum = refunds.reduce((sum, r) => sum + (Number(r.refundAmount) || 0), 0);

  // Eligible Payments for new refund request: SUCCESS payments where (amount - refundAmount) > 0
  const eligiblePayments = useMemo(() => {
    return allPayments.filter(
      (p) =>
        (p.rawStatus === "SUCCESS" || p.status === "paid") &&
        (p.rawAmount - (p.refundAmount || 0)) > 0
    );
  }, [allPayments]);

  const selectedPaymentObj = useMemo(() => {
    if (!selectedPaymentId) return null;
    return eligiblePayments.find((p) => String(p.rawId) === String(selectedPaymentId));
  }, [eligiblePayments, selectedPaymentId]);

  // Filter Refunds Table
  const filteredRefunds = useMemo(() => {
    return refunds.filter((r) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !searchQuery ||
        (r.refundReference && r.refundReference.toLowerCase().includes(q)) ||
        (r.patient && r.patient.toLowerCase().includes(q)) ||
        (r.invoice && r.invoice.toLowerCase().includes(q)) ||
        (r.refundReason && r.refundReason.toLowerCase().includes(q));

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "refunded" && (r.rawStatus === "REFUNDED" || r.status === "completed")) ||
        (statusFilter === "pending" && (r.rawStatus === "REFUND_PENDING" || r.status === "pending")) ||
        (statusFilter === "failed" && (r.rawStatus === "REFUND_FAILED" || r.status === "failed"));

      return matchSearch && matchStatus;
    });
  }, [refunds, searchQuery, statusFilter]);

  // Submit Refund Request
  const handleCreateRefund = async (e) => {
    e.preventDefault();
    if (!selectedPaymentObj) {
      setRefundError("Please select an eligible payment to refund");
      return;
    }
    const amt = parseFloat(refundAmount);
    if (isNaN(amt) || amt <= 0) {
      setRefundError("Please enter a valid refund amount greater than zero");
      return;
    }
    const maxAvailable = selectedPaymentObj.rawAmount - (selectedPaymentObj.refundAmount || 0);
    if (amt > maxAvailable) {
      setRefundError(`Refund amount cannot exceed available refundable balance (${formatLkr(maxAvailable)})`);
      return;
    }
    if (!refundReason.trim()) {
      setRefundError("Please provide a reason for the refund");
      return;
    }

    try {
      setRefundSubmitting(true);
      setRefundError(null);

      if (refundMode === "request") {
        await billingApi.requestRefund(selectedPaymentObj.rawId, amt, refundReason.trim());
        addToast(`Refund request of ${formatLkr(amt)} submitted for review!`, "success");
      } else {
        const res = await billingApi.refundPayment(selectedPaymentObj.rawId, amt, refundReason.trim());
        addToast(`Refund of ${formatLkr(amt)} processed successfully! Ref: ${res.refundReference || "REF-COMPLETED"}`, "success");
      }

      setCreateModalOpen(false);
      setSelectedPaymentId("");
      setRefundAmount("");
      setRefundReason("");
      setRefundMode("instant");
      await loadRefundsData();
    } catch (err) {
      console.error("Failed to process refund:", err);
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Refund processing failed";
      setRefundError(typeof msg === "string" ? msg : "Refund failed");
    } finally {
      setRefundSubmitting(false);
    }
  };

  // Approve Pending Refund Request
  const handleApproveRefund = async (row) => {
    try {
      setActionLoadingId(row.rawId);
      await billingApi.approveRefund(row.rawId);
      addToast(`Refund approved for payment ${row.id}! Balance restored to invoice.`, "success");
      await loadRefundsData();
    } catch (err) {
      console.error("Failed to approve refund:", err);
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Approval failed";
      addToast(typeof msg === "string" ? msg : "Approval failed", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Cancel Pending Refund Request
  const handleCancelRefund = async (row) => {
    try {
      setActionLoadingId(row.rawId);
      await billingApi.cancelRefund(row.rawId);
      addToast(`Refund request cancelled. Payment reverted to active.`, "success");
      await loadRefundsData();
    } catch (err) {
      console.error("Failed to cancel refund:", err);
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Cancellation failed";
      addToast(typeof msg === "string" ? msg : "Cancellation failed", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Discard Pending Refund Request
  const handleDeleteRefund = async (row) => {
    try {
      setActionLoadingId(row.rawId);
      await billingApi.deleteRefund(row.rawId);
      addToast(`Pending refund request discarded.`, "success");
      await loadRefundsData();
    } catch (err) {
      console.error("Failed to discard refund:", err);
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Discard failed";
      addToast(typeof msg === "string" ? msg : "Discard failed", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="df-role-page df-cashier-page">
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Refunds" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Financial Reconciliation</span>
          <h1>Refund Management</h1>
          <p>Review and process patient refund requests.</p>
        </div>
        <button
          type="button"
          className="df-btn df-btn-primary"
          onClick={() => {
            setCreateModalOpen(true);
            setRefundError(null);
          }}
        >
          + Create Refund Request
        </button>
      </header>

      {/* Relevant KPI Cards */}
      <div className="df-stat-grid">
        <StatCard label="Refund Requests" value={String(totalRefundRequests)} icon="◈" color="primary" />
        <StatCard label="Pending Refunds" value={String(pendingRefundsCount)} icon="◷" color="warning" />
        <StatCard label="Approved Refunds" value={String(approvedRefundsCount)} icon="✓" color="success" />
        <StatCard label="Refunded Amount" value={formatLkr(totalRefundedSum)} icon="💰" color="primary" />
      </div>

      {/* Main Section: Refund Records Table */}
      <section className="df-card df-cashier-glass-card">
        <div
          className="df-card-header"
          style={{
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Refund Audit Log</h3>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#64748b" }}>
              Authoritative refund records linked to original payment transactions.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              type="text"
              className="df-input"
              style={{ width: 220, fontSize: 13 }}
              placeholder="Search refund ref, patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <select
              className="df-select"
              style={{ fontSize: 13 }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="refunded">Approved / Refunded</option>
              <option value="pending">Pending Review</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        <div className="df-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: "48px 0", textAlign: "center", color: "var(--df-text-secondary)" }}>
              <div className="df-spinner" style={{ margin: "0 auto 12px", width: 28, height: 28 }} />
              <div>Loading refund records...</div>
            </div>
          ) : (
            <DataTable
              columns={[
                {
                  key: "refundReference",
                  label: "Refund ID",
                  render: (row) => row.refundReference || `REF-${row.rawId}`,
                },
                { key: "patient", label: "Patient" },
                { key: "invoice", label: "Invoice ID" },
                {
                  key: "paymentReference",
                  label: "Original Payment ID",
                  render: (row) => row.id,
                },
                {
                  key: "amount",
                  label: "Original Amount",
                },
                {
                  key: "refundAmount",
                  label: "Refund Amount",
                  render: (row) => (
                    <strong style={{ color: "#dc2626" }}>{formatLkr(row.refundAmount)}</strong>
                  ),
                },
                {
                  key: "refundReason",
                  label: "Reason",
                  render: (row) => row.refundReason || "Customer requested refund",
                },
                { key: "date", label: "Date" },
                {
                  key: "status",
                  label: "Refund Status",
                  render: (row) => <StatusBadge status={row.rawStatus || row.status} />,
                },
              ]}
              rows={filteredRefunds}
              searchable={false}
              rowActions={(row) => (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="df-btn df-btn-secondary df-btn-sm"
                    onClick={() => setDetailsModalRefund(row)}
                    title="View Details"
                  >
                    👁️ View
                  </button>
                  {(row.rawStatus === "REFUND_PENDING" || row.status === "pending") && (
                    <>
                      <button
                        type="button"
                        className="df-btn df-btn-success df-btn-sm"
                        onClick={() => handleApproveRefund(row)}
                        disabled={actionLoadingId === row.rawId}
                        title="Approve Refund & Restore Invoice Balance"
                        style={{ fontWeight: 700 }}
                      >
                        ✓ Approve
                      </button>
                      <button
                        type="button"
                        className="df-btn df-btn-warning df-btn-sm"
                        onClick={() => handleCancelRefund(row)}
                        disabled={actionLoadingId === row.rawId}
                        title="Cancel Refund Request (Revert to SUCCESS)"
                      >
                        ✕ Cancel
                      </button>
                      <button
                        type="button"
                        className="df-btn df-btn-danger df-btn-sm"
                        onClick={() => handleDeleteRefund(row)}
                        disabled={actionLoadingId === row.rawId}
                        title="Discard Draft Request"
                      >
                        🗑️ Discard
                      </button>
                    </>
                  )}
                </div>
              )}
            />
          )}
        </div>
      </section>

      {/* Create Refund Request Modal */}
      {createModalOpen && (
        <Modal
          title="Create New Refund Request"
          onClose={() => setCreateModalOpen(false)}
          actions={
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setCreateModalOpen(false)}
                disabled={refundSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="df-btn df-btn-danger"
                onClick={handleCreateRefund}
                disabled={refundSubmitting || !selectedPaymentObj}
              >
                {refundSubmitting
                  ? "Processing..."
                  : refundMode === "request"
                  ? "✓ Submit for Review"
                  : "✓ Process & Settle Refund"}
              </button>
            </div>
          }
        >
          <form onSubmit={handleCreateRefund} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {refundError && (
              <div style={{ padding: 10, background: "#fee2e2", color: "#b91c1c", borderRadius: 4, fontSize: 13 }}>
                {refundError}
              </div>
            )}

            <div>
              <label className="df-label" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Select Eligible Payment: *
              </label>
              <select
                className="df-select"
                style={{ width: "100%" }}
                value={selectedPaymentId}
                onChange={(e) => {
                  setSelectedPaymentId(e.target.value);
                  const p = eligiblePayments.find((item) => String(item.rawId) === String(e.target.value));
                  if (p) {
                    const maxAvail = p.rawAmount - (p.refundAmount || 0);
                    setRefundAmount(String(maxAvail));
                  }
                }}
                required
              >
                <option value="">-- Choose eligible settled payment --</option>
                {eligiblePayments.map((p) => {
                  const maxAvail = p.rawAmount - (p.refundAmount || 0);
                  return (
                    <option key={p.rawId} value={p.rawId}>
                      {p.id} — {p.patient} (Paid: {p.amount} | Refundable: {formatLkr(maxAvail)})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="df-label" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Refund Action Type:
              </label>
              <select
                className="df-select"
                style={{ width: "100%" }}
                value={refundMode}
                onChange={(e) => setRefundMode(e.target.value)}
              >
                <option value="instant">Process & Settle Immediately (Direct Refund)</option>
                <option value="request">Submit Request for Review (Pending Approval)</option>
              </select>
            </div>

            {selectedPaymentObj && (
              <div style={{ padding: 14, background: "var(--df-glass-panel, rgba(241, 245, 249, 0.7))", border: "1px solid var(--df-border, #e2e8f0)", borderRadius: 10, fontSize: 13 }}>
                <div>Patient: <strong>{selectedPaymentObj.patient}</strong></div>
                <div>Invoice: <strong>{selectedPaymentObj.invoice}</strong></div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span>Original Paid: <strong>{selectedPaymentObj.amount}</strong></span>
                  <span>Already Refunded: <strong>{formatLkr(selectedPaymentObj.refundAmount || 0)}</strong></span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontWeight: 700, color: "var(--df-primary-600, #2563eb)" }}>
                  <span>Max Available for Refund:</span>
                  <span>{formatLkr(selectedPaymentObj.rawAmount - (selectedPaymentObj.refundAmount || 0))}</span>
                </div>
              </div>
            )}

            <div>
              <label className="df-label" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Refund Amount (LKR): *
              </label>
              <input
                type="number"
                className="df-input"
                style={{ width: "100%", fontWeight: 700 }}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                min={1}
                max={selectedPaymentObj ? selectedPaymentObj.rawAmount - (selectedPaymentObj.refundAmount || 0) : undefined}
                required
              />
            </div>

            <div>
              <label className="df-label" style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 4 }}>
                Reason for Refund: *
              </label>
              <textarea
                className="df-input"
                style={{ width: "100%", height: 70 }}
                placeholder="e.g. Treatment cancellation, billing error, patient overpayment..."
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                required
              />
            </div>
          </form>
        </Modal>
      )}

      {/* View Refund Details Modal */}
      {detailsModalRefund && (
        <Modal
          title={`Refund Record: ${detailsModalRefund.refundReference || detailsModalRefund.id}`}
          onClose={() => setDetailsModalRefund(null)}
          actions={
            <button type="button" className="df-btn df-btn-primary" onClick={() => setDetailsModalRefund(null)}>
              Close
            </button>
          }
        >
          <div style={{ padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, color: "var(--df-primary-600, #2563eb)" }}>
                  {detailsModalRefund.refundReference || `REF-${detailsModalRefund.rawId}`}
                </h3>
                <div style={{ fontSize: 13, color: "var(--df-text-secondary, #64748b)" }}>Date: {detailsModalRefund.date}</div>
              </div>
              <StatusBadge status={detailsModalRefund.status} />
            </div>

            <div style={{ background: "var(--df-glass-panel, rgba(241, 245, 249, 0.7))", border: "1px solid var(--df-border, #e2e8f0)", padding: 14, borderRadius: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13, marginBottom: 14 }}>
              <div>Patient: <strong>{detailsModalRefund.patient}</strong></div>
              <div>Invoice Ref: <strong>{detailsModalRefund.invoice}</strong></div>
              <div>Original Payment: <strong>{detailsModalRefund.id}</strong></div>
              <div>Original Amount: <strong>{detailsModalRefund.amount}</strong></div>
              <div style={{ gridColumn: "span 2" }}>
                Refund Amount: <strong style={{ color: "#dc2626", fontSize: 16 }}>{formatLkr(detailsModalRefund.refundAmount)}</strong>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                Reason: <em>{detailsModalRefund.refundReason || "Standard patient refund"}</em>
              </div>
            </div>

            <div style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
              Financial record preserved in compliance with clinical accounting guidelines.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ==========================================================================
   DISPATCHER VIEW — PRESERVES BACKWARD COMPATIBILITY
   ========================================================================== */
export function CashierBillingView({ role = "user", page = "payments" }) {
  switch (page) {
    case "invoices":
      return <CashierInvoicesView role={role} />;
    case "pending":
      return <CashierPendingView role={role} />;
    case "history":
      return <CashierHistoryView role={role} />;
    case "refunds":
      return <CashierRefundsView role={role} />;
    case "payments":
    case "billing":
    default:
      return <CashierPaymentsView role={role} />;
  }
}
