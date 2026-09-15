import { createContext, useContext, useState } from "react";

const NotificationContext = createContext(null);

const INITIAL = [
  { id: 1, type: "appointment", title: "Appointment Confirmed", message: "Your appointment with Dr. Wilson on Mar 15 at 10:00 AM is confirmed.", time: "2h ago", read: false },
  { id: 2, type: "reminder", title: "Appointment Reminder", message: "Reminder: Dental checkup tomorrow at 10:00 AM.", time: "5h ago", read: false },
  { id: 3, type: "payment", title: "Payment Received", message: "Payment of LKR 5,500 received for invoice #INV-2024-089.", time: "1d ago", read: true },
  { id: 4, type: "prescription", title: "Prescription Ready", message: "Your prescription #RX-4521 is ready for pickup.", time: "2d ago", read: true },
  { id: 5, type: "system", title: "System Update", message: "DentaFlow has been updated with new features.", time: "3d ago", read: true },
];

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(INITIAL);
  const [toasts, setToasts] = useState([]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const addToast = (message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, addToast, toasts }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
