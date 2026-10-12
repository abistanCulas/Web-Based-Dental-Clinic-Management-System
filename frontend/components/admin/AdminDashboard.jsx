import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import AdminIcon from "./AdminIcons";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import usersApi from "../../api/users";
import { patientApi } from "../../api/patients";
import { appointmentApi, formatTime12Hour } from "../../api/appointments";
import { treatmentPlanApi } from "../../api/treatmentPlans";
import { billingApi, formatLkr } from "../../api/billing";
import { pharmacyApi } from "../../api/pharmacy";
import { feedbackApi } from "../../api/feedback";
import { inquiriesApi } from "../../api/inquiries";
import auditLogsApi from "../../api/auditLogs";

const EASE = [0.16, 1, 0.3, 1];
const MotionLink = motion.create(Link);

const KPI_ICON_TONES = {
  alert: "tone-alert",
  expiry: "tone-alert",
  pending: "tone-danger",
  revenue: "tone-cyan",
  patients: "tone-cyan",
  calendar: "tone-alert",
  dentist: "tone-cyan",
  treatment: "tone-alert",
};

export function Sparkline({ values = [], color = "#2563eb" }) {
  if (!values || values.length === 0) return null;
  const width = 96;
  const height = 30;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1 || 1)) * width;
      const y = height - ((v - min) / range) * (height - 6) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg className="adm-spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" aria-hidden="true">
      <polyline points={points} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function KpiCards({ kpis = [] }) {
  const reduce = useReducedMotion();
  return (
    <div className="adm-kpi-grid">
      {kpis.map((kpi, i) => {
        const tone = KPI_ICON_TONES[kpi.icon] || "";
        const trendCls = kpi.trendUp ? "up" : kpi.alert ? "flat" : "down";
        return (
          <motion.div
            className="adm-kpi"
            key={kpi.id || kpi.label}
            initial={{ opacity: 0, y: reduce ? 0 : 16, scale: reduce ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileHover={reduce ? undefined : { y: -5 }}
            transition={{ duration: 0.5, delay: 0.04 + i * 0.06, ease: EASE }}
          >
            <div className="adm-kpi-top">
              <span className={`adm-kpi-icon ${tone}`}>
                <AdminIcon name={kpi.icon} size={20} />
              </span>
              <div className="adm-kpi-top-right">
                <Link to={kpi.to || "/admin"} className="adm-kpi-more" aria-label={`View ${kpi.label}`}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                  </svg>
                </Link>
              </div>
            </div>
            <div>
              <div className="adm-kpi-value">{kpi.value}</div>
              <div className="adm-kpi-label">{kpi.label}</div>
            </div>
            <div className="adm-kpi-bottom-row">
              {kpi.trend && (
                <span className={`adm-kpi-trend ${trendCls}`}>
                  <AdminIcon name={kpi.trendUp ? "trendUp" : "trendDown"} size={12} strokeWidth={2.2} />
                  {kpi.trend}
                </span>
              )}
              {kpi.spark && kpi.spark.some(Boolean) && (
                <Sparkline values={kpi.spark} color={kpi.alert ? "#f59e0b" : tone === "tone-cyan" ? "#0ea5e9" : "#2563eb"} />
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function TodayAppointmentsWidget({ appointments = [], loading = false }) {
  const reduce = useReducedMotion();
  const statusChip = (status) => {
    const map = {
      completed: ["adm-chip-green", "Completed"],
      "in-progress": ["adm-chip-blue", "In Progress"],
      scheduled: ["adm-chip-royal", "Scheduled"],
      booked: ["adm-chip-royal", "Booked"],
      confirmed: ["adm-chip-royal", "Confirmed"],
      cancelled: ["adm-chip-red", "Cancelled"],
      "no-show": ["adm-chip-amber", "No Show"],
    };
    const s = String(status || "scheduled").toLowerCase();
    const [cls, label] = map[s] || ["adm-chip-gray", status];
    return <span className={`adm-chip ${cls}`}><span className="adm-chip-dot" />{label}</span>;
  };

  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <motion.section
      className="adm-card"
      initial={{ opacity: 0, y: reduce ? 0 : 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={reduce ? undefined : { y: -2 }}
      transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
    >
      <div className="adm-card-head">
        <div>
          <div className="adm-card-title">
            <span className="adm-title-icon"><AdminIcon name="calendar" size={16} /></span>
            Today's Appointments
          </div>
          <div className="adm-card-sub">{todayStr} · {appointments.length} booking{appointments.length !== 1 ? "s" : ""}</div>
        </div>
        <div className="adm-card-actions">
          <Link to="/admin/appointments" className="adm-btn adm-btn-soft adm-btn-sm">View All →</Link>
        </div>
      </div>
      <div className="adm-card-body">
        {loading ? (
          <div style={{ padding: "36px 0", textAlign: "center", color: "var(--df-text-secondary)" }}>
            Loading appointments…
          </div>
        ) : appointments.length === 0 ? (
          <div className="adm-empty-table" style={{ padding: "32px 16px", textAlign: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(37,99,235,0.08)", color: "#2563eb", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
              <AdminIcon name="calendar" size={22} />
            </div>
            <h4 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "var(--df-text-heading)" }}>No Appointments Scheduled Today</h4>
            <p style={{ margin: "0 auto 16px", maxWidth: 360, fontSize: 13, color: "var(--df-text-secondary)", lineHeight: 1.5 }}>
              Patient appointments and walk-in consultations booked for today will appear here in real time.
            </p>
            <Link to="/admin/appointments" className="adm-btn adm-btn-soft adm-btn-sm">
              Open Appointment Calendar
            </Link>
          </div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Patient</th>
                  <th>Doctor</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {appointments.slice(0, 6).map((row) => {
                  const patientName = row.patientName || row.patient || "Patient";
                  const doctorName = row.dentistName || row.doctor || "Attending Dentist";
                  const timeDisplay = formatTime12Hour(row.appointmentTime || row.time || "09:00:00");
                  return (
                    <tr key={row.id}>
                      <td className="adm-cell-strong">{timeDisplay}</td>
                      <td className="adm-user-cell">
                        <span className="adm-avatar-mini">
                          {patientName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                        </span>
                        {patientName}
                      </td>
                      <td>{doctorName}</td>
                      <td>{statusChip(row.status)}</td>
                      <td>
                        <Link to="/admin/appointments" className="adm-btn adm-btn-ghost adm-btn-sm">
                          Details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.section>
  );
}

function RevenueWidget({ bills = [], payments = [] }) {
  const reduce = useReducedMotion();
  const [range, setRange] = useState("6m");

  // Calculate real revenue metrics
  const totalRevenue = useMemo(() => {
    return bills.reduce((acc, b) => acc + Number(b.paidAmount || (b.status === "PAID" ? b.totalAmount : 0) || 0), 0);
  }, [bills]);

  const outstanding = useMemo(() => {
    return bills.reduce((acc, b) => acc + Number(b.balanceAmount != null ? b.balanceAmount : (b.status !== "PAID" ? b.totalAmount : 0) || 0), 0);
  }, [bills]);

  const collectionRate = useMemo(() => {
    const totalBilled = totalRevenue + outstanding;
    if (totalBilled <= 0) return "100.0%";
    return `${((totalRevenue / totalBilled) * 100).toFixed(1)}%`;
  }, [totalRevenue, outstanding]);

  const todayPaid = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return bills
      .filter((b) => String(b.billDate || "").slice(0, 10) === todayStr)
      .reduce((acc, b) => acc + Number(b.paidAmount || (b.status === "PAID" ? b.totalAmount : 0) || 0), 0);
  }, [bills]);

  // Aggregate monthly trend from real bills
  const chartData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const currentMonth = now.getMonth();
    const count = range === "1m" ? 4 : range === "1y" ? 12 : 6;
    const months = [];

    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), currentMonth - i, 1);
      const label = range === "1m" ? `Week ${count - i}` : monthNames[d.getMonth()];
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      
      const monthSum = bills
        .filter((b) => String(b.billDate || "").startsWith(yearMonth))
        .reduce((acc, b) => acc + Number(b.paidAmount || (b.status === "PAID" ? b.totalAmount : 0) || 0), 0);

      months.push({ label, value: monthSum });
    }
    return months;
  }, [bills, range]);

  const max = Math.max(...chartData.map((d) => d.value), 1000);
  const fmt = (v) => (v >= 1000000 ? `LKR ${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `LKR ${(v / 1000).toFixed(0)}K` : `LKR ${v}`);

  return (
    <motion.section
      className="adm-card"
      initial={{ opacity: 0, y: reduce ? 0 : 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={reduce ? undefined : { y: -2 }}
      transition={{ duration: 0.5, delay: 0.16, ease: EASE }}
    >
      <div className="adm-card-head">
        <div>
          <div className="adm-card-title">
            <span className="adm-title-icon"><AdminIcon name="revenue" size={16} /></span>
            Revenue Overview
          </div>
          <div className="adm-card-sub">Clinic operating revenue · LKR</div>
        </div>
        <div className="adm-card-actions">
          <div className="adm-tabs" style={{ margin: 0, padding: 4 }}>
            {["1m", "6m", "1y"].map((r) => (
              <button
                key={r}
                type="button"
                className={`adm-tab ${range === r ? "active" : ""}`}
                style={{ padding: "5px 11px", fontSize: "11.5px" }}
                onClick={() => setRange(r)}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
          <Link to="/admin/reports" className="adm-btn adm-btn-soft adm-btn-sm">View Report →</Link>
        </div>
      </div>
      <div className="adm-card-body">
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 4 }}>
          <div style={{ fontSize: "1.65rem", fontWeight: 800, color: "var(--df-text-heading)", letterSpacing: "-0.03em" }}>
            {formatLkr(totalRevenue)}
          </div>
          <span className="adm-kpi-trend up"><AdminIcon name="trendUp" size={12} strokeWidth={2.2} /> Live</span>
        </div>

        {bills.length === 0 ? (
          <div style={{ padding: "28px 16px", textAlign: "center", background: "rgba(14,165,233,0.03)", borderRadius: 14, margin: "14px 0" }}>
            <p style={{ margin: 0, fontSize: 13.5, color: "var(--df-text-secondary)" }}>
              No billing entries recorded yet. Generated bills and patient invoice settlements will populate this chart.
            </p>
          </div>
        ) : (
          <div className="adm-chart">
            {chartData.map((d, i) => (
              <div className="adm-chart-col" key={`${d.label}-${i}`}>
                <span className="adm-chart-value">{fmt(d.value)}</span>
                <div className="adm-chart-bar-track">
                  <motion.div
                    className="adm-chart-bar"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: `${Math.max(4, (d.value / max) * 100)}%`, opacity: 1 }}
                    transition={{ duration: 0.7, delay: 0.25 + i * 0.07, ease: EASE }}
                  />
                </div>
                <span className="adm-chart-label">{d.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="adm-chart-legend">
          <span><span className="adm-legend-dot" style={{ background: "linear-gradient(135deg,#60a5fa,#1d4ed8)" }} /> Settled payments</span>
          <span><span className="adm-legend-dot" style={{ background: "linear-gradient(135deg,#67e8f9,#0284c7)" }} /> Direct bills</span>
        </div>
        <div className="adm-rev-badges">
          <div className="adm-rev-badge tone-cyan">
            <span className="adm-rev-badge-icon"><AdminIcon name="revenue" size={14} /></span>
            <div><strong>{fmt(todayPaid)}</strong><span>Paid today</span></div>
          </div>
          <div className="adm-rev-badge tone-warning">
            <span className="adm-rev-badge-icon"><AdminIcon name="clock" size={14} /></span>
            <div><strong>{fmt(outstanding)}</strong><span>Outstanding</span></div>
          </div>
          <div className="adm-rev-badge tone-success">
            <span className="adm-rev-badge-icon"><AdminIcon name="trendUp" size={14} /></span>
            <div><strong>{collectionRate}</strong><span>Collection rate</span></div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function AlertsWidget({ alerts = [] }) {
  const reduce = useReducedMotion();
  const toneMap = { "low-stock": "t-warning", expiry: "t-warning", expired: "t-danger", deactivation: "t-info", inquiry: "t-green", feedback: "t-info" };
  const iconMap = { "low-stock": "alert", expiry: "expiry", expired: "expiry", deactivation: "shield", inquiry: "message", feedback: "star" };

  return (
    <motion.section
      className="adm-card"
      initial={{ opacity: 0, y: reduce ? 0 : 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={reduce ? undefined : { y: -2 }}
      transition={{ duration: 0.5, delay: 0.22, ease: EASE }}
    >
      <div className="adm-card-head">
        <div>
          <div className="adm-card-title">
            <span className="adm-title-icon"><AdminIcon name="bell" size={16} /></span>
            Important Alerts
          </div>
          <div className="adm-card-sub">Items requiring administrative attention</div>
        </div>
        <Link to="/admin/notifications" className="adm-btn adm-btn-ghost adm-btn-sm">All notifications</Link>
      </div>
      <div className="adm-alert-list">
        {alerts.length === 0 ? (
          <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--df-text-secondary)", fontSize: 13.5 }}>
            <span style={{ color: "#10b981", marginRight: 6, fontWeight: 700 }}>✓</span> All Clear — No pending alerts or security items requiring immediate action.
          </div>
        ) : (
          alerts.map((alert, i) => (
            <MotionLink
              className="adm-alert-row"
              to={alert.to}
              key={alert.id || alert.title}
              initial={{ opacity: 0, x: reduce ? 0 : -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.28 + i * 0.05, ease: EASE }}
            >
              <span className={`adm-alert-icon ${toneMap[alert.type] || "t-info"}`}>
                <AdminIcon name={iconMap[alert.type] || "alert"} size={19} />
              </span>
              <div className="adm-alert-main">
                <strong>{alert.title}</strong>
                <span>{alert.desc}</span>
              </div>
              <span className="adm-alert-time">{alert.time}</span>
              <AdminIcon name="chevronRight" size={15} />
            </MotionLink>
          ))
        )}
      </div>
    </motion.section>
  );
}

function PendingActionsWidget({ actions = [] }) {
  const reduce = useReducedMotion();
  const toneMap = { danger: "t-danger", primary: "t-primary", info: "t-info", warning: "t-warning" };
  const countToneMap = { danger: "c-danger", primary: "c-primary", info: "c-info", warning: "c-warning" };

  return (
    <motion.section
      className="adm-card"
      initial={{ opacity: 0, y: reduce ? 0 : 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={reduce ? undefined : { y: -2 }}
      transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
    >
      <div className="adm-card-head">
        <div>
          <div className="adm-card-title">
            <span className="adm-title-icon"><AdminIcon name="pending" size={16} /></span>
            Pending Actions
          </div>
          <div className="adm-card-sub">Admin approval & review queue</div>
        </div>
        <Link to="/admin/audit" className="adm-btn adm-btn-ghost adm-btn-sm">View All →</Link>
      </div>
      <div className="adm-card-body" style={{ paddingTop: 10 }}>
        <div className="adm-pending-list">
          {actions.map((action, i) => (
            <MotionLink
              className="adm-pending-row"
              to={action.to}
              key={action.id || action.label}
              initial={{ opacity: 0, x: reduce ? 0 : -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.26 + i * 0.05, ease: EASE }}
            >
              <span className={`adm-alert-icon ${toneMap[action.tone] || "t-primary"}`}>
                <AdminIcon name={action.icon} size={17} />
              </span>
              <span className="adm-pending-row-label">{action.label}</span>
              <span className={`adm-pending-row-count ${countToneMap[action.tone] || "c-primary"}`}>
                {action.count || 0}
              </span>
            </MotionLink>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function RecentActivityWidget({ activities = [] }) {
  const reduce = useReducedMotion();
  const toneMap = { patient: "t-patient", pharmacy: "t-pharmacy", payment: "t-payment", feedback: "t-feedback", purchase: "t-purchase", user: "t-user", deactivation: "t-deactivation" };
  const iconMap = { patient: "patients", pharmacy: "pill", payment: "revenue", feedback: "star", purchase: "purchase", user: "userPlus", deactivation: "shield" };

  return (
    <motion.section
      className="adm-card"
      initial={{ opacity: 0, y: reduce ? 0 : 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={reduce ? undefined : { y: -2 }}
      transition={{ duration: 0.5, delay: 0.25, ease: EASE }}
    >
      <div className="adm-card-head">
        <div>
          <div className="adm-card-title">
            <span className="adm-title-icon"><AdminIcon name="activity" size={16} /></span>
            Recent Activity
          </div>
          <div className="adm-card-sub">Latest clinic events and system audit</div>
        </div>
        <Link to="/admin/audit" className="adm-btn adm-btn-ghost adm-btn-sm">Audit log</Link>
      </div>
      <div className="adm-card-body" style={{ paddingTop: 10 }}>
        <div className="adm-activity-list">
          {activities.length === 0 ? (
            <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--df-text-secondary)", fontSize: 13.5 }}>
              No recent audit events recorded yet.
            </div>
          ) : (
            activities.slice(0, 5).map((item, i) => (
              <motion.div
                className="adm-activity-item"
                key={item.id || i}
                initial={{ opacity: 0, x: reduce ? 0 : -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.05, ease: EASE }}
              >
                <span className={`adm-activity-dot ${toneMap[item.type] || "t-user"}`}>
                  <AdminIcon name={iconMap[item.type] || "activity"} size={16} />
                </span>
                <div className="adm-activity-main">
                  <strong>{item.text || item.action}</strong>
                  <span>{item.detail || item.details || item.user}</span>
                </div>
                <span className="adm-activity-time">{item.time || item.timestamp}</span>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </motion.section>
  );
}

function QuickActionsWidget() {
  const reduce = useReducedMotion();
  const actions = [
    { to: "/admin/doctors", icon: "userPlus", label: "Add Doctor", tone: "cyan" },
    { to: "/admin/staff", icon: "staff", label: "Add Staff", tone: "success" },
    { to: "/admin/services", icon: "services", label: "Dental Services", tone: "primary" },
    { to: "/admin/inventory", icon: "box", label: "Manage Inventory", tone: "alert" },
    { to: "/admin/reports", icon: "table", label: "Clinic Reports", tone: "primary" },
  ];
  return (
    <motion.section
      className="adm-card"
      initial={{ opacity: 0, y: reduce ? 0 : 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={reduce ? undefined : { y: -2 }}
      transition={{ duration: 0.5, delay: 0.28, ease: EASE }}
    >
      <div className="adm-card-head">
        <div>
          <div className="adm-card-title">
            <span className="adm-title-icon"><AdminIcon name="bolt" size={16} /></span>
            Quick Actions
          </div>
        </div>
      </div>
      <div className="adm-card-body">
        <div className="adm-quick-grid-2">
          {actions.map((action, i) => (
            <MotionLink
              className="adm-quick-tile-2"
              to={action.to}
              key={action.label}
              initial={{ opacity: 0, y: reduce ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={reduce ? undefined : { y: -3 }}
              transition={{ duration: 0.4, delay: 0.32 + i * 0.05, ease: EASE }}
            >
              <span className={`adm-qt-icon-lg tone-${action.tone}`}><AdminIcon name={action.icon} size={20} /></span>
              <span className="adm-qt-label">{action.label}</span>
            </MotionLink>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function AutomationStatusWidget() {
  const reduce = useReducedMotion();
  const [list, setList] = useState([
    { id: 1, name: "Daily Appointment Reminders", type: "SMS & Email", nextRun: "08:00 AM Daily", status: "active" },
    { id: 2, name: "Inventory Low Stock Alerts", type: "Dispensary Monitor", nextRun: "Real-time", status: "active" },
    { id: 3, name: "Billing Ledger Reconciliation", type: "Daily Financials", nextRun: "11:59 PM Daily", status: "active" },
    { id: 4, name: "System Access & Security Audit", type: "Audit Logger", nextRun: "Active", status: "active" },
  ]);

  return (
    <motion.section
      className="adm-card"
      initial={{ opacity: 0, y: reduce ? 0 : 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={reduce ? undefined : { y: -2 }}
      transition={{ duration: 0.5, delay: 0.3, ease: EASE }}
    >
      <div className="adm-card-head">
        <div>
          <div className="adm-card-title">
            <span className="adm-title-icon"><AdminIcon name="automation" size={16} /></span>
            Automation Status
          </div>
          <div className="adm-card-sub">Active clinic operational workflows</div>
        </div>
        <Link to="/admin/schedule-automation" className="adm-btn adm-btn-ghost adm-btn-sm">Manage</Link>
      </div>
      <div className="adm-card-body" style={{ paddingTop: 10 }}>
        <div className="adm-auto-grid">
          {list.map((item, i) => (
            <motion.div
              className="adm-auto-card"
              key={item.id}
              initial={{ opacity: 0, y: reduce ? 0 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.34 + i * 0.05, ease: EASE }}
            >
              <div className="adm-auto-card-top">
                <span className="adm-auto-bolt-sm"><AdminIcon name="automation" size={15} /></span>
                <button
                  type="button"
                  aria-label={`Toggle ${item.name}`}
                  className={`adm-auto-pill ${item.status === "active" ? "on" : ""}`}
                  onClick={() => setList((prev) => prev.map((a) => a.id === item.id ? { ...a, status: a.status === "active" ? "paused" : "active" } : a))}
                >
                  {item.status === "active" ? "Active" : "Paused"}
                </button>
              </div>
              <strong>{item.name}</strong>
              <span>{item.type} · {item.nextRun}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function DentalVisual() {
  return (
    <div className="adm-welcome-showcase" aria-hidden="true">
      <div className="adm-showcase-glass">
        <div className="adm-showcase-clinic-art">
          <svg viewBox="0 0 200 90" fill="none" className="adm-showcase-svg">
            <defs>
              <linearGradient id="clinicGrad" x1="0" y1="0" x2="200" y2="90" gradientUnits="userSpaceOnUse">
                <stop stopColor="#e0f2fe" stopOpacity="0.8" />
                <stop offset="1" stopColor="#bfdbfe" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="toothGradSmall" x1="10" y1="0" x2="40" y2="50" gradientUnits="userSpaceOnUse">
                <stop stopColor="#ffffff" />
                <stop offset="1" stopColor="#93c5fd" />
              </linearGradient>
            </defs>
            <rect x="10" y="10" width="180" height="70" rx="10" fill="url(#clinicGrad)" />
            <path d="M120 58 C125 50 140 45 155 52 L165 56 C170 58 172 65 168 70 L158 72 C152 74 140 70 135 68 Z" fill="#3b82f6" opacity="0.8" />
            <path d="M148 50 L145 35 C144 30 150 28 154 32 L158 40" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" />
            <path d="M182 68 L182 78 M182 68 C176 60 178 50 182 46 C186 50 188 60 182 68 M182 62 C172 56 174 48 182 48 C190 48 192 56 182 62" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
            <rect x="177" y="74" width="10" height="10" rx="2" fill="#cbd5e1" />
            <path d="M40 22 C32 22 26 27 26 35 C26 41 28 48 31 54 C33 58 35 58 37 55 C38 53 39 49 40 46 C41 49 42 53 43 55 C45 58 47 58 49 54 C52 48 54 41 54 35 C54 27 48 22 40 22 Z" fill="url(#toothGradSmall)" filter="drop-shadow(0 4px 6px rgba(37,99,235,0.25))" />
          </svg>
        </div>
        <div className="adm-showcase-text">
          <strong>Clinical Excellence</strong>
          <span>Happier Smiles</span>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { notifications } = useNotifications();
  const reduce = useReducedMotion();

  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [treatmentPlans, setTreatmentPlans] = useState([]);
  const [bills, setBills] = useState([]);
  const [lowStockMedicines, setLowStockMedicines] = useState([]);
  const [deactivationRequests, setDeactivationRequests] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const loadDashboardData = async () => {
      try {
        const [
          allPatients,
          allAppointments,
          allTreatments,
          allBills,
          lowStock,
          deactReqs,
          allPo,
          allFeedback,
          allInquiries,
          allAudit,
        ] = await Promise.all([
          patientApi.getAllPatients().catch(() => []),
          appointmentApi.getAllAppointments().catch(() => []),
          treatmentPlanApi.getAllTreatmentPlans().catch(() => []),
          billingApi.getAllBills().catch(() => []),
          pharmacyApi.getLowStockMedicines().catch(() => []),
          usersApi.getDeactivationRequests().catch(() => []),
          pharmacyApi.getAllPurchaseOrders().catch(() => []),
          feedbackApi.getAllFeedback().catch(() => []),
          inquiriesApi.getAllInquiries().catch(() => []),
          auditLogsApi.getAllAuditLogs().catch(() => []),
        ]);

        if (cancelled) return;

        setPatients(Array.isArray(allPatients) ? allPatients : []);
        setAppointments(Array.isArray(allAppointments) ? allAppointments : []);

        const todayStr = new Date().toISOString().slice(0, 10);
        const todayList = Array.isArray(allAppointments)
          ? allAppointments.filter((a) => {
              const dateStr = a.appointmentDate ? String(a.appointmentDate).slice(0, 10) : "";
              return dateStr === todayStr;
            })
          : [];
        setTodayAppointments(todayList);

        setTreatmentPlans(Array.isArray(allTreatments) ? allTreatments : []);
        setBills(Array.isArray(allBills) ? allBills : []);
        setLowStockMedicines(Array.isArray(lowStock) ? lowStock : []);
        setDeactivationRequests(Array.isArray(deactReqs) ? deactReqs : []);
        setPurchaseOrders(Array.isArray(allPo) ? allPo : []);
        setFeedback(Array.isArray(allFeedback) ? allFeedback : []);
        setInquiries(Array.isArray(allInquiries) ? allInquiries : []);
        setAuditLogs(Array.isArray(allAudit) ? allAudit : []);
      } catch (err) {
        console.warn("Error loading admin dashboard real data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalRevenue = useMemo(() => {
    return bills.reduce((acc, b) => acc + Number(b.paidAmount || (b.status === "PAID" ? b.totalAmount : 0) || 0), 0);
  }, [bills]);

  const activeTreatmentsCount = useMemo(() => {
    return treatmentPlans.filter((t) => {
      const s = String(t.rawStatus || t.status || "").toUpperCase();
      return s === "IN_PROGRESS" || s === "APPROVED" || s === "ACTIVE";
    }).length;
  }, [treatmentPlans]);

  const kpis = useMemo(() => {
    return [
      {
        id: "patients",
        label: "Total Patients",
        value: patients.length.toLocaleString(),
        trend: patients.length > 0 ? "Database registered" : "None registered",
        trendUp: patients.length > 0,
        icon: "patients",
        to: "/admin/patients",
      },
      {
        id: "appointments",
        label: "Today's Appointments",
        value: todayAppointments.length.toLocaleString(),
        trend: todayAppointments.length > 0 ? "Active schedule" : "No visits today",
        trendUp: todayAppointments.length > 0,
        icon: "calendar",
        to: "/admin/appointments",
      },
      {
        id: "treatments",
        label: "Active Treatment Plans",
        value: activeTreatmentsCount.toLocaleString(),
        trend: activeTreatmentsCount > 0 ? "Ongoing care" : "None active",
        trendUp: activeTreatmentsCount > 0,
        icon: "treatment",
        to: "/admin/appointments",
      },
      {
        id: "revenue",
        label: "Total Clinic Revenue",
        value: formatLkr(totalRevenue),
        trend: bills.length > 0 ? "Settled ledger" : "No invoices",
        trendUp: totalRevenue > 0,
        icon: "revenue",
        to: "/admin/billing",
      },
    ];
  }, [patients.length, todayAppointments.length, activeTreatmentsCount, totalRevenue, bills.length]);

  const pendingActions = useMemo(() => {
    const pendingPo = purchaseOrders.filter((po) => {
      const st = String(po.status || "").toUpperCase();
      return st === "PENDING" || st === "ORDERED" || st === "DRAFT";
    }).length;

    const pendingFb = feedback.filter((f) => {
      const st = String(f.status || "").toLowerCase();
      const rating = Number(f.rating || 5);
      return st === "pending" || st === "pending-review" || rating <= 2;
    }).length;

    const pendingInq = inquiries.filter((i) => {
      const st = String(i.status || "").toLowerCase();
      return st === "pending" || st === "open";
    }).length;

    return [
      { id: "deact", to: "/admin/deactivation-requests", label: "Deactivation Requests", count: deactivationRequests.length, tone: "danger", icon: "shield" },
      { id: "po", to: "/admin/purchase-orders", label: "Purchase Orders Pending", count: pendingPo, tone: "warning", icon: "purchase" },
      { id: "fb", to: "/admin/feedback", label: "Patient Reviews To Review", count: pendingFb, tone: "info", icon: "star" },
      { id: "inq", to: "/admin/inquiries", label: "Patient Inquiries Pending", count: pendingInq, tone: "primary", icon: "message" },
    ];
  }, [deactivationRequests.length, purchaseOrders, feedback, inquiries]);

  const adminAlerts = useMemo(() => {
    const list = [];
    if (deactivationRequests.length > 0) {
      list.push({
        id: "deact-alert",
        to: "/admin/deactivation-requests",
        title: `${deactivationRequests.length} Account Deactivation Request${deactivationRequests.length > 1 ? "s" : ""}`,
        desc: "Staff or patient requested account deactivation awaiting admin review.",
        time: "Action needed",
        type: "deactivation",
      });
    }
    if (lowStockMedicines.length > 0) {
      list.push({
        id: "low-stock-alert",
        to: "/admin/low-stock",
        title: `${lowStockMedicines.length} Medicine${lowStockMedicines.length > 1 ? "s" : ""} Below Reorder Level`,
        desc: "Pharmacy stock is depleted or below safe threshold. Reorder required.",
        time: "Attention",
        type: "low-stock",
      });
    }
    const unreadNotifs = (notifications || []).filter((n) => !n.read).length;
    if (unreadNotifs > 0) {
      list.push({
        id: "notif-alert",
        to: "/admin/notifications",
        title: `${unreadNotifs} Unread Notification${unreadNotifs > 1 ? "s" : ""}`,
        desc: "New system messages, alerts or security notifications.",
        time: "Recent",
        type: "feedback",
      });
    }
    return list;
  }, [deactivationRequests.length, lowStockMedicines.length, notifications]);

  const recentActivities = useMemo(() => {
    if (auditLogs.length > 0) {
      return auditLogs.map((log) => ({
        id: log.id,
        text: log.action || "System Event",
        detail: log.details || log.username || "Admin Action",
        time: log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recently",
        type: "user",
      }));
    }
    return [];
  }, [auditLogs]);

  const today = useMemo(() => {
    const d = new Date();
    return {
      day: d.getDate(),
      month: d.toLocaleString("en-US", { month: "long" }),
      monthShort: d.toLocaleString("en-US", { month: "short" }),
      year: d.getFullYear(),
      weekday: d.toLocaleString("en-US", { weekday: "long" }),
      time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };
  }, []);

  return (
    <motion.div
      className="adm-page adm-dashboard-page"
      initial={{ opacity: 0, y: reduce ? 0 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      <motion.section
        className="adm-welcome"
        initial={{ opacity: 0, y: reduce ? 0 : 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.04, ease: EASE }}
      >
        <div className="adm-welcome-content">
          <motion.div
            initial={{ opacity: 0, y: reduce ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12, ease: EASE }}
          >
            <span className="adm-welcome-subhead">Welcome back,</span>
            <h1 className="adm-welcome-title">
              {user?.name?.split(" ")[0] || "Admin"} <span className="adm-wave">👋</span>
            </h1>
            <p className="adm-welcome-desc">Manage clinic operations, staff, appointments, and services at a glance.</p>
            <span className="adm-clinic-badge"><span /> DentaFlow open &amp; active</span>
          </motion.div>
        </div>

        <div className="adm-welcome-center">
          <div className="adm-welcome-date-text">
            {today.weekday}, {today.day} {today.monthShort} {today.year}
          </div>
          <div className="adm-welcome-quote">
            “Care today, healthier tomorrows.”
            <span className="adm-quote-line" aria-hidden="true" />
          </div>
        </div>

        <DentalVisual />
        <div className="adm-welcome-glow" aria-hidden="true" />
      </motion.section>

      <KpiCards kpis={kpis} />

      <div className="adm-grid">
        <TodayAppointmentsWidget appointments={todayAppointments} loading={loading} />
        <RevenueWidget bills={bills} />
      </div>

      <div className="adm-bento">
        <div className="adm-bento-pending"><PendingActionsWidget actions={pendingActions} /></div>
        <div className="adm-bento-activity"><RecentActivityWidget activities={recentActivities} /></div>
        <div className="adm-bento-alerts"><AlertsWidget alerts={adminAlerts} /></div>
        <div className="adm-bento-quick"><QuickActionsWidget /></div>
        <div className="adm-bento-automation"><AutomationStatusWidget /></div>
      </div>
    </motion.div>
  );
}