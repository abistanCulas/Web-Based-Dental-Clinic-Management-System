import { useState, useRef, useEffect } from "react";
import { Bell, Trash2 } from "lucide-react";
import { useNotifications } from "../../context/NotificationContext";
import "./NotificationCenter.css";

export default function NotificationCenter() {
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClearAll = () => {
    setShowClearConfirm(true);
  };

  const confirmClearAll = () => {
    clearAll();
    setShowClearConfirm(false);
  };

  return (
    <div className="df-notif-center" ref={ref}>
      <button className="df-notif-btn" onClick={() => setOpen(!open)} aria-label="Notifications">
        <Bell size={20} strokeWidth={2} />
        {unreadCount > 0 && <span className="df-notif-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="df-notif-panel">
          <div className="df-notif-header">
            <h4>Notifications</h4>
            <div style={{ display: "flex", gap: 8 }}>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="df-notif-mark-all">Mark all read</button>
              )}
              <button onClick={handleClearAll} className="df-notif-clear-all" title="Clear all notifications">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          {showClearConfirm && (
            <div className="df-notif-clear-confirm">
              <p>Clear all notifications?</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="df-btn df-btn-sm" style={{ background: "#dc2626", color: "white" }} onClick={confirmClearAll}>
                  Clear All
                </button>
                <button className="df-btn df-btn-secondary df-btn-sm" onClick={() => setShowClearConfirm(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
          <div className="df-notif-list">
            {notifications.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px", color: "var(--df-text-muted)" }}>
                No notifications
              </div>
            ) : (
              notifications.map((n) => (
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
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
