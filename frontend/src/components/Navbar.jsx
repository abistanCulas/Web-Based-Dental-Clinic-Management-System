import { Link } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  return (
    <header className="df-navbar">
      <div className="df-navbar-container">

        {/* Logo */}
        <Link to="/" className="df-logo">
          <div className="df-logo-icon">D</div>

          <div className="df-logo-text">
            <span>DentaFlow</span>
            <small>Care That Flows With You</small>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="df-nav-links">
          <Link to="/" className="df-nav-link active">
            Home
          </Link>

          <Link to="/services" className="df-nav-link">
            Services
          </Link>

          <Link to="/doctors" className="df-nav-link">
            Doctors
          </Link>

          <Link to="/book-appointment" className="df-nav-link">
            Book Appointment
          </Link>

          <Link to="/about" className="df-nav-link">
            About Us
          </Link>

          <Link to="/contact" className="df-nav-link">
            Contact Us
          </Link>

          <Link to="/feedback" className="df-nav-link">
            Feedback
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="df-navbar-actions">

          {/* Theme Toggle */}
          <button
            className="df-theme-btn"
            type="button"
            aria-label="Toggle theme"
          >
            ☀️
          </button>

          {/* Login */}
          <Link to="/login" className="df-login-btn">
            Login
          </Link>

          {/* Register */}
          <Link to="/register" className="df-register-btn">
            Register
          </Link>

        </div>

      </div>
    </header>
  );
}

export default Navbar;