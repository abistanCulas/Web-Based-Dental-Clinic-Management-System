import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { DOCTORS, REVIEWS } from "../../data/mockData";
import { dentistApi } from "../../api/dentists";
import "./public.css";

export default function DoctorProfile() {
  const { id } = useParams();
  const mockDoc = DOCTORS.find((d) => d.id === Number(id));
  const [liveDoc, setLiveDoc] = useState(null);

  useEffect(() => {
    let active = true;
    if (id) {
      dentistApi.getDentistById(id).then((d) => {
        if (active && d) setLiveDoc(d);
      }).catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [id]);

  const doctor = liveDoc ? {
    id: liveDoc.id,
    name: liveDoc.name,
    specialty: liveDoc.specialization || "General Dentistry",
    qualification: liveDoc.qualification || "Dental Surgeon",
    experience: `${liveDoc.experienceYears || 5}+ years`,
    rating: 4.9,
    reviews: 24,
    availability: "Mon - Fri, 9:00 AM - 5:00 PM",
    bio: liveDoc.bio || "Dedicated dental professional delivering compassionate, comprehensive dental care at DentaFlow.",
    services: ["Dental Checkup", "Teeth Cleaning", "Cavity Filling", "Root Canal Treatment"],
  } : mockDoc;

  if (!doctor) {
    return (
      <div className="df-page-content df-empty">
        <h2>Doctor not found</h2>
        <Link to="/doctors" className="df-btn df-btn-primary" style={{ marginTop: 16 }}>Back to Doctors</Link>
      </div>
    );
  }

  return (
    <>
      <div className="df-page-banner">
        <h1>{doctor.name}</h1>
        <p>{doctor.specialty} · {doctor.experience} experience</p>
      </div>
      <div className="df-page-content">
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 32 }}>
          <div className="df-card">
            <div className="df-doctor-photo" style={{ height: 220, borderRadius: 0 }}>{doctor.name.split(" ").slice(1).map((n) => n[0]).join("")}</div>
            <div className="df-card-body">
              <p style={{ fontSize: 13, color: "var(--df-text-secondary)", marginBottom: 8 }}>{doctor.qualification}</p>
              <p style={{ fontSize: 13, marginBottom: 4 }}>★ {doctor.rating} ({doctor.reviews} reviews)</p>
              <p style={{ fontSize: 13, color: "var(--df-text-muted)", marginBottom: 16 }}>📅 {doctor.availability}</p>
              <Link to="/book-appointment" state={{ doctorId: doctor.id }} className="df-btn df-btn-primary df-btn-block">Book Appointment</Link>
            </div>
          </div>
          <div>
            <div className="df-card" style={{ marginBottom: 24 }}>
              <div className="df-card-body">
                <h3 style={{ marginBottom: 12 }}>Biography</h3>
                <p style={{ color: "var(--df-text-secondary)", lineHeight: 1.7 }}>{doctor.bio}</p>
              </div>
            </div>
            <div className="df-card" style={{ marginBottom: 24 }}>
              <div className="df-card-body">
                <h3 style={{ marginBottom: 12 }}>Services Offered</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {doctor.services.map((s) => <span key={s} className="df-badge df-badge-primary">{s}</span>)}
                </div>
              </div>
            </div>
            <div className="df-card">
              <div className="df-card-body">
                <h3 style={{ marginBottom: 16 }}>Patient Reviews</h3>
                {REVIEWS.slice(0, 2).map((r) => (
                  <div key={r.id} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid var(--df-border)" }}>
                    <div className="df-review-stars">{"★".repeat(r.rating)}</div>
                    <p style={{ fontSize: 14, color: "var(--df-text-secondary)", fontStyle: "italic" }}>"{r.text}"</p>
                    <small style={{ color: "var(--df-text-muted)" }}>— {r.name}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
