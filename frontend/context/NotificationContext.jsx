import { createContext, useContext, useState, useEffect, useCallback } from "react";
import notificationsApi from "../api/notifications";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const uid = user?.id || user?.userId;
      const data = uid
        ? await notificationsApi.getUserNotifications(uid).catch(() => [])
        : await notificationsApi.getAllNotifications().catch(() => []);
      const normalized = (Array.isArray(data) ? data : []).map((n) => ({
        id: n.id,
        type: n.type || "system",
        title: n.title || "Notification",
        message: n.message || "",
        time: n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recently",
        date: n.createdAt ? String(n.createdAt).slice(0, 10) : new Date().toISOString().slice(0, 10),
        read: n.readStatus === "READ" || n.readStatus === true || n.isRead === true,
        status: n.readStatus === "READ" || n.readStatus === true || n.isRead === true ? "read" : "unread",
        raw: n,
      }));
      setNotifications(normalized);
    } catch {
      // Keep existing state on failure
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.userId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = async (id) => {
    try {
      await notificationsApi.markAsRead(id);
    } catch {
      // Optimistic update still applies
    }
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true, status: "read" } : n)));
  };

  const markAllRead = async () => {
    try {
      await Promise.all(notifications.filter((n) => !n.read).map((n) => notificationsApi.markAsRead(n.id)));
    } catch {
      // Optimistic update still applies
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true, status: "read" })));
  };

  const clearAll = async () => {
    try {
      await notificationsApi.deleteAllNotifications ? await notificationsApi.deleteAllNotifications() : Promise.resolve();
    } catch {
      // Fallback: just clear locally
    }
    setNotifications([]);
  };

  const addToast = (message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, clearAll, addToast, toasts, loading, fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
