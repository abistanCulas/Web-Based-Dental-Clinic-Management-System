import { useState, useMemo, useEffect } from "react";
import StatCard from "../../common/StatCard";
import { Breadcrumbs, TabPills, SearchBar, ConfirmationDialog } from "../DashboardPrimitives";
import { useNotifications } from "../../../context/NotificationContext";
import { useAuth } from "../../../context/AuthContext";
import notificationsApi, { normalizeNotification } from "../../../api/notifications";

export function NotificationCenterView({ role }) {
  const { user } = useAuth();
  const { notifications: ctxNotifications, markRead: ctxMarkRead, markAllRead: ctxMarkAll, clearAll, addToast } = useNotifications();
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [realNotifications, setRealNotifications] = useState([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    let active = true;
    const uid = user?.id || user?.userId;
    const fetchPromise = uid
        ? notificationsApi.getUserNotifications(uid).catch(() => [])
        : Promise.resolve([]);

    fetchPromise.then((list) => {
      if (!active) return;
      if (list && list.length > 0) {
        setRealNotifications(list.map(normalizeNotification));
      } else {
        setRealNotifications(ctxNotifications || []);
      }
    }).catch((err) => {
      console.warn("Could not load backend notifications:", err);
      if (active) setRealNotifications(ctxNotifications || []);
    });

    return () => {
      active = false;
    };
  }, [user?.id, user?.userId, role, ctxNotifications]);

  const notifications = realNotifications.length > 0 ? realNotifications : ctxNotifications;
  const unreadCount = notifications.filter((n) => !n.read).length;

  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = unreadCount;
    const appts = notifications.filter((n) => n.type === "appointment" || n.type === "reminder").length;
    const payments = notifications.filter((n) => n.type === "payment").length;
    return { total, unread, appts, payments };
  }, [notifications, unreadCount]);

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      const matchesSearch =
        !search ||
        (n.title && n.title.toLowerCase().includes(search.toLowerCase())) ||
        (n.message && n.message.toLowerCase().includes(search.toLowerCase())) ||
        (n.type && n.type.toLowerCase().includes(search.toLowerCase()));

      if (!matchesSearch) return false;

      if (activeTab === "all") return true;
      if (activeTab === "unread") return !n.read;
      if (activeTab === "appointments") return n.type === "appointment" || n.type === "reminder";
      if (activeTab === "prescriptions") return n.type === "prescription";
      if (activeTab === "payments") return n.type === "payment";
      if (activeTab === "system") return n.type === "system";
      return true;
    });
  }, [notifications, search, activeTab]);

  const handleMarkAll = async () => {
        try {
            const unreadList = notifications.filter((n) => !n.read && typeof n.id === "number");
            await Promise.all(unreadList.map((n) => notificationsApi.markAsRead(n.id).catch(() => null)));
        } catch (err) {
            console.warn("Could not mark all as read via API:", err);
        }
        setRealNotifications((prev) => prev.map((n) => ({ ...n, read: true, status: "read" })));
        ctxMarkAll();
        addToast("All notifications marked as read.", "success");
    };

  const handleClearAll = async () => {
        try {
            await clearAll();
            setRealNotifications([]);
            addToast("Notifications cleared successfully.", "success");
        } catch (err) {
            console.warn("Could not clear notifications:", err);
            addToast("Failed to clear notifications", "error");
        }
    };

  const getIconForType = (type) => {
    switch (type) {
      case "appointment":
      case "reminder":
        return "◷";
      case "payment":
        return "$";
      case "prescription":
        return "✚";
      case "system":
      default:
        return "ℹ";
    }
  };

  const getBadgeForType = (type) => {
    switch (type) {
      case "appointment":
        return "df-badge-primary";
      case "reminder":
        return "df-badge-warning";
      case "payment":
        return "df-badge-success";
      case "prescription":
        return "df-badge-teal";
      case "system":
      default:
        return "df-badge-secondary";
    }
  };

  return (
    <div className={`df-role-page df-role-blue`}>
      <Breadcrumbs
        items={[
          { label: "Dashboard", to: `/${role}` },
          { label: "Notifications" },
        ]}
      />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Real-Time Activity Feed</span>
          <h1>Notifications & System Alerts</h1>
          <p>Stay up to date with clinical appointments, pharmacy fulfillment, payments, and system notices.</p>
        </div>
{unreadCount > 0 && (
            <button className="df-btn df-btn-secondary" onClick={handleMarkAll}>
              Mark All as Read ✓
            </button>
          )}
          <button className="df-btn df-btn-sm" style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5" }} onClick={() => setShowClearConfirm(true)}>
            Clear All
          </button>
        </header>

      <div className="df-stat-grid">
        <StatCard label="Total Notifications" value={String(stats.total)} icon="◫" color="primary" />
        <StatCard label="Unread Notifications" value={String(stats.unread)} icon="◈" color={stats.unread > 0 ? "warning" : "success"} />
        <StatCard label="Appointment Alerts" value={String(stats.appts)} icon="◷" color="primary" />
        <StatCard label="Payment Updates" value={String(stats.payments)} icon="✓" color="success" />
      </div>

      <div className="df-toolbar" style={{ marginBottom: 16 }}>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search notifications by keyword..."
        />
      </div>

      <TabPills
        tabs={[
          { label: "All Alerts", value: "all", count: stats.total },
          { label: "Unread", value: "unread", count: stats.unread },
          { label: "Appointments", value: "appointments" },
          { label: "Prescriptions", value: "prescriptions" },
          { label: "Payments", value: "payments" },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <section className="df-card">
        <div className="df-card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--df-text-muted)" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--df-text-heading)" }}>You're all caught up!</h3>
              <p style={{ fontSize: 13 }}>No notifications match your selected filter.</p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16,
                  padding: "16px",
                  borderRadius: "var(--df-radius-sm, 8px)",
                  border: "1px solid var(--df-border)",
                  background: item.read ? "var(--df-bg-elevated)" : "var(--df-primary-50)",
                  transition: "background var(--df-transition)",
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: item.read ? "var(--df-gray-100)" : "var(--df-primary-100)",
                    color: item.read ? "var(--df-text-secondary)" : "var(--df-primary-600)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {getIconForType(item.type)}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <strong style={{ fontSize: 14, color: "var(--df-text-heading)" }}>{item.title}</strong>
                    <span className={`df-badge ${getBadgeForType(item.type)}`} style={{ fontSize: 10, textTransform: "uppercase" }}>
                      {item.type}
                    </span>
                    {!item.read && (
                      <span className="df-badge df-badge-warning" style={{ fontSize: 10 }}>
                        New
                      </span>
                    )}
                    <small style={{ color: "var(--df-text-muted)", marginLeft: "auto" }}>{item.time}</small>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--df-text-secondary)", lineHeight: 1.5 }}>
                    {item.message}
                  </p>
                </div>

                {!item.read && (
                  <button
                    className="df-btn df-btn-secondary df-btn-sm"
                    style={{ flexShrink: 0 }}
                    onClick={async () => {
                      if (typeof item.id === "number") {
                        await notificationsApi.markAsRead(item.id).catch(() => null);
                      }
                      setRealNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true, status: "read" } : n)));
                      ctxMarkRead(item.id);
                      addToast(`Notification '${item.title}' marked as read.`, "info");
                    }}
                  >
                    Mark Read
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {showClearConfirm && (
        <ConfirmationDialog
          title="Clear All Notifications"
          message="Are you sure you want to clear all notifications? This action cannot be undone."
          onCancel={() => setShowClearConfirm(false)}
          onConfirm={() => { setShowClearConfirm(false); handleClearAll(); }}
        />
      )}
    </div>
  );
}
