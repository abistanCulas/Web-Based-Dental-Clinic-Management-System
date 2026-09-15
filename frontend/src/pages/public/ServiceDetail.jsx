import { Link, useParams } from "react-router-dom";
import { SERVICES } from "../../data/mockData";
import "./public.css";

export default function ServiceDetail() {
  const { id } = useParams();
  const service = SERVICES.find((s) => s.id === Number(id));

  if (!service) {
    return (
      <div className="df-page-content df-empty">
        <h2>Service not found</h2>
        <Link to="/services" className="df-btn df-btn-primary" style={{ marginTop: 16 }}>Back to Services</Link>
      </div>
    );
  }

  return (
    <>
      <div className="df-page-banner">
        <span className="df-hero-badge" style={{ marginBottom: 12 }}>{service.category}</span>
        <h1>{service.name}</h1>
        <p>{service.desc}</p>
      </div>
      <div className="df-page-content">
        <div className="df-card" style={{ maxWidth: 720 }}>
          <div className="df-card-body">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
              <div><small style={{ color: "var(--df-text-muted)" }}>Duration</small><strong style={{ display: "block" }}>{service.duration}</strong></div>
              <div><small style={{ color: "var(--df-text-muted)" }}>Starting Price</small><strong style={{ display: "block" }}>{service.price}</strong></div>
              <div><small style={{ color: "var(--df-text-muted)" }}>Category</small><strong style={{ display: "block" }}>{service.category}</strong></div>
            </div>
            <h3 style={{ marginBottom: 12 }}>About This Service</h3>
            <p style={{ color: "var(--df-text-secondary)", lineHeight: 1.7, marginBottom: 24 }}>{service.desc} Our experienced team uses the latest technology to ensure comfortable, effective treatment with optimal results.</p>
            <div style={{ display: "flex", gap: 12 }}>
              <Link to="/book-appointment" state={{ serviceId: service.id }} className="df-btn df-btn-primary">Book Appointment</Link>
              <Link to="/services" className="df-btn df-btn-secondary">All Services</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
