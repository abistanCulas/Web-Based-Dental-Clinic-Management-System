import apiClient from "./client";

/**
 * Normalizes a ReviewDTO from backend
 */
export function normalizeReview(dto) {
  if (!dto) return null;
  return {
    id: dto.id,
    patientId: dto.patientId,
    patientName: dto.patientName || "Anonymous Patient",
    patientEmail: dto.patientEmail,
    dentistId: dto.dentistId,
    dentistName: dto.dentistName || "",
    rating: Number(dto.rating) || 5,
    comment: dto.comment || "",
    status: (dto.status || "ACTIVE").toUpperCase(),
    createdAt: dto.createdAt || null,
    updatedAt: dto.updatedAt || null,
  };
}

export const reviewsApi = {
  /**
   * Get all active reviews for public display
   * GET /api/reviews/public
   */
  async getPublicReviews() {
    try {
      const response = await apiClient.get("/reviews/public");
      return Array.isArray(response.data) ? response.data.map(normalizeReview) : [];
    } catch {
      return [];
    }
  },

  /**
   * Get all reviews (Admin / Staff)
   * GET /api/reviews
   */
  async getAllReviews() {
    const response = await apiClient.get("/reviews");
    return Array.isArray(response.data) ? response.data.map(normalizeReview) : [];
  },

  /**
   * Get reviews by dentist ID
   * GET /api/reviews/dentist/{dentistId}
   */
  async getDentistReviews(dentistId) {
    const response = await apiClient.get(`/reviews/dentist/${dentistId}`);
    return Array.isArray(response.data) ? response.data.map(normalizeReview) : [];
  },

  /**
   * Get logged-in patient's own reviews
   * GET /api/reviews/my
   */
  async getMyReviews() {
    const response = await apiClient.get("/reviews/my");
    return Array.isArray(response.data) ? response.data.map(normalizeReview) : [];
  },

  /**
   * Create a review (Patient CRUD - immediately active, no approval)
   * POST /api/reviews
   */
  async createReview(data) {
    const response = await apiClient.post("/reviews", data);
    return normalizeReview(response.data);
  },

  /**
   * Update review (Patient CRUD)
   * PUT /api/reviews/{id}
   */
  async updateReview(id, data) {
    const response = await apiClient.put(`/reviews/${id}`, data);
    return normalizeReview(response.data);
  },

  /**
   * Delete review (Patient CRUD)
   * DELETE /api/reviews/{id}
   */
  async deleteReview(id) {
    const response = await apiClient.delete(`/reviews/${id}`);
    return response.data;
  },

  /**
   * Admin hide review
   * PUT /api/reviews/{id}/hide
   */
  async hideReview(id) {
    const response = await apiClient.put(`/reviews/${id}/hide`);
    return normalizeReview(response.data);
  },

  /**
   * Admin activate review
   * PUT /api/reviews/{id}/activate
   */
  async activateReview(id) {
    const response = await apiClient.put(`/reviews/${id}/activate`);
    return normalizeReview(response.data);
  },
};

export default reviewsApi;
