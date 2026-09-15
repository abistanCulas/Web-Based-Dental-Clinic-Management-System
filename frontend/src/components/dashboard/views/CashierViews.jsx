import { useState, useMemo, useEffect } from "react";
import StatCard from "../../common/StatCard";
import { Breadcrumbs, DataTable, Modal, TabPills } from "../DashboardPrimitives";
import { useDashboardData } from "../../../context/DashboardDataContext";
import { useNotifications } from "../../../context/NotificationContext";
import billingApi, {
  formatLkr,
  parseLkr,
  normalizeBill,
  normalizePayment,
} from "../../../api/billing";
import patientApi from "../../../api/patients";
import appointmentApi from "../../../api/appointments";

export function CashierBillingView({ role = "user", page = "payments" }) {
  const { collections, saveRecord } = useDashboardData();
  const { addToast } = useNotifications();

  const initialTab =
    page === "pending"
      ? "pending"
      : page === "history"
      ? "paid"
      : page === "refunds"
      ? "refunds"
      : "all";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [payModal, setPayModal] = useState(null);
  const [receiptModal, setReceiptModal] = useState(null);
  const [payMethod, setPayMethod] = useState("Cash");
  const [refNumber, setRefNumber] = useState("TXN-CARD-8821");
  const [collecting, setCollecting] = useState(false);

  const [realBills, setRealBills] = useState([]);
  const [realPayments, setRealPayments] = useState([]);
  const [realRefunds, setRealRefunds] = useState([]);
  const [loading, setLoading] = useState(true);

  const reloadData = async () => {
    try {
      setLoading(true);
      const [bList, pList, patients, appointments] = await Promise.all([
        billingApi.getAllBills().catch(() => []),
        billingApi.getAllPayments().catch(() => []),
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

      const normalizedBills = bList.map((b) => normalizeBill(b, patientLookup, appointmentLookup));
      setRealBills(normalizedBills);

      const billLookup = {};
      normalizedBills.forEach((b) => {
        billLookup[b.rawId] = b;
      });

      const normalizedPayments = pList.map((p) => normalizePayment(p, billLookup));
      setRealPayments(normalizedPayments);

      const refundItems = normalizedPayments.filter(
        (p) => p.rawStatus === "REFUNDED" || p.rawStatus === "REFUND_PENDING" || (p.refundAmount && p.refundAmount > 0)
      );
      setRealRefunds(refundItems);
    } catch (err) {
      console.warn("Could not reload billing data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [bList, pList, patients, appointments] = await Promise.all([
          billingApi.getAllBills().catch(() => []),
          billingApi.getAllPayments().catch(() => []),
          patientApi.getAllPatients().catch(() => []),
          appointmentApi.getAllAppointments().catch(() => []),
        ]);

        if (!mounted) return;

        const patientLookup = {};
        patients.forEach((p) => {
          patientLookup[p.id] = p;
        });

        const appointmentLookup = {};
        appointments.forEach((a) => {
          appointmentLookup[a.id] = a;
        });

        const normalizedBills = bList.map((b) => normalizeBill(b, patientLookup, appointmentLookup));
        setRealBills(normalizedBills);

        const billLookup = {};
        normalizedBills.forEach((b) => {
          billLookup[b.rawId] = b;
        });

        const normalizedPayments = pList.map((p) => normalizePayment(p, billLookup));
        setRealPayments(normalizedPayments);

        const refundItems = normalizedPayments.filter(
          (p) => p.rawStatus === "REFUNDED" || p.rawStatus === "REFUND_PENDING" || (p.refundAmount && p.refundAmount > 0)
        );
        setRealRefunds(refundItems);
      } catch (err) {
        console.warn("Could not load billing data:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const bills = useMemo(() => {
    return realBills.length > 0 ? realBills : (collections.payments || []);
  }, [realBills, collections.payments]);

  const refunds = useMemo(() => {
    return realRefunds.length > 0 ? realRefunds : (collections.refunds || []);
  }, [realRefunds, collections.refunds]);

  const pending = useMemo(() => {
    return bills.filter((b) => b.status === "pending" || b.rawStatus === "UNPAID" || b.rawStatus === "PARTIALLY_PAID");
  }, [bills]);

  const paid = useMemo(() => {
    return bills.filter((b) => b.status === "paid" || b.rawStatus === "PAID");
  }, [bills]);

  const totalCollectedSum = useMemo(() => {
    if (realPayments.length > 0) {
      const sum = realPayments
        .filter((p) => p.rawStatus === "SUCCESS")
        .reduce((acc, curr) => acc + (curr.rawAmount || 0), 0);
      return formatLkr(sum);
    }
    return "LKR 42,500";
  }, [realPayments]);

  const filtered = useMemo(() => {
    if (activeTab === "all") return bills;
    if (activeTab === "pending") return pending;
    if (activeTab === "paid") return paid;
    return refunds;
  }, [activeTab, bills, pending, paid, refunds]);

  const handleCollect = async () => {
    if (!payModal) return;
    setCollecting(true);
    try {
      const amountToPay = payModal.balanceAmount != null && payModal.balanceAmount > 0
        ? payModal.balanceAmount
        : payModal.rawAmount || parseLkr(payModal.amount);

      const targetBillId = payModal.rawId || 1;

      // Real payment creation & verification
      if (typeof targetBillId === "number") {
        await billingApi.processPaymentAndVerify({
          billId: targetBillId,
          amount: amountToPay,
          paymentMethod: payMethod,
          transactionId: refNumber || `POS-TXN-${Date.now()}`,
          notes: `Collected via Cashier (${payMethod})`,
        });
      }

      const updated = {
        ...payModal,
        status: "paid",
        rawStatus: "PAID",
        paidDate: new Date().toISOString().slice(0, 10),
        method: payMethod,
      };

      saveRecord("payments", updated);
      addToast(`Payment of ${payModal.amount} collected for ${payModal.patient}!`, "success");
      setPayModal(null);
      setReceiptModal(updated);
      await reloadData();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Failed to process payment";
      addToast(typeof msg === "string" ? msg : "Payment failed", "error");
    } finally {
      setCollecting(false);
    }
  };

  const handleApproveRefund = async (ref) => {
    try {
      if (typeof ref.rawId === "number") {
        const refundAmt = ref.rawAmount || parseLkr(ref.amount);
        await billingApi.refundPayment(ref.rawId, refundAmt, ref.reason || "Approved by cashier");
      }
      saveRecord("refunds", { ...ref, status: "completed" });
      addToast(`Refund ${ref.id} of ${ref.amount} approved for ${ref.patient}!`, "success");
      await reloadData();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Failed to process refund";
      addToast(typeof msg === "string" ? msg : "Refund request failed", "error");
    }
  };

  const breadcrumbLabel =
    page === "invoices"
      ? "Invoices"
      : page === "pending"
      ? "Pending Payments"
      : page === "history"
      ? "Payment History"
      : page === "refunds"
      ? "Refunds"
      : "Payments";

  const pageTitle =
    page === "invoices"
      ? "Patient Invoices & Statements"
      : page === "pending"
      ? "Pending & Uncollected Invoices"
      : page === "history"
      ? "Settled Payment History & Ledger"
      : page === "refunds"
      ? "Refund Processing & Approvals"
      : "Cashier Station & Patient Billing";

  const columns =
    activeTab === "refunds"
      ? [
          { key: "id", label: "Refund #" },
          { key: "patient", label: "Patient" },
          { key: "invoice", label: "Invoice Ref" },
          { key: "amount", label: "Amount" },
          { key: "reason", label: "Refund Reason" },
          { key: "status", label: "Status", type: "status" },
        ]
      : [
          { key: "id", label: "Invoice #" },
          { key: "patient", label: "Patient" },
          { key: "service", label: "Dental Service" },
          { key: "amount", label: "Total Amount" },
          { key: "date", label: "Issue Date" },
          { key: "status", label: "Status", type: "status" },
        ];

  return (
    <div className={`df-role-page df-role-slate`}>
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: breadcrumbLabel }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Financial Reconciliation</span>
          <h1>{pageTitle}</h1>
          <p>Collect payments, issue stamped receipts, reconcile daily balances, and handle refund requests.</p>
        </div>
      </header>

      <div className="df-stat-grid">
        <StatCard label="Total Invoices" value={String(bills.length)} icon="◫" color="primary" />
        <StatCard label="Pending Collections" value={String(pending.length)} icon="◷" color="warning" />
        <StatCard label="Collected Total" value={totalCollectedSum} icon="✓" color="success" />
        <StatCard label="Refund Requests" value={String(refunds.length)} icon="◈" color="primary" />
      </div>

      <TabPills
        tabs={[
          { label: "All Invoices", value: "all", count: bills.length },
          { label: "Pending Payments", value: "pending", count: pending.length },
          { label: "Paid Invoices", value: "paid", count: paid.length },
          { label: "Refund Requests", value: "refunds", count: refunds.length },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <section className="df-card">
        <div className="df-card-body">
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
              <p>Loading clinic billing records...</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              rows={filtered}
              actionLabel={(row) => (row.status === "pending" ? "Collect Payment" : "View Receipt")}
              onEdit={(row) => {
                if (row.status === "pending") {
                  setPayModal(row);
                } else {
                  setReceiptModal(row);
                }
              }}
              onQuickAction={
                activeTab === "refunds"
                  ? handleApproveRefund
                  : (row) => {
                      if (row.status === "pending") {
                        setPayModal(row);
                      } else {
                        setReceiptModal(row);
                      }
                    }
              }
              quickActionLabel={(row) =>
                activeTab === "refunds"
                  ? "Approve Refund"
                  : row.status === "pending"
                  ? "Collect"
                  : "Receipt"
              }
            />
          )}
        </div>
      </section>

      {payModal && (
        <Modal
          title={`Collect Payment: ${payModal.id}`}
          onClose={() => setPayModal(null)}
          footer={
            <>
              <button className="df-btn df-btn-secondary" onClick={() => setPayModal(null)} disabled={collecting}>
                Cancel
              </button>
              <button className="df-btn df-btn-primary" onClick={handleCollect} disabled={collecting}>
                {collecting ? "Processing..." : `✓ Confirm Payment (${payModal.amount})`}
              </button>
            </>
          }
        >
          <div className="df-form-2col">
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Patient Name</small>
              <div style={{ fontWeight: 600 }}>{payModal.patient}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Total Due</small>
              <h3 style={{ color: "var(--df-primary-600)", margin: "4px 0" }}>{payModal.amount}</h3>
            </div>
          </div>

          <div className="df-form-group" style={{ marginTop: 14 }}>
            <label className="df-label">Payment Method</label>
            <select
              className="df-select"
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
            >
              <option value="Credit / Debit Card">Credit / Debit Card (Visa/Mastercard)</option>
              <option value="Cash">Cash (Front Desk Till)</option>
              <option value="Bank Transfer">Bank Transfer / Online Portal</option>
              <option value="Health Insurance">Health Insurance Direct Billing</option>
            </select>
          </div>

          <div className="df-form-group" style={{ marginTop: 14 }}>
            <label className="df-label">Payment Reference / Authorization Code</label>
            <input
              className="df-input"
              value={refNumber}
              onChange={(e) => setRefNumber(e.target.value)}
              placeholder="e.g. POS-AUTH-90214"
            />
          </div>
        </Modal>
      )}

      {receiptModal && (
        <Modal
          title={`Invoice Receipt: ${receiptModal.id}`}
          onClose={() => setReceiptModal(null)}
          footer={
            <>
              <button
                className="df-btn df-btn-secondary"
                onClick={() => {
                  window.print();
                  addToast("Receipt sent to printer", "info");
                }}
              >
                🖨 Print Receipt
              </button>
              <button className="df-btn df-btn-primary" onClick={() => setReceiptModal(null)}>
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
                <strong>Billed To:</strong> {receiptModal.patient}
              </div>
              <div>
                <strong>Receipt #:</strong> {receiptModal.id}
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
                  <td>{receiptModal.service || "Dental Consultation & Treatment"}</td>
                  <td>{receiptModal.amount}</td>
                </tr>
                <tr>
                  <td>Consumables & Sterilization Fee</td>
                  <td>Included</td>
                </tr>
              </tbody>
            </table>

            <div className="df-receipt-total">
              <span>Total Paid:</span>
              <span>{receiptModal.amount}</span>
            </div>

            <p style={{ textAlign: "center", fontSize: 11, color: "var(--df-text-muted)", marginTop: 16 }}>
              Thank you for trusting DentaFlow with your smile. Valid receipt for insurance reimbursement.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
export default CashierBillingView;
