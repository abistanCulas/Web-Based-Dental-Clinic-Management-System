import { useEffect, useState } from 'react'
import { Plus, Star, Trash2 } from 'lucide-react'
import { FeedbackApi, extractErrorMessage } from '../api/client.js'
import StatusPill from '../components/StatusPill.jsx'
import StarRating from '../components/StarRating.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Drawer from '../components/Drawer.jsx'

const FILTERS = ['ALL', 'SUBMITTED', 'REVIEWED', 'RESOLVED']

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function FeedbackPage() {
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')

  const [selected, setSelected] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  function load() {
    setLoading(true)
    FeedbackApi.list(filter === 'ALL' ? undefined : filter)
      .then(setItems)
      .catch((err) => setListError(extractErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [filter])

  async function handleDelete(id) {
    if (!confirm('Delete this feedback record? This cannot be undone.')) return
    await FeedbackApi.remove(id)
    load()
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Feedback</h1>
          <p className="page-subtitle">
            Review patient feedback and record how the clinic responded.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Log feedback
        </button>
      </header>

      <div className="page-body">
        <div className="panel">
          <div className="panel-header">
            <h2>All feedback</h2>
            <div className="filter-row">
              {FILTERS.map(f => (
                <button
                  key={f}
                  className={'chip' + (filter === f ? ' active' : '')}
                  onClick={() => setFilter(f)}
                >
                  {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {listError && <div className="alert alert-error" style={{ margin: '16px 20px 0' }}>{listError}</div>}

          {!loading && items.length === 0 ? (
            <EmptyState
              icon={Star}
              title="No feedback here"
              description="Feedback submitted by patients, or logged by staff, will show up in this list."
            />
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Subject</th>
                  <th>Rating</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map(f => (
                  <tr key={f.id}>
                    <td onClick={() => setSelected(f)} style={{ cursor: 'pointer' }}>
                      {f.patientName || `Patient #${f.patientId}`}
                    </td>
                    <td onClick={() => setSelected(f)} style={{ cursor: 'pointer' }}>{f.subject}</td>
                    <td onClick={() => setSelected(f)} style={{ cursor: 'pointer' }}>
                      <StarRating value={f.rating} size={14} />
                    </td>
                    <td onClick={() => setSelected(f)} style={{ cursor: 'pointer' }} className="cell-mono">
                      {formatDate(f.submittedDate)}
                    </td>
                    <td onClick={() => setSelected(f)} style={{ cursor: 'pointer' }}>
                      <StatusPill status={f.status} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelected(f)}>View</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(f.id)} aria-label="Delete">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateFeedbackDrawer
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load() }}
        />
      )}

      {selected && (
        <FeedbackDetailDrawer
          feedback={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => { setSelected(null); load() }}
        />
      )}
    </>
  )
}

function CreateFeedbackDrawer({ onClose, onCreated }) {
  const [form, setForm] = useState({ patientId: '', patientName: '', subject: '', comments: '', rating: 5 })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function update(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSubmit() {
    setError('')
    setSaving(true)
    try {
      await FeedbackApi.submit({ ...form, patientId: Number(form.patientId), rating: Number(form.rating) })
      onCreated()
    } catch (err) {
      // Surfaces extension 7a: invalid feedback information.
      setError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      title="Log feedback"
      onClose={onClose}
      footer={(
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Save feedback'}
          </button>
        </>
      )}
    >
      {error && <div className="alert alert-error">{error}</div>}

      <div className="field">
        <label>Patient ID</label>
        <input className="input" type="number" value={form.patientId}
          onChange={e => update('patientId', e.target.value)} placeholder="e.g. 104" />
      </div>
      <div className="field">
        <label>Patient name</label>
        <input className="input" value={form.patientName}
          onChange={e => update('patientName', e.target.value)} placeholder="e.g. Nimal Perera" />
      </div>
      <div className="field">
        <label>Subject</label>
        <input className="input" value={form.subject}
          onChange={e => update('subject', e.target.value)} placeholder="What is this feedback about?" />
      </div>
      <div className="field">
        <label>Rating</label>
        <select className="select" value={form.rating} onChange={e => update('rating', e.target.value)}>
          {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Comments</label>
        <textarea className="textarea" value={form.comments}
          onChange={e => update('comments', e.target.value)} placeholder="What did the patient say?" />
      </div>
    </Drawer>
  )
}

function FeedbackDetailDrawer({ feedback, onClose, onUpdated }) {
  const [status, setStatus] = useState(feedback.status)
  const [staffResponse, setStaffResponse] = useState(feedback.staffResponse || '')
  const [respondedBy, setRespondedBy] = useState(feedback.respondedBy || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setError('')
    setSaving(true)
    try {
      await FeedbackApi.respond(feedback.id, { status, staffResponse, respondedBy })
      onUpdated()
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      title={feedback.subject}
      onClose={onClose}
      footer={(
        <>
          <button className="btn btn-outline" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save response'}
          </button>
        </>
      )}
    >
      {error && <div className="alert alert-error">{error}</div>}

      <div className="detail-block">
        <div className="detail-label">Patient</div>
        <div className="detail-value">{feedback.patientName || `Patient #${feedback.patientId}`}</div>
      </div>
      <div className="detail-block">
        <div className="detail-label">Rating</div>
        <div className="detail-value"><StarRating value={feedback.rating} /></div>
      </div>
      <div className="detail-block">
        <div className="detail-label">Comments</div>
        <div className="detail-value">{feedback.comments}</div>
      </div>
      <div className="detail-block">
        <div className="detail-label">Submitted</div>
        <div className="detail-value">{formatDate(feedback.submittedDate)}</div>
      </div>

      <div className="field" style={{ marginTop: 20 }}>
        <label>Status</label>
        <select className="select" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="SUBMITTED">Submitted</option>
          <option value="REVIEWED">Reviewed</option>
          <option value="RESOLVED">Resolved</option>
        </select>
      </div>
      <div className="field">
        <label>Response</label>
        <textarea className="textarea" value={staffResponse} onChange={e => setStaffResponse(e.target.value)}
          placeholder="Write a response or internal note" />
      </div>
      <div className="field">
        <label>Responded by</label>
        <input className="input" value={respondedBy} onChange={e => setRespondedBy(e.target.value)}
          placeholder="Your name" />
      </div>
    </Drawer>
  )
}
