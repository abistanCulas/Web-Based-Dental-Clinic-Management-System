import apiClient from "./client";

/**
 * Inquiries API service for DentaFlow
 */
export const inquiriesApi = {
  /**
   * Submit an inquiry (Public or Authenticated)
   * POST /api/inquiries
   */
  async createInquiry(data) {
    const response = await apiClient.post("/inquiries", data);
    return response.data;
  },

  /**
   * Get all inquiries (Staff / Admin)
   * GET /api/inquiries
   */
  async getAllInquiries(params = {}) {
    const response = await apiClient.get("/inquiries", { params });
    return response.data;
  },

  /**
   * Get current user's inquiries (Patient / Authenticated user)
   * GET /api/inquiries/my
   */
  async getMyInquiries() {
    const response = await apiClient.get("/inquiries/my");
    return response.data;
  },

  /**
   * Get inquiry by ID
   * GET /api/inquiries/{id}
   */
  async getInquiryById(id) {
    const response = await apiClient.get(`/inquiries/${id}`);
    return response.data;
  },

  /**
   * Get inquiry by inquiry code
   * GET /api/inquiries/code/{inquiryCode}
   */
  async getInquiryByCode(code) {
    const response = await apiClient.get(`/inquiries/code/${code}`);
    return response.data;
  },

  /**
   * Update inquiry details
   * PUT /api/inquiries/{id}
   */
  async updateInquiry(id, data) {
    const response = await apiClient.put(`/inquiries/${id}`, data);
    return response.data;
  },

  /**
   * Update inquiry status (OPEN, IN_PROGRESS, RESOLVED, CLOSED, RESPONDED)
   * PUT /api/inquiries/{id}/status?status={status}
   */
  async updateStatus(id, status) {
    const response = await apiClient.put(`/inquiries/${id}/status`, null, {
      params: { status },
    });
    return response.data;
  },

  /**
   * Respond to an inquiry
   * PUT /api/inquiries/{id}/respond?response={response}&respondedBy={respondedBy}
   */
  async respondToInquiry(id, responseText, respondedBy = "Support Staff") {
    const response = await apiClient.put(`/inquiries/${id}/respond`, null, {
      params: { response: responseText, respondedBy },
    });
    return response.data;
  },

  /**
   * Close an inquiry
   * PUT /api/inquiries/{id}/close
   */
  async closeInquiry(id) {
    const response = await apiClient.put(`/inquiries/${id}/close`);
    return response.data;
  },

  /**
   * Reopen an inquiry
   * PUT /api/inquiries/{id}/reopen
   */
  async reopenInquiry(id) {
    const response = await apiClient.put(`/inquiries/${id}/reopen`);
    return response.data;
  },

  /**
   * Delete an inquiry (Admin only)
   * DELETE /api/inquiries/{id}
   */
  async deleteInquiry(id) {
    const response = await apiClient.delete(`/inquiries/${id}`);
    return response.data;
  },
};

export default inquiriesApi;
