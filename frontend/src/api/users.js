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
};

/**
 * Normalizes backend User DTO to frontend user format
 */
export function normalizeUser(dto, staffMap = {}) {
  if (!dto) return null;
  const staff = staffMap[dto.id];
  const staffRole = staff?.role || null;
  const rawRole = dto.role || "PATIENT";
  const normRole = normalizeRole(rawRole, staffRole, dto.email);

  const fullName = `${dto.firstName || ""} ${dto.lastName || ""}`.trim() || dto.email || "Unknown User";
  const rawStatus = (dto.status || "ACTIVE").toUpperCase();
  const status = rawStatus === "ACTIVE" ? "active" : "disabled";

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
    joined: dto.createdAt ? String(dto.createdAt).slice(0, 10) : "2026-03-01",
    raw: dto,
  };
}

export default usersApi;
