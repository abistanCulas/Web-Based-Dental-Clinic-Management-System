import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--df-space-2xl)" }}>
      <section className="df-empty" style={{ maxWidth: 480, background: "var(--df-bg-elevated)", padding: "var(--df-space-3xl) var(--df-space-2xl)", borderRadius: "var(--df-radius-xl)", border: "1px solid var(--df-border)", boxShadow: "var(--df-shadow-md)" }}>
        <div className="df-empty-icon" style={{ width: 72, height: 72, fontSize: 24, fontWeight: 800 }} aria-hidden="true">
          404
        </div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--df-text-heading)", margin: "var(--df-space-sm) 0" }}>Page Not Found</h1>
        <p style={{ color: "var(--df-text-secondary)", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "var(--df-space-xl)" }}>
          The page you are looking for does not exist or may have been moved.
        </p>
        <div style={{ display: "flex", gap: "var(--df-space-sm)", justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/" className="df-btn df-btn-primary">
            Return to Home
          </Link>
          <Link to="/login" className="df-btn df-btn-secondary">
            Sign In
          </Link>
        </div>
      </section>
    </div>
  );
}
