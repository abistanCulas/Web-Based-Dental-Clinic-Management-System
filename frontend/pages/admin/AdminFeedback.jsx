import { useState, useMemo, useEffect } from "react";
import StatCard from "../../components/common/StatCard";
import { Breadcrumbs, TabPills, SearchBar, Modal, EmptyState } from "../../components/dashboard/DashboardPrimitives";
import { useDashboardData } from "../../context/DashboardDataContext";
import { useNotifications } from "../../context/NotificationContext";
import feedbackApi, { normalizeFeedback } from "../../api/feedback";
import dentistApi from "../../api/dentists";
import patientApi from "../../api/patients";

export default function AdminFeedback({ role = "admin" }) {
  const { collections, saveRecord } = useDashboardData();
  const { addToast } = useNotifications();

  const [activeRatingTab, setActiveRatingTab] = useState("all");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [respondingTo, setRespondingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [realReviews, setRealReviews] = useState([]);
  const [dentistsList, setDentistsList] = useState([]);

  const fetchFeedback = async () => {
    try {
      const [backendFeedback, dentists, patients] = await Promise.all([
        feedbackApi.getAllFeedback().catch(() => []),
        dentistApi.getAllDentists().catch(() => []),
        patientApi.getAllPatients().catch(() => []),
      ]);
      setDentistsList(Array.isArray(dentists) ? dentists : []);
      const dLookup = {};
      dentists.forEach((d) => { dLookup[d.id] = d; });
      const pLookup = {};
      patients.forEach((p) => { pLookup[p.id] = p; });

      setRealReviews(Array.isArray(backendFeedback) ? backendFeedback.map((f) => normalizeFeedback(f, dLookup, pLookup)) : []);
    } catch (err) {
      console.warn("Could not load backend feedback:", err);
      setRealReviews([]);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      feedbackApi.getAllFeedback().catch(() => []),
      dentistApi.getAllDentists().catch(() => []),
      patientApi.getAllPatients().catch(() => []),
    ]).then(([backendFeedback, dentists, patients]) => {
      if (!active) return;
      setDentistsList(Array.isArray(dentists) ? dentists : []);
      const dLookup = {};
      dentists.forEach((d) => { dLookup[d.id] = d; });
      const pLookup = {};
      patients.forEach((p) => { pLookup[p.id] = p; });

      setRealReviews(Array.isArray(backendFeedback) ? backendFeedback.map((f) => normalizeFeedback(f, dLookup, pLookup)) : []);
    });
    return () => {
      active = false;
    };
  }, []);

  const reviews = realReviews;

  const filteredReviews = useMemo(() => {
    return reviews.filter((rev) => {
      const matchesRating =
        activeRatingTab === "all" ||
        (activeRatingTab === "5" && rev.rating === 5) ||
        (activeRatingTab === "4" && rev.rating === 4) ||
        (activeRatingTab === "3below" && rev.rating <= 3);

      const matchesDoctor = doctorFilter === "all" || rev.doctor === doctorFilter;

      const matchesSearch =
        !query ||
        rev.name?.toLowerCase().includes(query.toLowerCase()) ||
        rev.text?.toLowerCase().includes(query.toLowerCase()) ||
        rev.doctor?.toLowerCase().includes(query.toLowerCase());

      return matchesRating && matchesDoctor && matchesSearch;
    });
  }, [reviews, activeRatingTab, doctorFilter, query]);

  const avgRating = useMemo(() => {
    return reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / reviews.length).toFixed(1) + " / 5.0"
      : "No ratings";
  }, [reviews]);

  const handleAcknowledge = async (rev) => {
    try {
      if (rev.raw?.id) {
        await feedbackApi.approveFeedback(rev.raw.id);
        addToast(`Feedback #${rev.raw.id} approved/published successfully`, "success");
        await fetchFeedback();
        return;
      }
    } catch (err) {
      console.warn("Backend feedback acknowledge failed:", err);
    }
    const updated = {
      ...rev,
      status: rev.status === "acknowledged" ? "published" : "acknowledged",
    };
    saveRecord("feedback", updated);
    setRealReviews((prev) => prev.map((r) => (r.id === rev.id ? updated : r)));
    addToast(`Feedback from ${rev.name} marked as ${updated.status}`, "success");
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      if (respondingTo?.raw?.id) {
        await feedbackApi.respondToFeedback(respondingTo.raw.id, replyText.trim(), "Clinic Admin");
        addToast(`Official clinic response saved for Feedback #${respondingTo.raw.id}!`, "success");
        setRespondingTo(null);
        setReplyText("");
        await fetchFeedback();
        return;
      }
    } catch (err) {
      console.warn("Backend feedback response failed:", err);
    }

    const updated = {
      ...respondingTo,
      adminReply: replyText.trim(),
      replyDate: new Date().toISOString().slice(0, 10),
      status: "acknowledged",
    };
    saveRecord("feedback", updated);
    setRealReviews((prev) => prev.map((r) => (r.id === respondingTo.id ? updated : r)));
    addToast(`Official clinic response sent to ${respondingTo.name}!`, "success");
    setRespondingTo(null);
    setReplyText("");
  };

  return (
    <div className="df-role-page df-role-blue">
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Feedback & Complaints" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Quality Assurance & Patient Satisfaction</span>
          <h1>Patient Feedback & Clinical Complaints</h1>
          <p>Inspect clinic satisfaction ratings, review patient testimonials, and address triage complaints.</p>
        </div>
      </header>

      <div className="df-stat-grid">
        <StatCard label="Overall Satisfaction" value={avgRating} icon="★" color="warning" />
        <StatCard label="Total Feedback Logs" value={String(reviews.length)} icon="◫" color="primary" />
        <StatCard
          label="5-Star Ratings"
          value={String(reviews.filter((r) => r.rating === 5).length)}
          icon="✓"
          color="success"
        />
        <StatCard
          label="Action Required"
          value={String(reviews.filter((r) => r.rating <= 3 || !r.adminReply).length)}
          icon="◷"
          color="warning"
        />
      </div>

      <TabPills
        tabs={[
          { label: "All Reviews", value: "all", count: reviews.length },
          { label: "5 Stars", value: "5", count: reviews.filter((r) => r.rating === 5).length },
          { label: "4 Stars", value: "4", count: reviews.filter((r) => r.rating === 4).length },
          { label: "3 Stars & Below", value: "3below", count: reviews.filter((r) => r.rating <= 3).length },
        ]}
        activeTab={activeRatingTab}
        onChange={setActiveRatingTab}
      />

      <section className="df-card" style={{ marginBottom: 24 }}>
        <div className="df-card-body">
          <div className="df-toolbar">
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="Search feedback by patient, dentist, or keyword..."
            />
            <label className="df-filter-control">
              <span>Filter by Doctor</span>
              <select className="df-select" value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)}>
                <option value="all">All Attending Dentists</option>
                {dentistsList.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {filteredReviews.length === 0 ? (
            <EmptyState
              title="No patient reviews found"
              message="Try adjusting your rating filter, doctor selector, or search term."
            />
          ) : (
            <div style={{ display: "grid", gap: 16 }}>
              {filteredReviews.map((rev) => (
                <div key={rev.id} className="df-card" style={{ border: "1px solid var(--df-border)" }}>
                  <div className="df-card-body">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 16,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <strong style={{ fontSize: 16 }}>{rev.name}</strong>
                          <span className="df-badge df-badge-primary">
                            {"★".repeat(rev.rating || 5)}{"☆".repeat(Math.max(0, 5 - (rev.rating || 5)))}
                          </span>
                          <span
                            className={`df-badge ${
                              rev.status === "acknowledged" ? "df-badge-success" : "df-badge-warning"
                            }`}
                          >
                            {rev.status || "new"}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: "var(--df-text-secondary)", marginTop: 4 }}>
                          Attending Dentist: <strong>{rev.doctor || "Clinical Team"}</strong> · Date: {rev.date || "Recent"}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="df-btn df-btn-secondary df-btn-sm"
                          onClick={() => {
                            setRespondingTo(rev);
                            setReplyText(rev.adminReply || "");
                          }}
                        >
                          💬 {rev.adminReply ? "Edit Reply" : "Respond"}
                        </button>
                        <button
                          className="df-btn df-btn-ghost df-btn-sm"
                          onClick={() => handleAcknowledge(rev)}
                        >
                          {rev.status === "acknowledged" ? "Mark as New" : "✓ Acknowledge"}
                        </button>
                      </div>
                    </div>

                    <p style={{ margin: "14px 0 0", fontSize: 14, lineHeight: 1.5, color: "var(--df-text)" }}>
                      "{rev.text}"
                    </p>

                    {rev.adminReply && (
                      <div
                        style={{
                          marginTop: 14,
                          padding: "12px 16px",
                          borderRadius: "var(--df-radius-sm)",
                          background: "var(--df-primary-50)",
                          borderLeft: "3px solid var(--df-primary-500)",
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--df-primary-600)", marginBottom: 4 }}>
                          Clinic Response · {rev.replyDate || "Recently"}
                        </div>
                        <div style={{ fontSize: 13, color: "var(--df-text)" }}>{rev.adminReply}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {respondingTo && (
        <Modal
          title={`Respond to ${respondingTo.name}`}
          onClose={() => setRespondingTo(null)}
          footer={
            <>
              <button className="df-btn df-btn-secondary" onClick={() => setRespondingTo(null)}>
                Cancel
              </button>
              <button className="df-btn df-btn-primary" onClick={handleSendReply}>
                Post Official Response
              </button>
            </>
          }
        >
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: "var(--df-text-secondary)" }}>
              Patient comment: <em>"{respondingTo.text}"</em>
            </p>
          </div>
          <form onSubmit={handleSendReply}>
            <div className="df-form-group">
              <label className="df-label">Official Clinic Response *</label>
              <textarea
                className="df-input"
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Thank you for your feedback. Our clinical quality team has reviewed your remarks..."
                required
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
