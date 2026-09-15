import axios from 'axios'

export const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  headers: { 'Content-Type': 'application/json' },
})

// Every backend error uses the same ApiError shape:
// { timestamp, status, error, message, details? }
// This pulls the best available message out of that shape (or axios' own
// network-level message) so callers can show it directly to the user.
export function extractErrorMessage(err) {
  const data = err?.response?.data
  if (data?.details?.length) return data.details.join(' ')
  if (data?.message) return data.message
  if (err?.message) return err.message
  return 'Something went wrong. Please try again.'
}

// ---- Feedback ----
export const FeedbackApi = {
  list: (status) => api.get('/feedback', { params: status ? { status } : {} }).then(r => r.data),
  get: (id) => api.get(`/feedback/${id}`).then(r => r.data),
  submit: (payload) => api.post('/feedback', payload).then(r => r.data),
  respond: (id, payload) => api.put(`/feedback/${id}/respond`, payload).then(r => r.data),
  remove: (id) => api.delete(`/feedback/${id}`),
}

// ---- Inquiries ----
export const InquiryApi = {
  list: (status) => api.get('/inquiries', { params: status ? { status } : {} }).then(r => r.data),
  get: (id) => api.get(`/inquiries/${id}`).then(r => r.data),
  submit: (payload) => api.post('/inquiries', payload).then(r => r.data),
  respond: (id, payload) => api.put(`/inquiries/${id}/respond`, payload).then(r => r.data),
  remove: (id) => api.delete(`/inquiries/${id}`),
}

// ---- Reports ----
export const ReportApi = {
  list: () => api.get('/reports').then(r => r.data),
  get: (id) => api.get(`/reports/${id}`).then(r => r.data),
  generate: (payload) => api.post('/reports/generate', payload).then(r => r.data),
  remove: (id) => api.delete(`/reports/${id}`),
}
