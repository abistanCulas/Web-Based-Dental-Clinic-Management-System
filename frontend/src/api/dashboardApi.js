import api from './axios';

export const dashboardApi = {
  getStats: () => api.get('/api/dashboard/stats'),
};
