import { NavLink } from 'react-router-dom'
import { LayoutGrid, FileBarChart, MessageCircleQuestion, Star } from 'lucide-react'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/reports', label: 'Reports', icon: FileBarChart },
  { to: '/inquiries', label: 'Inquiries', icon: MessageCircleQuestion },
  { to: '/feedback', label: 'Feedback', icon: Star },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-name">DentaFlow</div>
        <div className="sidebar-brand-tag">Reports, Inquiry &amp; Feedback</div>
      </div>
      <nav className="sidebar-nav">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
          >
            <Icon size={17} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        Module 6 · Administrator &amp; Receptionist
      </div>
    </aside>
  )
}
