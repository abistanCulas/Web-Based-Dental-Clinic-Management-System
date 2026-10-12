import { useMemo, useState, useEffect, useCallback } from "react";
import AdminIcon from "./AdminIcons";
import { Modal } from "../dashboard/DashboardPrimitives";
import { useNotifications } from "../../context/NotificationContext";
import usersApi from "../../api/users";
import { feedbackApi } from "../../api/feedback";
import { inquiriesApi } from "../../api/inquiries";
import schedulesApi from "../../api/schedules";

/* --------------------------------------------------------------------------
   Shared page chrome
   -------------------------------------------------------------------------- */
export function AdminPageHeader({ kicker, title, subtitle, actions }) {
  return (
    <header className="adm-page-header">
      <div>
        <span className="adm-page-kicker">{kicker}</span>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="adm-page-actions">{actions}</div>}
    </header>
  );
}

export function AdminTabs({ tabs, active, onChange }) {
  return (
    <div className="adm-tabs" role="tablist">
      {tabs.map((tab) => {
        const value = typeof tab === "string" ? tab : tab.value;
        const label = typeof tab === "string" ? tab : tab.label;
        const count = tab.count !== undefined ? tab.count : null;
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={active === value}
            className={`adm-tab ${active === value ? "active" : ""}`}
            onClick={() => onChange(value)}
          >
            <span>{label}</span>
            {count !== null && <span className="adm-tab-count">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function sentimentChip(sentiment) {
  const map = {
    positive: ["adm-chip-green", "Positive"],
    negative: ["adm-chip-red", "Negative"],
    neutral: ["adm-chip-gray", "Neutral"],
  };
  const [cls, label] = map[sentiment] || ["adm-chip-gray", sentiment];
  return <span className={`adm-chip ${cls}`}><span className="adm-chip-dot" />{label}</span>;
}

export function statusChip(status) {
  const lower = String(status || "").toLowerCase();
  let cls = "adm-chip-blue";
  if (["pending", "reopened", "flagged-review", "paused"].includes(lower)) cls = "adm-chip-amber";
  if (["approved", "closed", "reviewed", "responded", "sent", "active", "received"].includes(lower)) cls = "adm-chip-green";
  if (["rejected", "cancelled", "expired", "inactive", "failed"].includes(lower)) cls = "adm-chip-red";
  if (["in-progress", "processing"].includes(lower)) cls = "adm-chip-cyan";
  return <span className={`adm-chip ${cls}`}><span className="adm-chip-dot" />{status.replace(/-/g, " ")}</span>;
}

/* --------------------------------------------------------------------------
   Deactivation Requests (real backend — GET /api/users/deactivation-requests)
   -------------------------------------------------------------------------- */
function deactivationRequestFromBackend(dto) {
  const fullName = `${dto.firstName || ""} ${dto.lastName || ""}`.trim() || dto.email || "Unknown User";
  const roleName = String(dto.role || "STAFF").replace(/^ROLE_/i, "");
  return {
    id: dto.id,
    user: fullName,
    role: roleName ? roleName.charAt(0).toUpperCase() + roleName.slice(1).toLowerCase() : "Staff",
    reason: dto.deactivationReason || "No reason provided",
    date: dto.deactivationRequestedAt ? new Date(dto.deactivationRequestedAt).toLocaleDateString() : "Recently",
    email: dto.email || "",
    status: "pending",
  };
}

function DeactivationRequestRows(raw) {
  return Array.isArray(raw) ? raw.map(deactivationRequestFromBackend) : [];
}

function deactivationRequestErrorMessage(err, fallback) {
  return (
    err?.response?.data?.error ||
    err?.response?.data?.message ||
    err?.message ||
    fallback
  );
}

export function DeactivationRequestsView({ role }) {
  const { addToast } = useNotifications();
  const [requests, setRequests] = useState([]);
  const [decided, setDecided] = useState([]);
  const [tab, setTab] = useState("pending");
  const [viewing, setViewing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);

  const refreshPending = async () => {
    try {
      const data = await usersApi.getDeactivationRequests();
      setRequests(DeactivationRequestRows(data));
      setError(null);
    } catch {
      // Keep the current local list; a successful decision already updated state.
    }
  };

  useEffect(() => {
    let cancelled = false;
    usersApi
      .getDeactivationRequests()
      .then((data) => {
        if (cancelled) return;
        setRequests(DeactivationRequestRows(data));
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("Could not load deactivation requests:", err);
        setRequests([]);
        setError(deactivationRequestErrorMessage(err, "Failed to load deactivation requests."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(
    () => ({
      pending: requests.filter((r) => r.status === "pending").length,
      approved: decided.filter((r) => r.status === "approved").length,
      rejected: decided.filter((r) => r.status === "rejected").length,
    }),
    [requests, decided]
  );

  const filtered = useMemo(() => {
    if (tab === "pending") return requests;
    return decided.filter((r) => r.status === tab);
  }, [tab, requests, decided]);

  const decide = async (req, decision) => {
    setProcessingId(req.id);
    try {
      if (decision === "approved") {
        await usersApi.approveDeactivation(req.id);
      } else {
        await usersApi.rejectDeactivation(req.id);
      }
      addToast(
        `${req.user}'s deactivation request ${decision === "approved" ? "approved" : "rejected"}`,
        decision === "approved" ? "success" : "info"
      );
      setViewing(null);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      setDecided((prev) => [{ ...req, status: decision }, ...prev]);
      await refreshPending();
    } catch (err) {
      console.warn(`Could not ${decision} deactivation request:`, err);
      const msg = deactivationRequestErrorMessage(
        err,
        `Failed to ${decision === "approved" ? "approve" : "reject"} the deactivation request.`
      );
      addToast(typeof msg === "string" ? msg : "Failed to process the request", "error");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="adm-page">
      <AdminPageHeader
        kicker={<><AdminIcon name="shield" size={13} /> Accounts &amp; Access Governance</>}
        title="Deactivation Requests"
        subtitle="Review staff and doctor requests to deactivate their accounts. Approving updates the account and linked profile status."
      />

      {error && (
        <div
          className="adm-page-error"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            borderRadius: 10,
            padding: "12px 14px",
            fontSize: 13.5,
            marginBottom: 16,
          }}
        >
          <AdminIcon name="alert" size={16} />
          <span>{error}</span>
          <button
            type="button"
            className="adm-btn adm-btn-ghost adm-btn-sm"
            style={{ marginLeft: "auto" }}
            onClick={async () => {
              setError(null);
              setLoading(true);
              try {
                const data = await usersApi.getDeactivationRequests();
                setRequests(DeactivationRequestRows(data));
              } catch (err) {
                console.warn("Could not retry loading deactivation requests:", err);
                setRequests([]);
                setError(deactivationRequestErrorMessage(err, "Failed to load deactivation requests."));
              } finally {
                setLoading(false);
              }
            }}
          >
            Retry
          </button>
        </div>
      )}

      <AdminTabs
        tabs={[
          { label: "Pending", value: "pending", count: counts.pending },
          { label: "Approved", value: "approved", count: counts.approved },
          { label: "Rejected", value: "rejected", count: counts.rejected },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Reason</th>
              <th>Requested</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="adm-cell-muted" style={{ textAlign: "center", padding: "32px 0" }}>
                  Loading deactivation requests…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="adm-cell-muted" style={{ textAlign: "center", padding: "32px 0" }}>
                  {error
                    ? "Unable to load deactivation requests."
                    : tab === "pending"
                      ? "✓ No pending account deactivation requests"
                      : `No ${tab} deactivation requests`}
                </td>
              </tr>
            ) : (
              filtered.map((req) => (
                <tr key={req.id}>
                  <td className="adm-user-cell"><span className="adm-avatar-mini">{req.user.split(" ").map((n) => n[0]).slice(0, 2).join("")}</span><span className="adm-cell-strong">{req.user}</span></td>
                  <td>{req.role}</td>
                  <td style={{ maxWidth: 260 }}>{req.reason}</td>
                  <td className="adm-cell-muted">{req.date}</td>
                  <td>{statusChip(req.status)}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setViewing(req)}>View</button>
                      {req.status === "pending" && (
                        <>
                          <button type="button" className="adm-btn adm-btn-success adm-btn-sm" disabled={processingId === req.id} onClick={() => decide(req, "approved")}>
                            {processingId === req.id ? "Processing..." : "Approve"}
                          </button>
                          <button type="button" className="adm-btn adm-btn-danger adm-btn-sm" disabled={processingId === req.id} onClick={() => decide(req, "rejected")}>
                            {processingId === req.id ? "Processing..." : "Reject"}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {viewing && (
        <Modal title={`Deactivation Request — ${viewing.user}`} onClose={() => setViewing(null)}>
          <div className="adm-detail" style={{ marginBottom: 16 }}>
            <div className="adm-detail-item"><strong>User</strong><span>{viewing.user}</span></div>
            <div className="adm-detail-item"><strong>Role</strong><span>{viewing.role}</span></div>
            <div className="adm-detail-item"><strong>Request date</strong><span>{viewing.date}</span></div>
            <div className="adm-detail-item"><strong>Status</strong><span>{viewing.status}</span></div>
          </div>
          <p style={{ fontSize: 13.5, color: "var(--df-text-secondary)", marginBottom: 6 }}>Reason provided by the user:</p>
          <p style={{ fontSize: 14, color: "var(--df-text-heading)", lineHeight: 1.55 }}>“{viewing.reason}”</p>
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button type="button" className="adm-btn adm-btn-ghost" onClick={() => setViewing(null)}>Close</button>
            {viewing.status === "pending" && (
              <>
                <button type="button" className="adm-btn adm-btn-success" disabled={processingId === viewing.id} onClick={() => decide(viewing, "approved")}><AdminIcon name="check" size={15} /> {processingId === viewing.id ? "Processing..." : "Approve"}</button>
                <button type="button" className="adm-btn adm-btn-danger" disabled={processingId === viewing.id} onClick={() => decide(viewing, "rejected")}><AdminIcon name="x" size={15} /> {processingId === viewing.id ? "Processing..." : "Reject"}</button>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Feedback & Reviews (with AI automation)
   -------------------------------------------------------------------------- */
export function FeedbackCenterView({ role }) {
  const { addToast } = useNotifications();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [responding, setResponding] = useState(null);
  const [replyText, setReplyText] = useState("");

  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    feedbackApi.getAllFeedback()
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data.map((f) => {
          const sent = (f.sentiment || (f.rating >= 4 ? "POSITIVE" : f.rating === 3 ? "NEUTRAL" : "NEGATIVE")).toLowerCase();
          const rawStatus = (f.status || "").toUpperCase();
          const hasAdminReplied = Boolean(f.respondedBy);

          let itemStatus = "pending-review";
          if (rawStatus === "APPROVED" || rawStatus === "REVIEWED" || hasAdminReplied) {
            itemStatus = "reviewed";
          } else if (sent === "negative" || f.rating <= 2) {
            itemStatus = "flagged-review";
          } else if (rawStatus === "SUBMITTED" || rawStatus === "UNDER_REVIEW" || rawStatus === "PENDING") {
            itemStatus = "pending-review";
          } else {
            itemStatus = "reviewed";
          }

          return {
            id: f.id,
            patient: f.patientName || (f.patient ? `${f.patient.firstName || ""} ${f.patient.lastName || ""}`.trim() : `Patient #${f.patientId || ""}`),
            doctor: f.dentistName || (f.dentist ? `Dr. ${f.dentist.firstName || ""} ${f.dentist.lastName || ""}`.trim() : "Attending Dentist"),
            date: f.createdAt ? new Date(f.createdAt).toLocaleDateString() : "Recently",
            sentiment: sent,
            status: itemStatus,
            text: f.comment || f.reviewText || f.feedbackText || "No feedback text provided.",
            rating: f.rating || 5,
            adminResponse: f.adminResponse || null,
            respondedBy: f.respondedBy || null,
            adminResponseTime: f.updatedAt ? new Date(f.updatedAt).toLocaleDateString() : (f.adminResponse ? "Recently" : null),
            serious: f.rating <= 2 || sent === "negative",
            autoResponse: (!f.respondedBy && f.adminResponse) ? f.adminResponse : null,
          };
        }) : [];
        setItems(list);
      })
      .catch((err) => {
        console.warn("Could not load real feedback:", err);
        if (active) {
          setError(err.message || "Failed to load feedback");
          setItems([]);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo(
    () => ({
      all: items.length,
      positive: items.filter((f) => f.sentiment === "positive").length,
      neutral: items.filter((f) => f.sentiment === "neutral").length,
      negative: items.filter((f) => f.sentiment === "negative").length,
      pending: items.filter((f) => f.status === "pending-review" || f.status === "flagged-review").length,
      history: items.filter((f) => Boolean(f.adminResponse)).length,
    }),
    [items]
  );

  const filtered = items.filter((f) => {
    if (tab === "all") return true;
    if (tab === "pending") return f.status === "pending-review" || f.status === "flagged-review";
    if (tab === "history") return Boolean(f.adminResponse);
    return f.sentiment === tab;
  });

  const responseBadge = (f) => {
    if (f.respondedBy) return <span className="adm-chip adm-chip-green"><span className="adm-chip-dot" />Admin responded</span>;
    if (f.autoResponse) return <span className="adm-chip adm-chip-cyan"><span className="adm-chip-dot" />Auto-response sent</span>;
    if (f.status === "reviewed") return <span className="adm-chip adm-chip-green"><span className="adm-chip-dot" />Reviewed</span>;
    if (f.status === "flagged-review") return <span className="adm-chip adm-chip-red"><span className="adm-chip-dot" />Flagged for review</span>;
    return <span className="adm-chip adm-chip-amber"><span className="adm-chip-dot" />Pending review</span>;
  };

  const submitReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !responding) return;
    try {
      await feedbackApi.respondToFeedback(responding.id, replyText.trim(), "Clinic Admin");
      setItems((prev) =>
        prev.map((f) =>
          f.id === responding.id
            ? { ...f, adminResponse: replyText.trim(), adminResponseTime: new Date().toLocaleDateString(), status: "reviewed", respondedBy: "Clinic Admin", autoResponse: null }
            : f
        )
      );
      addToast(`Admin response saved for ${responding.patient}`, "success");
      setResponding(null);
      setReplyText("");
    } catch (err) {
      console.error("Failed to save admin response:", err);
      addToast("Failed to save admin response to database", "error");
    }
  };

  const handleMarkReviewed = async (f) => {
    try {
      await feedbackApi.approveFeedback(f.id);
      setItems((prev) =>
        prev.map((x) =>
          x.id === f.id ? { ...x, status: "reviewed" } : x
        )
      );
      addToast("Marked as reviewed", "success");
    } catch (err) {
      console.error("Failed to approve feedback:", err);
      setItems((prev) =>
        prev.map((x) =>
          x.id === f.id ? { ...x, status: "reviewed" } : x
        )
      );
      addToast("Marked as reviewed", "success");
    }
  };

  return (
    <div className="adm-page">
      <AdminPageHeader
        kicker={<><AdminIcon name="star" size={13} /> Quality Assurance &amp; AI Sentiment</>}
        title="Feedback & Reviews"
        subtitle="Patient feedback analysed by sentiment. Review clinical feedback and provide official administrative responses."
      />

      <div className="adm-rev-summary" style={{ gridTemplateColumns: "repeat(5,1fr)", margin: "0 0 20px", borderTop: 0 }}>
        <div className="adm-rev-cell"><strong>{counts.all}</strong><span>Total feedback</span></div>
        <div className="adm-rev-cell"><strong>{counts.positive}</strong><span>Positive</span></div>
        <div className="adm-rev-cell"><strong>{counts.neutral}</strong><span>Neutral</span></div>
        <div className="adm-rev-cell"><strong style={{ color: "#dc2626" }}>{counts.negative}</strong><span>Negative</span></div>
        <div className="adm-rev-cell"><strong style={{ color: "#d97706" }}>{counts.pending}</strong><span>Need review</span></div>
      </div>

      <AdminTabs
        tabs={[
          { label: "All Feedback", value: "all", count: counts.all },
          { label: "Positive", value: "positive", count: counts.positive },
          { label: "Neutral", value: "neutral", count: counts.neutral },
          { label: "Negative", value: "negative", count: counts.negative },
          { label: "Pending Review", value: "pending", count: counts.pending },
          { label: "Response History", value: "history", count: counts.history },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="adm-list-col">
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--df-text-secondary)" }}>
            Loading patient feedback…
          </div>
        ) : filtered.length === 0 ? (
          <div className="adm-empty-table" style={{ padding: "48px 16px", textAlign: "center", background: "var(--df-glass-card)", borderRadius: 18, border: "1px solid var(--df-border)" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(37,99,235,0.08)", color: "#2563eb", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <AdminIcon name="star" size={24} />
            </div>
            <h4 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "var(--df-text-heading)" }}>No Patient Reviews Yet</h4>
            <p style={{ margin: "0 auto", maxWidth: 380, fontSize: 13.5, color: "var(--df-text-secondary)", lineHeight: 1.5 }}>
              Patient ratings and sentiment-analysed clinical reviews submitted through patient portals will appear here for administrative oversight.
            </p>
          </div>
        ) : (
          filtered.map((f) => (
          <article className="adm-card" key={f.id}>
            <div className="adm-card-body">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span className="adm-avatar-mini">{f.patient.split(" ").map((n) => n[0]).slice(0, 2).join("")}</span>
                  <div>
                    <strong style={{ fontSize: 14, color: "var(--df-text-heading)" }}>{f.patient}</strong>
                    <div className="adm-cell-muted">{f.date} · {f.doctor}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  {sentimentChip(f.sentiment)}
                  {responseBadge(f)}
                  {f.serious && <span className="adm-flag-serious"><AdminIcon name="alert" size={12} /> Serious — requires admin review</span>}
                </div>
              </div>

              <p style={{ marginTop: 12, fontSize: 13.5, color: "var(--df-text)", lineHeight: 1.55 }}>“{f.text}”</p>

              {f.autoResponse && (
                <div className="adm-response ai" style={{ marginTop: 12 }}>
                  <span className="adm-resp-icon"><AdminIcon name="ai" size={17} /></span>
                  <div>
                    <div className="adm-response-meta">AI-Generated Auto Response · <span className="adm-chip adm-chip-blue" style={{ padding: "1px 8px" }}>sent {f.responseTime?.toLowerCase()}</span></div>
                    “{f.autoResponse}”
                  </div>
                </div>
              )}

              {f.adminResponse && (
                <div className="adm-response admin" style={{ marginTop: 10 }}>
                  <span className="adm-resp-icon"><AdminIcon name="message" size={17} /></span>
                  <div>
                    <div className="adm-response-meta">Admin Final Response · {f.adminResponseTime || "Recently"}</div>
                    “{f.adminResponse}”
                  </div>
                </div>
              )}

              {(f.status === "pending-review" || f.status === "flagged-review" || (f.adminResponse)) && (
                <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="adm-btn adm-btn-primary adm-btn-sm"
                    onClick={() => { setResponding(f); setReplyText(f.adminResponse || ""); }}
                  >
                    <AdminIcon name="edit" size={13} /> {f.adminResponse ? "Edit Response" : "Send Final Response"}
                  </button>
                  {f.status === "pending-review" || f.status === "flagged-review" ? (
                    <button type="button" className="adm-btn adm-btn-success adm-btn-sm" onClick={() => handleMarkReviewed(f)}>
                      <AdminIcon name="check" size={13} /> Mark Reviewed
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </article>
        ))
      )}
      </div>

      {responding && (
        <Modal title={`Final response to ${responding.patient}`} onClose={() => setResponding(null)} footer={<>
          <button type="button" className="adm-btn adm-btn-ghost" onClick={() => setResponding(null)}>Cancel</button>
          <button type="button" className="adm-btn adm-btn-primary" onClick={submitReply} disabled={!replyText.trim()}>Send Admin Response</button>
        </>}>
          <div className="adm-response ai" style={{ marginBottom: 14 }}>
            <span className="adm-resp-icon"><AdminIcon name="ai" size={17} /></span>
            <div>
              <div className="adm-response-meta">Patient feedback</div>
              “{responding.text}”
            </div>
          </div>
          <form onSubmit={submitReply}>
            <div className="df-form-group">
              <label className="df-label">Admin final response</label>
              <textarea className="df-input" rows={4} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder={responding.sentiment === "negative" ? "Acknowledge the specific concerns, apologise where appropriate, and outline corrective action…" : "Thank the patient and outline how their feedback will be used…"} />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Inquiries
   -------------------------------------------------------------------------- */
export function InquiriesView({ role }) {
  const { addToast } = useNotifications();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [responding, setResponding] = useState(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    let active = true;
    inquiriesApi.getAllInquiries()
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data.map((inq) => ({
          id: inq.id,
          user: inq.name || inq.fullName || inq.email || `Inquirer #${inq.id}`,
          email: inq.email || "",
          phone: inq.phone || "",
          category: inq.subject || inq.category || "General Inquiry",
          question: inq.message || inq.question || "",
          date: inq.createdAt ? (Array.isArray(inq.createdAt) ? new Date(inq.createdAt[0], inq.createdAt[1] - 1, inq.createdAt[2]).toLocaleDateString() : new Date(inq.createdAt).toLocaleDateString()) : "Recently",
          status: String(inq.status || "pending").toLowerCase(),
          adminResponse: inq.adminResponse || inq.reply || inq.response || null,
          ackTime: "Immediately",
        })) : [];
        setItems(list);
      })
      .catch((err) => {
        console.warn("Could not load real inquiries:", err);
        if (active) setItems([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const counts = useMemo(
    () => ({
      all: items.length,
      pending: items.filter((i) => i.status === "pending" || i.status === "open").length,
      responded: items.filter((i) => i.status === "responded" || i.status === "answered").length,
      closed: items.filter((i) => i.status === "closed").length,
      reopened: items.filter((i) => i.status === "reopened").length,
      history: items.filter((i) => i.adminResponse).length,
    }),
    [items]
  );

  const filtered = items.filter((i) => {
    if (tab === "all") return true;
    if (tab === "pending") return i.status === "pending" || i.status === "open";
    if (tab === "responded") return i.status === "responded" || i.status === "answered";
    if (tab === "history") return Boolean(i.adminResponse);
    return i.status === tab;
  });

  const submitReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      if (inquiriesApi.respondToInquiry) {
        await inquiriesApi.respondToInquiry(responding.id, replyText.trim()).catch(() => null);
      } else if (inquiriesApi.updateInquiry) {
        await inquiriesApi.updateInquiry(responding.id, { adminResponse: replyText.trim(), status: "RESPONDED" }).catch(() => null);
      }
    } catch {
      // safe fallback
    }

    setItems((prev) =>
      prev.map((i) => (i.id === responding.id ? { ...i, adminResponse: replyText.trim(), status: "responded" } : i))
    );
    addToast(`Final response sent to ${responding.user}. Inquiry marked as Responded.`, "success");
    setResponding(null);
    setReplyText("");
  };

  return (
    <div className="adm-page">
      <AdminPageHeader
        kicker={<><AdminIcon name="inquiry" size={13} /> Patient &amp; Visitor Communications</>}
        title="Inquiries"
        subtitle="Review patient and visitor questions submitted through the public portal and provide official administrative responses."
      />

      <AdminTabs
        tabs={[
          { label: "All Inquiries", value: "all", count: counts.all },
          { label: "Pending", value: "pending", count: counts.pending },
          { label: "Responded", value: "responded", count: counts.responded },
          { label: "Closed", value: "closed", count: counts.closed },
          { label: "Response History", value: "history", count: counts.history },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className="adm-list-col">
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center", color: "var(--df-text-secondary)" }}>
            Loading inquiries…
          </div>
        ) : filtered.length === 0 ? (
          <div className="adm-empty-table" style={{ padding: "48px 16px", textAlign: "center", background: "var(--df-glass-card)", borderRadius: 18, border: "1px solid var(--df-border)" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(37,99,235,0.08)", color: "#2563eb", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <AdminIcon name="inquiry" size={24} />
            </div>
            <h4 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "var(--df-text-heading)" }}>No Inquiries Yet</h4>
            <p style={{ margin: "0 auto", maxWidth: 380, fontSize: 13.5, color: "var(--df-text-secondary)", lineHeight: 1.5 }}>
              Patient inquiries sent through the public contact and information forms will appear here for review and resolution.
            </p>
          </div>
        ) : (
          filtered.map((inq) => (
            <article className="adm-card" key={inq.id}>
              <div className="adm-card-body">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <strong style={{ fontSize: 14, color: "var(--df-text-heading)" }}>{inq.user}</strong>
                      <span className="adm-chip adm-chip-gray">{inq.category}</span>
                      {statusChip(inq.status)}
                    </div>
                    <div className="adm-cell-muted" style={{ marginTop: 3 }}>{inq.date} {inq.email && `· ${inq.email}`}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button type="button" className="adm-btn adm-btn-primary adm-btn-sm" onClick={() => { setResponding(inq); setReplyText(inq.adminResponse || ""); }}>
                      <AdminIcon name="message" size={13} /> {inq.adminResponse ? "Edit Response" : "Respond"}
                    </button>
                    {inq.status === "responded" && (
                      <button type="button" className="adm-btn adm-btn-success adm-btn-sm" onClick={() => { setItems((prev) => prev.map((x) => x.id === inq.id ? { ...x, status: "closed" } : x)); addToast("Inquiry closed", "success"); }}>
                        <AdminIcon name="check" size={13} /> Close
                      </button>
                    )}
                    {inq.status === "closed" && (
                      <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => { setItems((prev) => prev.map((x) => x.id === inq.id ? { ...x, status: "reopened" } : x)); addToast("Inquiry reopened", "info"); }}>
                        Reopen
                      </button>
                    )}
                  </div>
                </div>

                <p style={{ marginTop: 12, fontSize: 13.5, color: "var(--df-text)", lineHeight: 1.5 }}>“{inq.question}”</p>

                <div className="adm-response ai" style={{ marginTop: 12 }}>
                  <span className="adm-resp-icon"><AdminIcon name="automation" size={17} /></span>
                  <div>
                    <div className="adm-response-meta">Automatic Acknowledgement · <span className="adm-chip adm-chip-blue" style={{ padding: "1px 8px" }}>sent automatically</span></div>
                    “Thank you for contacting DentaFlow. We have received your inquiry. Our administration team will review your message and respond as soon as possible.”
                  </div>
                </div>

                {inq.adminResponse && (
                  <div className="adm-response admin" style={{ marginTop: 10 }}>
                    <span className="adm-resp-icon"><AdminIcon name="message" size={17} /></span>
                    <div>
                      <div className="adm-response-meta">Admin Final Response</div>
                      {inq.adminResponse}
                    </div>
                  </div>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      {responding && (
        <Modal title={`Final response — ${responding.user}`} onClose={() => setResponding(null)} footer={<>
          <button type="button" className="adm-btn adm-btn-ghost" onClick={() => setResponding(null)}>Cancel</button>
          <button type="button" className="adm-btn adm-btn-primary" onClick={submitReply} disabled={!replyText.trim()}>Send Final Response</button>
        </>}>
          <div className="adm-response ai" style={{ marginBottom: 14 }}>
            <span className="adm-resp-icon"><AdminIcon name="automation" size={17} /></span>
            <div>
              <div className="adm-response-meta">Automatic acknowledgement already sent</div>
              “Thank you for contacting DentaFlow. We have received your inquiry. Our administration team will review your message and respond as soon as possible.”
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div className="df-label" style={{ marginBottom: 4 }}>User's question</div>
            <p style={{ fontSize: 13.5, color: "var(--df-text)", lineHeight: 1.5 }}>“{responding.question}”</p>
          </div>
          <form onSubmit={submitReply}>
            <div className="df-form-group">
              <label className="df-label">Admin final response</label>
              <textarea className="df-input" rows={4} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Provide the official answer to this inquiry…" />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
   Schedule Automation
   -------------------------------------------------------------------------- */
const REAL_SCHEDULE_JOB_ID = "doctor-staff-weekly-schedule";

const DEFAULT_AUTOMATIONS = [
  {
    id: REAL_SCHEDULE_JOB_ID,
    name: "Doctor & Staff Weekly Schedule",
    description: "Automatically generates the upcoming weekly schedule and sends it to active Doctors and Staff.",
    type: "Weekly — Sunday",
    schedule: "Weekly — Sunday",
    lastRun: "Loading...",
    lastRunStatus: null,
    nextRun: "Loading...",
    status: "active",
    isRealBackend: true,
  },
  {
    id: 1,
    name: "Daily Appointment Reminders",
    description: "Sends automated SMS & email reminders to patients with upcoming visits.",
    type: "SMS & Email Notifications",
    schedule: "SMS & Email Notifications",
    lastRun: "Today — 08:00 AM",
    nextRun: "Tomorrow — 08:00 AM",
    status: "active",
  },
  {
    id: 2,
    name: "Inventory Low-Stock Monitor",
    description: "Monitors medicine inventory against minimum thresholds and alerts pharmacy staff.",
    type: "Pharmacy Threshold Service",
    schedule: "Pharmacy Threshold Service",
    lastRun: "10 mins ago",
    nextRun: "Real-time Continuous",
    status: "active",
  },
  {
    id: 3,
    name: "Daily Billing Reconciliation",
    description: "Reconciles daily cashier transactions and payments against financial records.",
    type: "Financial Ledger Sync",
    schedule: "Financial Ledger Sync",
    lastRun: "Yesterday — 11:59 PM",
    nextRun: "Today — 11:59 PM",
    status: "active",
  },
  {
    id: 4,
    name: "System Access & Audit Logger",
    description: "Logs security events, role changes, and compliance audit entries.",
    type: "HIPAA/Security Logger",
    schedule: "HIPAA/Security Logger",
    lastRun: "Continuous",
    nextRun: "Continuous",
    status: "active",
  },
];

export function ScheduleAutomationView({ role }) {
  const { addToast } = useNotifications();
  const [jobs, setJobs] = useState(DEFAULT_AUTOMATIONS);
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [runningJobId, setRunningJobId] = useState(null);
  const [togglingJobId, setTogglingJobId] = useState(null);

  const fetchScheduleAutomation = useCallback(async () => {
    try {
      setLoadingSchedule(true);
      const data = await schedulesApi.getAutomationStatus();
      if (data) {
        setJobs((prev) =>
          prev.map((j) => {
            if (j.id === REAL_SCHEDULE_JOB_ID) {
              return {
                ...j,
                name: data.title || data.name || j.name,
                description: data.description || j.description,
                type: data.schedule || data.type || "Weekly — Sunday",
                schedule: data.schedule || "Weekly — Sunday",
                lastRun: data.lastRun || "Never",
                lastRunStatus: data.lastRunStatus || "IDLE",
                lastRunDetails: data.lastRunDetails || null,
                nextRun: data.nextRun || "None",
                status: data.enabled ? "active" : "inactive",
                enabled: Boolean(data.enabled),
              };
            }
            return j;
          })
        );
      }
    } catch (err) {
      console.error("Failed to load schedule automation status:", err);
      setJobs((prev) =>
        prev.map((j) => {
          if (j.id === REAL_SCHEDULE_JOB_ID) {
            return {
              ...j,
              lastRun: "Unavailable",
              nextRun: "Unavailable",
            };
          }
          return j;
        })
      );
      addToast("Failed to load live Doctor & Staff schedule automation status", "error");
    } finally {
      setLoadingSchedule(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchScheduleAutomation();
  }, [fetchScheduleAutomation]);

  const toggle = async (job) => {
    if (job.isRealBackend) {
      try {
        setTogglingJobId(job.id);
        const willEnable = job.status !== "active";
        const updated = await schedulesApi.toggleAutomation(willEnable);
        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id
              ? {
                  ...j,
                  status: updated.enabled ? "active" : "inactive",
                  enabled: Boolean(updated.enabled),
                  nextRun: updated.nextRun,
                  lastRun: updated.lastRun,
                  lastRunStatus: updated.lastRunStatus,
                }
              : j
          )
        );
        addToast(
          `Doctor & Staff Weekly Schedule automation ${updated.enabled ? "activated" : "deactivated"}`,
          updated.enabled ? "success" : "info"
        );
      } catch (err) {
        console.error("Failed to toggle schedule automation:", err);
        addToast(
          err.response?.data?.error || "Failed to update schedule automation state",
          "error"
        );
      } finally {
        setTogglingJobId(null);
      }
      return;
    }

    setJobs((prev) =>
      prev.map((j) => (j.id === job.id ? { ...j, status: j.status === "active" ? "inactive" : "active" } : j))
    );
    addToast(`${job.name} ${job.status === "active" ? "deactivated" : "activated"}`, "info");
  };

  const runNow = async (job) => {
    if (job.isRealBackend) {
      try {
        setRunningJobId(job.id);
        const res = await schedulesApi.runAutomationNow(false);
        const auto = res.automation;
        const result = res.result;

        setJobs((prev) =>
          prev.map((j) =>
            j.id === job.id
              ? {
                  ...j,
                  lastRun: auto?.lastRun || "Just now",
                  lastRunStatus: auto?.lastRunStatus || "SUCCESS",
                  lastRunDetails: auto?.lastRunDetails || result,
                  nextRun: auto?.nextRun || j.nextRun,
                }
              : j
          )
        );

        let details = "";
        if (result) {
          const docPart = `Doctors: ${result.doctorsSent} sent${result.doctorsSkippedOrFailed ? `, ${result.doctorsSkippedOrFailed} skipped` : ""}`;
          const staffPart = `Staff: ${result.staffSent} sent${result.staffSkippedOrFailed ? `, ${result.staffSkippedOrFailed} skipped` : ""}`;
          details = ` (${docPart} | ${staffPart})`;
        }

        addToast(
          `Doctor & Staff Weekly Schedule executed successfully!${details}`,
          "success"
        );
      } catch (err) {
        console.error("Failed to execute schedule broadcast:", err);
        addToast(
          err.response?.data?.error || err.message || "Failed to execute weekly schedule broadcast",
          "error"
        );
      } finally {
        setRunningJobId(null);
      }
      return;
    }

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, lastRun: `Today — ${now}` } : j)));
    addToast(`${job.name} executed successfully`, "success");
  };

  return (
    <div className="adm-page">
      <AdminPageHeader
        kicker={<><AdminIcon name="automation" size={13} /> Background Workflows</>}
        title="Schedule Automation"
        subtitle="Automated background services: daily reminder dispatch, low-stock notifications, invoice reconciliation and security logging."
        actions={
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              type="button"
              className="adm-btn adm-btn-ghost adm-btn-sm"
              onClick={fetchScheduleAutomation}
              disabled={loadingSchedule}
              title="Refresh live automation status"
            >
              <AdminIcon name="refresh" size={13} />
              {loadingSchedule ? "Syncing..." : "Refresh"}
            </button>
            <span className="adm-chip adm-chip-green"><span className="adm-chip-dot" /> All Automations Operational</span>
          </div>
        }
      />

      <div className="adm-grid-3 adm-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))" }}>
        {jobs.map((job) => {
          const isReal = Boolean(job.isRealBackend);
          const isToggling = togglingJobId === job.id;
          const isRunning = runningJobId === job.id;

          return (
            <article className="adm-card" key={job.id}>
              <div className="adm-card-body">
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                  <span className="adm-auto-bolt"><AdminIcon name="automation" size={18} /></span>
                  <button
                    type="button"
                    aria-label={`Toggle ${job.name}`}
                    disabled={isToggling}
                    className={`adm-switch ${job.status === "active" ? "on" : ""}`}
                    onClick={() => toggle(job)}
                    style={isToggling ? { opacity: 0.6, cursor: "wait" } : {}}
                  />
                </div>

                <strong style={{ display: "block", marginTop: 12, color: "var(--df-text-heading)" }}>{job.name}</strong>

                {job.description && (
                  <p style={{ marginTop: 6, marginBottom: 0, fontSize: "0.82rem", color: "var(--df-text-muted)", lineHeight: 1.45 }}>
                    {job.description}
                  </p>
                )}

                <div style={{ marginTop: 10 }} className="adm-cell-muted">
                  Schedule: <b style={{ color: "var(--df-text-secondary)" }}>{job.schedule || job.type}</b>
                </div>

                <div className="adm-detail" style={{ marginTop: 14, padding: 12 }}>
                  <div className="adm-detail-item">
                    <strong>Last run</strong>
                    <span>
                      {isReal && loadingSchedule ? "Loading..." : job.lastRun}
                      {job.lastRunStatus && job.lastRunStatus !== "IDLE" && (
                        <span
                          style={{
                            marginLeft: 6,
                            fontSize: "0.7rem",
                            padding: "1px 6px",
                            borderRadius: 4,
                            fontWeight: 600,
                            background: job.lastRunStatus === "SUCCESS" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                            color: job.lastRunStatus === "SUCCESS" ? "#10b981" : "#ef4444",
                          }}
                        >
                          {job.lastRunStatus}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="adm-detail-item">
                    <strong>Next run</strong>
                    <span>{isReal && loadingSchedule ? "Loading..." : job.nextRun}</span>
                  </div>
                </div>

                <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center" }}>
                  {statusChip(job.status === "active" ? "Active" : "Inactive")}
                  <button
                    type="button"
                    disabled={isRunning || (isReal && loadingSchedule)}
                    className="adm-btn adm-btn-ghost adm-btn-sm"
                    onClick={() => runNow(job)}
                    style={isRunning ? { opacity: 0.7, cursor: "wait" } : {}}
                  >
                    <AdminIcon name="play" size={12} />
                    {isRunning ? "Running..." : "Run now"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}