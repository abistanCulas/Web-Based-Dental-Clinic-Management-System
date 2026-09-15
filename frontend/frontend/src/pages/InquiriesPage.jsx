import { useEffect, useState } from 'react'
import { Plus, MessageCircleQuestion, Trash2 } from 'lucide-react'
import { InquiryApi, extractErrorMessage } from '../api/client.js'
import StatusPill from '../components/StatusPill.jsx'
import EmptyState from '../components/EmptyState.jsx'
import Drawer from '../components/Drawer.jsx'

const FILTERS = ['ALL', 'PENDING', 'IN_PROGRESS', 'RESOLVED']

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState([])
  const [filter, setFilter] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')

  const [selected, setSelected] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  function load() {
    setLoading(true)
    InquiryApi.list(filter === 'ALL' ? undefined : filter)
      .then(setInquiries)
      .catch((err) => setListError(extractErrorMessage(err)))
      .finally(() => setLoading(false))
  }

  useEffect(load, [filter])

  async function handleDelete(id) {
    if (!confirm('Delete this inquiry record? This cannot be undone.')) return
    await InquiryApi.remove(id)
    load()
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">Inquiries</h1>
          <p className="page-subtitle">
            Review inquiries submitted through the patient portal and record a response.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Log inquiry
        </button>
      </header>

      <div className="page-body">
        <div className="panel">
          <div className="panel-header">
            <h2>All inquiries</h2>
            <div className="filter-row">
              {FILTERS.map(f => (
                <button
                  key={f}
                  className={'chip' + (filter === f ? ' active' : '')}
                  onClick={() => setFilter(f)}
                >
                  {f === 'ALL' ? 'All' : f.replace('_', ' ').toLowerCase().replace(/^./, c => c.toUpperCase())}
                </button>
              ))}
            </div>
          </div>

          {listError && <div className="alert alert-error" style={{ margin: '16px 20px 0' }}>{listError}</div>}

          {!loading && inquiries.length === 0 ? (
            <EmptyState
              icon={MessageCircleQuestion}
              title="No inquiries here"
              description="Inquiries submitted by patients, or logged by staff, will show up in this list."
            />
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Subject</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map(i => (
                  <tr key={i.id} style={{ cursor: 'pointer' }}>
                    <td onClick={() => setSelected(i)}>
                      <div className="cell-primary">{i.patientName || `Patient #${i.patientId}`}</div>
                      <div className="cell-muted">{i.contactEmail || '—'}</div>
                    </td>
                    <td onClick={() => setSelected(i)}>{i.subject}</td>
                    <td onClick={() => setSelected(i)} className="cell-mono">{formatDate(i.submittedDate)}</td>
                    <td onClick={() => setSelected(i)}><StatusPill status={i.status} /></td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelected(i)}>View</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(i.id)} aria-label="Delete">
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
        <CreateInquiryDrawer
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load() }}
        />
      )}

      {selected && (
        <InquiryDetailDrawer
          inquiry={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => { setSelected(null); load() }}
        />
      )}
    </>
  )
}

function CreateInquiryDrawer({ onClose, onCreated }) {
  const [form, setForm] = useState({ patientId: '', patientName: '', contactEmail: '', subject: '', message: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function update(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSubmit() {
    setError('')
    setSaving(true)
    try {
      await InquiryApi.submit({ ...form, patientId: Number(form.patientId) })
      onCreated()
    } catch (err) {
      // Surfaces extension 6a: incomplete inquiry information.
      setError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      title="Log a new inquiry"
      onClose={onClose}
      footer={(
        <>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Save inquiry'}
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
        <label>Contact email</label>
        <input className="input" type="email" value={form.contactEmail}
          onChange={e => update('contactEmail', e.target.value)} placeholder="patient@email.com" />
      </div>
      <div className="field">
        <label>Subject</label>
        <input className="input" value={form.subject}
          onChange={e => update('subject', e.target.value)} placeholder="What is this about?" />
      </div>
      <div className="field">
        <label>Message</label>
        <textarea className="textarea" value={form.message}
          onChange={e => update('message', e.target.value)} placeholder="Details of the inquiry" />
      </div>
    </Drawer>
  )
}

function InquiryDetailDrawer({ inquiry, onClose, onUpdated }) {
  const [status, setStatus] = useState(inquiry.status)
  const [response, setResponse] = useState(inquiry.response || '')
  const [respondedBy, setRespondedBy] = useState(inquiry.respondedBy || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setError('')
    setSaving(true)
    try {
      await InquiryApi.respond(inquiry.id, { status, response, respondedBy })
      onUpdated()
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      title={inquiry.subject}
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
        <div className="detail-value">{inquiry.patientName || `Patient #${inquiry.patientId}`} {inquiry.contactEmail ? `· ${inquiry.contactEmail}` : ''}</div>
      </div>
      <div className="detail-block">
        <div className="detail-label">Message</div>
        <div className="detail-value">{inquiry.message}</div>
      </div>
      <div className="detail-block">
        <div className="detail-label">Submitted</div>
        <div className="detail-value">{formatDate(inquiry.submittedDate)}</div>
      </div>

      <div className="field" style={{ marginTop: 20 }}>
        <label>Status</label>
        <select className="select" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="RESOLVED">Resolved</option>
        </select>
      </div>
      <div className="field">
        <label>Response</label>
        <textarea className="textarea" value={response} onChange={e => setResponse(e.target.value)}
          placeholder="Write a response to the patient" />
      </div>
      <div className="field">
        <label>Responded by</label>
        <input className="input" value={respondedBy} onChange={e => setRespondedBy(e.target.value)}
          placeholder="Your name" />
        <div className="hint">Shown against this inquiry for accountability.</div>
      </div>
    </Drawer>
  )
}
