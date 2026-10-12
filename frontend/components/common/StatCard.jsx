export default function StatCard({
  icon,
  value,
  label,
  color = "primary",
  trend,
  trendLabel,
  badge,
  badgeType = "success",
  subtitle,
  onMenuClick,
}) {
  const colors = {
    primary: { bg: "rgba(59, 130, 246, 0.12)", color: "#2563eb" },
    blue: { bg: "rgba(59, 130, 246, 0.12)", color: "#2563eb" },
    teal: { bg: "rgba(14, 165, 233, 0.12)", color: "#0284c7" },
    success: { bg: "rgba(34, 197, 94, 0.12)", color: "#16a34a" },
    warning: { bg: "rgba(245, 158, 11, 0.12)", color: "#d97706" },
    error: { bg: "rgba(239, 68, 68, 0.12)", color: "#dc2626" },
    slate: { bg: "rgba(71, 85, 105, 0.12)", color: "#475569" },
    purple: { bg: "rgba(139, 92, 246, 0.14)", color: "#7c3aed" },
    rose: { bg: "rgba(244, 63, 94, 0.12)", color: "#e11d48" },
    pink: { bg: "rgba(244, 63, 94, 0.12)", color: "#e11d48" },
  };

  const c = colors[color] || colors.primary;

  return (
    <div className="df-stat-card">
      <div className="df-stat-icon" style={{ background: c.bg, color: c.color }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div className="df-stat-value">{value}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {trend && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: trend.startsWith("-") ? "#dc2626" : "#16a34a",
                  background: trend.startsWith("-") ? "rgba(239, 68, 68, 0.1)" : "rgba(34, 197, 94, 0.12)",
                  padding: "2px 8px",
                  borderRadius: 9999,
                  whiteSpace: "nowrap",
                }}
              >
                {trend}
              </span>
            )}
            {badge && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: badgeType === "warning" ? "#d97706" : "#16a34a",
                  background: badgeType === "warning" ? "rgba(245, 158, 11, 0.12)" : "rgba(34, 197, 94, 0.12)",
                  padding: "2px 8px",
                  borderRadius: 9999,
                  whiteSpace: "nowrap",
                }}
              >
                {badge}
              </span>
            )}
            <button
              type="button"
              className="df-stat-menu-btn"
              onClick={onMenuClick}
              aria-label="Card options"
              title="More options"
            >
              ⋮
            </button>
          </div>
        </div>
        <div className="df-stat-label">
          {label}
          {trendLabel && (
            <span style={{ fontSize: 11, color: "var(--df-text-muted)", marginLeft: 6 }}>
              {trendLabel}
            </span>
          )}
        </div>
        {subtitle && (
          <div style={{ fontSize: 11.5, color: "var(--df-text-muted)", marginTop: 2, fontWeight: 500 }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
