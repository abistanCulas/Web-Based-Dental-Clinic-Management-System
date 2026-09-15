import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import ReportsPage from './pages/ReportsPage.jsx'
import InquiriesPage from './pages/InquiriesPage.jsx'
import FeedbackPage from './pages/FeedbackPage.jsx'

export default function App() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/inquiries" element={<InquiriesPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
        </Routes>
      </div>
    </div>
  )
}
