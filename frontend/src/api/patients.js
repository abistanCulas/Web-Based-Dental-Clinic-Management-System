import apiClient from "./client";

/**
 * Normalizes a backend PatientDTO into the format expected by DentaFlow frontend views.
 *
 * @param {object} dto - PatientDTO from backend
 * @returns {object} Normalized patient object
 */
export function normalizePatient(dto) {
  if (!dto) return null;
  const fullName = `${dto.firstName || ""} ${dto.lastName || ""}`.trim() || dto.email || "Unnamed Patient";
  return {
    id: dto.id,
    patientCode: dto.patientCode || `P${String(dto.id || 0).padStart(4, "0")}`,
    userId: dto.userId || null,
    firstName: dto.firstName || "",
    lastName: dto.lastName || "",
    name: fullName,
    email: dto.email || "",
    phone: dto.phone || "",
    nic: dto.nic || "",
    dateOfBirth: dto.dateOfBirth || "",
    gender: dto.gender || "Other",
    bloodGroup: dto.bloodGroup || "Unknown",
    address: dto.address || "",
    city: dto.city || "",
    emergencyContactName: dto.emergencyContactName || "",
    emergencyContactPhone: dto.emergencyContactPhone || "",
    allergies: dto.allergies || "None reported",
    medicalConditions: dto.medicalConditions || "None",
    currentMedications: dto.currentMedications || "None",
    status: (dto.status || "ACTIVE").toLowerCase(),
    joined: dto.dateOfBirth || "2024-01-15",
    role: "patient",
  };
}

/**
 * Converts an approximate age in years to an ISO YYYY-MM-DD dateOfBirth.
 *
 * @param {number|string} age - Age in years
 * @returns {string} YYYY-MM-DD date string
 */
export function ageToDateOfBirth(age) {
  const numAge = parseInt(age, 10);
  const validAge = isNaN(numAge) || numAge <= 0 ? 30 : numAge;
  const d = new Date();
  d.setFullYear(d.getFullYear() - validAge);
  return d.toISOString().split("T")[0];
}

export const patientApi = {
  /**
   * Fetch all registered patients
   * GET /api/patients
   * @returns {Promise<Array>}
   */
  async getAllPatients() {
    const response = await apiClient.get("/patients");
    return Array.isArray(response.data) ? response.data.map(normalizePatient) : [];
  },

  /**
   * Fetch a single patient by primary key ID
   * GET /api/patients/{id}
   * @param {number|string} id
   * @returns {Promise<object>}
   */
  async getPatientById(id) {
    const response = await apiClient.get(`/patients/${id}`);
    return normalizePatient(response.data);
  },

  /**
   * Fetch a patient by patient code (e.g. "P0001")
   * GET /api/patients/code/{code}
   * @param {string} patientCode
   * @returns {Promise<object>}
   */
  async getPatientByCode(patientCode) {
    const response = await apiClient.get(`/patients/code/${encodeURIComponent(patientCode)}`);
    return normalizePatient(response.data);
  },

  /**
   * Fetch a patient profile linked to a specific User ID
   * GET /api/patients/user/{userId}
   * @param {number|string} userId
   * @returns {Promise<object|null>}
   */
  async getPatientByUserId(userId) {
    try {
      const response = await apiClient.get(`/patients/user/${userId}`);
      return normalizePatient(response.data);
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Search patients by first/last name
   * GET /api/patients/search?keyword={keyword}
   * @param {string} keyword
   * @returns {Promise<Array>}
   */
  async searchPatients(keyword) {
    const response = await apiClient.get("/patients/search", {
      params: { keyword: keyword?.trim() || "" },
    });
    return Array.isArray(response.data) ? response.data.map(normalizePatient) : [];
  },

  /**
   * Create a new patient record
   * POST /api/patients
   * @param {object} patientData - PatientDTO payload
   * @returns {Promise<object>}
   */
  async createPatient(patientData) {
    const response = await apiClient.post("/patients", patientData);
    return normalizePatient(response.data);
  },

  /**
   * Update an existing patient record
   * PUT /api/patients/{id}
   * @param {number|string} id
   * @param {object} patientData - Updated PatientDTO payload
   * @returns {Promise<object>}
   */
  async updatePatient(id, patientData) {
    const response = await apiClient.put(`/patients/${id}`, patientData);
    return normalizePatient(response.data);
  },

  /**
   * Activate patient
   * PUT /api/patients/{id}/activate
   * @param {number|string} id
   * @returns {Promise<object>}
   */
  async activatePatient(id) {
    const response = await apiClient.put(`/patients/${id}/activate`);
    return normalizePatient(response.data);
  },

  /**
   * Deactivate patient
   * PUT /api/patients/{id}/deactivate
   * @param {number|string} id
   * @returns {Promise<object>}
   */
  async deactivatePatient(id) {
    const response = await apiClient.put(`/patients/${id}/deactivate`);
    return normalizePatient(response.data);
  },

  /**
   * Delete patient
   * DELETE /api/patients/{id}
   * @param {number|string} id
   * @returns {Promise<string>}
   */
  async deletePatient(id) {
    const response = await apiClient.delete(`/patients/${id}`);
    return response.data;
  },
};

export default patientApi;
