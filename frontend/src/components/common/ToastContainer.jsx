import { useNotifications } from "../../context/NotificationContext";

export default function ToastContainer() {
  const { toasts } = useNotifications();
  if (!toasts.length) return null;

  return (
    <div className="df-toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`df-toast df-alert df-alert-${t.type}`}>{t.message}</div>
      ))}
    </div>
  );
}
