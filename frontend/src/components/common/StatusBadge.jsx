const STATUS_MAP = {
  confirmed: "success",
  completed: "success",
  paid: "success",
  active: "success",
  ready: "success",
  dispensed: "success",
  "in-stock": "success",
  pending: "warning",
  "low-stock": "warning",
  cancelled: "error",
  disabled: "error",
  error: "error",
};

export default function StatusBadge({ status }) {
  const variant = STATUS_MAP[status?.toLowerCase()] || "neutral";
  return <span className={`df-badge df-badge-${variant}`}>{status}</span>;
}
