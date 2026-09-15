import apiClient from "./client";

/**
 * Feedback & Reviews API service for DentaFlow
 */
export const feedbackApi = {
  /**
   * Get all feedback
   * GET /api/feedback
   */
  async getAllFeedback() {
    const response = await apiClient.get("/feedback");
    return response.data;
  },

  /**
   * Get feedback by ID
   * GET /api/feedback/{id}
   */
  async getFeedbackById(id) {
    const response = await apiClient.get(`/feedback/${id}`);
    return response.data;
  },

  /**
   * Get feedback for a user
   * GET /api/feedback/user/{userId}
   */
  async getUserFeedback(userId) {
    const response = await apiClient.get(`/feedback/user/${userId}`);
    return response.data;
  },

  /**
   * Get feedback for a patient
   * GET /api/feedback/patient/{patientId}
   */
  async getPatientFeedback(patientId) {
    const response = await apiClient.get(`/feedback/patient/${patientId}`);
    return response.data;
  },

  /**
   * Create feedback / review
   * POST /api/feedback
   */
  async createFeedback(data) {
    const response = await apiClient.post("/feedback", data);
    return response.data;
  },

  /**
   * Update feedback
   * PUT /api/feedback/{id}
   */
  async updateFeedback(id, data) {
    const response = await apiClient.put(`/feedback/${id}`, data);
    return response.data;
  },

  /**
   * Respond to feedback (Admin)
   * PUT /api/feedback/{id}/respond?adminResponse={}&respondedBy={}
   */
  async respondToFeedback(id, adminResponse, respondedBy = "Admin") {
    const response = await apiClient.put(`/feedback/${id}/respond`, null, {
      params: { adminResponse, respondedBy },
    });
    return response.data;
  },

  /**
   * Approve feedback
   * PUT /api/feedback/{id}/approve
   */
  async approveFeedback(id) {
    const response = await apiClient.put(`/feedback/${id}/approve`);
    return response.data;
  },

  /**
   * Reject feedback
   * PUT /api/feedback/{id}/reject
   */
  async rejectFeedback(id) {
    const response = await apiClient.put(`/feedback/${id}/reject`);
    return response.data;
  },

  /**
   * Delete feedback
   * DELETE /api/feedback/{id}
   */
  async deleteFeedback(id) {
    const response = await apiClient.delete(`/feedback/${id}`);
    return response.data;
  },
};

/**
 * Normalizes backend FeedbackDTO to frontend review format
 */
export function normalizeFeedback(dto, dentistsLookup = {}, patientsLookup = {}) {
  if (!dto) return null;

  const doctorObj = dto.dentistId ? dentistsLookup[dto.dentistId] : null;
  const doctorName = doctorObj
    ? doctorObj.name || `Dr. ${doctorObj.firstName || ""} ${doctorObj.lastName || ""}`.trim()
    : "Dr. James Wilson";

  const patientObj = dto.patientId ? patientsLookup[dto.patientId] : null;
  const patientName = patientObj
    ? patientObj.name || `${patientObj.firstName || ""} ${patientObj.lastName || ""}`.trim()
    : dto.patientName || "Anonymous Patient";

  const rawStatus = (dto.status || "COMPLETED").toLowerCase();
  let status = "published";
  if (rawStatus.includes("review") || rawStatus.includes("pending")) status = "pending";
  else if (rawStatus.includes("acknowledged")) status = "acknowledged";
  else if (rawStatus.includes("approved") || rawStatus.includes("complete")) status = "published";

  return {
    id: dto.id,
    feedbackCode: dto.feedbackCode,
    name: patientName,
    doctor: doctorName,
    dentistId: dto.dentistId,
    patientId: dto.patientId,
    rating: dto.rating || 5,
    text: dto.comments || dto.comment || dto.reviewText || "Excellent professional care.",
    date: dto.createdAt ? String(dto.createdAt).slice(0, 10) : "2026-03-15",
    status,
    adminReply: dto.adminResponse || null,
    respondedBy: dto.respondedBy || null,
    raw: dto,
  };
}

export default feedbackApi;
