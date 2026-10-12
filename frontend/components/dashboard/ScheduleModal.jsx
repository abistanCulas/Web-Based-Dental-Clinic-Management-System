import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Calendar, Clock, Mail, Check, AlertCircle, ChevronLeft, ChevronRight, 
  RefreshCw, Sun, Moon, Sparkles, X, UserCheck, Trash2, ArrowLeftRight
} from "lucide-react";
import { schedulesApi } from "../../api/schedules";

const DAYS_OF_WEEK = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const DAY_LABELS = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

function formatIsoTime(val) {
  if (!val) return "";
  const parts = val.split(":");
  return `${parts[0].padStart(2, "0")}:${(parts[1] || "00").padStart(2, "0")}`;
}

function formatDisplayTime(timeStr) {
  if (!timeStr) return "—";
  const [h, m] = timeStr.split(":");
  let hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${String(hour).padStart(2, "0")}:${m} ${ampm}`;
}

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dayStr = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${dayStr}`;
}

function getDayDate(mondayStr, dayIndex) {
  const [y, m, d] = mondayStr.split("-").map(Number);
  const date = new Date(y, m - 1, d + dayIndex);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getWeekDateRangeDisplay(mondayStr) {
  const [y, m, d] = mondayStr.split("-").map(Number);
  const mon = new Date(y, m - 1, d);
  const sun = new Date(y, m - 1, d + 6);
  const opts = { month: "short", day: "numeric", year: "numeric" };
  return `${mon.toLocaleDateString("en-US", opts)} – ${sun.toLocaleDateString("en-US", opts)}`;
}

export default function ScheduleModal({ isOpen, onClose, targetUser, addToast }) {
  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState("weekly"); // "weekly" | "override"

  // Weekly Schedule State
  const [weekStartDate, setWeekStartDate] = useState(() => getMonday(new Date()));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [scheduleData, setScheduleData] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});

  // Date-Specific Override State
  const [overrideDate, setOverrideDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [overrideWorking, setOverrideWorking] = useState(true);
  const [overrideStartTime, setOverrideStartTime] = useState("10:00");
  const [overrideEndTime, setOverrideEndTime] = useState("18:00");
  const [overrideNotes, setOverrideNotes] = useState("");
  const [effectiveOnDate, setEffectiveOnDate] = useState(null);
  const [loadingEffective, setLoadingEffective] = useState(false);
  const [savingOverride, setSavingOverride] = useState(false);
  const [deletingOverride, setDeletingOverride] = useState(false);
  const [allOverrides, setAllOverrides] = useState([]);
  const [loadingOverridesList, setLoadingOverridesList] = useState(false);

  const isDoctor = useMemo(() => {
    if (!targetUser) return false;
    const r = (targetUser.role || "").toLowerCase();
    return r === "dentist" || r === "doctor" || Boolean(targetUser.dentistId);
  }, [targetUser]);

  const targetId = useMemo(() => {
    if (!targetUser) return null;
    if (isDoctor) {
      let id = targetUser.dentistId || (typeof targetUser.id === "string" && targetUser.id.startsWith("dentist-") ? targetUser.id : null);
      if (typeof id === "string") id = id.replace(/^dentist-/, "");
      return id ? Number(id) : null;
    } else {
      let id = targetUser.staffId || (typeof targetUser.id === "string" && targetUser.id.startsWith("staff-") ? targetUser.id : null);
      if (typeof id === "string") id = id.replace(/^staff-/, "");
      return id ? Number(id) : null;
    }
  }, [targetUser, isDoctor]);

  // Load Weekly Schedule
  const loadSchedule = useCallback(async (monday) => {
    if (!targetId) return;
    setLoading(true);
    setValidationErrors({});
    try {
      let res;
      if (isDoctor) {
        res = await schedulesApi.getDentistWeeklySchedule(targetId, monday);
      } else {
        res = await schedulesApi.getStaffWeeklySchedule(targetId, monday);
      }

      // Populate 7 days map
      const byDay = {};
      (res || []).forEach((item) => {
        if (item.dayOfWeek) byDay[item.dayOfWeek] = item;
      });

      const fullWeek = DAYS_OF_WEEK.map((dow) => {
        const item = byDay[dow];
        if (item) {
          return {
            id: item.id || null,
            dayOfWeek: dow,
            working: Boolean(item.working),
            startTime: item.startTime ? formatIsoTime(item.startTime) : "09:00",
            endTime: item.endTime ? formatIsoTime(item.endTime) : "17:00",
            shift: item.shift || "MORNING",
            notes: item.notes || "",
            scheduleSource: item.scheduleSource || "MANUAL",
          };
        } else {
          return {
            id: null,
            dayOfWeek: dow,
            working: dow !== "SUNDAY",
            startTime: "09:00",
            endTime: "17:00",
            shift: "MORNING",
            notes: "",
            scheduleSource: "MANUAL",
          };
        }
      });

      setScheduleData(fullWeek);
    } catch (err) {
      console.error("Failed to load schedule:", err);
      addToast?.("Could not load schedule for selected week", "error");
    } finally {
      setLoading(false);
    }
  }, [targetId, isDoctor, addToast]);

  // Fetch Effective Schedule on a Specific Date
  const fetchEffectiveOnDate = useCallback(async (dateStr) => {
    if (!targetId || isDoctor) return;
    setLoadingEffective(true);
    try {
      const data = await schedulesApi.getStaffEffectiveSchedule(targetId, dateStr);
      setEffectiveOnDate(data);
      if (data?.isOverride) {
        setOverrideWorking(Boolean(data.working));
        setOverrideStartTime(data.startTime ? formatIsoTime(data.startTime) : "10:00");
        setOverrideEndTime(data.endTime ? formatIsoTime(data.endTime) : "18:00");
        setOverrideNotes(data.notes || "");
      } else {
        // Fall back to template hours or standard default
        if (data?.working && data.startTime && data.endTime) {
          setOverrideWorking(true);
          setOverrideStartTime(formatIsoTime(data.startTime));
          setOverrideEndTime(formatIsoTime(data.endTime));
        } else {
          setOverrideWorking(true);
          setOverrideStartTime("10:00");
          setOverrideEndTime("18:00");
        }
        setOverrideNotes("");
      }
    } catch (err) {
      console.error("Failed to load effective schedule on date:", err);
    } finally {
      setLoadingEffective(false);
    }
  }, [targetId, isDoctor]);

  // Fetch all active overrides for this staff member
  const fetchOverridesList = useCallback(async () => {
    if (!targetId || isDoctor) return;
    setLoadingOverridesList(true);
    try {
      const allSchedules = await schedulesApi.getAdminSchedules({ staffId: targetId });
      const overrides = (allSchedules || []).filter(
        (s) => (s.shift === "OVERRIDE" || s.isOverride) && s.status !== "DELETED"
      );
      setAllOverrides(overrides);
    } catch (err) {
      console.warn("Failed to load overrides list:", err);
    } finally {
      setLoadingOverridesList(false);
    }
  }, [targetId, isDoctor]);

  useEffect(() => {
    if (isOpen && targetId) {
      loadSchedule(weekStartDate);
      if (!isDoctor) {
        fetchEffectiveOnDate(overrideDate);
        fetchOverridesList();
      }
    }
  }, [isOpen, targetId, weekStartDate, overrideDate, isDoctor, loadSchedule, fetchEffectiveOnDate, fetchOverridesList]);

  const handlePrevWeek = () => {
    const [y, m, d] = weekStartDate.split("-").map(Number);
    const prev = new Date(y, m - 1, d - 7);
    setWeekStartDate(getMonday(prev));
  };

  const handleNextWeek = () => {
    const [y, m, d] = weekStartDate.split("-").map(Number);
    const next = new Date(y, m - 1, d + 7);
    setWeekStartDate(getMonday(next));
  };

  const handleCurrentWeek = () => {
    setWeekStartDate(getMonday(new Date()));
  };

  const updateDay = (dayOfWeek, updates) => {
    setScheduleData((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...updates } : d))
    );
    setValidationErrors((prev) => {
      const copy = { ...prev };
      delete copy[dayOfWeek];
      return copy;
    });
  };

  const applyTemplate = (templateType) => {
    setScheduleData((prev) =>
      prev.map((day) => {
        if (templateType === "standard_5day") {
          const isWeekday = !["SATURDAY", "SUNDAY"].includes(day.dayOfWeek);
          return {
            ...day,
            working: isWeekday,
            startTime: "09:00",
            endTime: "17:00",
            shift: "MORNING",
          };
        } else if (templateType === "clinic_6day") {
          const isSunday = day.dayOfWeek === "SUNDAY";
          return {
            ...day,
            working: !isSunday,
            startTime: "09:00",
            endTime: "17:00",
            shift: "MORNING",
          };
        } else if (templateType === "all_working") {
          return {
            ...day,
            working: true,
            startTime: "09:00",
            endTime: "17:00",
            shift: "MORNING",
          };
        } else if (templateType === "all_off") {
          return {
            ...day,
            working: false,
          };
        }
        return day;
      })
    );
    addToast?.("Applied schedule template", "info");
  };

  const validateAll = () => {
    const errors = {};
    for (const day of scheduleData) {
      if (day.working) {
        if (!day.startTime || !day.endTime) {
          errors[day.dayOfWeek] = "Start and End times are required";
        } else if (day.startTime >= day.endTime) {
          errors[day.dayOfWeek] = "Start time must be before End time";
        }
      }
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Weekly Schedule
  const handleSaveWeekly = async () => {
    if (!validateAll()) {
      addToast?.("Please fix the scheduling time errors marked in red", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = scheduleData.map((d) => ({
        id: d.id,
        weekStartDate,
        dayOfWeek: d.dayOfWeek,
        working: d.working,
        startTime: d.working && d.startTime ? `${d.startTime}:00` : null,
        endTime: d.working && d.endTime ? `${d.endTime}:00` : null,
        shift: d.shift || "MORNING",
        notes: d.notes || "",
        scheduleSource: "MANUAL",
      }));

      if (isDoctor) {
        await schedulesApi.updateDentistWeeklySchedule(targetId, payload);
        addToast?.("Weekly schedule saved successfully! Doctor availability updated.", "success");
      } else {
        const res = await schedulesApi.saveStaffWeeklyScheduleWithNotification(targetId, payload, weekStartDate);
        if (res?.emailSent) {
          addToast?.(res.message || `Schedule updated successfully and notification email sent to ${targetUser.name}.`, "success");
        } else {
          addToast?.(res?.message || "Schedule updated, but the notification email could not be sent.", "warning");
        }
      }

      await loadSchedule(weekStartDate);
      if (!isDoctor) {
        await fetchEffectiveOnDate(overrideDate);
      }
    } catch (err) {
      console.error("Save weekly schedule failed:", err);
      const msg = err?.response?.data?.message || err?.response?.data || err?.message || "Failed to save schedule";
      addToast?.(typeof msg === "string" ? msg : "Failed to save schedule", "error");
    } finally {
      setSaving(false);
    }
  };

  // Broadcast Weekly Schedule Email
  const handleSendWeeklyEmail = async () => {
    setEmailing(true);
    try {
      let res;
      if (isDoctor) {
        res = await schedulesApi.sendDentistScheduleEmail(targetId, weekStartDate, true);
      } else {
        res = await schedulesApi.sendStaffScheduleEmail(targetId, weekStartDate, true);
      }

      if (res?.success) {
        addToast?.(`Schedule email sent successfully to ${targetUser.email || targetUser.name}`, "success");
      } else {
        addToast?.(res?.message || "Email skipped (email may not be configured)", "info");
      }
    } catch (err) {
      console.error("Failed to send schedule email:", err);
      addToast?.("Failed to dispatch schedule email", "error");
    } finally {
      setEmailing(false);
    }
  };

  // Save / Update Date-Specific Override
  const handleSaveOverride = async () => {
    if (!overrideDate) {
      addToast?.("Please select a valid date for the schedule override", "error");
      return;
    }

    if (overrideWorking) {
      if (!overrideStartTime || !overrideEndTime) {
        addToast?.("Start and End times are required for working overrides", "error");
        return;
      }
      if (overrideStartTime >= overrideEndTime) {
        addToast?.("Start time must be before End time", "error");
        return;
      }
    }

    setSavingOverride(true);
    try {
      const payload = {
        staffId: targetId,
        scheduleDate: overrideDate,
        working: overrideWorking,
        startTime: overrideWorking ? `${overrideStartTime}:00` : null,
        endTime: overrideWorking ? `${overrideEndTime}:00` : null,
        shift: "OVERRIDE",
        notes: overrideNotes || "Admin date-specific schedule override",
      };

      const res = await schedulesApi.createDateOverride(targetId, payload);
      if (res?.emailSent) {
        addToast?.(res.message || `Schedule updated successfully and notification email sent to ${targetUser.name}.`, "success");
      } else {
        addToast?.(res?.message || "Schedule updated, but the notification email could not be sent.", "warning");
      }

      await fetchEffectiveOnDate(overrideDate);
      await fetchOverridesList();
      await loadSchedule(weekStartDate);
    } catch (err) {
      console.error("Failed to save override:", err);
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to save date override";
      addToast?.(msg, "error");
    } finally {
      setSavingOverride(false);
    }
  };

  // Delete Date-Specific Override
  const handleDeleteOverride = async (targetOverrideDate) => {
    const d = targetOverrideDate || overrideDate;
    setDeletingOverride(true);
    try {
      const res = await schedulesApi.deleteDateOverride(targetId, d);
      if (res?.emailSent) {
        addToast?.(res.message || `Schedule updated successfully and notification email sent to ${targetUser.name}.`, "success");
      } else {
        addToast?.(res?.message || "Schedule updated, but the notification email could not be sent.", "warning");
      }

      await fetchEffectiveOnDate(overrideDate);
      await fetchOverridesList();
      await loadSchedule(weekStartDate);
    } catch (err) {
      console.error("Failed to delete override:", err);
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to delete date override";
      addToast?.(msg, "error");
    } finally {
      setDeletingOverride(false);
    }
  };

  if (!isOpen || !targetUser) return null;

  return (
    <div className="df-modal-backdrop" onClick={onClose} style={{ zIndex: 1050 }}>
      <div 
        className="df-modal df-modal-lg" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 880, width: "95%", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div className="df-modal-header" style={{ padding: "18px 24px", borderBottom: "1px solid var(--df-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ 
              width: 44, 
              height: 44, 
              borderRadius: 12, 
              background: "var(--df-primary-50)", 
              color: "var(--df-primary-600)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center" 
            }}>
              <Calendar size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--df-text-heading)" }}>
                {isDoctor ? "Doctor Schedule Management" : "Staff Schedule Management"}
              </h3>
              <div style={{ fontSize: 13, color: "var(--df-text-muted)", marginTop: 2, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 600, color: "var(--df-text-main)" }}>{targetUser.name}</span>
                <span>•</span>
                <span className={`df-badge df-badge-${(targetUser.role || "").toLowerCase()}`} style={{ fontSize: 11, padding: "2px 8px" }}>
                  {(targetUser.staffRole || targetUser.specialization || targetUser.role || "STAFF").toUpperCase()}
                </span>
                {targetUser.email && (
                  <>
                    <span>•</span>
                    <span>{targetUser.email}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button 
            type="button" 
            className="df-icon-btn" 
            onClick={onClose}
            style={{ border: "none", background: "none", cursor: "pointer", color: "var(--df-text-muted)" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher (Weekly vs Date Override) - for Staff */}
        {!isDoctor && (
          <div style={{ display: "flex", gap: 8, padding: "0 24px", borderBottom: "1px solid var(--df-border)", background: "var(--df-bg-surface)" }}>
            <button
              type="button"
              onClick={() => setActiveTab("weekly")}
              style={{
                padding: "12px 16px",
                border: "none",
                background: "transparent",
                borderBottom: activeTab === "weekly" ? "2.5px solid var(--df-primary-600)" : "2.5px solid transparent",
                fontWeight: activeTab === "weekly" ? 700 : 500,
                color: activeTab === "weekly" ? "var(--df-primary-700)" : "var(--df-text-muted)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13.5
              }}
            >
              <Calendar size={16} />
              <span>Weekly Staff Schedule</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("override");
                fetchEffectiveOnDate(overrideDate);
              }}
              style={{
                padding: "12px 16px",
                border: "none",
                background: "transparent",
                borderBottom: activeTab === "override" ? "2.5px solid var(--df-primary-600)" : "2.5px solid transparent",
                fontWeight: activeTab === "override" ? 700 : 500,
                color: activeTab === "override" ? "var(--df-primary-700)" : "var(--df-text-muted)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13.5
              }}
            >
              <Sparkles size={16} />
              <span>Date-Specific Schedule Override</span>
              {allOverrides.length > 0 && (
                <span style={{ 
                  background: "#ede9fe", 
                  color: "#7c3aed", 
                  padding: "1px 6px", 
                  borderRadius: 10, 
                  fontSize: 11, 
                  fontWeight: 700 
                }}>
                  {allOverrides.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 1: WEEKLY SCHEDULE                                         */}
        {/* ============================================================== */}
        {activeTab === "weekly" && (
          <>
            {/* Week Selector Bar & Template Buttons */}
            <div style={{ padding: "14px 24px", background: "var(--df-gray-50)", borderBottom: "1px solid var(--df-border)", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              {/* Week Navigation */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button 
                  type="button" 
                  className="df-btn df-btn-secondary df-btn-sm" 
                  onClick={handlePrevWeek} 
                  title="Previous Week"
                  style={{ display: "inline-flex", alignItems: "center", padding: "6px 10px" }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button 
                  type="button" 
                  className="df-btn df-btn-secondary df-btn-sm" 
                  onClick={handleCurrentWeek}
                  style={{ fontWeight: 600, fontSize: 12 }}
                >
                  Current Week
                </button>
                <button 
                  type="button" 
                  className="df-btn df-btn-secondary df-btn-sm" 
                  onClick={handleNextWeek} 
                  title="Next Week"
                  style={{ display: "inline-flex", alignItems: "center", padding: "6px 10px" }}
                >
                  <ChevronRight size={16} />
                </button>
                <div style={{ marginLeft: 8, fontWeight: 700, fontSize: 14, color: "var(--df-primary-800)" }}>
                  📅 {getWeekDateRangeDisplay(weekStartDate)}
                </div>
              </div>

              {/* Preset Templates */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, color: "var(--df-text-muted)", fontWeight: 500, marginRight: 2 }}>
                  Presets:
                </span>
                <button 
                  type="button" 
                  className="df-btn df-btn-outline df-btn-sm" 
                  onClick={() => applyTemplate("standard_5day")}
                  style={{ fontSize: 11, padding: "3px 8px" }}
                  title="Monday to Friday 09:00 - 17:00, Weekends OFF"
                >
                  Mon–Fri 9–5
                </button>
                <button 
                  type="button" 
                  className="df-btn df-btn-outline df-btn-sm" 
                  onClick={() => applyTemplate("clinic_6day")}
                  style={{ fontSize: 11, padding: "3px 8px" }}
                  title="Monday to Saturday 09:00 - 17:00, Sunday OFF"
                >
                  6 Days (Sun OFF)
                </button>
                <button 
                  type="button" 
                  className="df-btn df-btn-outline df-btn-sm" 
                  onClick={() => applyTemplate("all_working")}
                  style={{ fontSize: 11, padding: "3px 8px" }}
                >
                  All Working
                </button>
              </div>
            </div>

            {/* Days Grid */}
            <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
              {loading ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "var(--df-text-muted)" }}>
                  <RefreshCw size={24} className="df-spin" style={{ marginBottom: 12 }} />
                  <div>Loading weekly schedule…</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {scheduleData.map((day, idx) => {
                    const dayDateStr = getDayDate(weekStartDate, idx);
                    const hasError = Boolean(validationErrors[day.dayOfWeek]);

                    return (
                      <div
                        key={day.dayOfWeek}
                        style={{
                          border: hasError ? "1.5px solid #ef4444" : "1px solid var(--df-border)",
                          borderRadius: 10,
                          padding: "12px 16px",
                          background: day.working ? "var(--df-bg-surface)" : "var(--df-gray-50)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 16,
                          transition: "all 0.15s ease",
                        }}
                      >
                        {/* Day Name & Date */}
                        <div style={{ width: 140, flexShrink: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: day.working ? "var(--df-text-heading)" : "var(--df-text-muted)" }}>
                            {DAY_LABELS[day.dayOfWeek]}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--df-text-muted)", marginTop: 2 }}>
                            {dayDateStr}
                          </div>
                        </div>

                        {/* Working vs OFF Toggle */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          <button
                            type="button"
                            className={`df-btn df-btn-sm ${day.working ? "df-btn-primary" : "df-btn-secondary"}`}
                            onClick={() => updateDay(day.dayOfWeek, { working: true })}
                            style={{
                              padding: "5px 12px",
                              fontSize: 12,
                              fontWeight: day.working ? 700 : 500,
                              background: day.working ? "var(--df-primary-600)" : undefined,
                              color: day.working ? "#fff" : undefined,
                            }}
                          >
                            Working
                          </button>
                          <button
                            type="button"
                            className={`df-btn df-btn-sm ${!day.working ? "df-btn-secondary" : "df-btn-outline"}`}
                            onClick={() => updateDay(day.dayOfWeek, { working: false })}
                            style={{
                              padding: "5px 12px",
                              fontSize: 12,
                              fontWeight: !day.working ? 700 : 500,
                              background: !day.working ? "#fee2e2" : undefined,
                              color: !day.working ? "#dc2626" : undefined,
                              borderColor: !day.working ? "#fca5a5" : undefined,
                            }}
                          >
                            OFF
                          </button>
                        </div>

                        {/* Hours & Shift */}
                        {day.working ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, justifyContent: "flex-end" }}>
                            {/* Preset Buttons */}
                            <div style={{ display: "flex", gap: 4 }}>
                              <button
                                type="button"
                                onClick={() => updateDay(day.dayOfWeek, { shift: "MORNING", startTime: "08:00", endTime: "16:00" })}
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  border: (day.startTime === "08:00" && day.endTime === "16:00") ? "1px solid var(--df-primary-500)" : "1px solid var(--df-border)",
                                  background: (day.startTime === "08:00" && day.endTime === "16:00") ? "var(--df-primary-50)" : "transparent",
                                  color: (day.startTime === "08:00" && day.endTime === "16:00") ? "var(--df-primary-700)" : "var(--df-text-muted)",
                                  cursor: "pointer",
                                }}
                                title="08:00 - 16:00"
                              >
                                8–4
                              </button>
                              <button
                                type="button"
                                onClick={() => updateDay(day.dayOfWeek, { shift: "MORNING", startTime: "09:00", endTime: "17:00" })}
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  border: (day.startTime === "09:00" && day.endTime === "17:00") ? "1px solid var(--df-primary-500)" : "1px solid var(--df-border)",
                                  background: (day.startTime === "09:00" && day.endTime === "17:00") ? "var(--df-primary-50)" : "transparent",
                                  color: (day.startTime === "09:00" && day.endTime === "17:00") ? "var(--df-primary-700)" : "var(--df-text-muted)",
                                  cursor: "pointer",
                                }}
                                title="09:00 - 17:00"
                              >
                                9–5
                              </button>
                              <button
                                type="button"
                                onClick={() => updateDay(day.dayOfWeek, { shift: "EVENING", startTime: "14:00", endTime: "20:00" })}
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  border: day.shift === "EVENING" ? "1px solid var(--df-primary-500)" : "1px solid var(--df-border)",
                                  background: day.shift === "EVENING" ? "var(--df-primary-50)" : "transparent",
                                  color: day.shift === "EVENING" ? "var(--df-primary-700)" : "var(--df-text-muted)",
                                  cursor: "pointer",
                                }}
                                title="14:00 - 20:00"
                              >
                                2–8
                              </button>
                            </div>

                            {/* Start & End Inputs */}
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Clock size={14} style={{ color: "var(--df-text-muted)" }} />
                              <input
                                type="time"
                                value={day.startTime}
                                onChange={(e) => updateDay(day.dayOfWeek, { startTime: e.target.value })}
                                className="df-input"
                                style={{ width: 105, padding: "5px 8px", fontSize: 13 }}
                              />
                              <span style={{ color: "var(--df-text-muted)", fontSize: 13 }}>to</span>
                              <input
                                type="time"
                                value={day.endTime}
                                onChange={(e) => updateDay(day.dayOfWeek, { endTime: e.target.value })}
                                className="df-input"
                                style={{ width: 105, padding: "5px 8px", fontSize: 13 }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, justifyContent: "flex-end" }}>
                            <span 
                              style={{ 
                                fontSize: 12, 
                                fontWeight: 700, 
                                color: "#dc2626", 
                                background: "#fee2e2", 
                                padding: "3px 10px", 
                                borderRadius: 6 
                              }}
                            >
                              OFF DAY
                            </span>
                            <span style={{ fontSize: 12, color: "var(--df-text-muted)" }}>
                              Scheduled day off
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Informational Callout */}
              <div style={{ marginTop: 16, padding: "10px 14px", background: "var(--df-primary-50)", borderRadius: 8, border: "1px solid var(--df-primary-100)", display: "flex", alignItems: "center", gap: 10 }}>
                <UserCheck size={18} style={{ color: "var(--df-primary-700)", flexShrink: 0 }} />
                <div style={{ fontSize: 12, color: "var(--df-primary-800)", lineHeight: 1.4 }}>
                  <strong>Weekly Schedule:</strong> Changes saved here configure the regular weekly schedule from Monday to Sunday. Saving will automatically send a notification email ONLY to <strong>{targetUser.name}</strong> ({targetUser.email || "no email configured"}).
                </div>
              </div>
            </div>

            {/* Weekly Footer Actions */}
            <div className="df-modal-footer" style={{ padding: "16px 24px", borderTop: "1px solid var(--df-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <button
                  type="button"
                  className="df-btn df-btn-secondary"
                  onClick={handleSendWeeklyEmail}
                  disabled={loading || saving || emailing}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}
                  title="Resend this weekly schedule notification email"
                >
                  <Mail size={15} />
                  {emailing ? "Sending Email…" : "Send Schedule via Email"}
                </button>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className="df-btn df-btn-secondary"
                  onClick={onClose}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="df-btn df-btn-primary"
                  onClick={handleSaveWeekly}
                  disabled={loading || saving}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 150, justifyContent: "center" }}
                >
                  {saving ? (
                    <>
                      <RefreshCw size={15} className="df-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      Save Weekly Schedule
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ============================================================== */}
        {/* TAB 2: DATE-SPECIFIC SCHEDULE OVERRIDE                         */}
        {/* ============================================================== */}
        {activeTab === "override" && !isDoctor && (
          <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Explanatory Banner */}
            <div style={{ 
              padding: "14px 16px", 
              background: "#f8fafc", 
              borderRadius: 10, 
              border: "1px solid #e2e8f0", 
              display: "flex", 
              gap: 12, 
              alignItems: "flex-start" 
            }}>
              <div style={{ color: "#7c3aed", marginTop: 2 }}>
                <Sparkles size={20} />
              </div>
              <div style={{ fontSize: 12.5, color: "#334155", lineHeight: 1.5 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: "#0f172a", marginBottom: 3 }}>
                  Date-Specific Schedule Override
                </div>
                Configure custom hours or mark a day OFF for a single selected date.
                A date-specific change does <strong>NOT</strong> modify the normal weekly schedule.
                When deleted, that date automatically reverts to the normal weekly schedule.
                <div style={{ marginTop: 4, color: "#64748b", fontStyle: "italic" }}>
                  Schedule Priority: (1) Admin date override &gt; (2) Normal weekly schedule &gt; (3) Auto-generated schedule.
                </div>
              </div>
            </div>

            {/* Date Selection & Effective Schedule Card */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Date Picker */}
              <div className="df-card" style={{ padding: 16, border: "1px solid var(--df-border)" }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--df-text-heading)", marginBottom: 6 }}>
                  Select Target Date:
                </label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="date"
                    className="df-input"
                    value={overrideDate}
                    onChange={(e) => {
                      setOverrideDate(e.target.value);
                      fetchEffectiveOnDate(e.target.value);
                    }}
                    style={{ flex: 1, fontSize: 13, padding: "8px 10px" }}
                  />
                  <button
                    type="button"
                    className="df-btn df-btn-secondary df-btn-sm"
                    onClick={() => {
                      const todayStr = new Date().toISOString().split("T")[0];
                      setOverrideDate(todayStr);
                      fetchEffectiveOnDate(todayStr);
                    }}
                    style={{ fontSize: 11.5 }}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    className="df-btn df-btn-secondary df-btn-sm"
                    onClick={() => {
                      const tm = new Date();
                      tm.setDate(tm.getDate() + 1);
                      const tmStr = tm.toISOString().split("T")[0];
                      setOverrideDate(tmStr);
                      fetchEffectiveOnDate(tmStr);
                    }}
                    style={{ fontSize: 11.5 }}
                  >
                    Tomorrow
                  </button>
                </div>

                <div style={{ fontSize: 12, color: "var(--df-text-muted)", marginTop: 8 }}>
                  Selected: <strong>{new Date(overrideDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}</strong>
                </div>
              </div>

              {/* Current Effective Schedule Card */}
              <div className="df-card" style={{ padding: 16, border: "1px solid var(--df-border)", background: "var(--df-gray-50)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--df-text-muted)", textTransform: "uppercase" }}>
                    Current Effective Schedule
                  </span>
                  {loadingEffective && <RefreshCw size={14} className="df-spin" />}
                </div>

                {effectiveOnDate ? (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 6,
                          background: effectiveOnDate.isOverride ? "#ede9fe" : (effectiveOnDate.effectiveSource === "WEEKLY" ? "#e0f2fe" : "#f1f5f9"),
                          color: effectiveOnDate.isOverride ? "#7c3aed" : (effectiveOnDate.effectiveSource === "WEEKLY" ? "#0284c7" : "#64748b"),
                          border: effectiveOnDate.isOverride ? "1px solid #c4b5fd" : (effectiveOnDate.effectiveSource === "WEEKLY" ? "1px solid #bae6fd" : "1px solid #cbd5e1"),
                        }}
                      >
                        {effectiveOnDate.effectiveBadge || (effectiveOnDate.isOverride ? "[Admin Date Override]" : "[Weekly Schedule]")}
                      </span>
                      {effectiveOnDate.isOverride && (
                        <span style={{ fontSize: 11, color: "#7c3aed", fontWeight: 600 }}>
                          (Priority 1 Active)
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 15, fontWeight: 800, color: effectiveOnDate.working ? "#0f172a" : "#dc2626" }}>
                      {effectiveOnDate.working && effectiveOnDate.startTime && effectiveOnDate.endTime ? (
                        `${formatDisplayTime(effectiveOnDate.startTime)} – ${formatDisplayTime(effectiveOnDate.endTime)}`
                      ) : (
                        "OFF DAY"
                      )}
                    </div>

                    {effectiveOnDate.notes && (
                      <div style={{ fontSize: 11.5, color: "var(--df-text-muted)", marginTop: 4 }}>
                        Note: {effectiveOnDate.notes}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: "var(--df-text-muted)" }}>
                    Select a date above to inspect the current effective schedule.
                  </div>
                )}
              </div>
            </div>

            {/* Override Configuration Form */}
            <div className="df-card" style={{ padding: 18, border: "1.5px solid #c4b5fd", background: "#fbfbfe" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Sparkles size={18} style={{ color: "#7c3aed" }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#4c1d95" }}>
                    {effectiveOnDate?.isOverride ? "Edit Date-Specific Override" : "Add New Date-Specific Override"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    className={`df-btn df-btn-sm ${overrideWorking ? "df-btn-primary" : "df-btn-secondary"}`}
                    onClick={() => setOverrideWorking(true)}
                    style={{
                      background: overrideWorking ? "#7c3aed" : undefined,
                      borderColor: overrideWorking ? "#7c3aed" : undefined,
                      fontSize: 12,
                    }}
                  >
                    Working Shift
                  </button>
                  <button
                    type="button"
                    className={`df-btn df-btn-sm ${!overrideWorking ? "df-btn-secondary" : "df-btn-outline"}`}
                    onClick={() => setOverrideWorking(false)}
                    style={{
                      background: !overrideWorking ? "#fee2e2" : undefined,
                      color: !overrideWorking ? "#dc2626" : undefined,
                      borderColor: !overrideWorking ? "#fca5a5" : undefined,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    Mark as OFF
                  </button>
                </div>
              </div>

              {overrideWorking ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {/* Preset quick picks */}
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 11.5, color: "var(--df-text-muted)", fontWeight: 500 }}>Quick Hours:</span>
                    {[
                      { label: "10:00–18:00 (Example)", start: "10:00", end: "18:00" },
                      { label: "08:00–16:00", start: "08:00", end: "16:00" },
                      { label: "09:00–17:00", start: "09:00", end: "17:00" },
                      { label: "14:00–20:00", start: "14:00", end: "20:00" },
                    ].map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        className="df-btn df-btn-outline df-btn-sm"
                        style={{ fontSize: 11, padding: "2px 7px" }}
                        onClick={() => {
                          setOverrideStartTime(p.start);
                          setOverrideEndTime(p.end);
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Hours Inputs */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: "#334155" }}>Start Time:</span>
                      <input
                        type="time"
                        className="df-input"
                        value={overrideStartTime}
                        onChange={(e) => setOverrideStartTime(e.target.value)}
                        style={{ width: 110, fontSize: 13, padding: "6px 8px" }}
                      />
                    </div>
                    <span style={{ color: "var(--df-text-muted)" }}>to</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: "#334155" }}>End Time:</span>
                      <input
                        type="time"
                        className="df-input"
                        value={overrideEndTime}
                        onChange={(e) => setOverrideEndTime(e.target.value)}
                        style={{ width: 110, fontSize: 13, padding: "6px 8px" }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ padding: "10px 14px", background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca", color: "#991b1b", fontSize: 12.5 }}>
                  This staff member will be marked as <strong>OFF</strong> specifically on {overrideDate}. Their normal weekly schedule for other weeks remains intact.
                </div>
              )}

              {/* Notes Input */}
              <div style={{ marginTop: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                  Override Reason / Notes (Optional):
                </label>
                <input
                  type="text"
                  className="df-input"
                  placeholder="e.g., Extended shift, clinic event coverage, requested date off..."
                  value={overrideNotes}
                  onChange={(e) => setOverrideNotes(e.target.value)}
                  style={{ width: "100%", fontSize: 12.5, padding: "6px 10px" }}
                />
              </div>

              {/* Action Buttons for Override */}
              <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  {effectiveOnDate?.isOverride && (
                    <button
                      type="button"
                      className="df-btn df-btn-outline df-btn-sm"
                      onClick={() => handleDeleteOverride(overrideDate)}
                      disabled={deletingOverride || savingOverride}
                      style={{ 
                        color: "#dc2626", 
                        borderColor: "#fca5a5", 
                        display: "inline-flex", 
                        alignItems: "center", 
                        gap: 6,
                        background: "#fff"
                      }}
                      title="Delete this override and restore normal weekly schedule"
                    >
                      <Trash2 size={14} />
                      {deletingOverride ? "Deleting…" : "Delete Override (Restore Weekly)"}
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    className="df-btn df-btn-primary"
                    onClick={handleSaveOverride}
                    disabled={savingOverride || deletingOverride}
                    style={{ 
                      background: "#7c3aed", 
                      borderColor: "#7c3aed", 
                      display: "inline-flex", 
                      alignItems: "center", 
                      gap: 6,
                      minWidth: 150,
                      justifyContent: "center"
                    }}
                  >
                    {savingOverride ? (
                      <>
                        <RefreshCw size={14} className="df-spin" />
                        Saving Override…
                      </>
                    ) : (
                      <>
                        <Check size={15} />
                        {effectiveOnDate?.isOverride ? "Update Date Override" : "Save Date Override"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* List of Active Overrides for this staff member */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--df-text-heading)" }}>
                  All Configured Date Overrides ({allOverrides.length})
                </span>
                {loadingOverridesList && <RefreshCw size={14} className="df-spin" />}
              </div>

              {allOverrides.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", background: "var(--df-gray-50)", borderRadius: 8, color: "var(--df-text-muted)", fontSize: 12.5 }}>
                  No date-specific overrides configured for this staff member. The normal weekly schedule is used for all dates.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {allOverrides.map((ov) => (
                    <div
                      key={ov.id}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                        background: "#fff",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ 
                          background: "#ede9fe", 
                          color: "#7c3aed", 
                          padding: "3px 8px", 
                          borderRadius: 6, 
                          fontSize: 11, 
                          fontWeight: 700 
                        }}>
                          {ov.scheduleDate || "—"}
                        </span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>
                            {ov.working && ov.startTime && ov.endTime ? (
                              `${formatDisplayTime(ov.startTime)} – ${formatDisplayTime(ov.endTime)}`
                            ) : (
                              <span style={{ color: "#dc2626" }}>OFF DAY</span>
                            )}
                          </div>
                          {ov.notes && (
                            <div style={{ fontSize: 11, color: "var(--df-text-muted)" }}>
                              {ov.notes}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className="df-btn df-btn-secondary df-btn-sm"
                          style={{ fontSize: 11, padding: "3px 8px" }}
                          onClick={() => {
                            setOverrideDate(ov.scheduleDate);
                            fetchEffectiveOnDate(ov.scheduleDate);
                          }}
                        >
                          Select
                        </button>
                        <button
                          type="button"
                          className="df-btn df-btn-outline df-btn-sm"
                          style={{ fontSize: 11, padding: "3px 8px", color: "#dc2626", borderColor: "#fca5a5" }}
                          onClick={() => handleDeleteOverride(ov.scheduleDate)}
                          title="Delete override and restore weekly schedule"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
