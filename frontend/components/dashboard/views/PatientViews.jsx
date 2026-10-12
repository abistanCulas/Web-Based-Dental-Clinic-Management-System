import { useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import StatCard from "../../common/StatCard";
import { Breadcrumbs, ConfirmationDialog, DataTable, EmptyState, Modal, TabPills } from "../DashboardPrimitives";
import { useDashboardData } from "../../../context/DashboardDataContext";
import { useNotifications } from "../../../context/NotificationContext";
import { useAuth } from "../../../context/AuthContext";
import { appointmentApi, normalizeAppointment, formatTime24Hour, addMinutesToIsoTime } from "../../../api/appointments";
import { patientApi } from "../../../api/patients";
import { dentistApi } from "../../../api/dentists";
import { billingApi, normalizeBill, formatLkr, parseLkr, mapPaymentMethodToBackend, getReceiptStatusConfig } from "../../../api/billing";
import { pharmacyApi, normalizePrescription } from "../../../api/pharmacy";
import medicalRecordsApi, { normalizeMedicalRecord } from "../../../api/medicalRecords";
import treatmentPlanApi, { normalizeTreatmentPlan } from "../../../api/treatmentPlans";
import reviewsApi from "../../../api/reviews";
import feedbackApi from "../../../api/feedback";

export function PatientPrescriptionsView({ role }) {
  const { addToast } = useNotifications();
  const { user } = useAuth();
  const [refillModal, setRefillModal] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchPrescriptions = async () => {
      try {
        setLoading(true);
        let patientId = user?.patientId;
        if (!patientId && user?.id) {
          const p = await patientApi.getPatientByUserId(user.id).catch(() => null);
          if (p) patientId = p.id;
        }

        const [dentists, backendRxs] = await Promise.all([
          dentistApi.getAllDentists().catch(() => []),
          patientId ? pharmacyApi.getPatientPrescriptions(patientId).catch(() => []) : [],
        ]);

        if (!isMounted) return;

        if (backendRxs.length > 0) {
          const dLookup = {};
          dentists.forEach((d) => {
            dLookup[d.id] = d;
          });
          const pLookup = { [patientId]: { name: user?.name || "Patient" } };

          const normalized = await Promise.all(
            backendRxs.map(async (rx) => {
              const items = await pharmacyApi.getPrescriptionItems(rx.id).catch(() => []);
              return normalizePrescription(rx, pLookup, dLookup, items);
            })
          );
          if (isMounted) setPrescriptions(normalized);
        } else {
          setPrescriptions([]);
        }
      } catch (err) {
        console.warn("Could not load backend patient prescriptions:", err);
        if (isMounted) setPrescriptions([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPrescriptions();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const activeCount = prescriptions.filter((p) => p.status !== "dispensed" && p.rawStatus !== "COMPLETED").length;
  const dispensedCount = prescriptions.filter((p) => p.status === "dispensed" || p.rawStatus === "COMPLETED").length;
  const pharmacyStatus = activeCount > 0 ? "Pending Dispense" : (prescriptions.length > 0 ? "Dispensed" : "None Active");

  const handleRequestRefill = (rx) => {
    addToast(`Refill request sent to pharmacy for ${rx.id}!`, "success");
    setRefillModal(null);
  };

  return (
    <div className={`df-role-page df-role-blue`}>
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Prescriptions" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Medical Prescriptions</span>
          <h1>My Active Prescriptions & Medications</h1>
          <p>Digital medical prescriptions issued by your attending dental surgeons.</p>
        </div>
      </header>

      <div className="df-stat-grid">
        <StatCard label="Total Prescriptions" value={String(prescriptions.length)} icon="◫" color="primary" />
        <StatCard label="Active Medications" value={String(activeCount)} icon="✓" color="success" />
        <StatCard label="Refills Available" value={String(dispensedCount)} icon="◷" color="primary" />
        <StatCard label="Pharmacy Status" value={pharmacyStatus} icon="◈" color="primary" />
      </div>

      {loading ? (
        <div className="df-loading-card" style={{ padding: 24, textAlign: "center" }}>
          <p>Loading your medical prescriptions...</p>
        </div>
      ) : prescriptions.length === 0 ? (
        <EmptyState
          title="No Prescriptions Available"
          description="No prescriptions available yet."
          icon="◈"
        />
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {prescriptions.map((rx) => (
            <div key={rx.id} className="df-rx-card">
              <div className="df-rx-header">
                <div>
                  <span className="df-badge df-badge-primary" style={{ marginBottom: 6 }}>{rx.id}</span>
                  <div className="df-rx-doctor">{rx.doctor}</div>
                  <small style={{ color: "var(--df-text-muted)" }}>Issued Date: {rx.date}</small>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className={`df-badge df-badge-${rx.status === "dispensed" ? "success" : "warning"}`}>
                    {rx.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div>
                <strong style={{ fontSize: 13, color: "var(--df-text-heading)" }}>Prescribed Medicines:</strong>
                <div className="df-med-badge-row">
                  {(rx.medicines || [{ name: rx.medicine || "Amoxicillin 500mg", dosage: "1 tab", freq: "3x daily", duration: "7 days" }]).map((med, idx) => (
                    <div key={idx} className="df-med-badge">
                      <strong>{med.name}</strong> · {med.dosage || "1 tab"} ({med.freq || "3x daily"}) - {med.duration || "5 days"}
                    </div>
                  ))}
                </div>
              </div>

              <p style={{ fontSize: 13, color: "var(--df-text-secondary)", marginTop: 8, background: "var(--df-gray-50)", padding: 10, borderRadius: 6 }}>
                <strong>Instructions:</strong> {rx.instructions || "Take with meals. Complete entire antibiotic course."}
              </p>

              <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end" }}>
                <button
                  className="df-btn df-btn-secondary df-btn-sm"
                  onClick={() => addToast(`Prescription ${rx.id} downloaded (PDF)`, "info")}
                >
                  Download PDF
                </button>
                <button
                  className="df-btn df-btn-primary df-btn-sm"
                  onClick={() => setRefillModal(rx)}
                >
                  Request Refill
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {refillModal && (
        <Modal
          title={`Request Refill: ${refillModal.id}`}
          onClose={() => setRefillModal(null)}
          footer={
            <>
              <button className="df-btn df-btn-secondary" onClick={() => setRefillModal(null)}>
                Cancel
              </button>
              <button className="df-btn df-btn-primary" onClick={() => handleRequestRefill(refillModal)}>
                Confirm Refill Request
              </button>
            </>
          }
        >
          <p>
            You are requesting a renewal for <strong>{refillModal.medicine || "prescribed medicines"}</strong> from <strong>{refillModal.doctor}</strong>.
          </p>
          <div className="df-form-group" style={{ marginTop: 14 }}>
            <label className="df-label">Note for the Pharmacist (Optional)</label>
            <input className="df-input" placeholder="e.g. Need 3 extra days before traveling" />
          </div>
        </Modal>
      )}
    </div>
  );
}

export function PatientReviewsView({ role }) {
  const { addToast } = useNotifications();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [rating, setRating] = useState(5);
  const [selectedDentistId, setSelectedDentistId] = useState("");
  const [comment, setComment] = useState("");
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState("");
  const [publicReviews, setPublicReviews] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const reloadReviews = async () => {
    try {
      const [pubReviews, ownReviews, allDentists] = await Promise.all([
        reviewsApi.getPublicReviews().catch(() => []),
        reviewsApi.getMyReviews().catch(() => []),
        dentistApi.getAllDentists().catch(() => []),
      ]);
      setPublicReviews(Array.isArray(pubReviews) ? pubReviews : []);
      setMyReviews(Array.isArray(ownReviews) ? ownReviews : []);
      if (Array.isArray(allDentists) && allDentists.length > 0) {
        setDentists(allDentists);
        if (!selectedDentistId) {
          setSelectedDentistId(allDentists[0].id);
        }
      }
    } catch (err) {
      console.warn("Could not reload reviews:", err);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      reviewsApi.getPublicReviews().catch(() => []),
      reviewsApi.getMyReviews().catch(() => []),
      dentistApi.getAllDentists().catch(() => []),
    ]).then(([pubReviews, ownReviews, allDentists]) => {
      if (!active) return;
      setPublicReviews(Array.isArray(pubReviews) ? pubReviews : []);
      setMyReviews(Array.isArray(ownReviews) ? ownReviews : []);
      if (Array.isArray(allDentists) && allDentists.length > 0) {
        setDentists(allDentists);
        setSelectedDentistId(allDentists[0].id);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const displayReviews = useMemo(() => {
    if (activeTab === "mine") return myReviews;
    return publicReviews;
  }, [activeTab, myReviews, publicReviews]);

  const avgRating = publicReviews.length > 0
    ? (publicReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / publicReviews.length).toFixed(1)
    : "—";

  const handleAddReview = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      addToast("Please share a brief comment about your experience.", "warning");
      return;
    }
    if (rating < 1 || rating > 5) {
      addToast("Rating must be between 1 and 5 stars.", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const dentistId = selectedDentistId || dentists[0]?.id || 1;
      const dentistIdNum = dentistId ? Number(dentistId) : null;

      // 1. Submit to Feedback API (Existing Feedback system for Admin Feedback & Reviews)
      await feedbackApi.createFeedback({
        rating,
        comment: comment.trim(),
        dentistId: dentistIdNum,
        category: "CLINICAL",
      });

      // 2. Also submit to Reviews API (for public patient testimonials)
      try {
        await reviewsApi.createReview({
          dentistId: dentistIdNum,
          rating,
          comment: comment.trim(),
        });
      } catch (reviewErr) {
        console.warn("Public review sync notice:", reviewErr);
      }

      addToast("Thank you! Your feedback has been submitted successfully.", "success");
      setModalOpen(false);
      setComment("");
      setRating(5);
      await reloadReviews();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to submit review";
      addToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (rev) => {
    setEditingReview(rev);
    setEditRating(rev.rating || 5);
    setEditComment(rev.comment || rev.text || "");
  };

  const handleUpdateReview = async (e) => {
    e.preventDefault();
    if (!editComment.trim()) {
      addToast("Comment cannot be empty.", "warning");
      return;
    }
    setSubmitting(true);
    try {
      await reviewsApi.updateReview(editingReview.id, {
        rating: editRating,
        comment: editComment.trim(),
      });
      addToast("Your review has been updated successfully!", "success");
      setEditingReview(null);
      await reloadReviews();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to update review";
      addToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    try {
      await reviewsApi.deleteReview(reviewId);
      addToast("Your review has been deleted.", "info");
      await reloadReviews();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to delete review";
      addToast(msg, "error");
    }
  };

  const isOwnReview = (rev) => {
    if (activeTab === "mine") return true;
    if (myReviews.some((m) => m.id === rev.id)) return true;
    if (user?.email && rev.patientEmail === user.email) return true;
    return false;
  };

  return (
    <div className={`df-role-page df-role-blue`}>
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Reviews & Feedback" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Patient Experience</span>
          <h1>Reviews & Patient Feedback</h1>
          <p>Share your treatment experience with our dental surgeons and clinic staff. Published immediately to the clinic portal.</p>
        </div>
        <button className="df-btn df-btn-primary" onClick={() => setModalOpen(true)}>
          ★ Write a Review
        </button>
      </header>

      <div className="df-stat-grid">
        <StatCard
          label="Overall Rating"
          value={avgRating !== "—" ? `${avgRating} / 5.0` : "No ratings"}
          icon="★"
          color="warning"
        />
        <StatCard
          label="Clinic Reviews"
          value={String(publicReviews.length)}
          icon="◫"
          color="primary"
        />
        <StatCard
          label="My Submitted Reviews"
          value={String(myReviews.length)}
          icon="✓"
          color="success"
        />
        <StatCard
          label="Review Status"
          value={myReviews.length > 0 ? "Active" : "No submissions"}
          icon="◈"
          color="primary"
        />
      </div>

      <TabPills
        tabs={[
          { label: "All Clinic Reviews", value: "all", count: publicReviews.length },
          { label: "My Reviews", value: "mine", count: myReviews.length },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <div style={{ display: "grid", gap: 16 }}>
        {displayReviews.length === 0 ? (
          <EmptyState
            title={activeTab === "mine" ? "No Reviews Submitted Yet" : "No Clinic Reviews Available"}
            description={
              activeTab === "mine"
                ? "You haven't submitted any reviews yet. Share your experience by clicking 'Write a Review'."
                : "No patient reviews have been published yet."
            }
            actionLabel={activeTab === "mine" ? "Write a Review" : undefined}
            onAction={activeTab === "mine" ? () => setModalOpen(true) : undefined}
            icon="★"
          />
        ) : (
          displayReviews.map((rev) => {
            const own = isOwnReview(rev);
            return (
              <div key={rev.id} className="df-card">
                <div className="df-card-body">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong style={{ fontSize: 15 }}>{rev.patientName || rev.name}</strong>
                        {own && (
                          <span className="df-badge df-badge-primary" style={{ fontSize: 11, padding: "2px 8px" }}>
                            You
                          </span>
                        )}
                        <span className="df-badge df-badge-success" style={{ fontSize: 11, padding: "2px 8px" }}>
                          ACTIVE
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--df-text-secondary)", marginTop: 2 }}>
                        Attending Dentist: <strong>{rev.dentistName || rev.doctor || "Dental Specialist"}</strong> · {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : (rev.date || "Recent")}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ color: "#f59e0b", fontSize: 18, letterSpacing: 2 }}>
                        {"★".repeat(rev.rating || 5)}{"☆".repeat(5 - (rev.rating || 5))}
                      </div>
                      {own && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            className="df-btn df-btn-secondary df-btn-sm"
                            style={{ padding: "4px 10px", fontSize: 12 }}
                            onClick={() => handleStartEdit(rev)}
                          >
                            Edit
                          </button>
                          <button
                            className="df-btn df-btn-sm"
                            style={{ padding: "4px 10px", fontSize: 12, background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5" }}
                            onClick={() => handleDeleteReview(rev.id)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <p style={{ color: "var(--df-text-secondary)", fontStyle: "italic", lineHeight: 1.6, margin: 0 }}>
                    "{rev.comment || rev.text}"
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Review Modal */}
      {modalOpen && (
        <Modal
          title="Write a Dental Care Review"
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="df-btn df-btn-secondary" onClick={() => setModalOpen(false)} disabled={submitting}>
                Cancel
              </button>
              <button className="df-btn df-btn-primary" onClick={handleAddReview} disabled={submitting}>
                {submitting ? "Publishing..." : "Publish Review"}
              </button>
            </>
          }
        >
          <div className="df-form-group">
            <label className="df-label">Select Attending Dentist</label>
            <select
              className="df-select"
              value={selectedDentistId}
              onChange={(e) => setSelectedDentistId(e.target.value)}
            >
              {dentists.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name || `Dr. ${d.firstName} ${d.lastName}`} ({d.specialization || "General Dentistry"})
                </option>
              ))}
            </select>
          </div>

          <div className="df-form-group" style={{ marginTop: 14 }}>
            <label className="df-label">Your Rating (1 - 5 Stars)</label>
            <div className="df-star-selector" style={{ fontSize: 28, cursor: "pointer" }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  style={{ color: star <= rating ? "#f59e0b" : "#d1d5db", marginRight: 4 }}
                  onClick={() => setRating(star)}
                >
                  ★
                </span>
              ))}
            </div>
          </div>

          <div className="df-form-group" style={{ marginTop: 14 }}>
            <label className="df-label">Your Experience / Feedback *</label>
            <textarea
              className="df-input"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us about your dental consultation, gentle care, comfort, or staff friendliness..."
              required
            />
          </div>
          <small style={{ color: "var(--df-text-muted)", display: "block", marginTop: 8 }}>
            ✓ Note: Your review will be activated and visible immediately to the clinic community without waiting for administrator approval.
          </small>
        </Modal>
      )}

      {/* Edit Review Modal */}
      {editingReview && (
        <Modal
          title="Edit Your Review"
          onClose={() => setEditingReview(null)}
          footer={
            <>
              <button className="df-btn df-btn-secondary" onClick={() => setEditingReview(null)} disabled={submitting}>
                Cancel
              </button>
              <button className="df-btn df-btn-primary" onClick={handleUpdateReview} disabled={submitting}>
                {submitting ? "Saving..." : "Update Review"}
              </button>
            </>
          }
        >
          <div className="df-form-group">
            <label className="df-label">Attending Dentist</label>
            <input
              className="df-input"
              value={editingReview.dentistName || editingReview.doctor || "Dental Specialist"}
              disabled
              style={{ background: "var(--df-gray-100)" }}
            />
          </div>

          <div className="df-form-group" style={{ marginTop: 14 }}>
            <label className="df-label">Your Rating (1 - 5 Stars)</label>
            <div className="df-star-selector" style={{ fontSize: 28, cursor: "pointer" }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  style={{ color: star <= editRating ? "#f59e0b" : "#d1d5db", marginRight: 4 }}
                  onClick={() => setEditRating(star)}
                >
                  ★
                </span>
              ))}
            </div>
          </div>

          <div className="df-form-group" style={{ marginTop: 14 }}>
            <label className="df-label">Your Experience / Feedback *</label>
            <textarea
              className="df-input"
              rows={4}
              value={editComment}
              onChange={(e) => setEditComment(e.target.value)}
              placeholder="Update your review feedback..."
              required
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

export function PatientRecordsView({ role }) {
  const { user } = useAuth();
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [apiRecords, setApiRecords] = useState([]);
  const [apiPlans, setApiPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchRecords = async () => {
      try {
        setLoading(true);
        let patientId = user?.patientId;
        if (!patientId && user?.id) {
          const p = await patientApi.getPatientByUserId(user.id).catch(() => null);
          if (p) patientId = p.id;
        }

        const [dentists, backendRecords, backendPlans] = await Promise.all([
          dentistApi.getAllDentists().catch(() => []),
          patientId ? medicalRecordsApi.getPatientMedicalRecords(patientId).catch(() => []) : [],
          patientId ? treatmentPlanApi.getPatientTreatmentPlans(patientId).catch(() => []) : [],
        ]);

        if (!active) return;
        const dLookup = {};
        dentists.forEach((d) => {
          dLookup[d.id] = d;
        });
        const pLookup = { [patientId]: { name: user?.name || "Me" } };

        if (backendRecords.length > 0) {
          const normalizedRecs = backendRecords.map((r) => normalizeMedicalRecord(r, pLookup, dLookup));
          setApiRecords(normalizedRecs);
        } else {
          setApiRecords([]);
        }

        if (backendPlans.length > 0) {
          const normalizedPlans = backendPlans.map((p) => normalizeTreatmentPlan(p, pLookup, dLookup));
          setApiPlans(normalizedPlans);
        } else {
          setApiPlans([]);
        }
      } catch (err) {
        console.warn("Could not load patient medical records:", err);
        if (active) {
          setApiRecords([]);
          setApiPlans([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchRecords();
    return () => {
      active = false;
    };
  }, [user]);

  const location = useLocation();
  useEffect(() => {
    if ((location.state?.recordId || location.state?.selectedId) && apiRecords.length > 0) {
      const targetId = location.state.recordId || location.state.selectedId;
      const found = apiRecords.find(
        (r) => r.id === targetId || String(r.id) === String(targetId) || r.code === targetId
      );
      if (found) {
        setSelectedRecord(found);
      }
    }
  }, [location.state, apiRecords]);

  const records = apiRecords;
  const plans = apiPlans;
  const rayCount = records.filter((r) => (r.attachments && r.attachments !== "None") || r.type === "Radiograph" || r.type === "X-Ray" || (r.raw?.recordType || "").includes("RADIO")).length;
  const treatCount = records.filter((r) => r.type === "Treatment" || (r.raw?.recordType || "").includes("TREAT")).length;

  return (
    <div className={`df-role-page df-role-blue`}>
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Medical Records" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Health History</span>
          <h1>Dental Medical Records & Diagnostics</h1>
          <p>Complete clinical chart, diagnostic examinations, and past dental procedures.</p>
        </div>
      </header>

      <div className="df-stat-grid">
        <StatCard label="Total Records" value={String(records.length)} icon="◫" color="primary" />
        <StatCard label="Diagnostic X-Rays" value={`${rayCount} File${rayCount === 1 ? "" : "s"}`} icon="◈" color="primary" />
        <StatCard label="Treatment Plans" value={`${plans.length} Active`} icon="✓" color="success" />
        <StatCard label="Completed Procedures" value={`${treatCount} Done`} icon="◷" color="primary" />
      </div>

      {plans.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <strong style={{ fontSize: 16, color: "var(--df-text-heading)", display: "block", marginBottom: 12 }}>
            Active Treatment Plans
          </strong>
          <div style={{ display: "grid", gap: 12 }}>
            {plans.map((plan) => (
              <div key={plan.id} className="df-card">
                <div className="df-card-body" style={{ padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <div>
                      <span className="df-badge df-badge-primary" style={{ marginRight: 8 }}>{plan.id}</span>
                      <strong style={{ fontSize: 15 }}>{plan.procedure}</strong>
                      <div style={{ fontSize: 12, color: "var(--df-text-muted)", marginTop: 4 }}>
                        Attending Specialist: <strong>{plan.doctor}</strong> · Estimate: <strong>{plan.estimatedCost}</strong>
                      </div>
                    </div>
                    <span className="df-badge df-badge-teal">{plan.stage}</span>
                  </div>
                  {plan.description && (
                    <p style={{ fontSize: 13, color: "var(--df-text-secondary)", marginTop: 6, margin: 0 }}>
                      {plan.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="df-loading-card" style={{ padding: 24, textAlign: "center" }}>
          <p>Loading your clinical medical records...</p>
        </div>
      ) : records.length === 0 ? (
        <EmptyState
          title="No Medical Records Available"
          description="No medical records available yet."
          icon="◈"
        />
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {records.map((rec) => (
            <div key={rec.id} className="df-card" style={{ transition: "all var(--df-transition)" }}>
              <div className="df-card-body">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <span className="df-badge df-badge-primary" style={{ marginRight: 8 }}>{rec.type || "Clinical"}</span>
                    <strong style={{ fontSize: 16 }}>{rec.title}</strong>
                  </div>
                  <small style={{ color: "var(--df-text-muted)" }}>📅 {rec.date}</small>
                </div>
                <p style={{ color: "var(--df-text-secondary)", fontSize: 13, marginBottom: 12 }}>
                  Attending Specialist: <strong>{rec.doctor}</strong>
                </p>
                <div style={{ background: "var(--df-gray-50)", padding: 12, borderRadius: 8, fontSize: 13, color: "var(--df-text)" }}>
                  {rec.notes}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                  <button className="df-btn df-btn-secondary df-btn-sm" onClick={() => setSelectedRecord(rec)}>
                    {rec.attachments && rec.attachments !== "None" ? "Inspect Details & Radiograph" : "Inspect Details"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRecord && (
        <Modal
          title={`Clinical Record: ${selectedRecord.title}`}
          onClose={() => setSelectedRecord(null)}
          footer={
            <button className="df-btn df-btn-primary" onClick={() => setSelectedRecord(null)}>
              Done
            </button>
          }
        >
          <div className="df-form-2col">
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Record Type</small>
              <div style={{ fontWeight: 600 }}>{selectedRecord.type}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Examination Date</small>
              <div style={{ fontWeight: 600 }}>{selectedRecord.date}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Attending Dentist</small>
              <div style={{ fontWeight: 600 }}>{selectedRecord.doctor}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Facility</small>
              <div style={{ fontWeight: 600 }}>DentaFlow Suite 101</div>
            </div>
          </div>

          <div style={{ marginTop: 16, padding: 14, background: "var(--df-gray-50)", borderRadius: 8 }}>
            <strong>Specialist Notes:</strong>
            <p style={{ marginTop: 6, color: "var(--df-text-secondary)", lineHeight: 1.6 }}>{selectedRecord.notes}</p>
          </div>

          {selectedRecord.attachments && selectedRecord.attachments !== "None" ? (
            <div style={{ marginTop: 16, border: "1px dashed var(--df-border)", padding: 16, borderRadius: 8, textAlign: "center", background: "var(--df-gray-50)" }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>🩻</div>
              <strong>{selectedRecord.attachments}</strong>
              <p style={{ fontSize: 12, color: "var(--df-text-muted)", marginTop: 4 }}>
                High-resolution radiograph stored securely on HIPAA-compliant cloud storage.
              </p>
            </div>
          ) : (
            <div style={{ marginTop: 16, border: "1px dashed var(--df-border)", padding: 16, borderRadius: 8, textAlign: "center", background: "var(--df-gray-50)" }}>
              <p style={{ fontSize: 13, color: "var(--df-text-muted)", margin: 0 }}>
                No radiograph or attachment was added to this clinical record.
              </p>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

export function PatientAppointmentsView({ role, isHistory = false }) {
  const { user } = useAuth();
  const { addToast } = useNotifications();
  const [activeTab, setActiveTab] = useState(isHistory ? "completed" : "upcoming");
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [cancelDialog, setCancelDialog] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("10:00 AM");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawAppointments, setRawAppointments] = useState([]);
  const [bookingWindow, setBookingWindow] = useState(null);

  const fetchAppointments = async () => {
    try {
      setError(null);

      // 1. Load dentists for name/specialty lookup
      const dentistList = await dentistApi.getAllDentists();
      const dLookup = {};
      dentistList.forEach((d) => {
        dLookup[d.id] = d;
      });

      // 2. Load booking window constraints
      try {
        const bw = await appointmentApi.getBookingWindow();
        setBookingWindow(bw);
      } catch (err) {
        console.warn("Could not load booking window:", err);
      }

      // 3. Resolve authenticated patient ID
      let patientId = null;
      if (user?.id) {
        const p = await patientApi.getPatientByUserId(user.id);
        if (p) patientId = p.id;
      }

      if (patientId) {
        const [appts, upcomingAppts] = await Promise.all([
          appointmentApi.getPatientAppointments(patientId),
          appointmentApi.getPatientUpcomingAppointments(patientId).catch(() => []),
        ]);
        const pLookup = { [patientId]: { name: user?.name || "Patient" } };
        const source = appts.length > 0 ? appts : upcomingAppts;
        const normalized = source.map((a) => normalizeAppointment(a, dLookup, pLookup));
        setRawAppointments(normalized);
      } else {
        setRawAppointments([]);
      }
    } catch (err) {
      console.error("Error loading patient appointments:", err);
      setError(err.response?.data?.message || err.response?.data || "Unable to load appointments from server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    async function init() {
      await fetchAppointments();
      if (!active) return;
    }
    init();
    return () => { active = false; };
  }, [user?.id]);

  const appointments = rawAppointments;

  const upcoming = useMemo(
    () => appointments.filter((a) => a.status === "confirmed" || a.status === "booked" || a.status === "rescheduled" || a.status === "pending"),
    [appointments]
  );
  const completed = useMemo(
    () => appointments.filter((a) => a.status === "completed"),
    [appointments]
  );
  const cancelled = useMemo(
    () => appointments.filter((a) => a.status === "cancelled" || a.status === "no_show"),
    [appointments]
  );

  const filtered = useMemo(() => {
    if (activeTab === "all") return appointments;
    if (activeTab === "upcoming") return upcoming;
    if (activeTab === "completed") return completed;
    if (activeTab === "cancelled") return cancelled;
    return appointments;
  }, [appointments, activeTab, upcoming, completed, cancelled]);

  const handleReschedule = async () => {
    if (!rescheduleModal || !newDate || !newTime) return;
    try {
      const startTime = formatTime24Hour(newTime);
      const endTime = addMinutesToIsoTime(startTime, 30);
      await appointmentApi.rescheduleAppointment(rescheduleModal.id, newDate, startTime, endTime);
      addToast(`Appointment rescheduled to ${newDate} at ${newTime}!`, "success");
      setRescheduleModal(null);
      await fetchAppointments();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Failed to reschedule";
      addToast(typeof msg === "string" ? msg : "Failed to reschedule appointment", "error");
    }
  };

  const handleCancel = async () => {
    if (!cancelDialog) return;
    try {
      await appointmentApi.cancelAppointment(cancelDialog.id, cancelReason || "Patient requested cancellation");
      addToast(`Appointment with ${cancelDialog.doctor} has been cancelled.`, "info");
      setCancelDialog(null);
      setCancelReason("");
      await fetchAppointments();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Appointment cannot be cancelled within 2 hours of the appointment time.";
      addToast(typeof msg === "string" ? msg : "Cancellation failed", "error");
    }
  };

  return (
    <div className="df-role-page df-role-blue">
      <Breadcrumbs
        items={[
          { label: "Dashboard", to: `/${role}` },
          { label: isHistory ? "Appointment History" : "My Appointments" },
        ]}
      />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Consultation Schedule</span>
          <h1>{isHistory ? "Past Dental Care History" : "My Dental Appointments"}</h1>
          <p>Review upcoming consultations, reschedule dates, and inspect your full dental visit history.</p>
        </div>
        <Link to={`/${role}/book-appointment`} className="df-btn df-btn-primary">
          + Book New Appointment
        </Link>
      </header>

      <div className="df-stat-grid">
        <StatCard label="Total Scheduled" value={String(appointments.length)} icon="◫" color="primary" />
        <StatCard label="Upcoming Visits" value={String(upcoming.length)} icon="◷" color="primary" />
        <StatCard label="Completed Procedures" value={String(completed.length)} icon="✓" color="success" />
        <StatCard label="Cancelled / Missed" value={String(cancelled.length)} icon="◈" color="warning" />
      </div>

      <TabPills
        tabs={[
          { label: "All Bookings", value: "all", count: appointments.length },
          { label: "Upcoming Visits", value: "upcoming", count: upcoming.length },
          { label: "Completed History", value: "completed", count: completed.length },
          { label: "Cancelled", value: "cancelled", count: cancelled.length },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <section className="df-card">
        <div className="df-card-body">
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--df-text-muted)" }}>
              <p>Loading appointments from clinical server...</p>
            </div>
          ) : error ? (
            <div style={{ padding: 30, textAlign: "center", color: "var(--df-danger)" }}>
              <p>{error}</p>
              <button className="df-btn df-btn-secondary" onClick={fetchAppointments} style={{ marginTop: 12 }}>
                Try Again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title={activeTab === "upcoming" ? "No Upcoming Appointments" : "No Appointments Found"}
              description="You have no scheduled consultations in this category. Book a new appointment anytime."
              action={
                <Link to={`/${role}/book-appointment`} className="df-btn df-btn-primary">
                  Book First Appointment
                </Link>
              }
            />
          ) : (
            <DataTable
              columns={[
                { key: "doctor", label: "Consulting Dentist" },
                { key: "service", label: "Dental Service" },
                { key: "date", label: "Date" },
                { key: "time", label: "Time Slot" },
                { key: "status", label: "Status", type: "status" },
              ]}
              rows={filtered}
              actionLabel="Reschedule"
              onEdit={(row) => {
                setRescheduleModal(row);
                setNewDate(row.date || (bookingWindow?.today || new Date().toISOString().split("T")[0]));
                setNewTime(row.time || "10:00 AM");
              }}
              onDelete={(row) => {
                setCancelDialog(row);
                setCancelReason("");
              }}
            />
          )}
        </div>
      </section>

      {rescheduleModal && (
        <Modal
          title={`Reschedule: ${rescheduleModal.service} with ${rescheduleModal.doctor}`}
          onClose={() => setRescheduleModal(null)}
          footer={
            <>
              <button className="df-btn df-btn-secondary" onClick={() => setRescheduleModal(null)}>
                Cancel
              </button>
              <button className="df-btn df-btn-primary" onClick={handleReschedule}>
                Confirm Reschedule
              </button>
            </>
          }
        >
          <div className="df-form-2col">
            <div className="df-form-group">
              <label className="df-label">Select New Date (within 15 days) *</label>
              <input
                type="date"
                className="df-input"
                value={newDate}
                min={bookingWindow?.today}
                max={bookingWindow?.maximumBookingDate}
                onChange={(e) => setNewDate(e.target.value)}
                required
              />
            </div>
            <div className="df-form-group">
              <label className="df-label">Select Time Slot *</label>
              <select
                className="df-select"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              >
                <option value="09:00 AM">09:00 AM</option>
                <option value="09:30 AM">09:30 AM</option>
                <option value="10:00 AM">10:00 AM</option>
                <option value="10:30 AM">10:30 AM</option>
                <option value="11:00 AM">11:00 AM</option>
                <option value="11:30 AM">11:30 AM</option>
                <option value="02:00 PM">02:00 PM</option>
                <option value="02:30 PM">02:30 PM</option>
                <option value="03:00 PM">03:00 PM</option>
                <option value="03:30 PM">03:30 PM</option>
                <option value="04:00 PM">04:00 PM</option>
                <option value="04:30 PM">04:30 PM</option>
              </select>
            </div>
          </div>
        </Modal>
      )}

      {cancelDialog && (
        <ConfirmationDialog
          title="Cancel Dental Appointment?"
          message={`Are you sure you wish to cancel your ${cancelDialog.service} on ${cancelDialog.date} with ${cancelDialog.doctor}? Note: Backend enforces a 2-hour cancellation rule; appointments within 2 hours of start time cannot be cancelled.`}
          onCancel={() => setCancelDialog(null)}
          onConfirm={handleCancel}
        />
      )}
    </div>
  );
}

export function PatientBillingView({ role }) {
  const { user } = useAuth();
  const { saveRecord } = useDashboardData();
  const { addToast } = useNotifications();

  const [activeTab, setActiveTab] = useState("all");
  const [payModal, setPayModal] = useState(null);
  const [detailsModal, setDetailsModal] = useState(null);
  const [receiptModal, setReceiptModal] = useState(null);
  const [payMethod, setPayMethod] = useState("Credit / Debit Card");
  const [cardHolder, setCardHolder] = useState(user?.name || "Sarah Mitchell");
  const [cardNumber, setCardNumber] = useState("•••• •••• •••• 4242");
  const [cardExpiry, setCardExpiry] = useState("08/28");
  const [cardCvv, setCardCvv] = useState("•••");
  const [paying, setPaying] = useState(false);
  const [realBills, setRealBills] = useState([]);
  const [loading, setLoading] = useState(true);

  const reloadBills = async () => {
    try {
      let pId = user?.patientId;
      if (!pId && user?.id) {
        const pat = await patientApi.getPatientByUserId(user.id).catch(() => null);
        if (pat?.id) pId = pat.id;
      }
      if (pId) {
        const list = await billingApi.getPatientBills(pId).catch(() => []);
        setRealBills((list || []).map((b) => normalizeBill(b)));
      }
    } catch (err) {
      console.warn("Failed to reload bills:", err);
    }
  };

  useEffect(() => {
    let mounted = true;
    async function loadPatientBills() {
      try {
        let pId = user?.patientId;
        if (!pId && user?.id) {
          const pat = await patientApi.getPatientByUserId(user.id).catch(() => null);
          if (pat?.id) pId = pat.id;
        }
        if (pId) {
          const list = await billingApi.getPatientBills(pId).catch(() => []);
          if (!mounted) return;
          const normalized = (list || []).map((b) => normalizeBill(b));
          setRealBills(normalized);
        }
      } catch (err) {
        console.warn("Could not load patient bills:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadPatientBills();
    return () => {
      mounted = false;
    };
  }, [user]);

  const payments = realBills;

  const pendingInvoices = useMemo(
    () => payments.filter((p) => p.status === "pending" || p.rawStatus === "UNPAID" || p.rawStatus === "PARTIALLY_PAID"),
    [payments]
  );

  const paidInvoices = useMemo(
    () => payments.filter((p) => p.status === "paid" || p.status === "completed" || p.rawStatus === "PAID"),
    [payments]
  );

  const totalPendingAmount = useMemo(() => {
    return pendingInvoices.reduce((acc, curr) => {
      const num = curr.balanceAmount != null ? curr.balanceAmount : parseLkr(curr.amount);
      return acc + num;
    }, 0);
  }, [pendingInvoices]);

  const totalPaidAmount = useMemo(() => {
    return paidInvoices.reduce((acc, curr) => {
      const num = curr.paidAmount != null ? curr.paidAmount : parseLkr(curr.amount);
      return acc + num;
    }, 0);
  }, [paidInvoices]);

  const filteredInvoices = useMemo(() => {
    if (activeTab === "pending") return pendingInvoices;
    if (activeTab === "paid") return paidInvoices;
    return payments;
  }, [payments, activeTab, pendingInvoices, paidInvoices]);

  const handleOnlinePayment = async () => {
    if (!payModal) return;
    setPaying(true);

    try {
      const targetBillId = payModal.rawId || (typeof payModal.id === "number" ? payModal.id : null);
      const amountToPay = payModal.balanceAmount != null ? payModal.balanceAmount : (payModal.amountNumber || parseLkr(payModal.amount));

      let backendSuccess = false;
      if (targetBillId) {
        await billingApi.processPaymentAndVerify({
          billId: targetBillId,
          amount: amountToPay,
          paymentMethod: mapPaymentMethodToBackend(payMethod),
          transactionId: `ONLINE-TXN-${Date.now()}`,
          notes: `Patient Online Payment via ${payMethod}`,
        });
        backendSuccess = true;
      }

      const paidDate = new Date().toISOString().slice(0, 10);
      const updatedInvoice = {
        ...payModal,
        status: "paid",
        rawStatus: "PAID",
        paidDate,
        method: payMethod,
        balanceAmount: 0,
        paidAmount: (payModal.paidAmount || 0) + amountToPay,
      };

      saveRecord("payments", updatedInvoice);
      addToast(`Payment of ${formatLkr(amountToPay)} completed successfully for ${payModal.service}!`, "success");
      setPayModal(null);
      setReceiptModal(updatedInvoice);

      if (backendSuccess) {
        await reloadBills();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Payment processing failed";
      addToast(typeof msg === "string" ? msg : "Payment processing failed", "error");
    } finally {
      setPaying(false);
    }
  };

  const columns = [
    { key: "id", label: "Invoice #" },
    { key: "service", label: "Dental Service" },
    { key: "date", label: "Issue Date" },
    { key: "amount", label: "Amount Due / Paid" },
    { key: "status", label: "Payment Status", type: "status" },
  ];

  return (
    <div className="df-role-page df-role-blue">
      <Breadcrumbs
        items={[
          { label: "Dashboard", to: `/${role}` },
          { label: "Billing & Invoices" },
        ]}
      />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Patient Financial Portal</span>
          <h1>My Dental Billing & Payments</h1>
          <p>Review current treatment charges, settle invoices securely online, and download stamped receipts.</p>
        </div>
      </header>

      {loading && (
        <div style={{ padding: "8px 0", color: "var(--df-text-muted)", fontSize: 13 }}>
          Syncing billing records...
        </div>
      )}

      <div className="df-stat-grid">
        <StatCard
          label="Outstanding Balance"
          value={totalPendingAmount > 0 ? `LKR ${totalPendingAmount.toLocaleString()}` : "LKR 0"}
          icon="◈"
          color={totalPendingAmount > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Unpaid Invoices"
          value={String(pendingInvoices.length)}
          icon="◷"
          color={pendingInvoices.length > 0 ? "warning" : "primary"}
        />
        <StatCard
          label="Paid Treatments"
          value={String(paidInvoices.length)}
          icon="✓"
          color="success"
        />
        <StatCard
          label="Total Settled"
          value={`LKR ${totalPaidAmount.toLocaleString()}`}
          icon="◫"
          color="primary"
        />
      </div>

      <TabPills
        tabs={[
          { label: "All Invoices", value: "all", count: payments.length },
          { label: "Unpaid & Due", value: "pending", count: pendingInvoices.length },
          { label: "Payment History", value: "paid", count: paidInvoices.length },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <section className="df-card">
        <div className="df-card-body">
          {filteredInvoices.length > 0 ? (
            <DataTable
              columns={columns}
              rows={filteredInvoices}
              actionLabel="View Details"
              onEdit={(row) => setDetailsModal(row)}
              onQuickAction={(row) => {
                if (row.status === "pending") {
                  setPayModal(row);
                } else {
                  setReceiptModal(row);
                }
              }}
              quickActionLabel={(row) => (row.status === "pending" ? "💳 Pay Online" : "🧾 Download Receipt")}
            />
          ) : (
            <EmptyState
              title={
                activeTab === "pending"
                  ? "No Outstanding Invoices"
                  : payments.length === 0
                  ? "No Outstanding Invoices"
                  : "No Invoices Found"
              }
              description={
                payments.length === 0
                  ? "No billing information available"
                  : activeTab === "pending"
                  ? "All your dental treatment charges are completely settled. Thank you!"
                  : "No billing records match the selected category."
              }
            />
          )}
        </div>
      </section>

      {/* Online Payment Modal */}
      {payModal && (
        <Modal
          title={`Pay Invoice Online: ${payModal.id}`}
          onClose={() => !paying && setPayModal(null)}
          footer={
            <>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                disabled={paying}
                onClick={() => setPayModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="df-btn df-btn-primary"
                disabled={paying}
                onClick={handleOnlinePayment}
              >
                {paying ? "Processing Payment..." : `✓ Pay ${payModal.balanceAmount != null ? formatLkr(payModal.balanceAmount) : payModal.amount} Securely`}
              </button>
            </>
          }
        >
          <div className="df-form-2col" style={{ marginBottom: 16 }}>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Dental Treatment</small>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{payModal.service}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Total Due</small>
              <h2 style={{ color: "var(--df-primary-600)", margin: "4px 0" }}>{payModal.balanceAmount != null ? formatLkr(payModal.balanceAmount) : payModal.amount}</h2>
            </div>
          </div>

          <div className="df-form-group">
            <label className="df-label" htmlFor="pay-method-select">Payment Method</label>
            <select
              id="pay-method-select"
              className="df-select"
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
              disabled={paying}
            >
              <option value="Credit / Debit Card">Credit / Debit Card (Visa / Mastercard)</option>
              <option value="Online Bank Transfer">Online Bank Transfer (Sri Lanka Interbank)</option>
              <option value="Digital Health Wallet">Digital Health Wallet (DentaFlow Pay)</option>
            </select>
          </div>

          <div className="df-form-group" style={{ marginTop: 14 }}>
            <label className="df-label" htmlFor="cardholder-name">Cardholder Name</label>
            <input
              id="cardholder-name"
              className="df-input"
              value={cardHolder}
              onChange={(e) => setCardHolder(e.target.value)}
              placeholder="Full Name as on card"
              disabled={paying}
            />
          </div>

          <div className="df-form-group" style={{ marginTop: 14 }}>
            <label className="df-label" htmlFor="card-number">Card Number</label>
            <input
              id="card-number"
              className="df-input"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="4242 •••• •••• 4242"
              disabled={paying}
            />
          </div>

          <div className="df-form-2col" style={{ marginTop: 14 }}>
            <div className="df-form-group">
              <label className="df-label" htmlFor="card-expiry">Expiry Date</label>
              <input
                id="card-expiry"
                className="df-input"
                value={cardExpiry}
                onChange={(e) => setCardExpiry(e.target.value)}
                placeholder="MM/YY"
                disabled={paying}
              />
            </div>
            <div className="df-form-group">
              <label className="df-label" htmlFor="card-cvv">Security Code (CVV)</label>
              <input
                id="card-cvv"
                className="df-input"
                type="password"
                maxLength={4}
                value={cardCvv}
                onChange={(e) => setCardCvv(e.target.value)}
                placeholder="•••"
                disabled={paying}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              background: "var(--df-gray-50)",
              borderRadius: 6,
              fontSize: 12,
              color: "var(--df-text-secondary)",
              marginTop: 18,
            }}
          >
            <span>🔒</span>
            <span>256-Bit SSL Encrypted Healthcare Payment Gateway · PCI-DSS Compliant</span>
          </div>
        </Modal>
      )}

      {/* Invoice Details Modal */}
      {detailsModal && (
        <Modal
          title={`Invoice Details: ${detailsModal.id}`}
          onClose={() => setDetailsModal(null)}
          footer={
            <>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setDetailsModal(null)}
              >
                Close
              </button>
              {detailsModal.status === "pending" ? (
                <button
                  type="button"
                  className="df-btn df-btn-primary"
                  onClick={() => {
                    const inv = detailsModal;
                    setDetailsModal(null);
                    setPayModal(inv);
                  }}
                >
                  💳 Proceed to Pay Online
                </button>
              ) : (
                <button
                  type="button"
                  className="df-btn df-btn-primary"
                  onClick={() => {
                    const inv = detailsModal;
                    setDetailsModal(null);
                    setReceiptModal(inv);
                  }}
                >
                  🧾 Download Receipt
                </button>
              )}
            </>
          }
        >
          <div className="df-form-2col" style={{ marginBottom: 16 }}>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Patient Name</small>
              <div style={{ fontWeight: 600 }}>{detailsModal.patient || user?.name || "Sarah Mitchell"}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Invoice Date</small>
              <div style={{ fontWeight: 600 }}>{detailsModal.date}</div>
            </div>
          </div>

          <div className="df-form-2col" style={{ marginBottom: 16 }}>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Dental Service / Reference</small>
              <div style={{ fontWeight: 600 }}>{detailsModal.service}</div>
              {detailsModal.notes && (
                <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
                  {detailsModal.notes}
                </div>
              )}
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Payment Status</small>
              <div style={{ marginTop: 2 }}>
                <span className={`df-badge df-badge-${detailsModal.status === "paid" ? "success" : "warning"}`} style={{ fontWeight: 700 }}>
                  {detailsModal.status === "paid" ? "✓ Payment Successful" : "⏳ Pending Payment"}
                </span>
              </div>
            </div>
          </div>

          <div style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 14px", border: "1px solid #e2e8f0", marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: "#334155" }}>Financial Settlement Breakdown</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 14px", fontSize: 13 }}>
              <div style={{ color: "#64748b" }}>Subtotal / Base Charge:</div>
              <div style={{ textAlign: "right", fontWeight: 500 }}>{formatLkr(detailsModal.subtotal ?? detailsModal.rawAmount)}</div>

              <div style={{ color: "#64748b" }}>Discount:</div>
              <div style={{ textAlign: "right", color: "#16a34a", fontWeight: 500 }}>- {formatLkr(detailsModal.discount || 0)}</div>

              <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: 6, fontWeight: 700, color: "#1e293b" }}>Total Invoiced:</div>
              <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: 6, textAlign: "right", fontWeight: 700, color: "var(--df-primary-600)" }}>{detailsModal.amount}</div>

              <div style={{ color: "#64748b" }}>Paid Amount:</div>
              <div style={{ textAlign: "right", color: "#16a34a", fontWeight: 600 }}>{formatLkr(detailsModal.paidAmount || 0)}</div>

              <div style={{ color: "#64748b", fontWeight: 600 }}>Balance Due:</div>
              <div style={{ textAlign: "right", color: detailsModal.balanceAmount > 0 ? "#dc2626" : "#16a34a", fontWeight: 700 }}>
                {formatLkr(detailsModal.balanceAmount || 0)}
              </div>
            </div>
          </div>

          <p style={{ fontSize: 12, color: "var(--df-text-muted)", marginTop: 14 }}>
            {detailsModal.status === "pending"
              ? "Payment is due within 14 days of consultation. Click 'Proceed to Pay Online' to settle securely."
              : "This invoice has been fully settled. You can download or print your official payment receipt."}
          </p>
        </Modal>
      )}

      {/* Stamped Receipt Modal */}
      {receiptModal && (
        <Modal
          title={`Payment Receipt: ${receiptModal.id}`}
          onClose={() => setReceiptModal(null)}
          footer={
            <>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => addToast(`Receipt PDF downloaded for ${receiptModal.id}.`, "success")}
              >
                📥 Download PDF
              </button>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => addToast("Receipt sent to print spooler.", "info")}
              >
                🖨 Print
              </button>
              <button
                type="button"
                className="df-btn df-btn-primary"
                onClick={() => setReceiptModal(null)}
              >
                Done
              </button>
            </>
          }
        >
          {(() => {
            const statusCfg = getReceiptStatusConfig(receiptModal);
            return (
              <div className="df-receipt">
                <div
                  className="df-receipt-stamp"
                  style={{
                    borderColor: statusCfg.stampColor,
                    color: statusCfg.stampColor,
                  }}
                >
                  {statusCfg.isPaid ? "PAID" : statusCfg.displayStatus.toUpperCase()}
                </div>
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                  <h3 style={{ margin: 0 }}>DentaFlow Dental Hospital</h3>
                  <small style={{ color: "var(--df-text-secondary)" }}>
                    123 Dental Avenue, Colombo · +94 11 234 5678
                  </small>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 12 }}>
                  <div>
                    <strong>Billed To:</strong> {receiptModal.patient || user?.name || "Sarah Mitchell"}
                  </div>
                  <div>
                    <strong>Receipt #:</strong> {receiptModal.id}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 12, color: "var(--df-text-secondary)" }}>
                  <span><strong>{statusCfg.isPaid ? "Paid Date:" : "Date:"}</strong> {receiptModal.paidDate || receiptModal.date || "2026-03-15"}</span>
                  <span><strong>Method:</strong> {receiptModal.method || "Online Card Payment"}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 12, color: "var(--df-text-secondary)" }}>
                  <span>
                    <strong>Payment Status:</strong>{" "}
                    <span style={{ color: statusCfg.stampColor, fontWeight: 700 }}>
                      {statusCfg.displayStatus}
                    </span>
                  </span>
                  {receiptModal.invoice && <span><strong>Invoice:</strong> {receiptModal.invoice}</span>}
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
                  <span>{statusCfg.amountLabel}:</span>
                  <span style={{ color: statusCfg.amountColor }}>{receiptModal.amount}</span>
                </div>

                <p style={{ textAlign: "center", fontSize: 11, color: "var(--df-text-muted)", marginTop: 16 }}>
                  {statusCfg.footerNote || "Official digital receipt issued by DentaFlow Hospital. Valid for health insurance claims and medical records."}
                </p>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}


