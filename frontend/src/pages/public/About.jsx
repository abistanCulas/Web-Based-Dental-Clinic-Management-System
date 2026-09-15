import { Link } from "react-router-dom";
import { STATS, WHY_CHOOSE } from "../../data/mockData";
import "./public.css";

export default function About() {
  return (
    <>
      <div className="df-page-banner">
        <h1>About DentaFlow</h1>
        <p>Advanced dental care powered by modern technology and compassionate professionals.</p>
      </div>
      <div className="df-page-content">
        <div className="df-about-preview" style={{ marginBottom: 48 }}>
          <div className="df-about-image">🏥</div>
          <div>
            <h2>Our Story</h2>
            <p style={{ color: "var(--df-text-secondary)", lineHeight: 1.8, margin: "16px 0" }}>
              Founded in 2011, DentaFlow has grown from a single dental clinic to a comprehensive digital healthcare platform serving thousands of patients across Sri Lanka. We believe that quality dental care should be accessible, transparent, and comfortable.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
              <div className="df-card"><div className="df-card-body"><h4>Mission</h4><p style={{ fontSize: 14, color: "var(--df-text-secondary)", marginTop: 8 }}>To deliver exceptional dental care through innovation, expertise, and patient-centered service.</p></div></div>
              <div className="df-card"><div className="df-card-body"><h4>Vision</h4><p style={{ fontSize: 14, color: "var(--df-text-secondary)", marginTop: 8 }}>To be South Asia's leading digital dental care platform.</p></div></div>
            </div>
          </div>
        </div>

        <div className="df-stats-grid" style={{ marginBottom: 48 }}>
          {STATS.map((s) => <div key={s.label}><strong>{s.value}</strong><span>{s.label}</span></div>)}
        </div>

        <div className="df-section-header"><h2>Why Choose Us</h2></div>
        <div className="df-why-grid" style={{ marginBottom: 48 }}>
          {WHY_CHOOSE.map((w) => (
            <div key={w.title} className="df-why-card">
              <div className="df-why-icon">✓</div>
              <div><h3>{w.title}</h3><p style={{ fontSize: 14, color: "var(--df-text-secondary)", marginTop: 4 }}>{w.desc}</p></div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center" }}>
          <Link to="/book-appointment" className="df-btn df-btn-primary df-btn-lg">Book Your Appointment</Link>
        </div>
      </div>
    </>
  );
}
