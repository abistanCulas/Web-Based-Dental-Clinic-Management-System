import apiClient from "./client";

export const schedulesApi = {
  /**
   * Fetch weekly schedule for a doctor/dentist
   * GET /api/staff-schedules/dentist/:dentistId/weekly?weekStartDate=YYYY-MM-DD
   */
  async getDentistWeeklySchedule(dentistId, weekStartDate) {
    const params = weekStartDate ? { weekStartDate } : {};
    const res = await apiClient.get(`/staff-schedules/dentist/${dentistId}/weekly`, { params });
    return res.data;
  },

  /**
   * Fetch weekly schedule for a staff member
   * GET /api/staff-schedules/staff/:staffId/weekly?weekStartDate=YYYY-MM-DD
   */
  async getStaffWeeklySchedule(staffId, weekStartDate) {
    const params = weekStartDate ? { weekStartDate } : {};
    const res = await apiClient.get(`/staff-schedules/staff/${staffId}/weekly`, { params });
    return res.data;
  },

  /**
   * Update or create weekly schedule for a doctor/dentist
   * PUT /api/staff-schedules/dentist/:dentistId/weekly
   */
  async updateDentistWeeklySchedule(dentistId, schedules) {
    const res = await apiClient.put(`/staff-schedules/dentist/${dentistId}/weekly`, schedules);
    return res.data;
  },

  /**
   * Update or create weekly schedule for a staff member
   * PUT /api/staff-schedules/staff/:staffId/weekly
   */
  async updateStaffWeeklySchedule(staffId, schedules) {
    const res = await apiClient.put(`/staff-schedules/staff/${staffId}/weekly`, schedules);
    return res.data;
  },

  /**
   * Send schedule email to a doctor/dentist
   * POST /api/staff-schedules/dentist/:dentistId/send-email?weekStartDate=...&force=...
   */
  async sendDentistScheduleEmail(dentistId, weekStartDate, force = true) {
    const params = { force };
    if (weekStartDate) params.weekStartDate = weekStartDate;
    const res = await apiClient.post(`/staff-schedules/dentist/${dentistId}/send-email`, null, { params });
    return res.data;
  },

  /**
   * Send schedule email to a staff member
   * POST /api/staff-schedules/staff/:staffId/send-email?weekStartDate=...&force=...
   */
  async sendStaffScheduleEmail(staffId, weekStartDate, force = true) {
    const params = { force };
    if (weekStartDate) params.weekStartDate = weekStartDate;
    const res = await apiClient.post(`/staff-schedules/staff/${staffId}/send-email`, null, { params });
    return res.data;
  },

  /**
   * Trigger weekly schedule email broadcast to all active doctors & staff
   * POST /api/staff-schedules/trigger-weekly-emails?weekStartDate=...&force=...
   */
  async triggerWeeklyBroadcast(weekStartDate, force = true) {
    const params = { force };
    if (weekStartDate) params.weekStartDate = weekStartDate;
    const res = await apiClient.post("/staff-schedules/trigger-weekly-emails", null, { params });
    return res.data;
  },

  /**
   * Fetch automation status for Doctor & Staff weekly schedule
   * GET /api/staff-schedules/automation/status
   */
  async getAutomationStatus() {
    const res = await apiClient.get("/staff-schedules/automation/status");
    return res.data;
  },

  /**
   * Toggle automation status for Doctor & Staff weekly schedule
   * POST /api/staff-schedules/automation/toggle
   */
  async toggleAutomation(enabled) {
    const params = typeof enabled === "boolean" ? { enabled } : {};
    const res = await apiClient.post("/staff-schedules/automation/toggle", null, { params });
    return res.data;
  },

  /**
   * Trigger automation "Run Now" for Doctor & Staff weekly schedule
   * POST /api/staff-schedules/automation/run-now
   */
  async runAutomationNow(force = false) {
    const res = await apiClient.post("/staff-schedules/automation/run-now", null, { params: { force } });
    return res.data;
  },

  // =========================================================
  // ADMIN SCHEDULE MANAGEMENT APIS
  // =========================================================

  /**
   * Get all or filtered dentist/staff schedules
   * GET /api/admin/schedules
   */
  async getAdminSchedules(params = {}) {
    const res = await apiClient.get("/admin/schedules", { params });
    return res.data;
  },

  /**
   * Get schedule by ID
   * GET /api/admin/schedules/:id
   */
  async getScheduleById(id) {
    const res = await apiClient.get(`/admin/schedules/${id}`);
    return res.data;
  },

  /**
   * Create schedule manually
   * POST /api/admin/schedules
   */
  async createSchedule(data) {
    const res = await apiClient.post("/admin/schedules", data);
    return res.data;
  },

  /**
   * Update existing schedule
   * PUT /api/admin/schedules/:id
   */
  async updateSchedule(id, data) {
    const res = await apiClient.put(`/admin/schedules/${id}`, data);
    return res.data;
  },

  /**
   * Delete schedule (soft delete)
   * DELETE /api/admin/schedules/:id
   */
  async deleteSchedule(id) {
    const res = await apiClient.delete(`/admin/schedules/${id}`);
    return res.data;
  },

  /**
   * Auto-generate weekly schedules for dentists & staff
   * POST /api/admin/schedules/generate
   */
  async autoGenerateSchedules(params = {}) {
    const res = await apiClient.post("/admin/schedules/generate", null, { params });
    return res.data;
  },

  // =========================================================
  // STAFF SCHEDULE MANAGEMENT & DATE-SPECIFIC OVERRIDES
  // =========================================================

  /**
   * Fetch effective schedule for a staff member on a specific date (Priority: Override > Weekly > Auto)
   * GET /api/staff-schedules/staff/:staffId/effective?date=YYYY-MM-DD
   */
  async getStaffEffectiveSchedule(staffId, date) {
    const params = date ? { date } : {};
    const res = await apiClient.get(`/staff-schedules/staff/${staffId}/effective`, { params });
    return res.data;
  },

  /**
   * Fetch effective weekly schedule for a staff member (Monday to Sunday)
   * GET /api/staff-schedules/staff/:staffId/effective-week?weekStartDate=YYYY-MM-DD
   */
  async getStaffEffectiveWeekSchedule(staffId, weekStartDate) {
    const params = weekStartDate ? { weekStartDate } : {};
    const res = await apiClient.get(`/staff-schedules/staff/${staffId}/effective-week`, { params });
    return res.data;
  },

  /**
   * Update staff weekly schedule and notify ONLY this staff member via email
   * PUT /api/admin/schedules/staff/:staffId/weekly?weekStartDate=YYYY-MM-DD
   */
  async saveStaffWeeklyScheduleWithNotification(staffId, schedules, weekStartDate) {
    const params = weekStartDate ? { weekStartDate } : {};
    const res = await apiClient.put(`/admin/schedules/staff/${staffId}/weekly`, schedules, { params });
    return res.data;
  },

  /**
   * Create date-specific schedule override for a staff member
   * POST /api/admin/schedules/staff/:staffId/override
   */
  async createDateOverride(staffId, data) {
    const res = await apiClient.post(`/admin/schedules/staff/${staffId}/override`, data);
    return res.data;
  },

  /**
   * Update date-specific schedule override for a staff member
   * PUT /api/admin/schedules/staff/:staffId/override
   */
  async updateDateOverride(staffId, data) {
    const res = await apiClient.put(`/admin/schedules/staff/${staffId}/override`, data);
    return res.data;
  },

  /**
   * Delete date-specific schedule override (restores normal weekly schedule)
   * DELETE /api/admin/schedules/staff/:staffId/override?date=YYYY-MM-DD
   */
  async deleteDateOverride(staffId, date) {
    const res = await apiClient.delete(`/admin/schedules/staff/${staffId}/override`, { params: { date } });
    return res.data;
  },
};

export default schedulesApi;

