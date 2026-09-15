import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import StatusBadge from "../common/StatusBadge";

export function Breadcrumbs({ items }) {
  if (!items || !items.length) return null;
  return (
    <nav className="df-breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span key={item.label || index} className="df-breadcrumb-item">
          {item.to ? (
            <Link to={item.to} className="df-breadcrumb-link">
              {item.label}
            </Link>
          ) : (
            <span className="df-breadcrumb-current">{item.label}</span>
          )}
          {index < items.length - 1 && (
            <span className="df-breadcrumb-sep" aria-hidden="true">
              →
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function TabPills({ tabs, activeTab, onChange }) {
  return (
    <div className="df-tab-pills" role="tablist">
      {tabs.map((tab) => {
        const value = typeof tab === "string" ? tab : tab.value;
        const label = typeof tab === "string" ? tab : tab.label;
        const count = tab.count !== undefined ? tab.count : null;
        return (
          <button
            key={value}
            role="tab"
            aria-selected={activeTab === value}
            className={`df-tab-pill ${activeTab === value ? "active" : ""}`}
            onClick={() => onChange(value)}
          >
            <span>{label}</span>
            {count !== null && <span className="df-tab-pill-count">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function SearchBar({ value, onChange, placeholder = "Search..." }) {
  return (
    <label className="df-dashboard-search">
      <span aria-hidden="true">⌕</span>
      <input className="df-input" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

export function FilterControl({ value, onChange, options, label = "Filter" }) {
  return (
    <label className="df-filter-control">
      <span>{label}</span>
      <select className="df-select" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

export function EmptyState({ title = "No records found", message = "Try adjusting your search or filters." }) {
  return <div className="df-empty"><div className="df-empty-icon" aria-hidden="true">○</div><h3>{title}</h3><p>{message}</p></div>;
}

export function LoadingState() {
  return <div className="df-empty" aria-live="polite"><div className="df-spinner" /><p style={{ marginTop: 12 }}>Loading dashboard data…</p></div>;
}

export function Pagination({ page, total, onChange }) {
  if (total <= 1) return null;
  return (
    <nav className="df-pagination" aria-label="Pagination">
      <button className="df-page-btn" aria-label="Previous page" disabled={page === 1} onClick={() => onChange(page - 1)}>‹</button>
      {Array.from({ length: total }, (_, index) => index + 1).map((number) => <button key={number} className={`df-page-btn ${number === page ? "active" : ""}`} onClick={() => onChange(number)}>{number}</button>)}
      <button className="df-page-btn" aria-label="Next page" disabled={page === total} onClick={() => onChange(page + 1)}>›</button>
    </nav>
  );
}

export function DataTable({ columns, rows, onEdit, onDelete, actionLabel = "Manage", onQuickAction, quickActionLabel = "Process" }) {
  const [sort, setSort] = useState({ key: columns[0]?.key, direction: "asc" });
  const sortedRows = useMemo(() => [...rows].sort((left, right) => {
    const leftValue = String(left[sort.key] ?? "");
    const rightValue = String(right[sort.key] ?? "");
    return leftValue.localeCompare(rightValue, undefined, { numeric: true }) * (sort.direction === "asc" ? 1 : -1);
  }), [rows, sort]);
  const changeSort = (key) => setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));

  if (!rows.length) return <EmptyState />;
  return (
    <div className="df-table-wrap">
      <table className="df-table">
        <thead><tr>{columns.map((column) => <th key={column.key} scope="col"><button className="df-table-sort" onClick={() => changeSort(column.key)}>{column.label}{sort.key === column.key ? (sort.direction === "asc" ? " ↑" : " ↓") : ""}</button></th>)}{(onEdit || onDelete || onQuickAction) && <th scope="col">Actions</th>}</tr></thead>
        <tbody>{sortedRows.map((row) => <tr key={row.id}>{columns.map((column) => <td key={column.key}>{column.type === "status" ? <StatusBadge status={row[column.key]} /> : column.render ? column.render(row) : row[column.key]}</td>)}{(onEdit || onDelete || onQuickAction) && <td><div className="df-table-actions">{onQuickAction && <button className="df-btn df-btn-primary df-btn-sm" onClick={() => onQuickAction(row)}>{typeof quickActionLabel === "function" ? quickActionLabel(row) : quickActionLabel}</button>}{onEdit && <button className="df-btn df-btn-secondary df-btn-sm" onClick={() => onEdit(row)}>{typeof actionLabel === "function" ? actionLabel(row) : actionLabel}</button>}{onDelete && <button className="df-icon-button danger" aria-label={`Remove ${row.name || row.id}`} onClick={() => onDelete(row)}>×</button>}</div></td>}</tr>)}</tbody>
      </table>
    </div>
  );
}

export function Modal({ title, children, onClose, footer }) {
  return <div className="df-modal-overlay" role="presentation" onMouseDown={onClose}><section className="df-modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onMouseDown={(event) => event.stopPropagation()}><header className="df-modal-header"><h3 id="dialog-title">{title}</h3><button className="df-icon-button" aria-label="Close dialog" onClick={onClose}>×</button></header><div className="df-modal-body">{children}</div>{footer && <footer className="df-modal-footer">{footer}</footer>}</section></div>;
}

export function ConfirmationDialog({ title = "Confirm action", message, onCancel, onConfirm }) {
  return <Modal title={title} onClose={onCancel} footer={<><button className="df-btn df-btn-secondary" onClick={onCancel}>Cancel</button><button className="df-btn df-btn-danger" onClick={onConfirm}>Confirm</button></>}><p>{message}</p></Modal>;
}

export function MiniBarChart({ title, values }) {
  const max = Math.max(...values.map((item) => item.value), 1);
  return <section className="df-card df-chart-card"><div className="df-card-body"><div className="df-card-title-row"><h3>{title}</h3><span className="df-badge df-badge-primary">Last 6 months</span></div><div className="df-mini-chart" aria-label={`${title} chart`}>{values.map((item) => <div className="df-bar-column" key={item.label}><span className="df-bar-value">{item.value}</span><div className="df-bar-track"><div className="df-bar" style={{ height: `${Math.max(10, (item.value / max) * 100)}%` }} /></div><small>{item.label}</small></div>)}</div></div></section>;
}
