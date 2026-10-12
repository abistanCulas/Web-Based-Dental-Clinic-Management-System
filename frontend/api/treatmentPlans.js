import apiClient from "./client";
import { formatLkr } from "./billing";

/**
 * Normalizes a backend TreatmentPlanDTO to frontend format.
 *
 * @param {object} dto - TreatmentPlanDTO
 * @param {object} patientLookup - Optional map of patient id -> patient object
 * @param {object} dentistLookup - Optional map of dentist id -> dentist object
 * @returns {object} Normalized treatment plan
 */
export function normalizeTreatmentPlan(dto, patientLookup = {}, dentistLookup = {}) {
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

  // Format stage label according to backend status or description
  let stageLabel = "Stage 1: Diagnosis & Planning";
  const stUpper = (dto.status || "").toUpperCase();
  if (stUpper === "COMPLETED") {
    stageLabel = "Stage 4: Prosthetic Delivery & Completed";
  } else if (stUpper === "IN_PROGRESS") {
    stageLabel = "Stage 2: Active Clinical Intervention";
  } else if (stUpper === "APPROVED") {
    stageLabel = "Stage 2: Treatment Approved & Scheduled";
  } else if (stUpper === "CANCELLED") {
    stageLabel = "Plan Cancelled";
  }

  const estCostNum = typeof dto.estimatedTotalCost === "number"
    ? dto.estimatedTotalCost
    : parseFloat(String(dto.estimatedTotalCost || 0).replace(/[^0-9.-]/g, "")) || 0;

  return {
    id: dto.planCode || `TP-${dto.id}`,
    rawId: dto.id,
    patient: patientName,
    patientId: dto.patientId,
    doctor: dentistName,
    dentistId: dto.dentistId,
    procedure: dto.planName || "Comprehensive Dental Treatment",
    stage: stageLabel,
    estimatedCost: formatLkr(estCostNum),
    actualCost: formatLkr(estCostNum * (stUpper === "COMPLETED" ? 1 : 0.4)),
    status: stUpper === "COMPLETED" ? "completed" : stUpper === "IN_PROGRESS" ? "in-progress" : stUpper === "APPROVED" ? "confirmed" : "pending",
    rawStatus: dto.status || "PROPOSED",
    date: dto.startDate ? String(dto.startDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
    expectedEndDate: dto.expectedEndDate ? String(dto.expectedEndDate).slice(0, 10) : "",
    description: dto.description || "",
    dentistNotes: dto.dentistNotes || "",
    raw: dto,
  };
}

/**
 * Normalizes a backend TreatmentDTO to frontend format.
 *
 * @param {object} dto - TreatmentDTO
 * @param {object} patientLookup - Optional map of patient id -> patient object
 * @param {object} dentistLookup - Optional map of dentist id -> dentist object
 * @returns {object} Normalized treatment
 */
export function normalizeTreatment(dto, patientLookup = {}, dentistLookup = {}) {
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
    `Dentist #${dto.dentistId}`;

  return {
    id: dto.treatmentCode || `TRT-${dto.id}`,
    rawId: dto.id,
    treatmentCode: dto.treatmentCode,
    patient: patientName,
    patientId: dto.patientId,
    doctor: dentistName,
    dentistId: dto.dentistId,
    appointmentId: dto.appointmentId,
    treatmentPlanId: dto.treatmentPlanId,
    treatmentPlanName: dto.treatmentPlanName || "",
    type: dto.treatmentType || "Restorative",
    diagnosis: dto.diagnosis || "",
    description: dto.description || "",
    toothDetails: dto.toothDetails || "",
    estimatedCost: formatLkr(dto.estimatedCost || 0),
    actualCost: formatLkr(dto.actualCost || 0),
    status: (dto.status || "PLANNED").toLowerCase(),
    rawStatus: dto.status || "PLANNED",
    date: dto.treatmentDate ? String(dto.treatmentDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
    followUpDate: dto.followUpDate ? String(dto.followUpDate).slice(0, 10) : "",
    dentistNotes: dto.dentistNotes || "",
    raw: dto,
  };
}

export const treatmentPlanApi = {
  // =========================================================
  // TREATMENT PLANS
  // =========================================================

  /**
   * Fetch all treatment plans
   * GET /api/treatment-plans
   */
  async getAllTreatmentPlans() {
    const response = await apiClient.get("/treatment-plans");
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch treatment plan by ID
   * GET /api/treatment-plans/{id}
   */
  async getTreatmentPlanById(id) {
    const response = await apiClient.get(`/treatment-plans/${id}`);
    return response.data;
  },

  /**
   * Fetch treatment plan by plan code
   * GET /api/treatment-plans/code/{planCode}
   */
  async getTreatmentPlanByCode(planCode) {
    const response = await apiClient.get(`/treatment-plans/code/${planCode}`);
    return response.data;
  },

  /**
   * Fetch treatment plans for a specific patient
   * GET /api/treatment-plans/patient/{patientId}
   */
  async getPatientTreatmentPlans(patientId) {
    const response = await apiClient.get(`/treatment-plans/patient/${patientId}`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch treatment plans for a specific dentist
   * GET /api/treatment-plans/dentist/{dentistId}
   */
  async getDentistTreatmentPlans(dentistId) {
    const response = await apiClient.get(`/treatment-plans/dentist/${dentistId}`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch treatment plans by status
   * GET /api/treatment-plans/status/{status}
   */
  async getPlansByStatus(status) {
    const response = await apiClient.get(`/treatment-plans/status/${status}`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Create a new treatment plan for a patient by dentist
   * POST /api/treatment-plans/patient/{patientId}/dentist/{dentistId}
   */
  async createTreatmentPlan(patientId, dentistId, data) {
    const response = await apiClient.post(
      `/treatment-plans/patient/${patientId}/dentist/${dentistId}`,
      data
    );
    return response.data;
  },

  /**
   * Update an existing treatment plan
   * PUT /api/treatment-plans/{id}
   */
  async updateTreatmentPlan(id, data) {
    const response = await apiClient.put(`/treatment-plans/${id}`, data);
    return response.data;
  },

  /**
   * Approve a treatment plan
   * PUT /api/treatment-plans/{id}/approve
   */
  async approvePlan(id) {
    const response = await apiClient.put(`/treatment-plans/${id}/approve`);
    return response.data;
  },

  /**
   * Start a treatment plan
   * PUT /api/treatment-plans/{id}/start
   */
  async startPlan(id) {
    const response = await apiClient.put(`/treatment-plans/${id}/start`);
    return response.data;
  },

  /**
   * Complete a treatment plan
   * PUT /api/treatment-plans/{id}/complete
   */
  async completePlan(id) {
    const response = await apiClient.put(`/treatment-plans/${id}/complete`);
    return response.data;
  },

  /**
   * Cancel a treatment plan
   * PUT /api/treatment-plans/{id}/cancel
   */
  async cancelPlan(id) {
    const response = await apiClient.put(`/treatment-plans/${id}/cancel`);
    return response.data;
  },

  /**
   * Delete a treatment plan
   * DELETE /api/treatment-plans/{id}
   */
  async deleteTreatmentPlan(id) {
    const response = await apiClient.delete(`/treatment-plans/${id}`);
    return response.data;
  },

  // =========================================================
  // TREATMENTS / PROCEDURES
  // =========================================================

  /**
   * Fetch all treatments
   * GET /api/treatments
   */
  async getAllTreatments() {
    const response = await apiClient.get("/treatments");
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch treatments for a specific patient
   * GET /api/treatments/patient/{patientId}
   */
  async getPatientTreatments(patientId) {
    const response = await apiClient.get(`/treatments/patient/${patientId}`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch treatments for a specific dentist
   * GET /api/treatments/dentist/{dentistId}
   */
  async getDentistTreatments(dentistId) {
    const response = await apiClient.get(`/treatments/dentist/${dentistId}`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Create a new treatment
   * POST /api/treatments
   */
  async createTreatment(data) {
    const response = await apiClient.post("/treatments", data);
    return response.data;
  },

  /**
   * Update treatment
   * PUT /api/treatments/{id}
   */
  async updateTreatment(id, data) {
    const response = await apiClient.put(`/treatments/${id}`, data);
    return response.data;
  },

  /**
   * Complete treatment
   * PUT /api/treatments/{id}/complete
   */
  async completeTreatment(id) {
    const response = await apiClient.put(`/treatments/${id}/complete`);
    return response.data;
  },

  /**
   * Cancel treatment
   * PUT /api/treatments/{id}/cancel
   */
  async cancelTreatment(id) {
    const response = await apiClient.put(`/treatments/${id}/cancel`);
    return response.data;
  },
};

export default treatmentPlanApi;
