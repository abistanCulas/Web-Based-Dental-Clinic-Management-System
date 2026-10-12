import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import servicesApi from "../../api/services";
import clinicReception from "../../assets/clinic_reception_desk.png";
import "./public.css";

export default function ServiceDetail() {
  const { id } = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(Boolean(id));

  useEffect(() => {
    let active = true;

    if (id) {
      servicesApi
        .getServiceById(id)
        .then((s) => {
          if (active) setService(s);
        })
        .catch(() => {
          if (active) setService(null);
        })
        .finally(() => {
          if (active) setLoading(false);
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

  if (!service) {
    return (
      <div className="df-page-content df-empty" style={{ textAlign: "center", padding: "60px 20px" }}>
        <h2>Service not found</h2>
        <p style={{ color: "var(--df-text-secondary)", marginTop: 8 }}>
          The requested dental service could not be found or is no longer offered.
        </p>
        <Link to="/services" className="df-btn df-btn-primary" style={{ marginTop: 16, display: "inline-block" }}>
          Back to Services
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="df-page-banner">
        {service.category && (
          <span className="df-hero-badge" style={{ marginBottom: 12 }}>
            {service.category}
          </span>
        )}
        <h1>{service.name}</h1>
        {service.desc && <p>{service.desc}</p>}
      </div>

      <div className="df-page-content">
        <div className="df-card" style={{ maxWidth: 900, margin: "0 auto" }}>
          <div className="df-card-body">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 32,
                alignItems: "start",
              }}
            >
              <div>
                <img
                  src={service.imageUrl || service.image || clinicReception}
                  alt={service.name}
                  style={{
                    width: "100%",
                    borderRadius: "var(--df-radius-lg)",
                    objectFit: "cover",
                    aspectRatio: "4/3",
                  }}
                />
              </div>

              <div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 16,
                    marginBottom: 24,
                  }}
                >
                  {service.duration && (
                    <div className="df-card" style={{ padding: "16px", textAlign: "center" }}>
                      <div className="df-card-body" style={{ padding: 0 }}>
                        <small style={{ color: "var(--df-text-muted)", display: "block" }}>
                          Duration
                        </small>
                        <strong style={{ display: "block", marginTop: 4 }}>
                          {service.duration}
                        </strong>
                      </div>
                    </div>
                  )}

                  {service.price && (
                    <div className="df-card" style={{ padding: "16px", textAlign: "center" }}>
                      <div className="df-card-body" style={{ padding: 0 }}>
                        <small style={{ color: "var(--df-text-muted)", display: "block" }}>
                          Price
                        </small>
                        <strong style={{ display: "block", marginTop: 4 }}>
                          {service.price}
                        </strong>
                      </div>
                    </div>
                  )}

                  {service.category && (
                    <div className="df-card" style={{ padding: "16px", textAlign: "center" }}>
                      <div className="df-card-body" style={{ padding: 0 }}>
                        <small style={{ color: "var(--df-text-muted)", display: "block" }}>
                          Category
                        </small>
                        <strong style={{ display: "block", marginTop: 4 }}>
                          {service.category}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>

                <h3 style={{ marginBottom: 12 }}>About This Service</h3>
                <p
                  style={{
                    color: "var(--df-text-secondary)",
                    lineHeight: 1.7,
                    marginBottom: 24,
                  }}
                >
                  {service.desc ||
                    "Professional dental treatment provided by qualified dental specialists using modern clinical procedures."}
                </p>

                <div style={{ display: "flex", gap: 12 }}>
                  <Link
                    to="/book-appointment"
                    state={{ serviceId: service.id }}
                    className="df-btn df-btn-primary"
                  >
                    Book Appointment
                  </Link>
                  <Link to="/services" className="df-btn df-btn-secondary">
                    All Services
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
