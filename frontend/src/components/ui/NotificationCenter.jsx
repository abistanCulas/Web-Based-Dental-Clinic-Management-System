import { useState, useRef, useEffect } from "react";
import { useNotifications } from "../../context/NotificationContext";
import "./NotificationCenter.css";

export default function NotificationCenter() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="df-notif-center" ref={ref}>
      <button className="df-notif-btn" onClick={() => setOpen(!open)} aria-label="Notifications">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {unreadCount > 0 && <span className="df-notif-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="df-notif-panel">
          <div className="df-notif-header">
            <h4>Notifications</h4>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="df-notif-mark-all">Mark all read</button>
            )}
          </div>
          <div className="df-notif-list">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`df-notif-item ${!n.read ? "unread" : ""}`}
                onClick={() => markRead(n.id)}
              >
                <div className="df-notif-dot" />
                <div>
                  <strong>{n.title}</strong>
                  <p>{n.message}</p>
                  <small>{n.time}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
