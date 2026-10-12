const STATUS_MAP = {
  confirmed: "success",
  completed: "success",
  paid: "success",
  active: "success",
  ready: "success",
  dispensed: "success",
  "in-stock": "success",
  approved: "success",
  success: "success",
  pending: "warning",
  "low-stock": "warning",
  waiting: "warning",
  "partially-paid": "warning",
  partial: "warning",
  "refund-pending": "warning",
  "partially-refunded": "warning",

  cancelled: "error",
  disabled: "error",
  error: "error",
  failed: "error",
  "refund-failed": "error",
  unpaid: "error",
  "out-of-stock": "error",
  rejected: "error",
  overdue: "error",

  booked: "primary",
  scheduled: "primary",
  "in-consultation": "teal",
  "in-chair": "teal",
  processing: "primary",
  refunded: "neutral",
  inactive: "neutral",
};

export default function StatusBadge({ status }) {
  if (!status) return null;
  const normalizedKey = String(status).toLowerCase().replace(/_/g, "-");
  const variant = STATUS_MAP[normalizedKey] || "neutral";
  const displayLabel = String(status).replace(/_/g, " ");

  return (
    <span className={`df-badge df-badge-${variant}`}>
      {displayLabel}
    </span>
  );
}
