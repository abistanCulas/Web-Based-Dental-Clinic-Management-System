import { useState, useEffect } from "react";
import { Link, NavLink } from "react-router-dom";
import Logo from "../icons/Logo";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import "./Navbar.css";

export default function Navbar() {
  const { t } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  const navLinks = [
    { to: "/", label: t("nav.home") },
    { to: "/services", label: t("nav.services") },
    { to: "/doctors", label: t("nav.doctors") },
    { to: "/book-appointment", label: t("nav.bookAppointment") },
    { to: "/about", label: t("nav.about") },
    { to: "/contact", label: t("nav.contact") },
  ];

  const dashboardPath = user ? `/${user.role}` : "/login";

  return (
    <header className="df-navbar">
      {menuOpen && (
        <div
          className="df-navbar-backdrop"
          onClick={() => setMenuOpen(false)}
          onTouchEnd={(e) => {
            e.preventDefault();
            setMenuOpen(false);
          }}
          aria-hidden="true"
        />
      )}
      <div className="df-navbar-inner">
        <Link to="/" className="df-navbar-logo" onClick={() => setMenuOpen(false)}>
          <Logo size={36} />
        </Link>

        <nav className={`df-navbar-nav ${menuOpen ? "open" : ""}`}>
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `df-nav-link ${isActive ? "active" : ""}`}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="df-navbar-actions">
          {isAuthenticated ? (
            <Link to={dashboardPath} className="df-btn df-btn-primary df-btn-sm">
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="df-btn df-btn-secondary df-btn-sm df-login-btn">
                {t("nav.login")}
              </Link>
              <Link to="/register" className="df-btn df-btn-primary df-btn-sm df-register-btn">
                {t("nav.register")}
              </Link>
            </>
          )}

          <button
            className="df-hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <span /><span /><span />
          </button>
        </div>
      </div>
    </header>
  );
}
