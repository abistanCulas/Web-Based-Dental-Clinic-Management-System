import apiClient from "./client";

/**
 * Converts a 24-hour time string ("09:00:00", "14:30") to user-friendly 12-hour format ("9:00 AM", "2:30 PM").
 *
 * @param {string} timeStr - Time in 24h format
 * @returns {string} Formatted 12-hour time string
 */
export function formatTime12Hour(timeStr) {
  if (!timeStr) return "";
  if (typeof timeStr === "string" && (timeStr.includes("AM") || timeStr.includes("PM"))) {
    return timeStr;
  }
  const parts = String(timeStr).split(":");
  let hour = parseInt(parts[0], 10);
  const minute = parts[1] || "00";
  if (isNaN(hour)) return timeStr;

  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute.padStart(2, "0")} ${ampm}`;
}

/**
 * Converts a 12-hour time string ("10:00 AM", "2:30 PM") or partial string to backend ISO LocalTime ("10:00:00", "14:30:00").
 *
 * @param {string} time12Str - Time in 12h or 24h format
 * @returns {string} Formatted HH:mm:ss string
 */
export function formatTime24Hour(time12Str) {
  if (!time12Str) return "09:00:00";
  const trimmed = String(time12Str).trim();

  // If already in HH:mm:ss format
  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // If in HH:mm format without AM/PM
  if (/^\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00`;
  }

  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return "09:00:00";

  let hour = parseInt(match[1], 10);
  const minute = match[2] || "00";
  const ampm = match[3] ? match[3].toUpperCase() : null;

  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;

  return `${String(hour).padStart(2, "0")}:${minute}:00`;
}

/**
 * Adds minutes to an ISO LocalTime string ("09:00:00" + 30 -> "09:30:00").
 *
 * @param {string} isoTime - HH:mm:ss time
 * @param {number} minutesToAdd - Minutes
 * @returns {string} HH:mm:ss time
 */
export function addMinutesToIsoTime(isoTime, minutesToAdd = 30) {
  const parts = String(isoTime).split(":");
  let hours = parseInt(parts[0] || "0", 10);
  let minutes = parseInt(parts[1] || "0", 10) + minutesToAdd;

  hours += Math.floor(minutes / 60);
  minutes = minutes % 60;
  hours = hours % 24;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

export const addMinutesToTime = addMinutesToIsoTime;

/**
 * Slices backend available ranges ([{ startTime: "09:00:00", endTime: "17:00:00" }]) into discrete 30-min bookable slots.
 * Also filters out past times if the date is today.
 *
 * @param {Array} ranges - Array of available slot range objects
 * @param {string} dateStr - Target date YYYY-MM-DD
 * @param {number} slotDurationMinutes - Default 30 minutes
 * @returns {Array<{ startTime: string, endTime: string, label: string, displayTime: string }>}
 */
export function generateSlotIntervals(ranges, dateStr, slotDurationMinutes = 30) {
  if (!Array.isArray(ranges) || ranges.length === 0) return [];

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const todayStr = `${year}-${month}-${day}`;
  const isToday = dateStr === todayStr;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const slots = [];

  ranges.forEach((range) => {
    if (!range.startTime || !range.endTime) return;

    const [startH, startM] = range.startTime.split(":").map(Number);
    const [endH, endM] = range.endTime.split(":").map(Number);

    let currentStartMinutes = startH * 60 + startM;
    const rangeEndMinutes = endH * 60 + endM;

    while (currentStartMinutes + slotDurationMinutes <= rangeEndMinutes) {
      // If today, filter out past times
      if (!isToday || currentStartMinutes > currentMinutes) {
        const slotStartH = Math.floor(currentStartMinutes / 60);
        const slotStartM = currentStartMinutes % 60;
        const slotEndH = Math.floor((currentStartMinutes + slotDurationMinutes) / 60);
        const slotEndM = (currentStartMinutes + slotDurationMinutes) % 60;

        const startIso = `${String(slotStartH).padStart(2, "0")}:${String(slotStartM).padStart(2, "0")}:00`;
        const endIso = `${String(slotEndH).padStart(2, "0")}:${String(slotEndM).padStart(2, "0")}:00`;

        slots.push({
          startTime: startIso,
          endTime: endIso,
          displayTime: formatTime12Hour(startIso),
          label: `${formatTime12Hour(startIso)} - ${formatTime12Hour(endIso)}`,
        });
      }

      currentStartMinutes += slotDurationMinutes;
    }
  });

  return slots;
}

/**
 * Normalizes a backend AppointmentDTO into the format expected by frontend views.
 *
 * @param {object} dto - Backend AppointmentDTO
 * @param {object} dentistLookup - Map of dentistId -> dentist object
 * @param {object} patientLookup - Map of patientId -> patient object
 * @returns {object} Normalized appointment object
 */
export function normalizeAppointment(dto, dentistLookup = {}, patientLookup = {}) {
  if (!dto) return null;
  const dentist = dentistLookup[dto.dentistId];
  const patient = patientLookup[dto.patientId];

  const doctorName = dentist?.name || (dto.dentistId ? `Dr. Dentist #${dto.dentistId}` : "Assigned Dentist");
  const patientName = patient?.name || (dto.patientId ? `Patient #${dto.patientId}` : "Scheduled Patient");
  const time12 = formatTime12Hour(dto.startTime);

  return {
    id: dto.id,
    appointmentCode: dto.appointmentCode || `APT${String(dto.id).padStart(5, "0")}`,
    patientId: dto.patientId,
    dentistId: dto.dentistId,
    patient: patientName,
    doctor: doctorName,
    service: dto.appointmentType || "General Checkup",
    appointmentType: dto.appointmentType || "General Checkup",
    date: dto.appointmentDate,
    time: time12,
    startTime: dto.startTime,
    endTime: dto.endTime,
    status: (dto.status || "BOOKED").toLowerCase().replace(/_/g, "-"),
    rawStatus: dto.status || "BOOKED",
    reason: dto.reason || "",
    notes: dto.notes || "",
    bookingSource: dto.bookingSource || "ONLINE",
    reminderSent: Boolean(dto.reminderSent),
  };
}

export const appointmentApi = {
  /**
   * Fetch all clinic appointments
   * GET /api/appointments
   */
  async getAllAppointments() {
    const response = await apiClient.get("/appointments");
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch appointment by ID
   * GET /api/appointments/{id}
   */
  async getAppointmentById(id) {
    const response = await apiClient.get(`/appointments/${id}`);
    return response.data;
  },

  /**
   * Fetch appointments for a specific patient
   * GET /api/appointments/patient/{patientId}
   */
  async getPatientAppointments(patientId) {
    const response = await apiClient.get(`/appointments/patient/${patientId}`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch upcoming appointments for a specific patient
   * GET /api/appointments/patient/{patientId}/upcoming
   */
  async getPatientUpcomingAppointments(patientId) {
    try {
      const response = await apiClient.get(`/appointments/patient/${patientId}/upcoming`);
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      // If backend does not have dedicated /upcoming route, filter active future appointments
      const all = await this.getPatientAppointments(patientId);
      const today = new Date().toISOString().split("T")[0];
      return all.filter((a) => {
        const isFuture = a.appointmentDate >= today;
        const activeStatus = ["BOOKED", "CONFIRMED", "RESCHEDULED", "PENDING"].includes(a.status?.toUpperCase());
        return isFuture && activeStatus;
      });
    }
  },

  /**
   * Fetch appointments for a specific dentist
   * GET /api/appointments/dentist/{dentistId}
   */
  async getDentistAppointments(dentistId) {
    const response = await apiClient.get(`/appointments/dentist/${dentistId}`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch appointments for a dentist on a specific date
   * GET /api/appointments/dentist/{dentistId}/date/{date}
   */
  async getDentistAppointmentsByDate(dentistId, date) {
    const response = await apiClient.get(`/appointments/dentist/${dentistId}/date/${date}`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch appointments across the clinic for a specific date
   * GET /api/appointments/date/{date}
   */
  async getAppointmentsByDate(date) {
    const response = await apiClient.get(`/appointments/date/${date}`);
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Fetch booking window (today and maximum booking date)
   * GET /api/appointments/booking-window
   */
  async getBookingWindow() {
    const response = await apiClient.get("/appointments/booking-window");
    return response.data;
  },

  /**
   * Fetch free time ranges for a dentist on a specific date
   * GET /api/appointments/available-slots?dentistId={id}&date={date}
   */
  async getAvailableSlots(dentistId, date) {
    const response = await apiClient.get("/appointments/available-slots", {
      params: { dentistId, date },
    });
    return Array.isArray(response.data) ? response.data : [];
  },

  /**
   * Create a new appointment
   * POST /api/appointments
   */
  async createAppointment(data) {
    const response = await apiClient.post("/appointments", data);
    return response.data;
  },

  /**
   * Reschedule an existing appointment
   * PUT /api/appointments/{id}/reschedule?newDate={d}&newStartTime={t}&newEndTime={t}
   */
  async rescheduleAppointment(id, newDate, newStartTime, newEndTime) {
    const response = await apiClient.put(`/appointments/${id}/reschedule`, null, {
      params: {
        newDate,
        newStartTime,
        newEndTime,
      },
    });
    return response.data;
  },

  /**
   * Cancel an appointment (enforces 2-hour cancellation rule)
   * PUT /api/appointments/{id}/cancel?reason={reason}
   */
  async cancelAppointment(id, reason) {
    const response = await apiClient.put(`/appointments/${id}/cancel`, null, {
      params: reason ? { reason } : {},
    });
    return response.data;
  },

  /**
   * Confirm an appointment
   * PUT /api/appointments/{id}/confirm
   */
  async confirmAppointment(id) {
    const response = await apiClient.put(`/appointments/${id}/confirm`);
    return response.data;
  },

  /**
   * Mark appointment completed
   * PUT /api/appointments/{id}/complete
   */
  async completeAppointment(id) {
    const response = await apiClient.put(`/appointments/${id}/complete`);
    return response.data;
  },

  /**
   * Mark appointment as no-show
   * PUT /api/appointments/{id}/no-show
   */
  async markNoShow(id) {
    const response = await apiClient.put(`/appointments/${id}/no-show`);
    return response.data;
  },

  /**
   * Transition appointment status using the backend Strategy Design Pattern
   * PUT /api/appointments/{id}/status
   */
  async transitionStatus(id, status, context = {}) {
    const response = await apiClient.put(`/appointments/${id}/status`, {
      status,
      ...context,
    });
    return response.data;
  },

  /**
   * Fetch available lifecycle status transitions for an appointment based on active strategies
   * GET /api/appointments/{id}/available-transitions
   */
  async getAvailableTransitions(id) {
    const response = await apiClient.get(`/appointments/${id}/available-transitions`);
    return response.data;
  },

  /**
   * Fetch metadata of all registered appointment strategies
   * GET /api/appointments/strategies
   */
  async getStrategies() {
    const response = await apiClient.get('/appointments/strategies');
    return response.data;
  },

  /**
   * Update appointment details
   * PUT /api/appointments/{id}
   */
  async updateAppointment(id, data) {
    const response = await apiClient.put(`/appointments/${id}`, data);
    return response.data;
  },

  /**
   * Delete appointment (Admin only, subject to business rules)
   * DELETE /api/appointments/{id}
   */
  async deleteAppointment(id) {
    const response = await apiClient.delete(`/appointments/${id}`);
    return response.data;
  },
};

export default appointmentApi;
