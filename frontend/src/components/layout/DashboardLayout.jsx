import { useState, useEffect } from "react";
import { Link, NavLink, Outlet, Navigate } from "react-router-dom";
import Logo from "../icons/Logo";
import SidebarIcon from "../icons/SidebarIcons";
import ProfileDropdown from "../ui/ProfileDropdown";
import NotificationCenter from "../ui/NotificationCenter";
import AIChatbot from "../ui/AIChatbot";
import { useAuth } from "../../context/AuthContext";
import { ROLE_MENUS } from "../../config/roles";
import "./DashboardLayout.css";

export default function DashboardLayout({ requiredRole }) {
  const { user, isAuthenticated, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close mobile drawer on Escape and lock body scroll when open
  useEffect(() => {
    if (!sidebarOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [sidebarOpen]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="df-spinner" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  const menu = ROLE_MENUS[user.role] || [];

  return (
    <div className="df-dashboard">
      <aside className={`df-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="df-sidebar-header">
          <Logo size={32} />
          <button
            type="button"
            className="df-sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation drawer"
          >
            ✕
          </button>
        </div>
        <nav className="df-sidebar-nav">
          {menu.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === `/${user.role}`}
              className={({ isActive }) => `df-sidebar-link ${isActive ? "active" : ""}`}
              onClick={() => setSidebarOpen(false)}
            >
              <SidebarIcon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="df-sidebar-footer">
          <NavLink to={`/${user.role}/profile`} className="df-sidebar-link" onClick={() => setSidebarOpen(false)}>
            <SidebarIcon name="settings" />
            <span>Profile</span>
          </NavLink>
          <NavLink to={`/${user.role}/settings`} className="df-sidebar-link" onClick={() => setSidebarOpen(false)}>
            <SidebarIcon name="settings" />
            <span>Settings</span>
          </NavLink>
        </div>
      </aside>

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
            if (e.key === "Enter" || e.key === " ") setSidebarOpen(false);
          }}
        />
      )}

      <div className="df-dashboard-main">
        <header className="df-dashboard-header">
          <button className="df-sidebar-toggle" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
          <label className="df-header-search">
            <span aria-hidden="true">⌕</span>
            <input aria-label="Search dashboard" placeholder="Search your workspace" />
          </label>
          <div className="df-dashboard-header-right">
            <Link className="df-header-action" to={`/${user.role}/notifications`}>Activity</Link>
            <NotificationCenter />
            <ProfileDropdown />
          </div>
        </header>
        <main className="df-dashboard-content">
          <Outlet />
        </main>
      </div>
      <AIChatbot />
    </div>
  );
}
