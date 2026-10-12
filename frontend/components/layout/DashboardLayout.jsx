import { useState, useEffect } from "react";
import { Link, NavLink, Outlet, Navigate, useLocation } from "react-router-dom";
import Logo from "../icons/Logo";
import SidebarIcon from "../icons/SidebarIcons";
import ProfileDropdown from "../ui/ProfileDropdown";
import NotificationCenter from "../ui/NotificationCenter";
import AIChatbot from "../ui/AIChatbot";
import GlobalSearchBar from "../ui/GlobalSearchBar";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { ROLE_MENUS } from "../../config/roles";
import { messagesApi } from "../../api/messages";
import AdminSidebar from "../admin/AdminSidebar";
import Footer from "./Footer";
import "./DashboardLayout.css";
import "../../styles/CashierGlass.css";
import "../../styles/PharmacyGlass.css";
import "../../styles/PatientGlass.css";
import "../../styles/ClinicalGlass.css";

const ROLE_DISPLAY_NAMES = {
  patient: "General User",
  dentist: "Doctor Workspace",
  doctor: "Doctor Workspace",
  receptionist: "Reception Desk",
  pharmacist: "Pharmacy Hub",
  cashier: "Cashier Desk",
  user: "Cashier Desk",
  admin: "Enterprise Admin",
};

export default function DashboardLayout({ requiredRole }) {
  const { user, isAuthenticated, loading } = useAuth();
  const { theme, setTheme } = useTheme();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) return;
    let mounted = true;
    messagesApi.getUnreadCount()
      .then((data) => {
        if (mounted && data?.unreadCount !== undefined) {
          setUnreadMsgCount(data.unreadCount);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [location.pathname, isAuthenticated]);

  // Close mobile drawer on Escape and lock body scroll when open
  useEffect(() => {
    if (!sidebarOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSidebarOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [sidebarOpen]);

  // Current page title for breadcrumb
  const menu = user?.role ? ROLE_MENUS[user.role] || [] : [];

  const activeItem = menu.find(
      (item) => item.path === location.pathname
  );

  const currentNavLabel = activeItem
      ? activeItem.label
      : location.pathname.endsWith("/profile")
          ? "Profile"
          : location.pathname.endsWith("/settings")
              ? "Settings"
              : location.pathname.endsWith("/notifications")
                  ? "Notifications"
                  : "Overview";

  if (loading) {
    return (
        <div
            style={{
              minHeight: "100vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--df-bg)",
            }}
        >
          <div className="df-spinner" />
        </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isAuthorized =
    !requiredRole ||
    user?.role === requiredRole ||
    (requiredRole === "user" && user?.role === "cashier") ||
    (requiredRole === "cashier" && user?.role === "user");

  if (!isAuthorized) {
    return <Navigate to={`/${user?.role === "cashier" ? "user" : (user?.role || "")}`} replace />;
  }

  const roleName =
      ROLE_DISPLAY_NAMES[user.role] ||
      `${user.role.toUpperCase()} SUITE`;

  const initials =
      user?.name
          ?.split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase() || "DF";

  const isAdmin = user.role === "admin";
  const isDoctor =
    user?.role === "doctor" ||
    user?.role === "dentist" ||
    location.pathname.startsWith("/doctor");
  const isReceptionist =
    user?.role === "receptionist" ||
    location.pathname.startsWith("/receptionist");
  const isCashier =
    user?.role === "cashier" ||
    user?.role === "user" ||
    location.pathname.startsWith("/cashier") ||
    location.pathname.startsWith("/user");
  const isPharmacist =
    user?.role === "pharmacist" ||
    location.pathname.startsWith("/pharmacist");
  const isPatient =
    user?.role === "patient" ||
    requiredRole === "patient" ||
    location.pathname.startsWith("/patient");

  // Footer is completely removed from all Patient Dashboard pages so the layout extends naturally to the bottom of the viewport.
  // Conditionally disabled only for the Patient Dashboard; other dashboards sharing DashboardLayout remain unaffected.
  const showFooter =
    !isPatient &&
    !isCashier &&
    !isPharmacist &&
    !isDoctor &&
    !isReceptionist &&
    !isAdmin;

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
      <div
          className={`df-dashboard ${
              isAdmin ? "df-admin" : ""
          } ${isDoctor ? "df-doctor-dashboard" : ""} ${isReceptionist ? "df-receptionist-dashboard" : ""} ${isCashier ? "df-cashier-dashboard" : ""} ${isPharmacist ? "df-pharmacist-dashboard" : ""} ${user?.role === "patient" ? "df-patient-dashboard" : ""} ${isAdmin && collapsed ? "sidebar-collapsed" : ""}`}
      >
        {/* SIDEBAR */}
        <aside
            className={`df-sidebar ${
                sidebarOpen ? "open" : ""
            } ${isAdmin ? "df-admin-sidebar" : ""}`}
        >
          {isAdmin ? (
              <>
                <div className="df-admin-topbar">
                  <button
                      type="button"
                      className="df-sidebar-close"
                      onClick={() => setSidebarOpen(false)}
                      aria-label="Close navigation drawer"
                  >
                    ✕
                  </button>
                </div>

                <AdminSidebar collapsed={collapsed} />

                <button
                    type="button"
                    className={`adm-collapse-toggle ${
                        collapsed ? "" : "open"
                    }`}
                    onClick={() => setCollapsed((c) => !c)}
                    aria-label={
                      collapsed
                          ? "Expand sidebar"
                          : "Collapse sidebar"
                    }
                    title={
                      collapsed
                          ? "Expand sidebar"
                          : "Collapse sidebar"
                    }
                >
                  <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                  >
                    {collapsed ? (
                        <path d="M9 18l6-6-6-6" />
                    ) : (
                        <path d="M15 18l-6-6 6-6" />
                    )}
                  </svg>
                </button>
              </>
          ) : (
              <>
                <div className="df-sidebar-header">
                  <div className="df-sidebar-header-top">
                    <Logo
                        size={34}
                        variant="default"
                    />

                    <button
                        type="button"
                        className="df-sidebar-close"
                        onClick={() => setSidebarOpen(false)}
                        aria-label="Close navigation drawer"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="df-sidebar-role-badge">
                <span
                    className="df-pulse-dot"
                    aria-hidden="true"
                />
                    <span>{roleName}</span>
                  </div>
                </div>

                <nav className="df-sidebar-nav">
                  <div className="df-sidebar-section-title">
                    Workspace
                  </div>

                  {menu.map((item) => (
                      <NavLink
                          key={item.path}
                          to={item.path}
                          end={item.path === `/${user.role}` || item.path === "/user" || item.path === "/cashier"}
                          className={({ isActive }) =>
                              `df-sidebar-link ${
                                  isActive ? "active" : ""
                              }`
                          }
                          onClick={() => setSidebarOpen(false)}
                      >
                        <SidebarIcon name={item.icon} />
                        <span>{item.label}</span>
                        {item.badge === "messages" && unreadMsgCount > 0 && (
                          <span
                            className="df-badge df-badge-primary"
                            style={{
                              marginLeft: "auto",
                              fontSize: 10,
                              padding: "1px 6px",
                              borderRadius: 10,
                              fontWeight: 700,
                              background: "var(--df-role-accent)",
                              color: "#fff",
                            }}
                          >
                            {unreadMsgCount}
                          </span>
                        )}
                      </NavLink>
                  ))}

                  <div className="df-sidebar-section-title">
                    Preferences
                  </div>

                  <NavLink
                      to={`/${user.role}/profile`}
                      className={({ isActive }) =>
                          `df-sidebar-link ${
                              isActive ? "active" : ""
                          }`
                      }
                      onClick={() => setSidebarOpen(false)}
                  >
                    <SidebarIcon name="settings" />
                    <span>Profile</span>
                  </NavLink>

                  <NavLink
                      to={`/${user.role}/settings`}
                      className={({ isActive }) =>
                          `df-sidebar-link ${
                              isActive ? "active" : ""
                          }`
                      }
                      onClick={() => setSidebarOpen(false)}
                  >
                    <SidebarIcon name="settings" />
                    <span>Settings</span>
                  </NavLink>
                </nav>

                <div
                    className="df-sidebar-promo"
                    style={{ margin: "0 12px 14px 12px" }}
                >
                  <div className="adm-sidebar-promo">
                    <div className="adm-promo-glow" />

                    <div className="adm-promo-inner">
                      <div
                          className="adm-promo-tooth"
                          aria-hidden="true"
                      >
                        <svg
                            width="22"
                            height="22"
                            viewBox="0 0 24 24"
                            fill="none"
                        >
                          <path
                              d="M12 2C8.5 2 6 4.5 6 8c0 3 1.5 5.5 2.5 8 .8 2 1.5 4 3.5 4s2.7-2 3.5-4c1-2.5 2.5-5 2.5-8 0-3.5-2.5-6-6-6z"
                              fill="#38bdf8"
                              fillOpacity="0.9"
                          />
                        </svg>
                      </div>

                      <div className="adm-promo-text">
                    <span className="adm-promo-script">
                      Better Care
                    </span>
                        <span className="adm-promo-sans">
                      Brighter Smiles
                    </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="df-sidebar-footer">
                  <div className="df-sidebar-user-card">
                    <div
                        className="df-sidebar-user-avatar"
                        style={{
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                    >
                      {user?.profileImage ? (
                          <img
                              src={user.profileImage}
                              alt={user?.name || "User"}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                          />
                      ) : (
                          initials
                      )}
                    </div>

                    <div className="df-sidebar-user-info">
                      <div className="df-sidebar-user-name">
                        {user?.name || "Healthcare Staff"}
                      </div>

                      <div className="df-sidebar-user-role">
                        {user?.role}
                      </div>
                    </div>
                  </div>
                </div>
              </>
          )}
        </aside>

        {/* MOBILE SIDEBAR OVERLAY */}
        {sidebarOpen && (
            <div
                className="df-sidebar-overlay"
                role="button"
                tabIndex={0}
                aria-label="Close navigation drawer"
                onClick={() => setSidebarOpen(false)}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  setSidebarOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setSidebarOpen(false);
                  }
                }}
            />
        )}

        {/* MAIN DASHBOARD */}
        <div className="df-dashboard-main">
          {/* HEADER */}
          <header className="df-dashboard-header">
            <div className="df-header-left">
              <button
                  className="df-sidebar-toggle"
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Open menu"
              >
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                >
                  <path
                      d="M3 12h18M3 6h18M3 18h18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                  />
                </svg>
              </button>

              <div className="df-header-breadcrumbs">
              <span className="df-header-breadcrumb-root">
                DentaFlow
              </span>

                <span
                    className="df-header-breadcrumb-sep"
                    aria-hidden="true"
                >
                /
              </span>

                <span className="df-header-breadcrumb-current">
                {currentNavLabel}
              </span>
              </div>
            </div>

            {/* HEADER SEARCH */}
            <GlobalSearchBar role={user?.role} isAdmin={isAdmin} />

            {/* HEADER RIGHT */}
            <div className="df-dashboard-header-right">
              {/* THEME TOGGLE */}
              <button
                  type="button"
                  className="df-theme-toggle-btn"
                  onClick={toggleTheme}
                  aria-label={`Switch to ${
                      theme === "dark" ? "light" : "dark"
                  } mode`}
                  title={`Switch to ${
                      theme === "dark" ? "light" : "dark"
                  } mode`}
              >
                {theme === "dark" ? (
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="5" />
                      <line x1="12" y1="1" x2="12" y2="3" />
                      <line x1="12" y1="21" x2="12" y2="23" />
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                      <line x1="1" y1="12" x2="3" y2="12" />
                      <line x1="21" y1="12" x2="23" y2="12" />
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </svg>
                ) : (
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                )}
              </button>

              <Link
                  className="df-header-action-link"
                  to={`/${user.role}/notifications`}
              >
                Activity
              </Link>

              <NotificationCenter />

              <ProfileDropdown />

              <div
                  className="adm-header-tagline"
                  aria-hidden="true"
              >
              <span className="adm-tagline-text">
                Healthy Smiles
                <br />
                Happier Lives
              </span>

                <span className="adm-tagline-heart">
                ♡
              </span>
              </div>
            </div>
          </header>

          {/* PAGE CONTENT */}
          <main className="df-dashboard-content">
            <Outlet />
          </main>

          {/* FOOTER */}
          {showFooter && <Footer />}
        </div>

        {/* AI CHATBOT */}
        <AIChatbot />
      </div>
  );
}