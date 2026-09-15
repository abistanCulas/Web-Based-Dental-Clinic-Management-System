import { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../context/LanguageContext";
import { useNotifications } from "../../context/NotificationContext";
import { SERVICES, DOCTORS, REVIEWS, STATS, WHY_CHOOSE } from "../../data/mockData";
import "./public.css";

const SERVICE_ICONS = ["🦷", "🪥", "✨", "😬", "🔧", "💎"];

export default function Home() {
  const { t } = useLanguage();
  const { addToast } = useNotifications();
  const [enquiry, setEnquiry] = useState({ name: "", email: "", message: "" });
  const previewServices = SERVICES.slice(0, 6);
  const previewDoctors = DOCTORS.slice(0, 4);

  const handleEnquirySubmit = (e) => {
    e.preventDefault();
    if (!enquiry.name.trim() || !enquiry.email.trim() || !enquiry.message.trim()) {
      addToast("Please fill in your name, email, and question", "warning");
      return;
    }
    addToast("Your question has been received! We will respond shortly.", "success");
    setEnquiry({ name: "", email: "", message: "" });
  };

  return (
    <>
      <section className="df-hero">
        <div className="df-hero-shapes">
          <div className="df-hero-shape df-hero-shape-1" />
          <div className="df-hero-shape df-hero-shape-2" />
          <div className="df-hero-shape df-hero-shape-3" />
        </div>
        <div className="df-hero-inner">
          <div className="df-hero-content">
            <span className="df-hero-badge">{t("hero.badge")}</span>
            <h1>{t("hero.title").split(",")[0]},<br /><span>{t("hero.title").split(",")[1] || "Our Priority"}</span></h1>
            <p>{t("hero.subtitle")}</p>
            <div className="df-hero-buttons">
              <Link to="/book-appointment" className="df-btn df-btn-primary df-btn-lg">{t("hero.ctaPrimary")}</Link>
              <Link to="/services" className="df-btn df-btn-outline df-btn-lg">{t("hero.ctaSecondary")}</Link>
            </div>
          </div>
          <div className="df-hero-visual">
            <div className="df-hero-image-wrap">
              <div className="df-hero-placeholder">
                <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                  <circle cx="60" cy="60" r="50" fill="rgba(255,255,255,0.1)" />
                  <path d="M60 30C50 30 42 38 42 48C42 58 48 64 52 72C56 80 58 88 60 92C62 88 64 80 68 72C72 64 78 58 78 48C78 38 70 30 60 30Z" fill="white" opacity="0.9" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="df-stats-bar">
        <div className="df-stats-grid">
          {STATS.map((s) => (
            <div key={s.label}><strong>{s.value}</strong><span>{s.label}</span></div>
          ))}
        </div>
      </section>

      <section className="df-section" style={{ background: "var(--df-bg-subtle)" }}>
        <div className="df-section-inner">
          <div className="df-section-header">
            <span className="df-section-label">Our Services</span>
            <h2>Complete Dental Care for You and Your Family</h2>
            <p className="df-section-desc">We offer a wide range of dental services to keep your smile healthy and beautiful.</p>
          </div>
          <div className="df-services-grid">
            {previewServices.map((s, i) => (
              <div key={s.id} className="df-service-card">
                <div className="df-service-icon">{SERVICE_ICONS[i] || "🦷"}</div>
                <h3>{s.name}</h3>
                <p>{s.desc.slice(0, 80)}...</p>
                <Link to={`/services/${s.id}`} className="df-btn df-btn-ghost df-btn-sm" style={{ alignSelf: "flex-start", padding: "6px 0" }}>
                  Learn More →
                </Link>
              </div>
            ))}
          </div>
          <div className="df-section-action">
            <Link to="/services" className="df-btn df-btn-primary">View All Services</Link>
          </div>
        </div>
      </section>

      <section className="df-section">
        <div className="df-section-inner">
          <div className="df-section-header">
            <span className="df-section-label">Why Choose DentaFlow</span>
            <h2>Why Patients Trust DentaFlow</h2>
          </div>
          <div className="df-why-grid">
            {WHY_CHOOSE.map((w) => (
              <div key={w.title} className="df-why-card">
                <div className="df-why-icon">✓</div>
                <div><h3>{w.title}</h3><p style={{ fontSize: 14, color: "var(--df-text-secondary)", marginTop: 4 }}>{w.desc}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="df-section" style={{ background: "var(--df-bg-subtle)" }}>
        <div className="df-section-inner">
          <div className="df-section-header">
            <span className="df-section-label">Our Doctors</span>
            <h2>Meet Our Expert Dentists</h2>
          </div>
          <div className="df-doctors-grid">
            {previewDoctors.map((d) => (
              <div key={d.id} className="df-doctor-card">
                <div className="df-doctor-photo">{d.name.split(" ").slice(1).map((n) => n[0]).join("")}</div>
                <div className="df-doctor-body">
                  <h3>{d.name}</h3>
                  <div className="df-doctor-specialty">{d.specialty}</div>
                  <div className="df-doctor-meta">{d.experience} · {d.availability}</div>
                  <Link to={`/doctors/${d.id}`} className="df-btn df-btn-secondary df-btn-sm df-btn-block">View Profile</Link>
                </div>
              </div>
            ))}
          </div>
          <div className="df-section-action">
            <Link to="/doctors" className="df-btn df-btn-primary">View All Doctors</Link>
          </div>
        </div>
      </section>

      <section className="df-section">
        <div className="df-section-inner">
          <div className="df-about-preview">
            <div>
              <span className="df-section-label">About DentaFlow</span>
              <h2>Modern Healthcare for Modern Smiles</h2>
              <p style={{ color: "var(--df-text-secondary)", margin: "16px 0", lineHeight: 1.7 }}>
                DentaFlow is a comprehensive dental management platform combining advanced technology with compassionate care. Our mission is to make quality dental healthcare accessible, comfortable, and efficient for every patient.
              </p>
              <p style={{ color: "var(--df-text-secondary)", marginBottom: 24, lineHeight: 1.7 }}>
                <strong>Vision:</strong> To be the leading digital dental care platform in South Asia.
              </p>
              <Link to="/about" className="df-btn df-btn-primary">Learn More</Link>
            </div>
            <div className="df-about-image">🏥</div>
          </div>
        </div>
      </section>

      <section className="df-section" style={{ background: "var(--df-bg-subtle)" }}>
        <div className="df-section-inner">
          <div className="df-section-header">
            <span className="df-section-label">Patient Reviews</span>
            <h2>What Our Patients Say</h2>
          </div>
          <div className="df-reviews-grid">
            {REVIEWS.map((r) => (
              <div key={r.id} className="df-review-card">
                <div className="df-review-stars">{"★".repeat(r.rating)}</div>
                <p className="df-review-text">"{r.text}"</p>
                <div className="df-review-author">
                  <div className="df-review-avatar">{r.avatar}</div>
                  <strong style={{ fontSize: 14 }}>{r.name}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="df-enquiry">
        <div className="df-enquiry-inner">
          <h2>Have a Question About Your Dental Care?</h2>
          <form className="df-enquiry-form" onSubmit={handleEnquirySubmit}>
            <div className="df-form-row">
              <div className="df-form-group">
                <label className="df-label">Name</label>
                <input
                  className="df-input"
                  placeholder="Your name"
                  value={enquiry.name}
                  onChange={(e) => setEnquiry({ ...enquiry, name: e.target.value })}
                  required
                />
              </div>
              <div className="df-form-group">
                <label className="df-label">Email</label>
                <input
                  className="df-input"
                  type="email"
                  placeholder="your@email.com"
                  value={enquiry.email}
                  onChange={(e) => setEnquiry({ ...enquiry, email: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="df-form-group">
              <label className="df-label">Question / Message</label>
              <textarea
                className="df-textarea"
                rows={4}
                placeholder="Your question..."
                value={enquiry.message}
                onChange={(e) => setEnquiry({ ...enquiry, message: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="df-btn df-btn-primary df-btn-block df-btn-lg">Send Question</button>
          </form>
        </div>
      </section>
    </>
  );
}
