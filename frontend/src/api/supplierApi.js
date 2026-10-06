import api from './axios';

export const supplierApi = {
  getAllSuppliers: (params) => api.get('/api/suppliers', { params }),
  getActiveSuppliers: () => api.get('/api/suppliers/active'),
  getSupplierById: (id) => api.get(`/api/suppliers/${id}`),
  createSupplier: (data) => api.post('/api/suppliers', data),
  updateSupplier: (id, data) => api.put(`/api/suppliers/${id}`, data),
  deleteSupplier: (id) => api.delete(`/api/suppliers/${id}`),
};
