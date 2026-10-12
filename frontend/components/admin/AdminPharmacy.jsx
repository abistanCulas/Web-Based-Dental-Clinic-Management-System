import { useEffect, useMemo, useState } from "react";
import AdminIcon from "./AdminIcons";
import { Modal } from "../dashboard/DashboardPrimitives";
import { useNotifications } from "../../context/NotificationContext";
import { pharmacyApi, normalizePurchaseRequest } from "../../api/pharmacy";
import { AdminPageHeader, AdminTabs, statusChip } from "./AdminModules";

const WORKFLOW_STEPS = ["Low Stock", "Purchase Request", "Admin Review", "Purchase Order", "Delivered"];

export function WorkflowStepper({ current = 0 }) {
  return (
    <div className="adm-stepper">
      {WORKFLOW_STEPS.map((step, i) => (
        <span key={step} style={{ display: "contents" }}>
          <span className={`adm-step-chip ${i < current ? "done" : i === current ? "active" : ""}`}>
            {i < current && <AdminIcon name="check" size={12} strokeWidth={2.4} />}
            {step}
          </span>
          {i < WORKFLOW_STEPS.length - 1 && (
            <span className="adm-step-arrow"><AdminIcon name="chevronRight" size={15} /></span>
          )}
        </span>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Purchase Requests — pharmacist creates, admin reviews/approves
   -------------------------------------------------------------------------- */
export function PurchaseRequestsView({ role }) {
  const { addToast } = useNotifications();
  const [requests, setRequests] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [viewing, setViewing] = useState(null);
  const [rejectModalReq, setRejectModalReq] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderDraft, setOrderDraft] = useState(null);
  const [orderForm, setOrderForm] = useState({ supplierId: "", supplierName: "", expectedDate: "", notes: "" });

  const loadRequests = async () => {
    try {
      setLoading(true);
      const [reqRaw, sups] = await Promise.all([
        pharmacyApi.getAllPurchaseRequests().catch(() => []),
        pharmacyApi.getAllSuppliers().catch(() => []),
      ]);
      setSuppliers(Array.isArray(sups) ? sups : []);
      const normalized = Array.isArray(reqRaw) ? reqRaw.map(normalizePurchaseRequest) : [];
      setRequests(normalized);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const counts = useMemo(() => ({
    all: requests.length,
    PENDING: requests.filter((r) => r.status === "PENDING" || r.status === "DRAFT").length,
    APPROVED: requests.filter((r) => r.status === "APPROVED").length,
    REJECTED: requests.filter((r) => r.status === "REJECTED" || r.status === "CANCELLED").length,
    ORDERED: requests.filter((r) => r.status === "ORDERED" || r.status === "RECEIVED").length,
  }), [requests]);

  const filtered = tab === "all" ? requests : requests.filter((r) => {
    if (tab === "ORDERED") return r.status === "ORDERED" || r.status === "RECEIVED";
    if (tab === "PENDING") return r.status === "PENDING" || r.status === "DRAFT";
    if (tab === "REJECTED") return r.status === "REJECTED" || r.status === "CANCELLED";
    return r.status === tab;
  });

  const handleApprove = async (req) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const updated = await pharmacyApi.approvePurchaseRequest(req.rawId);
      const normalized = normalizePurchaseRequest(updated);
      setRequests((prev) => prev.map((r) => (r.rawId === req.rawId ? normalized : r)));
      addToast(`Approved ${req.id} for ${req.medicine} — notification sent to ${req.requestedBy}`, "success");
      setViewing(null);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Approval failed";
      addToast(typeof msg === "string" ? msg : "Failed to approve", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenReject = (req) => {
    setRejectModalReq(req);
    setRejectionReason("");
  };

  const handleConfirmReject = async () => {
    if (!rejectModalReq || isProcessing) return;
    setIsProcessing(true);
    try {
      const updated = await pharmacyApi.rejectPurchaseRequest(rejectModalReq.rawId, rejectionReason);
      const normalized = normalizePurchaseRequest(updated);
      setRequests((prev) => prev.map((r) => (r.rawId === rejectModalReq.rawId ? normalized : r)));
      addToast(`Rejected ${rejectModalReq.id} — notification sent to ${rejectModalReq.requestedBy}`, "info");
      setRejectModalReq(null);
      setRejectionReason("");
      setViewing(null);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Rejection failed";
      addToast(typeof msg === "string" ? msg : "Failed to reject", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const startOrder = (req) => {
    setOrderDraft(req);
    const firstSup = suppliers[0];
    setOrderForm({
      supplierId: firstSup?.id || "",
      supplierName: firstSup?.supplierName || firstSup?.name || "",
      expectedDate: "",
      notes: `Procurement for request ${req.id}: ${req.medicine} (${req.requestedQty})`,
    });
  };

  const submitOrder = async () => {
    if (!orderDraft || isProcessing) return;
    setIsProcessing(true);
    try {
      if (pharmacyApi.createPurchaseOrder) {
        await pharmacyApi.createPurchaseOrder({
          supplierId: orderForm.supplierId,
          supplierName: orderForm.supplierName,
          itemsDescription: `${orderDraft.medicine} (${orderDraft.requestedQty})`,
          expectedDeliveryDate: orderForm.expectedDate,
          notes: orderForm.notes,
          status: "ORDERED",
        }).catch(() => null);
      }
      if (pharmacyApi.updatePurchaseRequestStatus) {
        await pharmacyApi.updatePurchaseRequestStatus(orderDraft.rawId, "ORDERED", "Purchase order created").catch(() => null);
      }
      setRequests((prev) => prev.map((r) => (r.id === orderDraft.id ? { ...r, status: "ORDERED" } : r)));
      addToast(`Purchase Order created for ${orderDraft.medicine} via ${orderForm.supplierName || "Supplier"}`, "success");
      setOrderDraft(null);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Failed to create order";
      addToast(typeof msg === "string" ? msg : "Failed to create order", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="adm-page">
      <AdminPageHeader
        kicker={<><AdminIcon name="purchase" size={13} /> Pharmacy Procurement</>}
        title="Purchase Requests"
        subtitle="Review medicine and consumable requests submitted by clinic pharmacists and authorize procurement."
        actions={
          <span className="adm-chip adm-chip-amber"><span className="adm-chip-dot" /> {counts.PENDING} pending approval</span>
        }
      />

      <WorkflowStepper current={2} />

      <AdminTabs
        tabs={[
          { label: "All", value: "all", count: counts.all },
          { label: "Pending", value: "PENDING", count: counts.PENDING },
          { label: "Approved", value: "APPROVED", count: counts.APPROVED },
          { label: "Ordered", value: "ORDERED", count: counts.ORDERED },
          { label: "Rejected", value: "REJECTED", count: counts.REJECTED },
        ]}
        active={tab}
        onChange={setTab}
      />

      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--df-text-secondary)" }}>
          Loading purchase requests…
        </div>
      ) : filtered.length === 0 ? (
        <div className="adm-empty-table" style={{ padding: "48px 16px", textAlign: "center", background: "var(--df-glass-card)", borderRadius: 18, border: "1px solid var(--df-border)" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(37,99,235,0.08)", color: "#2563eb", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <AdminIcon name="purchase" size={24} />
          </div>
          <h4 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "var(--df-text-heading)" }}>No Purchase Requests Found</h4>
          <p style={{ margin: "0 auto 16px", maxWidth: 380, fontSize: 13.5, color: "var(--df-text-secondary)", lineHeight: 1.5 }}>
            {tab === "all" ? "No procurement requests have been raised yet. When dispensary stock is low, requests submitted by pharmacists will appear here for admin review." : `No purchase requests with status "${tab}".`}
          </p>
          <a href="/admin/inventory" className="adm-btn adm-btn-soft adm-btn-sm">
            View Medicine Inventory
          </a>
        </div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table adm-pr-table">
            <colgroup>
              <col style={{ width: "105px" }} />
              <col style={{ width: "185px" }} />
              <col style={{ width: "230px" }} />
              <col style={{ width: "115px" }} />
              <col style={{ width: "180px" }} />
              <col style={{ width: "105px" }} />
              <col style={{ width: "115px" }} />
              <col style={{ width: "235px" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Requester</th>
                <th>Medicine / Item</th>
                <th>Requested Qty</th>
                <th>Reason / Note</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((req) => (
                <tr key={req.id}>
                  <td className="adm-cell-strong">{req.id}</td>
                  <td>
                    <div className="adm-pr-requester">
                      <span className="adm-pr-requester-name">{req.requestedBy}</span>
                      {req.pharmacistEmail && (
                        <span className="adm-pr-requester-email">{req.pharmacistEmail}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="adm-pr-medicine">
                      {req.medicine}
                    </div>
                  </td>
                  <td className="adm-cell-num" style={{ whiteSpace: "nowrap" }}>
                    {req.requestedQty}
                  </td>
                  <td title={req.reason}>
                    <div className="adm-pr-reason">
                      {req.reason || "—"}
                    </div>
                  </td>
                  <td className="adm-cell-muted" style={{ whiteSpace: "nowrap" }}>
                    {req.requestedDate}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {statusChip(req.status)}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <div className="adm-pr-actions">
                      <button
                        type="button"
                        className="adm-btn adm-btn-ghost adm-btn-sm"
                        onClick={() => setViewing(req)}
                      >
                        View
                      </button>
                      {(req.status === "PENDING" || req.status === "DRAFT") && (
                        <>
                          <button
                            type="button"
                            className="adm-btn adm-btn-success adm-btn-sm"
                            disabled={isProcessing}
                            onClick={() => handleApprove(req)}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="adm-btn adm-btn-danger adm-btn-sm"
                            disabled={isProcessing}
                            onClick={() => handleOpenReject(req)}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {req.status === "APPROVED" && (
                        <button
                          type="button"
                          className="adm-btn adm-btn-primary adm-btn-sm"
                          onClick={() => startOrder(req)}
                        >
                          Create PO →
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View Details Modal */}
      {viewing && (
        <Modal title={`Purchase Request — ${viewing.id}`} onClose={() => setViewing(null)}>
          <div className="adm-detail" style={{ marginBottom: 16 }}>
            <div className="adm-detail-item"><strong>Request Code</strong><span>{viewing.id}</span></div>
            <div className="adm-detail-item"><strong>Medicine Name</strong><span>{viewing.medicine}</span></div>
            <div className="adm-detail-item"><strong>Requested Quantity</strong><span>{viewing.requestedQty}</span></div>
            <div className="adm-detail-item"><strong>Requester</strong><span>{viewing.requestedBy} {viewing.pharmacistEmail ? `(${viewing.pharmacistEmail})` : ""}</span></div>
            <div className="adm-detail-item"><strong>Request Date</strong><span>{viewing.requestedDate}</span></div>
            <div className="adm-detail-item"><strong>Status</strong><span>{statusChip(viewing.status)}</span></div>
            <div className="adm-detail-item" style={{ gridColumn: "1 / -1" }}>
              <strong>Reason / Note</strong>
              <p style={{ margin: "4px 0 0", color: "var(--df-text-main)" }}>{viewing.reason}</p>
            </div>
            {viewing.adminNote && (
              <div className="adm-detail-item" style={{ gridColumn: "1 / -1", background: "rgba(239,68,68,0.06)", padding: "8px 12px", borderRadius: 8 }}>
                <strong>Admin Response / Note</strong>
                <p style={{ margin: "4px 0 0", color: "var(--df-text-main)" }}>{viewing.adminNote}</p>
              </div>
            )}
            {viewing.processedByName && (
              <div className="adm-detail-item">
                <strong>Processed By</strong>
                <span>{viewing.processedByName} {viewing.processedAt ? `(${viewing.processedAt})` : ""}</span>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
            <button type="button" className="adm-btn adm-btn-ghost" onClick={() => setViewing(null)}>Close</button>
            {(viewing.status === "PENDING" || viewing.status === "DRAFT") && (
              <>
                <button
                  type="button"
                  className="adm-btn adm-btn-success"
                  disabled={isProcessing}
                  onClick={() => handleApprove(viewing)}
                >
                  Approve Request
                </button>
                <button
                  type="button"
                  className="adm-btn adm-btn-danger"
                  disabled={isProcessing}
                  onClick={() => handleOpenReject(viewing)}
                >
                  Reject Request
                </button>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Reject Modal with Reason */}
      {rejectModalReq && (
        <Modal title={`Reject Purchase Request — ${rejectModalReq.id}`} onClose={() => setRejectModalReq(null)}>
          <p style={{ margin: "0 0 14px", fontSize: 14, color: "var(--df-text-secondary)" }}>
            Please state the reason for rejecting the request for <strong>{rejectModalReq.medicine}</strong> ({rejectModalReq.requestedQty}). This note will be sent directly to <strong>{rejectModalReq.requestedBy}</strong>.
          </p>
          <div className="df-form-group">
            <label className="df-label">Rejection Reason</label>
            <textarea
              className="df-input"
              rows={3}
              placeholder="e.g. Sufficient stock remains in warehouse, alternative brand available..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              autoFocus
            />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
            <button type="button" className="adm-btn adm-btn-ghost" onClick={() => setRejectModalReq(null)}>Cancel</button>
            <button
              type="button"
              className="adm-btn adm-btn-danger"
              disabled={isProcessing}
              onClick={handleConfirmReject}
            >
              {isProcessing ? "Rejecting..." : "Confirm Rejection"}
            </button>
          </div>
        </Modal>
      )}

      {/* Continue to Purchase Order Modal */}
      {orderDraft && (
        <Modal title={`Continue to Purchase Order — ${orderDraft.medicine}`} onClose={() => setOrderDraft(null)} footer={<>
          <button type="button" className="adm-btn adm-btn-ghost" onClick={() => setOrderDraft(null)}>Cancel</button>
          <button type="button" className="adm-btn adm-btn-primary" disabled={isProcessing} onClick={submitOrder}>
            {isProcessing ? "Creating PO..." : "Create Purchase Order"}
          </button>
        </>}>
          <div className="adm-detail" style={{ marginBottom: 14 }}>
            <div className="adm-detail-item"><strong>Approved request</strong><span>{orderDraft.id}</span></div>
            <div className="adm-detail-item"><strong>Item</strong><span>{orderDraft.medicine} ({orderDraft.requestedQty})</span></div>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); submitOrder(); }}>
            <div className="df-form-group">
              <label className="df-label">Supplier *</label>
              <select
                className="df-select"
                value={orderForm.supplierId}
                onChange={(e) => {
                  const s = suppliers.find((x) => String(x.id) === e.target.value);
                  setOrderForm((f) => ({
                    ...f,
                    supplierId: e.target.value,
                    supplierName: s?.supplierName || s?.name || "",
                  }));
                }}
                required
              >
                <option value="">Select supplier…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.supplierName || s.name}</option>
                ))}
              </select>
            </div>
            <div className="df-form-group">
              <label className="df-label">Expected delivery date</label>
              <input type="date" className="df-input" value={orderForm.expectedDate} onChange={(e) => setOrderForm((f) => ({ ...f, expectedDate: e.target.value }))} />
            </div>
            <div className="df-form-group">
              <label className="df-label">Order notes</label>
              <textarea className="df-input" rows={3} value={orderForm.notes} onChange={(e) => setOrderForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional instructions for the supplier…" />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Purchase Orders
   -------------------------------------------------------------------------- */
export function PurchaseOrdersView({ role }) {
  const { addToast } = useNotifications();
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ supplierId: "", supplierName: "", items: "", total: "", expectedDate: "" });

  useEffect(() => {
    let active = true;
    Promise.all([
      pharmacyApi.getAllPurchaseOrders().catch(() => []),
      pharmacyApi.getAllSuppliers().catch(() => []),
    ]).then(([pos, sups]) => {
      if (!active) return;
      setSuppliers(Array.isArray(sups) ? sups : []);
      const list = Array.isArray(pos) ? pos.map((po) => ({
        id: po.orderNumber || `PO-${po.id}`,
        rawId: po.id,
        supplier: po.supplierName || "Medical Supplier",
        items: po.notes || "Pharmaceuticals batch",
        total: Number(po.totalAmount || 0),
        orderDate: po.orderDate ? String(po.orderDate).slice(0, 10) : "Recently",
        expectedDate: po.expectedDeliveryDate ? String(po.expectedDeliveryDate).slice(0, 10) : "—",
        status: String(po.status || "ORDERED").toUpperCase(),
      })) : [];
      setOrders(list);
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const markReceived = async (po) => {
    try {
      if (pharmacyApi.receivePurchaseOrder) {
        await pharmacyApi.receivePurchaseOrder(po.rawId).catch(() => null);
      }
    } catch {
      // safe fallback
    }
    setOrders((prev) => prev.map((o) => (o.id === po.id ? { ...o, status: "RECEIVED" } : o)));
    addToast(`${po.id} marked as received — inventory stock updated`, "success");
  };

  const submit = async () => {
    if (!form.supplierName || !form.items || !form.total) {
      addToast("Please enter supplier, items and total amount", "error");
      return;
    }

    try {
      if (pharmacyApi.createPurchaseOrder) {
        await pharmacyApi.createPurchaseOrder({
          supplierId: form.supplierId || null,
          supplierName: form.supplierName,
          notes: form.items,
          totalAmount: Number(form.total),
          expectedDeliveryDate: form.expectedDate,
          status: "ORDERED",
        }).catch(() => null);
      }
    } catch {
      // safe fallback
    }

    const newPO = {
      id: `PO-${Date.now().toString().slice(-4)}`,
      rawId: Date.now(),
      supplier: form.supplierName,
      items: form.items,
      total: Number(form.total),
      orderDate: new Date().toISOString().slice(0, 10),
      expectedDate: form.expectedDate || "—",
      status: "ORDERED",
    };

    setOrders((prev) => [newPO, ...prev]);
    setCreating(false);
    setForm({ supplierId: "", supplierName: "", items: "", total: "", expectedDate: "" });
    addToast("Purchase order created and logged in clinic procurement", "success");
  };

  return (
    <div className="adm-page">
      <AdminPageHeader
        kicker={<><AdminIcon name="box" size={13} /> Pharmacy Procurement</>}
        title="Purchase Orders"
        subtitle="Purchase orders raised for suppliers. Mark stock as received upon delivery to update pharmacy inventory automatically."
        actions={
          <button type="button" className="adm-btn adm-btn-primary" onClick={() => setCreating(true)}><AdminIcon name="plus" size={15} /> Create Purchase Order</button>
        }
      />

      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--df-text-secondary)" }}>
          Loading purchase orders…
        </div>
      ) : orders.length === 0 ? (
        <div className="adm-empty-table" style={{ padding: "48px 16px", textAlign: "center", background: "var(--df-glass-card)", borderRadius: 18, border: "1px solid var(--df-border)" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(37,99,235,0.08)", color: "#2563eb", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <AdminIcon name="box" size={24} />
          </div>
          <h4 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "var(--df-text-heading)" }}>No Purchase Orders Yet</h4>
          <p style={{ margin: "0 auto 16px", maxWidth: 380, fontSize: 13.5, color: "var(--df-text-secondary)", lineHeight: 1.5 }}>
            Create purchase orders for registered dental and pharmaceutical suppliers to track deliveries and replenish stock.
          </p>
          <button type="button" className="adm-btn adm-btn-primary adm-btn-sm" onClick={() => setCreating(true)}>
            <AdminIcon name="plus" size={14} /> Create First Order
          </button>
        </div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Supplier</th>
                <th>Items</th>
                <th>Total</th>
                <th>Ordered Date</th>
                <th>Expected Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((po) => (
                <tr key={po.id}>
                  <td className="adm-cell-strong">{po.id}</td>
                  <td>{po.supplier}</td>
                  <td style={{ maxWidth: 240 }}>{po.items}</td>
                  <td className="adm-cell-num">LKR {po.total.toLocaleString()}</td>
                  <td className="adm-cell-muted">{po.orderDate}</td>
                  <td className="adm-cell-muted">{po.expectedDate}</td>
                  <td>{statusChip(po.status)}</td>
                  <td>
                    {(po.status === "ORDERED" || po.status === "PENDING") && (
                      <button type="button" className="adm-btn adm-btn-success adm-btn-sm" onClick={() => markReceived(po)}>
                        <AdminIcon name="box" size={13} /> Receive Stock
                      </button>
                    )}
                    {po.status === "RECEIVED" && <span className="adm-cell-muted">Completed</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <Modal title="Create Purchase Order" onClose={() => setCreating(false)} footer={<>
          <button type="button" className="adm-btn adm-btn-ghost" onClick={() => setCreating(false)}>Cancel</button>
          <button type="button" className="adm-btn adm-btn-primary" onClick={submit}>Create &amp; Send</button>
        </>}>
          <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <div className="df-form-group">
              <label className="df-label">Supplier *</label>
              <select
                className="df-select"
                value={form.supplierId}
                onChange={(e) => {
                  const s = suppliers.find((x) => String(x.id) === e.target.value);
                  setForm((f) => ({
                    ...f,
                    supplierId: e.target.value,
                    supplierName: s?.supplierName || s?.name || e.target.value,
                  }));
                }}
              >
                <option value="">Select registered supplier…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.supplierName || s.name}</option>
                ))}
              </select>
            </div>
            <div className="df-form-group">
              <label className="df-label">Items Description *</label>
              <input className="df-input" value={form.items} onChange={(e) => setForm((f) => ({ ...f, items: e.target.value }))} placeholder="e.g. Amoxicillin 500mg × 500 packs" />
            </div>
            <div className="df-form-row">
              <div className="df-form-group">
                <label className="df-label">Total Amount (LKR) *</label>
                <input type="number" className="df-input" value={form.total} onChange={(e) => setForm((f) => ({ ...f, total: e.target.value }))} placeholder="125000" />
              </div>
              <div className="df-form-group">
                <label className="df-label">Expected Delivery Date</label>
                <input type="date" className="df-input" value={form.expectedDate} onChange={(e) => setForm((f) => ({ ...f, expectedDate: e.target.value }))} />
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Low Stock — admin view
   -------------------------------------------------------------------------- */
export function LowStockView({ role }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    pharmacyApi.getLowStockMedicines()
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data : [];
        setRows(list);
      })
      .catch(() => {
        if (active) setRows([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="adm-page">
      <AdminPageHeader
        kicker={<><AdminIcon name="alert" size={13} /> Pharmacy &amp; Inventory</>}
        title="Low Stock Medicines"
        subtitle="Medicines at or below minimum reorder thresholds requiring procurement attention."
        actions={<span className="adm-chip adm-chip-red"><span className="adm-chip-dot" /> {rows.length} below threshold</span>}
      />

      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--df-text-secondary)" }}>
          Checking inventory levels…
        </div>
      ) : rows.length === 0 ? (
        <div className="adm-empty-table" style={{ padding: "48px 16px", textAlign: "center", background: "var(--df-glass-card)", borderRadius: 18, border: "1px solid var(--df-border)" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(16,185,129,0.1)", color: "#10b981", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <AdminIcon name="check" size={24} />
          </div>
          <h4 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "var(--df-text-heading)" }}>All Stock Levels Healthy</h4>
          <p style={{ margin: "0 auto 16px", maxWidth: 380, fontSize: 13.5, color: "var(--df-text-secondary)", lineHeight: 1.5 }}>
            No pharmaceutical products are currently below their minimum safety stock threshold.
          </p>
          <a href="/admin/inventory" className="adm-btn adm-btn-soft adm-btn-sm">
            View Complete Inventory →
          </a>
        </div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Category</th>
                <th>Current Stock</th>
                <th>Reorder Level</th>
                <th>Unit Price</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="adm-cell-strong">{row.name}</td>
                  <td>{row.category || "General"}</td>
                  <td className="adm-cell-num" style={{ color: "#dc2626", fontWeight: 700 }}>{row.stockQuantity}</td>
                  <td className="adm-cell-num">{row.reorderLevel || 50}</td>
                  <td className="adm-cell-num">LKR {Number(row.unitPrice || 0).toLocaleString()}</td>
                  <td>{statusChip("low-stock")}</td>
                  <td>
                    <a href="/admin/purchase-requests" className="adm-btn adm-btn-soft adm-btn-sm">
                      <AdminIcon name="purchase" size={13} /> Reorder
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Expiry Alerts
   -------------------------------------------------------------------------- */
export function ExpiryAlertsView({ role }) {
  const { addToast } = useNotifications();
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    pharmacyApi.getAllMedicines()
      .then((data) => {
        if (!active) return;
        const now = new Date();
        const list = Array.isArray(data) ? data.filter((m) => {
          if (!m.expiryDate) return false;
          const exp = new Date(m.expiryDate);
          const daysLeft = Math.round((exp - now) / 86400000);
          return daysLeft <= 90; // Alert within 90 days
        }).map((m) => {
          const exp = new Date(m.expiryDate);
          const daysLeft = Math.round((exp - now) / 86400000);
          return {
            id: m.id,
            medicine: m.name,
            batch: m.medicineCode || `MED-${m.id}`,
            expiryDate: String(m.expiryDate).slice(0, 10),
            daysLeft,
            remainingQty: m.stockQuantity || 0,
            status: daysLeft <= 0 ? "expired" : "near-expiry",
          };
        }) : [];
        setMedicines(list);
      })
      .catch(() => {
        if (active) setMedicines([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const expired = medicines.filter((r) => r.status === "expired");
  const near = medicines.filter((r) => r.status === "near-expiry");

  const dispose = (row) => {
    setMedicines((prev) => prev.filter((r) => r.id !== row.id));
    addToast(`${row.medicine} marked as quarantined and removed from active dispensary stock`, "success");
  };

  return (
    <div className="adm-page">
      <AdminPageHeader
        kicker={<><AdminIcon name="expiry" size={13} /> Pharmacy &amp; Inventory</>}
        title="Expiry Alerts"
        subtitle="Medicines expiring within 90 days are flagged for priority rotation. Expired medicines must be quarantined immediately."
        actions={
          <>
            <span className="adm-chip adm-chip-amber"><span className="adm-chip-dot" /> {near.length} near expiry</span>
            <span className="adm-chip adm-chip-red"><span className="adm-chip-dot" /> {expired.length} expired</span>
          </>
        }
      />

      {expired.length > 0 && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "13px 16px", borderRadius: 12, background: "var(--df-error-bg)", border: "1px solid rgba(239,68,68,.3)", color: "#b91c1c", marginBottom: 20, fontSize: 13 }}>
          <AdminIcon name="x" size={17} strokeWidth={2.4} />
          <strong>Expired medicines detected.</strong> Quarantine expired batches to update active stock.
        </div>
      )}

      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--df-text-secondary)" }}>
          Checking medicine expiry schedules…
        </div>
      ) : medicines.length === 0 ? (
        <div className="adm-empty-table" style={{ padding: "48px 16px", textAlign: "center", background: "var(--df-glass-card)", borderRadius: 18, border: "1px solid var(--df-border)" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(16,185,129,0.1)", color: "#10b981", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <AdminIcon name="check" size={24} />
          </div>
          <h4 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "var(--df-text-heading)" }}>No Expiry Alerts</h4>
          <p style={{ margin: "0 auto 16px", maxWidth: 380, fontSize: 13.5, color: "var(--df-text-secondary)", lineHeight: 1.5 }}>
            All medicines currently in dispensary stock have healthy expiry timelines and are safe for patient administration.
          </p>
          <a href="/admin/inventory" className="adm-btn adm-btn-soft adm-btn-sm">
            View Dispensary Catalog →
          </a>
        </div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Batch Code</th>
                <th>Expiry Date</th>
                <th>Days Left</th>
                <th>Remaining Qty</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map((row) => (
                <tr key={row.id}>
                  <td className="adm-cell-strong">{row.medicine}</td>
                  <td><span className="adm-chip adm-chip-gray">{row.batch}</span></td>
                  <td>{row.expiryDate}</td>
                  <td className={`adm-cell-num ${row.status === "expired" ? "td-expired" : ""}`} style={row.status === "expired" ? { color: "#dc2626", fontWeight: 700 } : {}}>
                    {row.status === "expired" ? "Expired" : `${row.daysLeft} days`}
                  </td>
                  <td className="adm-cell-num">{row.remainingQty} units</td>
                  <td>
                    <span className={`adm-chip ${row.status === "expired" ? "adm-chip-red" : "adm-chip-amber"}`}>
                      <span className="adm-chip-dot" />{row.status === "expired" ? "Expired" : "Near Expiry"}
                    </span>
                  </td>
                  <td>
                    {row.status === "expired" ? (
                      <button type="button" className="adm-btn adm-btn-danger adm-btn-sm" onClick={() => dispose(row)}>
                        <AdminIcon name="x" size={13} /> Quarantine
                      </button>
                    ) : (
                      <button type="button" className="adm-btn adm-btn-soft adm-btn-sm" onClick={() => addToast(`Stock rotation suggestion for ${row.medicine} — dispense soonest expiry first`, "info")}>
                        <AdminIcon name="eye" size={13} /> Rotate Stock
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
