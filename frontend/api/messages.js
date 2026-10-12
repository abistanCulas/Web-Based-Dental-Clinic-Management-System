import apiClient from "./client";

/**
 * Messages / Clinical Communication API service for DentaFlow
 */
export const messagesApi = {
  /**
   * Get all messages for the current authenticated user (inbox)
   * GET /api/messages
   */
  async getMessages() {
    const response = await apiClient.get("/messages");
    return response.data;
  },

  /**
   * Get conversation thread between current user and another user
   * GET /api/messages/conversation/{otherUserId}
   */
  async getConversation(otherUserId) {
    const response = await apiClient.get(`/messages/conversation/${otherUserId}`);
    return response.data;
  },

  /**
   * Get single message by ID
   * GET /api/messages/{id}
   */
  async getMessageById(id) {
    const response = await apiClient.get(`/messages/${id}`);
    return response.data;
  },

  /**
   * Send a new message
   * POST /api/messages
   * @param {Object} data - { receiverId, subject, content, priority, patientId, appointmentId }
   */
  async sendMessage(data) {
    const response = await apiClient.post("/messages", data);
    return response.data;
  },

  /**
   * Mark a single message as read
   * PUT /api/messages/{id}/read
   */
  async markAsRead(id) {
    const response = await apiClient.put(`/messages/${id}/read`);
    return response.data;
  },

  /**
   * Mark all unread messages from a user as read
   * PUT /api/messages/conversation/{otherUserId}/read
   */
  async markConversationAsRead(otherUserId) {
    const response = await apiClient.put(`/messages/conversation/${otherUserId}/read`);
    return response.data;
  },

  /**
   * Get unread message count for the current user
   * GET /api/messages/unread-count
   */
  async getUnreadCount() {
    const response = await apiClient.get("/messages/unread-count");
    return response.data;
  },

  /**
   * Get available recipients (staff, doctors, etc.) for messaging
   * GET /api/messages/recipients
   */
  async getRecipients() {
    const response = await apiClient.get("/messages/recipients");
    return response.data;
  },

  /**
   * Update an existing message (only original sender can update)
   * PUT /api/messages/{id}
   * @param {number|string} id
   * @param {Object} data - { subject, content, priority, patientId, appointmentId }
   */
  async updateMessage(id, data) {
    const response = await apiClient.put(`/messages/${id}`, data);
    return response.data;
  },

  /**
   * Delete a message
   * DELETE /api/messages/{id}
   */
  async deleteMessage(id) {
    const response = await apiClient.delete(`/messages/${id}`);
    return response.data;
  },
};

export default messagesApi;
