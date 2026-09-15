const icons = {
  dashboard: <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="currentColor" strokeWidth="1.5" fill="none" />,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="1.5" /></>,
  plus: <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />,
  doctors: <><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" fill="none" /></>,
  records: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M14 2v6h6M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.5" /></>,
  prescription: <><rect x="4" y="2" width="16" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M8 7h8M8 11h8M8 15h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>,
  payment: <><rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M2 10h20" stroke="currentColor" strokeWidth="1.5" /></>,
  star: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.5" fill="none" />,
  message: <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="currentColor" strokeWidth="1.5" fill="none" />,
  patients: <><circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" /><circle cx="17" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M3 20c0-3.3 2.7-6 6-6M14 20c0-2.5 1.8-4.5 4-4.5" stroke="currentColor" strokeWidth="1.5" fill="none" /></>,
  plan: <><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="currentColor" strokeWidth="1.5" fill="none" /><rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.5" /></>,
  history: <><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>,
  schedule: <><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M8 2v4M16 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01" stroke="currentColor" strokeWidth="1.5" /></>,
  register: <><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" fill="none" /><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M19 8v6M22 11h-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>,
  invoice: <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M14 2v6h6M9 15l2 2 4-4" stroke="currentColor" strokeWidth="1.5" /></>,
  pending: <><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>,
  refund: <><path d="M3 12a9 9 0 1016.5-5.5" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M3 4v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>,
  report: <><path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>,
  dispensed: <><path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M22 4L12 14.01l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>,
  inventory: <><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="currentColor" strokeWidth="1.5" fill="none" /></>,
  stock: <><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" stroke="currentColor" strokeWidth="1.5" fill="none" /></>,
  alert: <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>,
  users: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" fill="none" /><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.5" fill="none" /></>,
  receptionist: <><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M4 20c0-4 3.6-7 8-7" stroke="currentColor" strokeWidth="1.5" fill="none" /><rect x="16" y="14" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" /></>,
  cashier: <><rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M12 12h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></>,
  pharmacist: <><path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.5" /><rect x="4" y="4" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.5" /></>,
  service: <><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>,
  treatment: <><path d="M12 2a10 10 0 100 20 10 10 0 000-20z" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>,
  settings: <><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>,
};

export default function SidebarIcon({ name, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {icons[name] || icons.dashboard}
    </svg>
  );
}
