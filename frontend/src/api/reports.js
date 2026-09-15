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

  // ==========================================
  // AI AGGREGATED REPORTS
  // ==========================================

  /**
   * Generate aggregated clinical & financial reports across all domains
   * GET /api/admin/ai/reports/all
   */
  async getAIReportsAll() {
    const response = await apiClient.get("/admin/ai/reports/all");
    return response.data;
  },

  /**
   * Generate appointment analytics report
   * GET /api/admin/ai/reports/appointments
   */
  async getAIReportAppointments() {
    const response = await apiClient.get("/admin/ai/reports/appointments");
    return response.data;
  },

  /**
   * Generate treatment analytics report
   * GET /api/admin/ai/reports/treatments
   */
  async getAIReportTreatments() {
    const response = await apiClient.get("/admin/ai/reports/treatments");
    return response.data;
  },

  /**
   * Generate billing analytics report
   * GET /api/admin/ai/reports/billing
   */
  async getAIReportBilling() {
    const response = await apiClient.get("/admin/ai/reports/billing");
    return response.data;
  },

  /**
   * Generate payment analytics report
   * GET /api/admin/ai/reports/payments
   */
  async getAIReportPayments() {
    const response = await apiClient.get("/admin/ai/reports/payments");
    return response.data;
  },

  /**
   * Generate patient-specific comprehensive clinical report
   * GET /api/admin/ai/reports/patient/{patientId}
   */
  async getAIReportPatient(patientId) {
    const response = await apiClient.get(`/admin/ai/reports/patient/${patientId}`);
    return response.data;
  },
};

export default reportsApi;
