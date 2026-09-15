import { X } from 'lucide-react'

export default function Drawer({ title, onClose, children, footer }) {
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="drawer">
        <div className="drawer-header">
          <h3 className="drawer-title">{title}</h3>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-footer">{footer}</div>}
      </div>
    </div>
  )
}
