import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { dentistApi } from "../../api/dentists";
import { reviewsApi } from "../../api/reviews";
import "./public.css";

export default function DoctorProfile() {
  const { id } = useParams();
  const [doctor, setDoctor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(Boolean(id));

  useEffect(() => {
    let active = true;

    if (id) {
      Promise.all([
        dentistApi.getDentistById(id).catch(() => null),
        reviewsApi.getDentistReviews(id).catch(() => []),
        dentistApi.getDentistAvailability(id).catch(() => []),
      ]).then(([docData, reviewsData, availData]) => {
        if (!active) return;
        setDoctor(docData || null);
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
        setAvailability(Array.isArray(availData) ? availData : []);
        setLoading(false);
      });
    }

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="df-section-container">
        <div className="df-spinner" style={{ margin: "60px auto" }} />
      </div>
    );
  }

  if (!doctor || doctor.status !== "active") {
    return (
      <div className="df-page-content df-empty" style={{ textAlign: "center", padding: "60px 20px" }}>
        <h2>Doctor currently unavailable</h2>
        <p style={{ color: "var(--df-text-secondary)", marginTop: 8 }}>
          This dentist is currently not available for bookings or consultation.
        </p>
        <Link to="/doctors" className="df-btn df-btn-primary" style={{ marginTop: 16, display: "inline-block" }}>
          Back to Doctors
        </Link>
      </div>
    );
  }

  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) /
          reviews.length
        ).toFixed(1)
      : null;

  const initials =
    (doctor.firstName?.[0] || "") + (doctor.lastName?.[0] || "") ||
    doctor.name
      ?.replace(/^Dr\.\s*/i, "")
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ||
    "DR";

  const availabilityText =
    availability.length > 0
      ? availability
          .map((a) => `${a.dayOfWeek || ""}: ${a.startTime || ""} - ${a.endTime || ""}`)
          .filter(Boolean)
          .join(" | ")
      : doctor.status === "active"
      ? "Available by Appointment"
      : "Currently Unavailable";

  return (
    <>
      <div className="df-page-banner">
        <h1>{doctor.name}</h1>
        <p>
          {[
            doctor.specialization,
            doctor.experienceYears ? `${doctor.experienceYears}+ years experience` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <div className="df-page-content">
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 32 }}>
          <div className="df-card">
            <div
              className="df-doctor-photo"
              style={{
                height: 220,
                borderRadius: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
                color: "#ffffff",
                fontSize: 48,
                fontWeight: 800,
                overflow: "hidden",
              }}
            >
              {doctor.imageUrl || doctor.profileImage || doctor.image ? (
                <img
                  src={doctor.imageUrl || doctor.profileImage || doctor.image}
                  alt={doctor.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                initials
              )}
            </div>
            <div className="df-card-body">
              {doctor.qualification && (
                <p style={{ fontSize: 13, color: "var(--df-text-secondary)", marginBottom: 8 }}>
                  {doctor.qualification}
                </p>
              )}
              <p style={{ fontSize: 13, marginBottom: 8 }}>
                {avgRating ? `★ ${avgRating} (${reviews.length} ${reviews.length === 1 ? "review" : "reviews"})` : "No reviews yet"}
              </p>
              <p style={{ fontSize: 13, color: "var(--df-text-muted)", marginBottom: 16 }}>
                📅 {availabilityText}
              </p>
              <Link
                to="/book-appointment"
                state={{ doctorId: doctor.id }}
                className="df-btn df-btn-primary df-btn-block"
              >
                Book Appointment
              </Link>
            </div>
          </div>

          <div>
            {doctor.bio && (
              <div className="df-card" style={{ marginBottom: 24 }}>
                <div className="df-card-body">
                  <h3 style={{ marginBottom: 12 }}>Biography</h3>
                  <p style={{ color: "var(--df-text-secondary)", lineHeight: 1.7 }}>
                    {doctor.bio}
                  </p>
                </div>
              </div>
            )}

            {doctor.specialization && (
              <div className="df-card" style={{ marginBottom: 24 }}>
                <div className="df-card-body">
                  <h3 style={{ marginBottom: 12 }}>Specialization</h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <span className="df-badge df-badge-primary">
                      {doctor.specialization}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="df-card">
              <div className="df-card-body">
                <h3 style={{ marginBottom: 16 }}>Patient Reviews</h3>
                {reviews.length === 0 ? (
                  <p style={{ color: "var(--df-text-muted)", fontSize: 14, margin: 0 }}>
                    No reviews submitted for this dentist yet.
                  </p>
                ) : (
                  reviews.map((r, idx) => (
                    <div
                      key={r.id || idx}
                      style={{
                        marginBottom: 16,
                        paddingBottom: 16,
                        borderBottom: idx < reviews.length - 1 ? "1px solid var(--df-border)" : "none",
                      }}
                    >
                      <div className="df-review-stars" style={{ color: "#eab308" }}>
                        {"★".repeat(Math.max(1, Math.min(5, Number(r.rating) || 5)))}
                      </div>
                      <p
                        style={{
                          fontSize: 14,
                          color: "var(--df-text-secondary)",
                          fontStyle: "italic",
                          margin: "6px 0",
                        }}
                      >
                        "{r.comment || r.text || ""}"
                      </p>
                      <small style={{ color: "var(--df-text-muted)" }}>
                        — {r.patientName || "Patient"}
                        {r.createdAt && ` (${new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })})`}
                      </small>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
