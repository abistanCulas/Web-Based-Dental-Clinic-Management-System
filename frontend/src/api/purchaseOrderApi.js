import api from './axios';

export const purchaseOrderApi = {
  getAllOrders: (params) => api.get('/api/purchase-orders', { params }),
  getOrderById: (id) => api.get(`/api/purchase-orders/${id}`),
  createOrder: (data) => api.post('/api/purchase-orders', data),
  updateOrderStatus: (id, status) => api.patch(`/api/purchase-orders/${id}/status?status=${status}`),
  deleteOrder: (id) => api.delete(`/api/purchase-orders/${id}`),
};
