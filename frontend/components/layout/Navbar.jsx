import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Search, Moon, Sun } from "lucide-react";
import Logo from "../icons/Logo";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import NotificationCenter from "../ui/NotificationCenter";
import ProfileDropdown from "../ui/ProfileDropdown";
import "./Navbar.css";

export default function Navbar() {
  const { t } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  useEffect(() => {
    if (!menuOpen && !searchOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen, searchOpen]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/services?search=${encodeURIComponent(searchQuery.trim())}`);
    setSearchOpen(false);
    setSearchQuery("");
  };

  const navLinks = [
    { to: "/", label: t("nav.home") || "Home" },
    { to: "/services", label: t("nav.services") || "Services" },
    { to: "/doctors", label: t("nav.doctors") || "Our Doctors" },
    { to: "/reviews", label: t("Reviews") || "Reviews" },
    { to: "/book-appointment", label: t("nav.bookAppointment") || "Book Appointment" },
    { to: "/about", label: t("nav.about") || "About Us" },
    { to: "/contact", label: t("nav.contact") || "Contact Us" },
  ];

  const dashboardPath = user ? `/${user.role}` : "/login";

  return (
    <div className="df-navbar-wrapper">
      <header className="df-navbar-glass">
        {menuOpen && (
          <div
            className="df-navbar-backdrop"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        <div className="df-navbar-inner">
          <Link to="/" className="df-navbar-logo" onClick={() => setMenuOpen(false)}>
            <Logo size={34} />
          </Link>

          <nav className={`df-navbar-nav ${menuOpen ? "open" : ""}`}>
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) => `df-nav-link ${isActive ? "active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                <span className="df-nav-link-text">{link.label}</span>
                <span className="df-nav-link-indicator" />
              </NavLink>
            ))}
          </nav>

          <div className="df-navbar-actions">
            <button
              type="button"
              className="df-nav-icon-btn df-search-btn"
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label="Search"
              title="Search services & doctors"
            >
              <Search size={17} strokeWidth={2.2} />
            </button>

            {isAuthenticated ? (
              <Link to={dashboardPath} className="df-nav-btn df-nav-primary-btn">
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="df-nav-btn df-nav-login-btn">
                  {t("nav.login") || "Login"}
                </Link>
                <Link to="/register" className="df-nav-btn df-nav-register-btn">
                  {t("nav.register") || "Register"}
                </Link>
              </>
            )}

            <button
              type="button"
              className="df-nav-icon-btn df-theme-btn"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? (
                <Sun size={17} strokeWidth={2.2} />
              ) : (
                <Moon size={17} strokeWidth={2.2} />
              )}
            </button>

            {isAuthenticated && <NotificationCenter />}
            {isAuthenticated && <ProfileDropdown />}

            <button
              className="df-hamburger"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>

        {/* Quick Search dropdown bar */}
        {searchOpen && (
          <div className="df-navbar-search-bar">
            <form onSubmit={handleSearchSubmit} className="df-search-form">
              <Search size={16} className="df-search-input-icon" />
              <input
                type="text"
                placeholder="Search dental treatments, doctors, appointments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="df-search-input"
              />
              <button
                type="button"
                className="df-search-close-btn"
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
              >
                <X size={15} />
              </button>
            </form>
          </div>
        )}
      </header>
    </div>
  );
}
