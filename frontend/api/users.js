import apiClient from "./client";
import { normalizeRole } from "./auth";

/**
 * User and Staff API service for DentaFlow
 */
export const usersApi = {
  /**
   * Get all users (Admin only)
   * GET /api/users
   */
  async getAllUsers() {
    const response = await apiClient.get("/users");
    return response.data;
  },

  /**
   * Get user by ID
   * GET /api/users/{id}
   */
  async getUserById(id) {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  /**
   * Activate user account
   * PUT /api/users/{id}/activate
   */
  async activateUser(id) {
    const response = await apiClient.put(`/users/${id}/activate`);
    return response.data;
  },

  /**
   * Deactivate user account
   * PUT /api/users/{id}/deactivate
   */
  async deactivateUser(id) {
    const response = await apiClient.put(`/users/${id}/deactivate`);
    return response.data;
  },

  /**
   * Change user role
   * PUT /api/users/{id}/role?role={role}
   */
  async changeUserRole(id, role) {
    const response = await apiClient.put(`/users/${id}/role`, null, {
      params: { role: role.toUpperCase() },
    });
    return response.data;
  },

  /**
   * Delete user
   * DELETE /api/users/{id}
   */
  async deleteUser(id) {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  },

  /**
   * Create a new user account (Admin direct)
   * POST /api/users
   */
  async createUser(userData) {
    const payload = {
      firstName: userData.firstName || userData.name?.split(" ")[0] || "User",
      lastName: userData.lastName || userData.name?.split(" ").slice(1).join(" ") || "Member",
      email: userData.email,
      phone: userData.phone || "0770000000",
      password: userData.password || "demo123",
      role: (userData.role || "patient").toUpperCase(),
    };
    const response = await apiClient.post("/users", payload);
    return response.data;
  },

  // ==========================================
  // STAFF MANAGEMENT
  // ==========================================

  /**
   * Get all clinic staff
   * GET /api/staff
   */
  async getAllStaff() {
    const response = await apiClient.get("/staff");
    return response.data;
  },

  /**
   * Get staff by ID
   * GET /api/staff/{id}
   */
  async getStaffById(id) {
    const response = await apiClient.get(`/staff/${id}`);
    return response.data;
  },

  /**
   * Get staff by user ID
   * GET /api/staff/user/{userId}
   */
  async getStaffByUserId(userId) {
    const response = await apiClient.get(`/staff/user/${userId}`);
    return response.data;
  },

  /**
   * Create staff profile
   * POST /api/staff
   */
  async createStaff(staffData) {
    const response = await apiClient.post("/staff", staffData);
    return response.data;
  },

  /**
   * Update staff profile
   * PUT /api/staff/{id}
   */
  async updateStaff(id, staffData) {
    const response = await apiClient.put(`/staff/${id}`, staffData);
    return response.data;
  },

  /**
   * Activate staff
   * PUT /api/staff/{id}/activate
   */
  async activateStaff(id) {
    const response = await apiClient.put(`/staff/${id}/activate`);
    return response.data;
  },

  /**
   * Deactivate staff
   * PUT /api/staff/{id}/deactivate
   */
  async deactivateStaff(id) {
    const response = await apiClient.put(`/staff/${id}/deactivate`);
    return response.data;
  },

  /**
   * Delete staff
   * DELETE /api/staff/{id}
   */
  async deleteStaff(id) {
    const response = await apiClient.delete(`/staff/${id}`);
    return response.data;
  },

  // ==========================================
  // DEACTIVATION MANAGEMENT (ADMIN)
  // ==========================================

  /**
   * Get all pending deactivation requests
   * GET /api/users/deactivation-requests
   */
  async getDeactivationRequests() {
    const response = await apiClient.get("/users/deactivation-requests");
    return response.data;
  },

  /**
   * Approve deactivation request
   * PUT /api/users/{id}/deactivation/approve
   */
  async approveDeactivation(id) {
    const response = await apiClient.put(`/users/${id}/deactivation/approve`);
    return response.data;
  },

  /**
   * Reject deactivation request
   * PUT /api/users/{id}/deactivation/reject
   */
  async rejectDeactivation(id) {
    const response = await apiClient.put(`/users/${id}/deactivation/reject`);
    return response.data;
  },

  // ==========================================
  // PROFILE AVATAR MANAGEMENT
  // ==========================================

  /**
   * Update current user's profile image
   * POST /api/users/me/avatar
   */
  async updateMyAvatar(image) {
    const response = await apiClient.post("/users/me/avatar", { image });
    return response.data;
  },

  /**
   * Delete current user's profile image
   * DELETE /api/users/me/avatar
   */
  async deleteMyAvatar() {
    const response = await apiClient.delete("/users/me/avatar");
    return response.data;
  },

  /**
   * Admin update a user's avatar
   * POST /api/users/{id}/avatar
   */
  async updateUserAvatar(id, image) {
    const response = await apiClient.post(`/users/${id}/avatar`, { image });
    return response.data;
  },

  /**
   * Admin delete a user's avatar
   * DELETE /api/users/{id}/avatar
   */
  async deleteUserAvatar(id) {
    const response = await apiClient.delete(`/users/${id}/avatar`);
    return response.data;
  },
};

/**
 * Normalizes backend User DTO to frontend user format
 */
export function normalizeUser(dto, staffMap = {}) {
  if (!dto) return null;
  const rawRole = String(dto.role || "PATIENT").trim().toUpperCase();
  // Never attach staff data to doctor/dentist users — prevents cross-contamination
  const isDoctorUser = rawRole === "DOCTOR" || rawRole === "DENTIST";
  const staff = isDoctorUser ? null : (staffMap[dto.id] || null);
  const staffRole = staff?.role || null;
  const normRole = normalizeRole(rawRole, staffRole, dto.email);

  const fullName = `${dto.firstName || ""} ${dto.lastName || ""}`.trim() || dto.email || "Unknown User";
  const rawStatus = (dto.status || "ACTIVE").toUpperCase();
  const status = rawStatus === "ACTIVE" ? "active" : rawStatus === "DEACTIVATION_REQUESTED" ? "pending_deactivation" : "disabled";

  return {
    id: dto.id,
    userId: dto.id,
    name: fullName,
    firstName: dto.firstName,
    lastName: dto.lastName,
    email: dto.email,
    phone: dto.phone || "—",
    role: normRole,
    backendRole: rawRole,
    status,
    rawStatus,
    profileImage: dto.profileImage || null,
    deactivationReason: dto.deactivationReason || null,
    deactivationRequestedAt: dto.deactivationRequestedAt || null,
    deactivatedAt: dto.deactivatedAt || null,
    joined: dto.createdAt ? String(dto.createdAt).slice(0, 10) : "2026-03-01",
    raw: dto,
  };
}

export default usersApi;
