import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <section className="df-empty">
      <div className="df-empty-icon" aria-hidden="true">404</div>
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist or may have moved.</p>
      <Link to="/" className="df-btn df-btn-primary" style={{ marginTop: 20 }}>
        Return Home
      </Link>
    </section>
  );
}
