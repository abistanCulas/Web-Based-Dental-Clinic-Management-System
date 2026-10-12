import apiClient from "./client";

/**
 * Normalizes a backend MedicalRecordDTO to frontend medical record format.
 *
 * @param {object} dto - MedicalRecordDTO
 * @param {object} patientLookup - Optional map of patient id -> patient object
 * @param {object} dentistLookup - Optional map of dentist id -> dentist object
 * @returns {object} Normalized medical record
 */
export function normalizeMedicalRecord(dto, patientLookup = {}, dentistLookup = {}) {
  if (!dto) return null;

  const patientObj = patientLookup[dto.patientId];
  const patientName =
    patientObj?.name ||
    (patientObj ? `${patientObj.firstName || ""} ${patientObj.lastName || ""}`.trim() : null) ||
    `Patient #${dto.patientId}`;

  const dentistObj = dentistLookup[dto.dentistId];
  const dentistName =
    dentistObj?.name ||
    (dentistObj ? `Dr. ${dentistObj.firstName || ""} ${dentistObj.lastName || ""}`.trim() : null) ||
    (dto.dentistId ? `Dr. Dentist #${dto.dentistId}` : "Attending Dentist");

  // Map backend recordType to user-friendly label
  let categoryLabel;
  const typeUpper = (dto.recordType || "").toUpperCase();
  if (typeUpper.includes("RAY") || typeUpper.includes("RADIOLOGY") || typeUpper.includes("RADIOGRAPH") || typeUpper.includes("IMAGING")) {
    categoryLabel = "Radiograph";
  } else if (typeUpper.includes("EXAM")) {
    categoryLabel = "Examination";
  } else if (typeUpper.includes("DIAGNOSIS")) {
    categoryLabel = "Diagnosis";
  } else if (typeUpper.includes("CONSULT")) {
    categoryLabel = "Consultation";
  } else if (typeUpper.includes("FOLLOW")) {
    categoryLabel = "Follow-up";
  } else if (typeUpper.includes("TREATMENT") || typeUpper.includes("PROCEDURE") || typeUpper.includes("OPERATIVE")) {
    categoryLabel = "Treatment";
  } else {
    categoryLabel = dto.recordType || "General";
  }

  // Parse diagnosis and treatment
  let diag = dto.diagnosis || "";
  let treat = "";
  if (diag.includes(" - ")) {
    const parts = diag.split(" - ");
    diag = parts[0].trim();
    treat = parts.slice(1).join(" - ").trim();
  } else if (categoryLabel === "Treatment") {
    treat = diag || "Operative Treatment Protocol";
    diag = "Dental Condition requiring treatment";
  } else if (categoryLabel === "Diagnosis") {
    treat = "Treatment plan under review";
  } else if (categoryLabel === "Radiograph" || categoryLabel === "X-Ray") {
    treat = "Radiographic Examination";
  } else if (categoryLabel === "Examination") {
    treat = "Clinical Examination";
  } else {
    treat = "Comprehensive Oral Evaluation";
  }

  // Radiograph / attachments indicator - strictly from real DB field
  let attachments = "None";
  if (dto.attachments && typeof dto.attachments === "string" && dto.attachments.trim() && dto.attachments.trim().toLowerCase() !== "none") {
    attachments = dto.attachments.trim();
  }

  return {
    id: dto.id ? `REC-${dto.id}` : `REC-TMP`,
    rawId: dto.id,
    title: dto.diagnosis || dto.clinicalNotes?.slice(0, 45) || "Dental Clinical Record",
    type: categoryLabel,
    patient: patientName,
    patientId: dto.patientId,
    patientCode: patientObj?.patientCode || `P${String(dto.patientId || 0).padStart(4, "0")}`,
    doctor: dentistName,
    dentistId: dto.dentistId,
    date: dto.recordDate ? String(dto.recordDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
    notes: dto.clinicalNotes || dto.symptoms || "No detailed notes recorded.",
    diagnosis: diag || "Clinical Dental Assessment",
    treatment: treat || "Standard Treatment Protocol",
    attachments: attachments,
    symptoms: dto.symptoms || "",
    allergies: dto.allergies || "",
    medicalConditions: dto.medicalConditions || "",
    status: (dto.status || "ACTIVE").toLowerCase(),
    rawStatus: dto.status || "ACTIVE",
    raw: dto,
  };
}

export const medicalRecordsApi = {
  /**
   * Fetch all medical records (Admin / clinical overview)
   * GET /api/medical-records
   */
  async getAllMedicalRecords() {
    const response = await apiClient.get("/medical-records");
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch medical record by ID
   * GET /api/medical-records/{id}
   */
  async getMedicalRecordById(id) {
    const response = await apiClient.get(`/medical-records/${id}`);
    return response.data;
  },

  /**
   * Fetch medical records for a specific patient
   * GET /api/medical-records/patient/{patientId}
   */
  async getPatientMedicalRecords(patientId) {
    const response = await apiClient.get(`/medical-records/patient/${patientId}`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch active medical records for a specific patient
   * GET /api/medical-records/patient/{patientId}/active
   */
  async getActivePatientRecords(patientId) {
    const response = await apiClient.get(`/medical-records/patient/${patientId}/active`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch medical records handled by a specific dentist
   * GET /api/medical-records/dentist/{dentistId}
   */
  async getDentistMedicalRecords(dentistId) {
    const response = await apiClient.get(`/medical-records/dentist/${dentistId}`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch medical records by record type
   * GET /api/medical-records/type/{recordType}
   */
  async getRecordsByType(recordType) {
    const response = await apiClient.get(`/medical-records/type/${recordType}`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch medical records by date
   * GET /api/medical-records/date/{date}
   */
  async getRecordsByDate(date) {
    const response = await apiClient.get(`/medical-records/date/${date}`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch medical records by status
   * GET /api/medical-records/status/{status}
   */
  async getRecordsByStatus(status) {
    const response = await apiClient.get(`/medical-records/status/${status}`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Create a new medical record for a patient by dentist
   * POST /api/medical-records/patient/{patientId}/dentist/{dentistId}
   */
  async createMedicalRecord(patientId, dentistId, data) {
    const response = await apiClient.post(
      `/medical-records/patient/${patientId}/dentist/${dentistId}`,
      data
    );
    return response.data;
  },

  /**
   * Update an existing medical record
   * PUT /api/medical-records/{id}
   */
  async updateMedicalRecord(id, data) {
    const response = await apiClient.put(`/medical-records/${id}`, data);
    return response.data;
  },

  /**
   * Activate medical record
   * PUT /api/medical-records/{id}/activate
   */
  async activateRecord(id) {
    const response = await apiClient.put(`/medical-records/${id}/activate`);
    return response.data;
  },

  /**
   * Archive medical record
   * PUT /api/medical-records/{id}/archive
   */
  async archiveRecord(id) {
    const response = await apiClient.put(`/medical-records/${id}/archive`);
    return response.data;
  },

  /**
   * Delete a medical record
   * DELETE /api/medical-records/{id}
   */
  async deleteMedicalRecord(id) {
    const response = await apiClient.delete(`/medical-records/${id}`);
    return response.data;
  },
};

export default medicalRecordsApi;
