import apiClient from "./client";
import { getImageUrl } from "./upload";

/**
 * Normalizes a backend DentistDTO into the format expected by DentaFlow frontend views.
 *
 * @param {object} dto - DentistDTO from backend
 * @returns {object} Normalized dentist object
 */
export function normalizeDentist(dto) {
  if (!dto) return null;
  const fullName = `${dto.firstName || ""} ${dto.lastName || ""}`.trim() || dto.email || "Doctor";
  const imgUrl = getImageUrl(dto.imageUrl || dto.profileImage || dto.image);
  return {
    id: dto.id,
    dentistCode: dto.dentistCode || `D-${String(dto.id || 0).padStart(3, "0")}`,
    userId: dto.userId || null,
    firstName: dto.firstName || "",
    lastName: dto.lastName || "",
    name: fullName.startsWith("Dr.") ? fullName : `Dr. ${fullName}`,
    email: dto.email || "",
    phone: dto.phone || "",
    specialization: dto.specialization || "",
    qualification: dto.qualification || "",
    experienceYears: dto.experienceYears ?? 0,
    licenseNumber: dto.licenseNumber || "",
    consultationFee: dto.consultationFee ?? null,
    status: (dto.status || "ACTIVE").toLowerCase(),
    rawStatus: (dto.status || "ACTIVE").toUpperCase(),
    bio: dto.about || dto.bio || "",
    about: dto.about || dto.bio || "",
    imageUrl: imgUrl,
    profileImage: imgUrl,
    image: imgUrl,
    role: "dentist",
  };
}

export const dentistApi = {
  /**
   * Fetch active dentists (or all if admin passes { all: true })
   * GET /api/dentists
   * @param {object} params
   * @returns {Promise<Array>}
   */
  async getAllDentists(params = {}) {
    const response = await apiClient.get("/dentists", { params });
    return Array.isArray(response.data) ? response.data.map(normalizeDentist) : [];
  },

  /**
   * Fetch all registered dentists (Admin only: active + inactive)
   * GET /api/dentists/admin
   * @returns {Promise<Array>}
   */
  async getAllDentistsAdmin() {
    const response = await apiClient.get("/dentists/admin");
    return Array.isArray(response.data) ? response.data.map(normalizeDentist) : [];
  },

  /**
   * Fetch a dentist by database ID
   * GET /api/dentists/{id}
   * @param {number|string} id
   * @returns {Promise<object>}
   */
  async getDentistById(id) {
    const response = await apiClient.get(`/dentists/${id}`);
    return normalizeDentist(response.data);
  },

  /**
   * Fetch a dentist by linked User ID
   * GET /api/dentists/user/{userId}
   * @param {number|string} userId
   * @returns {Promise<object|null>}
   */
  async getDentistByUserId(userId) {
    try {
      const response = await apiClient.get(`/dentists/user/${userId}`);
      return normalizeDentist(response.data);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Fetch weekly availability for a dentist
   * GET /api/dentist-availability/dentist/{dentistId}
   * @param {number|string} dentistId
   * @returns {Promise<Array>}
   */
  async getDentistAvailability(dentistId) {
    try {
      const response = await apiClient.get(`/dentist-availability/dentist/${dentistId}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.warn(`Could not load availability for dentist ${dentistId}:`, error);
      return [];
    }
  },

  /**
   * Fetch all dentist availability records
   * GET /api/dentist-availability
   * @returns {Promise<Array>}
   */
  async getAllAvailability() {
    try {
      const response = await apiClient.get("/dentist-availability");
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.warn("Could not load all availability:", error);
      return [];
    }
  },

  /**
   * Create dentist profile
   * POST /api/dentists
   */
  async createDentist(dentistData) {
    const response = await apiClient.post("/dentists", dentistData);
    return normalizeDentist(response.data);
  },

  /**
   * Update dentist profile
   * PUT /api/dentists/{id}
   */
  async updateDentist(id, dentistData) {
    const response = await apiClient.put(`/dentists/${id}`, dentistData);
    return normalizeDentist(response.data);
  },

  /**
   * Activate dentist profile
   * PUT /api/dentists/{id}/activate
   */
  async activateDentist(id) {
    const response = await apiClient.put(`/dentists/${id}/activate`);
    return normalizeDentist(response.data);
  },

  /**
   * Deactivate dentist profile
   * PUT /api/dentists/{id}/deactivate
   */
  async deactivateDentist(id) {
    const response = await apiClient.put(`/dentists/${id}/deactivate`);
    return normalizeDentist(response.data);
  },

  /**
   * Delete dentist profile
   * DELETE /api/dentists/{id}
   */
  async deleteDentist(id) {
    const response = await apiClient.delete(`/dentists/${id}`);
    return response.data;
  },
};

export default dentistApi;
