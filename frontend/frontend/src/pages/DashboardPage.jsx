import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FeedbackApi, InquiryApi, ReportApi, extractErrorMessage } from '../api/client.js'
import StatusPill from '../components/StatusPill.jsx'
import StarRating from '../components/StarRating.jsx'

export default function DashboardPage() {
  const [feedback, setFeedback] = useState([])
  const [inquiries, setInquiries] = useState([])
  const [reports, setReports] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([FeedbackApi.list(), InquiryApi.list(), ReportApi.list()])
      .then(([f, i, r]) => { setFeedback(f); setInquiries(i); setReports(r) })
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  const pendingInquiries = inquiries.filter(i => i.status === 'PENDING').length
  const openFeedback = feedback.filter(f => f.status !== 'RESOLVED').length
  const avgRating = feedback.length
    ? (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length).toFixed(1)
    : '—'

  const recentInquiries = [...inquiries]
    .sort((a, b) => new Date(b.submittedDate) - new Date(a.submittedDate))
    .slice(0, 5)

  const recentFeedback = [...feedback]
    .sort((a, b) => new Date(b.submittedDate) - new Date(a.submittedDate))
    .slice(0, 5)

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Overview of clinic reports, patient inquiries and feedback.
          </p>
        </div>
      </header>

      <div className="page-body">
        {error && <div className="alert alert-error">{error}</div>}

        <div className="stat-grid">
          <div className="stat-tile">
            <div className="stat-value">{pendingInquiries}</div>
            <div className="stat-label">Pending inquiries</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{openFeedback}</div>
            <div className="stat-label">Feedback awaiting review</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{avgRating}</div>
            <div className="stat-label">Average patient rating</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{reports.length}</div>
            <div className="stat-label">Reports generated</div>
          </div>
        </div>

        <div className="form-grid">
          <div className="panel">
            <div className="panel-header">
              <h2>Recent inquiries</h2>
              <Link className="btn btn-outline btn-sm" to="/inquiries">View all</Link>
            </div>
            {!loading && recentInquiries.length === 0 ? (
              <div className="empty-state"><p>No inquiries yet.</p></div>
            ) : (
              <table>
                <tbody>
                  {recentInquiries.map(i => (
                    <tr key={i.id}>
                      <td>
                        <div className="cell-primary">{i.subject}</div>
                        <div className="cell-muted">{i.patientName || `Patient #${i.patientId}`}</div>
                      </td>
                      <td><StatusPill status={i.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Recent feedback</h2>
              <Link className="btn btn-outline btn-sm" to="/feedback">View all</Link>
            </div>
            {!loading && recentFeedback.length === 0 ? (
              <div className="empty-state"><p>No feedback yet.</p></div>
            ) : (
              <table>
                <tbody>
                  {recentFeedback.map(f => (
                    <tr key={f.id}>
                      <td>
                        <div className="cell-primary">{f.subject}</div>
                        <div className="cell-muted">{f.patientName || `Patient #${f.patientId}`}</div>
                      </td>
                      <td><StarRating value={f.rating} size={13} /></td>
                      <td><StatusPill status={f.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
