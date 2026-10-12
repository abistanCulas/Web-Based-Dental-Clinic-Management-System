import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getRoleBadgeClass } from "../../config/roles";
import "./ProfileDropdown.css";

export default function ProfileDropdown() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "U";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="df-profile-dropdown" ref={ref}>
      <button className="df-profile-trigger" onClick={() => setOpen(!open)} aria-expanded={open}>
        <div className="df-avatar" style={{ overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {user?.profileImage ? (
            <img src={user.profileImage} alt={user?.name || "User"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            initials
          )}
        </div>
        <span className="df-profile-name">{user?.name?.split(" ")[0]}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </button>

      {open && (
        <div className="df-profile-menu">
          <div className="df-profile-menu-header">
            <div className="df-avatar df-avatar-lg" style={{ overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {user?.profileImage ? (
                <img src={user.profileImage} alt={user?.name || "User"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                initials
              )}
            </div>
            <div>
              <strong>{user?.name}</strong>
              <small>{user?.email}</small>
              <span className={getRoleBadgeClass(user?.role)}>{user?.role}</span>
            </div>
          </div>
          <div className="df-profile-menu-divider" />
          <Link to={`/${user?.role}/profile`} onClick={() => setOpen(false)}>Profile</Link>
          <Link to={`/${user?.role}/settings`} onClick={() => setOpen(false)}>Account Settings</Link>
          <Link to={`/${user?.role}/settings/security`} onClick={() => setOpen(false)}>Security</Link>
          <Link to={`/${user?.role}/settings/appearance`} onClick={() => setOpen(false)}>Appearance</Link>
          <Link to={`/${user?.role}/settings/language`} onClick={() => setOpen(false)}>Language</Link>
          <div className="df-profile-menu-divider" />
          <button className="df-profile-logout" onClick={handleLogout}>Logout</button>
        </div>
      )}
    </div>
  );
}
