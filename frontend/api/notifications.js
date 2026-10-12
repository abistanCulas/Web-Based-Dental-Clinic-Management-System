import apiClient from "./client";

/**
 * Notifications API service for DentaFlow
 */
export const notificationsApi = {
  /**
   * Get all notifications (Admin)
   * GET /api/notifications
   */
  async getAllNotifications() {
    const response = await apiClient.get("/notifications");
    return response.data;
  },

  /**
   * Get notifications for a specific user
   * GET /api/notifications/user/{userId}
   */
  async getUserNotifications(userId) {
    const response = await apiClient.get(`/notifications/user/${userId}`);
    return response.data;
  },

  /**
   * Get unread notifications for a user
   * GET /api/notifications/user/{userId}/unread
   */
  async getUnreadNotifications(userId) {
    const response = await apiClient.get(`/notifications/user/${userId}/unread`);
    return response.data;
  },

  /**
   * Count unread notifications for a user
   * GET /api/notifications/user/{userId}/unread/count
   */
  async countUnreadNotifications(userId) {
    const response = await apiClient.get(`/notifications/user/${userId}/unread/count`);
    return response.data;
  },

  /**
   * Create a notification
   * POST /api/notifications
   */
  async createNotification(data) {
    const response = await apiClient.post("/notifications", data);
    return response.data;
  },

  /**
   * Mark notification as read
   * PUT /api/notifications/{id}/read
   */
  async markAsRead(id) {
    const response = await apiClient.put(`/notifications/${id}/read`);
    return response.data;
  },

  /**
   * Mark notification as unread
   * PUT /api/notifications/{id}/unread
   */
  async markAsUnread(id) {
    const response = await apiClient.put(`/notifications/${id}/unread`);
    return response.data;
  },

    /**
     * Delete notification
     * DELETE /api/notifications/{id}
     */
    async deleteNotification(id) {
      const response = await apiClient.delete(`/notifications/${id}`);
      return response.data;
    },

    /**
     * Clear all notifications
     * DELETE /api/notifications/clear-all
     */
    async deleteAllNotifications() {
      const response = await apiClient.delete("/notifications/clear-all");
      return response.data;
    },
};

/**
 * Normalizes backend NotificationDTO to frontend format
 */
export function normalizeNotification(dto) {
  if (!dto) return null;

  const rawType = (dto.type || "SYSTEM").toLowerCase();
  let type = "system";
  if (rawType.includes("appoint")) type = "appointment";
  else if (rawType.includes("remind")) type = "reminder";
  else if (rawType.includes("pay") || rawType.includes("bill")) type = "payment";
  else if (rawType.includes("prescrip") || rawType.includes("pharm")) type = "prescription";

  const isRead = dto.readStatus === "READ" || dto.readStatus === true || dto.isRead === true;
  const timeStr = dto.createdAt ? new Date(dto.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recently";

  return {
    id: dto.id,
    type,
    title: dto.title || "Notification",
    message: dto.message || "",
    time: timeStr,
    date: dto.createdAt ? String(dto.createdAt).slice(0, 10) : new Date().toISOString().slice(0, 10),
    read: isRead,
    status: isRead ? "read" : "unread",
    raw: dto,
  };
}

export default notificationsApi;
