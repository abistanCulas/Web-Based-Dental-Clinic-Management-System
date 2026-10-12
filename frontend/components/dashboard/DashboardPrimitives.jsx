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
              ›
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
        const isActive = activeTab === value;
        return (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`df-tab-pill ${isActive ? "active" : ""}`}
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
      <span aria-hidden="true" className="df-search-prefix-icon">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      </span>
      <input
        className="df-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button
          type="button"
          className="df-search-clear-btn"
          onClick={() => onChange("")}
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </label>
  );
}

export function FilterControl({ value, onChange, options, label = "Filter" }) {
  return (
    <label className="df-filter-control">
      <span>{label}</span>
      <select className="df-select" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function EmptyState({
  title = "No records found",
  message,
  description,
  actionLabel,
  onAction,
  action,
  children,
  icon,
}) {
  const displayMsg = message || description || "Try adjusting your search criteria or filters.";
  return (
    <div className="df-empty">
      <div className="df-empty-icon" aria-hidden="true">
        {icon ? (
          typeof icon === "string" ? (
            <span style={{ fontSize: 24 }}>{icon}</span>
          ) : (
            icon
          )
        ) : (
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12h8" />
          </svg>
        )}
      </div>
      <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 6, color: "var(--df-text-heading)" }}>
        {title}
      </h3>
      <p style={{ fontSize: "13.5px", color: "var(--df-text-secondary)", maxWidth: 420, margin: "0 auto", lineHeight: 1.5 }}>
        {displayMsg}
      </p>
      {action ? (
        <div style={{ marginTop: 16 }}>{action}</div>
      ) : actionLabel && onAction ? (
        <button
          type="button"
          className="df-btn df-btn-primary df-btn-sm"
          style={{ marginTop: 16 }}
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : children ? (
        <div style={{ marginTop: 16 }}>{children}</div>
      ) : null}
    </div>
  );
}

export function LoadingState({ message = "Loading healthcare data…" }) {
  return (
    <div className="df-empty" aria-live="polite" style={{ border: "1px solid var(--df-border)" }}>
      <div className="df-spinner" />
      <p style={{ marginTop: 14, fontWeight: 500, color: "var(--df-text-secondary)" }}>{message}</p>
    </div>
  );
}

export function Pagination({ page, total, onChange }) {
  if (total <= 1) return null;
  return (
    <nav className="df-pagination" aria-label="Pagination">
      <button
        type="button"
        className="df-page-btn"
        aria-label="Previous page"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
      >
        ‹
      </button>
      {Array.from({ length: total }, (_, index) => index + 1).map((number) => (
        <button
          key={number}
          type="button"
          className={`df-page-btn ${number === page ? "active" : ""}`}
          onClick={() => onChange(number)}
        >
          {number}
        </button>
      ))}
      <button
        type="button"
        className="df-page-btn"
        aria-label="Next page"
        disabled={page === total}
        onClick={() => onChange(page + 1)}
      >
        ›
      </button>
    </nav>
  );
}

export function DataTable({
  columns = [],
  rows = [],
  data,
  onEdit,
  onDelete,
  actionLabel = "Manage",
  onQuickAction,
  quickActionLabel = "Process",
  deleteLabel,
  rowActions,
  className = "",
  tableClassName = "",
  tableStyle,
  actionsWidth,
  actionsAlign = "left",
  actionsHeaderStyle,
  actionsCellStyle,
}) {
  const actualRows = Array.isArray(rows) && rows.length > 0 ? rows : (Array.isArray(data) ? data : (rows || []));
  const [sort, setSort] = useState({ key: columns[0]?.key, direction: "asc" });
  const sortedRows = useMemo(() => {
    return [...actualRows].sort((left, right) => {
      const leftValue = String(left[sort.key] ?? "");
      const rightValue = String(right[sort.key] ?? "");
      return (
        leftValue.localeCompare(rightValue, undefined, { numeric: true }) *
        (sort.direction === "asc" ? 1 : -1)
      );
    });
  }, [actualRows, sort]);

  const changeSort = (key) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  if (!actualRows.length) return <EmptyState />;

  const hasActions = Boolean(onEdit || onDelete || onQuickAction || rowActions);
  const hasExplicitWidths = columns.some((col) => col.width) || Boolean(actionsWidth);

  return (
    <div className={`df-table-wrap ${className}`.trim()}>
      <table className={`df-table ${tableClassName}`.trim()} style={tableStyle}>
        {hasExplicitWidths && (
          <colgroup>
            {columns.map((column) => (
              <col
                key={column.key}
                style={column.width ? { width: column.width } : undefined}
              />
            ))}
            {hasActions && (
              <col style={actionsWidth ? { width: actionsWidth } : undefined} />
            )}
          </colgroup>
        )}
        <thead>
          <tr>
            {columns.map((column) => {
              const align = column.align || (column.type === "status" ? "center" : "left");
              const headerAlign = column.headerAlign || align;
              return (
                <th
                  key={column.key}
                  scope="col"
                  className={column.headerClassName || column.className || ""}
                  style={{
                    ...(column.width ? { width: column.width } : {}),
                    textAlign: headerAlign,
                    ...(column.headerStyle || {}),
                  }}
                >
                  <button
                    type="button"
                    className="df-table-sort"
                    onClick={() => changeSort(column.key)}
                    style={{
                      width: "100%",
                      justifyContent:
                        headerAlign === "right"
                          ? "flex-end"
                          : headerAlign === "center"
                          ? "center"
                          : "flex-start",
                    }}
                  >
                    <span>{column.label}</span>
                    <span style={{ marginLeft: 4, opacity: sort.key === column.key ? 1 : 0.4 }}>
                      {sort.key === column.key ? (sort.direction === "asc" ? "▲" : "▼") : "↕"}
                    </span>
                  </button>
                </th>
              );
            })}
            {hasActions && (
              <th
                scope="col"
                style={{
                  ...(actionsWidth ? { width: actionsWidth } : {}),
                  textAlign: actionsAlign,
                  ...(actionsHeaderStyle || {}),
                }}
              >
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, rIdx) => (
            <tr key={row.id || row.rawId || rIdx}>
              {columns.map((column) => {
                const align = column.align || (column.type === "status" ? "center" : "left");
                return (
                  <td
                    key={column.key}
                    className={column.className || ""}
                    style={{
                      textAlign: align,
                      ...(column.style || {}),
                    }}
                  >
                    {column.type === "status" ? (
                      <StatusBadge status={row[column.key]} />
                    ) : column.render ? (
                      column.render(row)
                    ) : (
                      row[column.key]
                    )}
                  </td>
                );
              })}
              {hasActions && (
                <td
                  style={{
                    textAlign: actionsAlign,
                    ...(actionsCellStyle || {}),
                  }}
                >
                  <div className="df-table-actions">
                    {rowActions && rowActions(row)}
                    {onQuickAction && (
                      <button
                        type="button"
                        className="df-btn df-btn-primary df-btn-sm"
                        onClick={() => onQuickAction(row)}
                      >
                        {typeof quickActionLabel === "function" ? quickActionLabel(row) : quickActionLabel}
                      </button>
                    )}
                    {onEdit && (
                      <button
                        type="button"
                        className="df-btn df-btn-secondary df-btn-sm"
                        onClick={() => onEdit(row)}
                      >
                        {typeof actionLabel === "function" ? actionLabel(row) : actionLabel}
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        className="df-icon-button danger"
                        aria-label={`Remove ${row.name || row.id}`}
                        onClick={() => onDelete(row)}
                        title={typeof deleteLabel === "function" ? deleteLabel(row) : (deleteLabel || "Remove")}
                      >
                        {typeof deleteLabel === "function" ? deleteLabel(row) : (deleteLabel || "×")}
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Modal({ title, children, onClose, footer, actions }) {
  const modalFooter = footer || actions;
  return (
    <div className="df-modal-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="df-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="df-modal-header">
          <h3 id="dialog-title">{title}</h3>
          <button
            type="button"
            className="df-icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="df-modal-body">{children}</div>
        {modalFooter && <footer className="df-modal-footer">{modalFooter}</footer>}
      </section>
    </div>
  );
}

export function ConfirmationDialog({ title = "Confirm action", message, onCancel, onConfirm, cancelLabel = "Cancel", confirmLabel = "Confirm" }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="df-btn df-btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="df-btn df-btn-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ color: "var(--df-text-secondary)", fontSize: "14px" }}>{message}</p>
    </Modal>
  );
}

export function MiniBarChart({ title, values }) {
  const max = Math.max(...values.map((item) => item.value), 1);
  return (
    <section className="df-card df-chart-card">
      <div className="df-card-body">
        <div className="df-card-title-row">
          <h3 style={{ fontSize: "1.05rem", fontWeight: 700 }}>{title}</h3>
          <span className="df-badge df-badge-primary">Last 6 months</span>
        </div>
        <div className="df-mini-chart" aria-label={`${title} chart`}>
          {values.map((item) => (
            <div className="df-bar-column" key={item.label}>
              <span className="df-bar-value">{item.value}</span>
              <div className="df-bar-track">
                <div
                  className="df-bar"
                  style={{ height: `${item.value > 0 ? Math.max(12, (item.value / max) * 100) : 0}%` }}
                />
              </div>
              <small>{item.label}</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
