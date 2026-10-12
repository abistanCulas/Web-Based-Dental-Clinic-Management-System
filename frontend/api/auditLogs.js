import apiClient from "./client";

/**
 * Audit Logs API service for DentaFlow
 */
export const auditLogsApi = {
  /**
   * Get all audit logs
   * GET /api/audit-logs
   */
  async getAllAuditLogs() {
    const response = await apiClient.get("/audit-logs");
    return response.data;
  },

  /**
   * Get audit log by ID
   * GET /api/audit-logs/{id}
   */
  async getAuditLogById(id) {
    const response = await apiClient.get(`/audit-logs/${id}`);
    return response.data;
  },

  /**
   * Get logs by user ID
   * GET /api/audit-logs/user/{userId}
   */
  async getLogsByUser(userId) {
    const response = await apiClient.get(`/audit-logs/user/${userId}`);
    return response.data;
  },

  /**
   * Get logs by action
   * GET /api/audit-logs/action/{action}
   */
  async getLogsByAction(action) {
    const response = await apiClient.get(`/audit-logs/action/${action}`);
    return response.data;
  },

  /**
   * Get logs by entity type
   * GET /api/audit-logs/entity-type/{entityType}
   */
  async getLogsByEntityType(entityType) {
    const response = await apiClient.get(`/audit-logs/entity-type/${entityType}`);
    return response.data;
  },

  /**
   * Create an audit log
   * POST /api/audit-logs
   */
  async createAuditLog(data) {
    const response = await apiClient.post("/audit-logs", data);
    return response.data;
  },
};

/**
 * Normalizes backend AuditLogDTO to frontend display format
 */
export function normalizeAuditLog(dto, usersLookup = {}) {
  if (!dto) return null;

  const user = dto.userId ? usersLookup[dto.userId] : null;
  const userName = user
    ? user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim()
    : dto.userName || `User #${dto.userId || "System"}`;

  const timeStr = dto.timestamp
    ? new Date(dto.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "Just now";

  return {
    id: dto.id,
    name: dto.action ? `${dto.action} on ${dto.entityType || "Resource"}` : "System Event",
    detail: dto.details || `Performed by ${userName}`,
    status: dto.status?.toLowerCase() === "failure" ? "failed" : "completed",
    time: timeStr,
    ip: dto.ipAddress || "127.0.0.1",
    raw: dto,
  };
}

export default auditLogsApi;
