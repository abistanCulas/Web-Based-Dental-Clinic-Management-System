import apiClient from "./client";

/**
 * Reports & Analytics API service for DentaFlow
 */
export const reportsApi = {
  /**
   * Get all registered reports
   * GET /api/reports
   */
  async getAllReports() {
    const response = await apiClient.get("/reports");
    return response.data;
  },

  /**
   * Get report by ID
   * GET /api/reports/{id}
   */
  async getReportById(id) {
    const response = await apiClient.get(`/reports/${id}`);
    return response.data;
  },

  /**
   * Create report
   * POST /api/reports
   */
  async createReport(data) {
    const response = await apiClient.post("/reports", data);
    return response.data;
  },

  /**
   * Update report details
   * PUT /api/reports/{id}
   */
  async updateReport(id, data) {
    const response = await apiClient.put(`/reports/${id}`, data);
    return response.data;
  },

  /**
   * Delete report
   * DELETE /api/reports/{id}
   */
  async deleteReport(id) {
    const response = await apiClient.delete(`/reports/${id}`);
    return response.data;
  },

  // ==========================================
  // AI AGGREGATED REPORTS (US5 - Real Dynamic Data)
  // ==========================================

  /**
   * Generate aggregated clinical & financial reports across all domains
   * GET /api/admin/ai/reports/all
   */
  async getAIReportsAll(params = {}) {
    const response = await apiClient.get("/admin/ai/reports/all", { params });
    return response.data;
  },

  /**
   * Generate billing analytics report
   * GET /api/admin/ai/reports/billing
   */
  async getAIReportBilling(params = {}) {
    const response = await apiClient.get("/admin/ai/reports/billing", { params });
    return response.data;
  },

  /**
   * Generate payment analytics report
   * GET /api/admin/ai/reports/payments
   */
  async getAIReportPayments(params = {}) {
    const response = await apiClient.get("/admin/ai/reports/payments", { params });
    return response.data;
  },

  /**
   * Generate revenue summary report
   * GET /api/admin/ai/reports/revenue
   */
  async getAIReportRevenue(params = {}) {
    const response = await apiClient.get("/admin/ai/reports/revenue", { params });
    return response.data;
  },

  /**
   * Generate outstanding balances report
   * GET /api/admin/ai/reports/outstanding
   */
  async getAIReportOutstanding(params = {}) {
    const response = await apiClient.get("/admin/ai/reports/outstanding", { params });
    return response.data;
  },

  /**
   * Generate refunds report
   * GET /api/admin/ai/reports/refunds
   */
  async getAIReportRefunds(params = {}) {
    const response = await apiClient.get("/admin/ai/reports/refunds", { params });
    return response.data;
  },

  /**
   * Generate appointment analytics report
   * GET /api/admin/ai/reports/appointments
   */
  async getAIReportAppointments(params = {}) {
    const response = await apiClient.get("/admin/ai/reports/appointments", { params });
    return response.data;
  },

  /**
   * Generate treatment analytics report
   * GET /api/admin/ai/reports/treatments
   */
  async getAIReportTreatments(params = {}) {
    const response = await apiClient.get("/admin/ai/reports/treatments", { params });
    return response.data;
  },

  /**
   * Generate pharmacy inventory report
   * GET /api/admin/ai/reports/inventory
   */
  async getAIReportInventory(params = {}) {
    const response = await apiClient.get("/admin/ai/reports/inventory", { params });
    return response.data;
  },

  /**
   * Generate low stock alerts report
   * GET /api/admin/ai/reports/low-stock
   */
  async getAIReportLowStock(params = {}) {
    const response = await apiClient.get("/admin/ai/reports/low-stock", { params });
    return response.data;
  },

  /**
   * Generate medicine dispensing report
   * GET /api/admin/ai/reports/dispensing
   */
  async getAIReportDispensing(params = {}) {
    const response = await apiClient.get("/admin/ai/reports/dispensing", { params });
    return response.data;
  },

  /**
   * Generate suppliers performance report
   * GET /api/admin/ai/reports/suppliers
   */
  async getAIReportSuppliers(params = {}) {
    const response = await apiClient.get("/admin/ai/reports/suppliers", { params });
    return response.data;
  },

  /**
   * Generate patients demographics & growth report
   * GET /api/admin/ai/reports/patients
   */
  async getAIReportPatients(params = {}) {
    const response = await apiClient.get("/admin/ai/reports/patients", { params });
    return response.data;
  },

  /**
   * Generate dentist performance report
   * GET /api/admin/ai/reports/dentists
   */
  async getAIReportDentists(params = {}) {
    const response = await apiClient.get("/admin/ai/reports/dentists", { params });
    return response.data;
  },

  /**
   * Generate staff allocation report
   * GET /api/admin/ai/reports/staff
   */
  async getAIReportStaff(params = {}) {
    const response = await apiClient.get("/admin/ai/reports/staff", { params });
    return response.data;
  },

  /**
   * Generate inquiry analytics report
   * GET /api/admin/ai/reports/inquiries
   */
  async getAIReportInquiries(params = {}) {
    const response = await apiClient.get("/admin/ai/reports/inquiries", { params });
    return response.data;
  },

  /**
   * Generate feedback & ratings report
   * GET /api/admin/ai/reports/feedback
   */
  async getAIReportFeedback(params = {}) {
    const response = await apiClient.get("/admin/ai/reports/feedback", { params });
    return response.data;
  },

  /**
   * Generate patient-specific comprehensive clinical & financial report
   * GET /api/admin/ai/reports/patient/{patientId}
   */
  async getAIReportPatient(patientId, params = {}) {
    const response = await apiClient.get(`/admin/ai/reports/patient/${patientId}`, { params });
    return response.data;
  },

  /**
   * Generate logged-in patient's own clinical & financial report
   * GET /api/admin/ai/reports/patient/my
   */
  async getAIMyPatientReport(params = {}) {
    const response = await apiClient.get("/admin/ai/reports/patient/my", { params });
    return response.data;
  },

  /**
   * Export report to CSV
   * GET /api/admin/ai/reports/export/csv?type={type}
   */
  async exportReportCSV(type, params = {}) {
    const response = await apiClient.get("/admin/ai/reports/export/csv", {
      params: { type, ...params },
      responseType: "blob",
    });
    return response.data;
  },
};

export default reportsApi;
