const LABELS = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  SUBMITTED: 'Submitted',
  REVIEWED: 'Reviewed',
}

export default function StatusPill({ status }) {
  const cls = 'pill pill-' + status.toLowerCase()
  return <span className={cls}>{LABELS[status] ?? status}</span>
}
