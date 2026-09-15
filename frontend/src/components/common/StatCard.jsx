export default function StatCard({ icon, value, label, color = "primary" }) {
  const colors = {
    primary: { bg: "rgba(27,110,243,0.1)", color: "var(--df-primary-500)" },
    success: { bg: "var(--df-success-bg)", color: "var(--df-success)" },
    warning: { bg: "var(--df-warning-bg)", color: "var(--df-warning)" },
    error: { bg: "var(--df-error-bg)", color: "var(--df-error)" },
  };
  const c = colors[color] || colors.primary;

  return (
    <div className="df-stat-card">
      <div className="df-stat-icon" style={{ background: c.bg, color: c.color }}>{icon}</div>
      <div>
        <div className="df-stat-value">{value}</div>
        <div className="df-stat-label">{label}</div>
      </div>
    </div>
  );
}
