import api from './axios';

export const inventoryApi = {
  getAllItems: (params) => api.get('/api/inventory', { params }),
  getItemById: (id) => api.get(`/api/inventory/${id}`),
  createItem: (data) => api.post('/api/inventory', data),
  updateItem: (id, data) => api.put(`/api/inventory/${id}`, data),
  updateStock: (id, data) => api.patch(`/api/inventory/${id}/stock`, data),
  dispenseItem: (id, data) => api.post(`/api/inventory/${id}/dispense`, data),
  disposeExpiredItem: (id) => api.delete(`/api/inventory/${id}/dispose-expired`),
  deleteItem: (id) => api.delete(`/api/inventory/${id}`),
  getLowStockItems: () => api.get('/api/inventory/low-stock'),
  getExpiredItems: () => api.get('/api/inventory/expired'),
  getExpiringSoonItems: () => api.get('/api/inventory/expiring-soon'),
  getItemsBySupplier: (supplierId) => api.get(`/api/inventory/by-supplier/${supplierId}`),
};
