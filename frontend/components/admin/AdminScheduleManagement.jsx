import { useState, useEffect, useMemo, useCallback } from "react";
import AdminIcon from "./AdminIcons";
import { Modal } from "../dashboard/DashboardPrimitives";
import { useNotifications } from "../../context/NotificationContext";
import schedulesApi from "../../api/schedules";
import { dentistApi } from "../../api/dentists";
import { usersApi } from "../../api/users";
import { AdminPageHeader } from "./AdminModules";

function formatTime(timeStr) {
  if (!timeStr) return "—";
  const [h, m] = timeStr.split(":");
  let hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${String(hour).padStart(2, "0")}:${m} ${ampm}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getMondayOfDate(date) {
  const d = date ? new Date(date) : new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split("T")[0];
}

export default function AdminScheduleManagementView({ role = "admin" }) {
  const { addToast } = useNotifications();

  // Data states
  const [schedules, setSchedules] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [personFilter, setPersonFilter] = useState("ALL");
  const [dateQuickFilter, setDateQuickFilter] = useState("THIS_WEEK");
  const [customDate, setCustomDate] = useState("");
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'calendar'

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editSchedule, setEditSchedule] = useState(null);
  const [viewSchedule, setViewSchedule] = useState(null);
  const [deleteSchedule, setDeleteSchedule] = useState(null);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    personType: "DENTIST",
    dentistId: "",
    staffId: "",
    scheduleDate: new Date().toISOString().split("T")[0],
    working: true,
    startTime: "09:00",
    endTime: "17:00",
    shift: "MORNING",
    status: "ACTIVE",
    notes: "",
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Auto-generate form state
  const [generateWeek, setGenerateWeek] = useState(getMondayOfDate(new Date()));
  const [generateForce, setGenerateForce] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Compute date range based on quick filter
  const dateParams = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    if (dateQuickFilter === "TODAY") {
      return { date: todayStr };
    }
    if (dateQuickFilter === "THIS_WEEK") {
      const monStr = getMondayOfDate(today);
      const sun = new Date(monStr + "T00:00:00");
      sun.setDate(sun.getDate() + 6);
      return { startDate: monStr, endDate: sun.toISOString().split("T")[0] };
    }
    if (dateQuickFilter === "NEXT_WEEK") {
      const nextMon = new Date(getMondayOfDate(today) + "T00:00:00");
      nextMon.setDate(nextMon.getDate() + 7);
      const nextMonStr = nextMon.toISOString().split("T")[0];
      const nextSun = new Date(nextMonStr + "T00:00:00");
      nextSun.setDate(nextSun.getDate() + 6);
      return { startDate: nextMonStr, endDate: nextSun.toISOString().split("T")[0] };
    }
    if (dateQuickFilter === "CUSTOM" && customDate) {
      return { date: customDate };
    }
    return {};
  }, [dateQuickFilter, customDate]);

  // Load personnel (Dentists & Staff)
  const loadPersonnel = useCallback(async () => {
    try {
      const [dList, sList] = await Promise.all([
        dentistApi.getAllDentists().catch(() => []),
        usersApi.getAllStaff().catch(() => []),
      ]);
      setDentists(dList || []);
      setStaffList(sList || []);
    } catch (err) {
      console.error("Failed to load personnel list:", err);
    }
  }, []);

  // Fetch Schedules from backend
  const fetchSchedules = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const params = { ...dateParams };
      if (search.trim()) params.search = search.trim();
      if (roleFilter !== "ALL") params.role = roleFilter;
      if (statusFilter !== "ALL") params.status = statusFilter;

      if (personFilter.startsWith("D_")) {
        params.dentistId = personFilter.replace("D_", "");
      } else if (personFilter.startsWith("S_")) {
        params.staffId = personFilter.replace("S_", "");
      }

      const data = await schedulesApi.getAdminSchedules(params);
      setSchedules(data || []);
    } catch (err) {
      console.error("Failed to fetch schedules:", err);
      addToast(err?.response?.data?.message || err?.message || "Failed to load schedules", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateParams, search, roleFilter, statusFilter, personFilter, addToast]);

  useEffect(() => {
    loadPersonnel();
  }, [loadPersonnel]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Summary statistics
  const stats = useMemo(() => {
    const total = schedules.length;
    const active = schedules.filter((s) => s.working && s.status === "ACTIVE").length;
    const offDays = schedules.filter((s) => !s.working || s.status === "OFF").length;

    const doctorIds = new Set(
      schedules
        .filter((s) => s.dentistId && s.working && s.status === "ACTIVE")
        .map((s) => s.dentistId)
    );
    const staffIds = new Set(
      schedules
        .filter((s) => s.staffId && s.working && s.status === "ACTIVE")
        .map((s) => s.staffId)
    );

    return {
      total,
      active,
      doctorsCount: doctorIds.size,
      staffCount: staffIds.size,
      offDays,
    };
  }, [schedules]);

  // Group schedules by day of week for Calendar View
  const calendarDays = useMemo(() => {
    const today = new Date();
    const mondayStr = getMondayOfDate(
      dateQuickFilter === "NEXT_WEEK"
        ? new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
        : customDate
        ? new Date(customDate)
        : today
    );

    const days = [
      { name: "Monday", index: 0 },
      { name: "Tuesday", index: 1 },
      { name: "Wednesday", index: 2 },
      { name: "Thursday", index: 3 },
      { name: "Friday", index: 4 },
      { name: "Saturday", index: 5 },
      { name: "Sunday", index: 6 },
    ].map((d) => {
      const dayDate = new Date(mondayStr + "T00:00:00");
      dayDate.setDate(dayDate.getDate() + d.index);
      const isoDate = dayDate.toISOString().split("T")[0];

      const daySchedules = schedules.filter((s) => {
        const sDate = s.scheduleDate;
        return sDate === isoDate;
      });

      return {
        ...d,
        date: isoDate,
        displayDate: dayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        isToday: isoDate === today.toISOString().split("T")[0],
        schedules: daySchedules,
      };
    });

    return days;
  }, [schedules, dateQuickFilter, customDate]);

  // Open Add Modal
  const openAddModal = () => {
    setFormData({
      personType: "DENTIST",
      dentistId: dentists.length > 0 ? dentists[0].id : "",
      staffId: staffList.length > 0 ? staffList[0].id : "",
      scheduleDate: new Date().toISOString().split("T")[0],
      working: true,
      startTime: "09:00",
      endTime: "17:00",
      shift: "MORNING",
      status: "ACTIVE",
      notes: "",
    });
    setFormError("");
    setAddModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (sch) => {
    setEditSchedule(sch);
    setFormData({
      personType: sch.dentistId ? "DENTIST" : "STAFF",
      dentistId: sch.dentistId || "",
      staffId: sch.staffId || "",
      scheduleDate: sch.scheduleDate || "",
      working: Boolean(sch.working),
      startTime: sch.startTime ? sch.startTime.slice(0, 5) : "09:00",
      endTime: sch.endTime ? sch.endTime.slice(0, 5) : "17:00",
      shift: sch.shift || "MORNING",
      status: sch.status || "ACTIVE",
      notes: sch.notes || "",
    });
    setFormError("");
  };

  // Handle Preset shift selection
  const handleShiftPreset = (preset) => {
    if (preset === "MORNING") {
      setFormData((prev) => ({
        ...prev,
        shift: "MORNING",
        working: true,
        startTime: "09:00",
        endTime: "14:00",
      }));
    } else if (preset === "EVENING") {
      setFormData((prev) => ({
        ...prev,
        shift: "EVENING",
        working: true,
        startTime: "14:00",
        endTime: "20:00",
      }));
    } else if (preset === "FULL_DAY") {
      setFormData((prev) => ({
        ...prev,
        shift: "MORNING",
        working: true,
        startTime: "09:00",
        endTime: "17:00",
      }));
    } else if (preset === "OFF") {
      setFormData((prev) => ({
        ...prev,
        working: false,
        status: "OFF",
        startTime: "",
        endTime: "",
      }));
    }
  };

  // Submit Add Schedule
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.scheduleDate) {
      setFormError("Schedule date is required.");
      return;
    }

    if (formData.working) {
      if (!formData.startTime || !formData.endTime) {
        setFormError("Start and End times are required for working shifts.");
        return;
      }
      if (formData.startTime >= formData.endTime) {
        setFormError("Start time must be before end time.");
        return;
      }
    }

    const payload = {
      dentistId: formData.personType === "DENTIST" ? Number(formData.dentistId) : null,
      staffId: formData.personType === "STAFF" ? Number(formData.staffId) : null,
      scheduleDate: formData.scheduleDate,
      working: formData.working,
      startTime: formData.working ? (formData.startTime.length === 5 ? formData.startTime + ":00" : formData.startTime) : null,
      endTime: formData.working ? (formData.endTime.length === 5 ? formData.endTime + ":00" : formData.endTime) : null,
      shift: formData.shift,
      status: formData.working ? formData.status : "OFF",
      notes: formData.notes,
    };

    if (!payload.dentistId && !payload.staffId) {
      setFormError("Please select a Dentist or Staff member.");
      return;
    }

    try {
      setFormSubmitting(true);
      await schedulesApi.createSchedule(payload);
      addToast("Schedule created successfully!", "success");
      setAddModalOpen(false);
      fetchSchedules();
    } catch (err) {
      console.error("Create schedule error:", err);
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to create schedule";
      setFormError(msg);
      addToast(msg, "error");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Edit Schedule
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editSchedule) return;
    setFormError("");

    if (!formData.scheduleDate) {
      setFormError("Schedule date is required.");
      return;
    }

    if (formData.working) {
      if (!formData.startTime || !formData.endTime) {
        setFormError("Start and End times are required for working shifts.");
        return;
      }
      if (formData.startTime >= formData.endTime) {
        setFormError("Start time must be before end time.");
        return;
      }
    }

    const payload = {
      scheduleDate: formData.scheduleDate,
      working: formData.working,
      startTime: formData.working ? (formData.startTime.length === 5 ? formData.startTime + ":00" : formData.startTime) : null,
      endTime: formData.working ? (formData.endTime.length === 5 ? formData.endTime + ":00" : formData.endTime) : null,
      shift: formData.shift,
      status: formData.working ? formData.status : "OFF",
      notes: formData.notes,
    };

    try {
      setFormSubmitting(true);
      await schedulesApi.updateSchedule(editSchedule.id, payload);
      addToast("Schedule updated successfully (Admin override preserved)!", "success");
      setEditSchedule(null);
      fetchSchedules();
    } catch (err) {
      console.error("Update schedule error:", err);
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to update schedule";
      setFormError(msg);
      addToast(msg, "error");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Delete Schedule
  const handleDeleteSubmit = async () => {
    if (!deleteSchedule) return;
    try {
      setFormSubmitting(true);
      await schedulesApi.deleteSchedule(deleteSchedule.id);
      addToast("Schedule removed. Automated generation will preserve this deletion.", "success");
      setDeleteSchedule(null);
      fetchSchedules();
    } catch (err) {
      console.error("Delete schedule error:", err);
      const msg = err?.response?.data?.error || err?.message || "Failed to delete schedule";
      addToast(msg, "error");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit Auto-Generation
  const handleAutoGenerateSubmit = async (e) => {
    e.preventDefault();
    try {
      setGenerating(true);
      const res = await schedulesApi.autoGenerateSchedules({
        targetDate: generateWeek,
        force: generateForce,
      });
      const count = res?.count ?? 0;
      addToast(`Generated ${count} schedules for week of ${generateWeek}! Admin-edited records were preserved.`, "success");
      setGenerateModalOpen(false);
      fetchSchedules();
    } catch (err) {
      console.error("Auto generate error:", err);
      const msg = err?.response?.data?.error || err?.message || "Failed to generate schedules";
      addToast(msg, "error");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="adm-schedule-management df-role-page df-role-blue">
      {/* Page Header */}
      <AdminPageHeader
        kicker="Clinic Operations"
        title="Dentist & Staff Schedule Management"
        subtitle="Configure consultation rosters, staff duty shifts, and operating hours with real-time overlap validation and automatic availability sync."
        actions={
          <>
            <button
              type="button"
              className="df-btn df-btn-secondary"
              onClick={() => fetchSchedules(true)}
              disabled={refreshing}
              title="Refresh schedules"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <span style={{ display: "inline-block", transform: refreshing ? "rotate(180deg)" : "none", transition: "transform 0.5s ease" }}>
                <AdminIcon name="refresh" size={15} />
              </span>
              <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
            </button>

            <button
              type="button"
              className="df-btn df-btn-secondary"
              onClick={() => setGenerateModalOpen(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <AdminIcon name="bolt" size={15} />
              <span>⚡ Auto-Generate</span>
            </button>

            <button
              type="button"
              className="df-btn df-btn-primary"
              onClick={openAddModal}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <AdminIcon name="plus" size={16} />
              <span>+ Add Schedule</span>
            </button>
          </>
        }
      />

      {/* Stat Cards */}
      <div className="df-stat-grid" style={{ marginBottom: 20 }}>
        <div className="df-card df-stat-card" style={{ padding: 18, borderLeft: "4px solid #0284c7" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span className="df-stat-label" style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Total Shifts
              </span>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
                {stats.total}
              </div>
              <span style={{ fontSize: 11.5, color: "#0284c7", fontWeight: 600 }}>
                {stats.active} Active Duty
              </span>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#e0f2fe", display: "grid", placeItems: "center", color: "#0284c7" }}>
              <AdminIcon name="calendar" size={22} />
            </div>
          </div>
        </div>

        <div className="df-card df-stat-card" style={{ padding: 18, borderLeft: "4px solid #10b981" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span className="df-stat-label" style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Dentists on Duty
              </span>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
                {stats.doctorsCount}
              </div>
              <span style={{ fontSize: 11.5, color: "#10b981", fontWeight: 600 }}>
                Consulting Doctors
              </span>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#d1fae5", display: "grid", placeItems: "center", color: "#10b981" }}>
              <AdminIcon name="doctors" size={22} />
            </div>
          </div>
        </div>

        <div className="df-card df-stat-card" style={{ padding: 18, borderLeft: "4px solid #8b5cf6" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span className="df-stat-label" style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Staff on Duty
              </span>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
                {stats.staffCount}
              </div>
              <span style={{ fontSize: 11.5, color: "#8b5cf6", fontWeight: 600 }}>
                Reception & Assistants
              </span>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#ede9fe", display: "grid", placeItems: "center", color: "#8b5cf6" }}>
              <AdminIcon name="staff" size={22} />
            </div>
          </div>
        </div>

        <div className="df-card df-stat-card" style={{ padding: 18, borderLeft: "4px solid #f59e0b" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span className="df-stat-label" style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Scheduled Off Days
              </span>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>
                {stats.offDays}
              </div>
              <span style={{ fontSize: 11.5, color: "#f59e0b", fontWeight: 600 }}>
                Rest & Clinic Holidays
              </span>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fef3c7", display: "grid", placeItems: "center", color: "#f59e0b" }}>
              <AdminIcon name="clock" size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <section className="df-card" style={{ marginBottom: 18, padding: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          {/* Left: Quick Date Filters */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginRight: 4 }}>Period:</span>
            {[
              { id: "THIS_WEEK", label: "This Week" },
              { id: "NEXT_WEEK", label: "Next Week" },
              { id: "TODAY", label: "Today" },
              { id: "CUSTOM", label: "Specific Date" },
              { id: "ALL", label: "All Dates" },
            ].map((qf) => (
              <button
                key={qf.id}
                type="button"
                className={`adm-tab ${dateQuickFilter === qf.id ? "active" : ""}`}
                style={{ padding: "6px 12px", fontSize: 12 }}
                onClick={() => setDateQuickFilter(qf.id)}
              >
                {qf.label}
              </button>
            ))}

            {dateQuickFilter === "CUSTOM" && (
              <input
                type="date"
                className="df-input"
                style={{ padding: "5px 10px", fontSize: 12, width: 140 }}
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
              />
            )}
          </div>

          {/* Right: View switcher */}
          <div style={{ display: "flex", gap: 6, background: "#f1f5f9", padding: 3, borderRadius: 8 }}>
            <button
              type="button"
              className={`adm-tab ${viewMode === "table" ? "active" : ""}`}
              style={{ padding: "5px 10px", fontSize: 12, gap: 5 }}
              onClick={() => setViewMode("table")}
            >
              <AdminIcon name="table" size={14} />
              <span>Table</span>
            </button>
            <button
              type="button"
              className={`adm-tab ${viewMode === "calendar" ? "active" : ""}`}
              style={{ padding: "5px 10px", fontSize: 12, gap: 5 }}
              onClick={() => setViewMode("calendar")}
            >
              <AdminIcon name="calendar" size={14} />
              <span>Weekly Roster</span>
            </button>
          </div>
        </div>

        {/* Second Row: Search and Filters */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 14 }}>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <input
              type="text"
              className="df-input"
              placeholder="Search by dentist, staff, shift, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 32, fontSize: 13 }}
            />
            <span style={{ position: "absolute", left: 10, top: 10, color: "#94a3b8" }}>
              <AdminIcon name="search" size={15} />
            </span>
          </div>

          {/* Role Filter */}
          <div>
            <select
              className="df-select"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPersonFilter("ALL");
              }}
              style={{ fontSize: 13 }}
            >
              <option value="ALL">All Roles (Doctors & Staff)</option>
              <option value="DENTIST">Dentists / Doctors</option>
              <option value="STAFF">Clinic Staff</option>
            </select>
          </div>

          {/* Person Filter */}
          <div>
            <select
              className="df-select"
              value={personFilter}
              onChange={(e) => setPersonFilter(e.target.value)}
              style={{ fontSize: 13 }}
            >
              <option value="ALL">All Personnel</option>
              {roleFilter !== "STAFF" && dentists.length > 0 && (
                <optgroup label="Dentists">
                  {dentists.map((d) => (
                    <option key={`D_${d.id}`} value={`D_${d.id}`}>
                      {d.name || `Dr. ${d.firstName} ${d.lastName}`} {d.specialization ? `(${d.specialization})` : ""}
                    </option>
                  ))}
                </optgroup>
              )}
              {roleFilter !== "DENTIST" && staffList.length > 0 && (
                <optgroup label="Staff Members">
                  {staffList.map((s) => (
                    <option key={`S_${s.id}`} value={`S_${s.id}`}>
                      {s.firstName} {s.lastName} ({s.role || "Staff"})
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              className="df-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ fontSize: 13 }}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Shift</option>
              <option value="OFF">Day Off</option>
            </select>
          </div>
        </div>
      </section>

      {/* Main Content Area: Loading / Table / Calendar */}
      {loading ? (
        <section className="df-card" style={{ padding: "60px 20px", textAlign: "center", color: "#64748b" }}>
          <div style={{ display: "inline-block", animation: "spin 1s linear infinite", marginBottom: 12 }}>
            <AdminIcon name="refresh" size={28} />
          </div>
          <p style={{ fontWeight: 600, fontSize: 14 }}>Loading clinic duty schedules...</p>
        </section>
      ) : schedules.length === 0 ? (
        <section className="df-card" style={{ padding: "60px 20px", textAlign: "center", color: "#64748b" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#f1f5f9", margin: "0 auto 16px", display: "grid", placeItems: "center", color: "#94a3b8" }}>
            <AdminIcon name="calendar" size={30} />
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>No Schedules Found</h3>
          <p style={{ maxWidth: 450, margin: "0 auto 18px", fontSize: 13.5 }}>
            No schedules match the selected filters or date period. You can create a shift manually or automatically generate weekly rosters.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button type="button" className="df-btn df-btn-secondary" onClick={() => setGenerateModalOpen(true)}>
              ⚡ Auto-Generate This Week
            </button>
            <button type="button" className="df-btn df-btn-primary" onClick={openAddModal}>
              + Add Schedule
            </button>
          </div>
        </section>
      ) : viewMode === "table" ? (
        /* ======================== TABLE VIEW ======================== */
        <section className="df-card" style={{ overflow: "hidden" }}>
          <div className="adm-table-wrap" style={{ overflowX: "auto" }}>
            <table className="df-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "12px 16px", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>ID</th>
                  <th style={{ padding: "12px 16px", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>Dentist / Staff</th>
                  <th style={{ padding: "12px 16px", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>Role</th>
                  <th style={{ padding: "12px 16px", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>Date & Day</th>
                  <th style={{ padding: "12px 16px", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>Hours</th>
                  <th style={{ padding: "12px 16px", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>Shift</th>
                  <th style={{ padding: "12px 16px", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>Source</th>
                  <th style={{ padding: "12px 16px", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>Status</th>
                  <th style={{ padding: "12px 16px", fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", color: "#64748b", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((sch) => {
                  const isDentist = Boolean(sch.dentistId);
                  const isWorking = Boolean(sch.working);
                  const isManual = Boolean(sch.modifiedByAdmin) || sch.scheduleSource === "MANUAL";

                  return (
                    <tr key={sch.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s ease" }}>
                      {/* ID */}
                      <td style={{ padding: "14px 16px", fontSize: 12.5, fontWeight: 600, color: "#64748b" }}>
                        #{sch.id}
                      </td>

                      {/* Name & Specialization */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: "50%",
                              background: isDentist ? "#e0f2fe" : "#ede9fe",
                              color: isDentist ? "#0284c7" : "#7c3aed",
                              display: "grid",
                              placeItems: "center",
                              fontWeight: 700,
                              fontSize: 13,
                              flexShrink: 0,
                            }}
                          >
                            {isDentist ? "Dr" : "St"}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13.5, color: "#0f172a" }}>
                              {sch.name || (isDentist ? `Dr. Dentist #${sch.dentistId}` : `Staff #${sch.staffId}`)}
                            </div>
                            {sch.specialization && (
                              <div style={{ fontSize: 11.5, color: "#64748b" }}>
                                {sch.specialization}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          className={`adm-chip ${isDentist ? "adm-chip-blue" : "adm-chip-purple"}`}
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            fontSize: 11,
                            fontWeight: 700,
                            borderRadius: 6,
                            background: isDentist ? "#e0f2fe" : "#ede9fe",
                            color: isDentist ? "#0369a1" : "#6d28d9",
                          }}
                        >
                          {sch.role || (isDentist ? "DENTIST" : "STAFF")}
                        </span>
                      </td>

                      {/* Date & Day */}
                      <td style={{ padding: "14px 16px", fontSize: 13 }}>
                        <div style={{ fontWeight: 600, color: "#1e293b" }}>{formatDate(sch.scheduleDate)}</div>
                        <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                          {sch.dayOfWeek || "—"}
                        </div>
                      </td>

                      {/* Working Hours */}
                      <td style={{ padding: "14px 16px", fontSize: 13 }}>
                        {isWorking && sch.startTime && sch.endTime ? (
                          <span style={{ fontWeight: 600, color: "#0f172a" }}>
                            {formatTime(sch.startTime)} – {formatTime(sch.endTime)}
                          </span>
                        ) : (
                          <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: 12 }}>
                            OFF (Rest Day)
                          </span>
                        )}
                      </td>

                      {/* Shift */}
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 6,
                            background: "#f1f5f9",
                            color: "#475569",
                          }}
                        >
                          {sch.shift || "—"}
                        </span>
                      </td>

                      {/* Source */}
                      <td style={{ padding: "14px 16px" }}>
                        {isManual ? (
                          <span
                            title="Created or modified by Admin. Automated generation will not overwrite."
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "3px 8px",
                              borderRadius: 6,
                              background: "#fef3c7",
                              color: "#b45309",
                            }}
                          >
                            <span>👤</span>
                            <span>Admin Modified</span>
                          </span>
                        ) : (
                          <span
                            title="Generated automatically from dentist availability or clinic hours."
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "3px 8px",
                              borderRadius: 6,
                              background: "#e0f2fe",
                              color: "#0369a1",
                            }}
                          >
                            <span>⚡</span>
                            <span>Auto-Generated</span>
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 11.5,
                            fontWeight: 700,
                            padding: "3px 9px",
                            borderRadius: 9999,
                            background: isWorking && sch.status === "ACTIVE" ? "#dcfce7" : "#f1f5f9",
                            color: isWorking && sch.status === "ACTIVE" ? "#15803d" : "#64748b",
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: isWorking && sch.status === "ACTIVE" ? "#16a34a" : "#94a3b8",
                            }}
                          />
                          {sch.status || (isWorking ? "ACTIVE" : "OFF")}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                          <button
                            type="button"
                            className="df-btn df-btn-secondary"
                            style={{ padding: "5px 8px", fontSize: 12 }}
                            onClick={() => setViewSchedule(sch)}
                            title="View shift details"
                          >
                            <AdminIcon name="eye" size={14} />
                          </button>

                          <button
                            type="button"
                            className="df-btn df-btn-secondary"
                            style={{ padding: "5px 8px", fontSize: 12 }}
                            onClick={() => openEditModal(sch)}
                            title="Edit shift"
                          >
                            <AdminIcon name="edit" size={14} />
                          </button>

                          <button
                            type="button"
                            className="df-btn df-btn-secondary"
                            style={{ padding: "5px 8px", fontSize: 12, color: "#dc2626" }}
                            onClick={() => setDeleteSchedule(sch)}
                            title="Delete schedule"
                          >
                            <AdminIcon name="x" size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        /* ======================== CALENDAR / ROSTER VIEW ======================== */
        <section className="df-card" style={{ padding: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(160px, 1fr))",
              gap: 12,
              overflowX: "auto",
            }}
          >
            {calendarDays.map((day) => (
              <div
                key={day.date}
                style={{
                  background: day.isToday ? "#eff6ff" : "#f8fafc",
                  borderRadius: 10,
                  border: day.isToday ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                  padding: 10,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 400,
                }}
              >
                {/* Day Header */}
                <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 8, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 800, fontSize: 13, color: day.isToday ? "#1d4ed8" : "#0f172a" }}>
                      {day.name.slice(0, 3)}
                    </span>
                    {day.isToday && (
                      <span style={{ fontSize: 9.5, fontWeight: 800, color: "#2563eb", background: "#dbeafe", padding: "1px 6px", borderRadius: 4, textTransform: "uppercase" }}>
                        Today
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{day.displayDate}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#0284c7", marginTop: 4 }}>
                    {day.schedules.length} {day.schedules.length === 1 ? "shift" : "shifts"}
                  </div>
                </div>

                {/* List of shifts on this day */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                  {day.schedules.length === 0 ? (
                    <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 11.5, margin: "auto 0" }}>
                      No shifts scheduled
                    </div>
                  ) : (
                    day.schedules.map((sch) => {
                      const isDoc = Boolean(sch.dentistId);
                      const isWorking = Boolean(sch.working);
                      const isManual = Boolean(sch.modifiedByAdmin) || sch.scheduleSource === "MANUAL";

                      return (
                        <div
                          key={sch.id}
                          style={{
                            background: isWorking ? "#ffffff" : "#f1f5f9",
                            border: "1px solid #e2e8f0",
                            borderRadius: 8,
                            padding: 8,
                            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                            fontSize: 12,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 4 }}>
                            <div style={{ fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>
                              {sch.name || (isDoc ? "Doctor" : "Staff")}
                            </div>
                            <span
                              style={{
                                fontSize: 9.5,
                                fontWeight: 800,
                                padding: "1px 5px",
                                borderRadius: 4,
                                background: isDoc ? "#e0f2fe" : "#ede9fe",
                                color: isDoc ? "#0284c7" : "#7c3aed",
                              }}
                            >
                              {isDoc ? "DOC" : "STAFF"}
                            </span>
                          </div>

                          <div style={{ marginTop: 6, fontSize: 11, fontWeight: 600, color: isWorking ? "#1e293b" : "#94a3b8" }}>
                            {isWorking ? `${formatTime(sch.startTime)} - ${formatTime(sch.endTime)}` : "Day Off"}
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, fontSize: 10.5 }}>
                            <span style={{ color: isManual ? "#b45309" : "#0284c7", fontWeight: 700 }}>
                              {isManual ? "👤 Admin" : "⚡ Auto"}
                            </span>
                            <div style={{ display: "flex", gap: 4 }}>
                              <button
                                type="button"
                                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 2 }}
                                onClick={() => openEditModal(sch)}
                                title="Edit"
                              >
                                <AdminIcon name="edit" size={12} />
                              </button>
                              <button
                                type="button"
                                style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: 2 }}
                                onClick={() => setDeleteSchedule(sch)}
                                title="Delete"
                              >
                                <AdminIcon name="x" size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* MODAL: ADD SCHEDULE MANUALLY                              */}
      {/* ========================================================= */}
      {addModalOpen && (
        <Modal
          title="+ Add Clinical / Staff Schedule"
          onClose={() => setAddModalOpen(false)}
          footer={
            <>
              <button type="button" className="df-btn df-btn-secondary" onClick={() => setAddModalOpen(false)} disabled={formSubmitting}>
                Cancel
              </button>
              <button type="button" className="df-btn df-btn-primary" onClick={handleCreateSubmit} disabled={formSubmitting}>
                {formSubmitting ? "Creating Schedule..." : "Create Schedule"}
              </button>
            </>
          }
        >
          <form onSubmit={handleCreateSubmit}>
            {formError && (
              <div style={{ background: "#fee2e2", border: "1px solid #f87171", color: "#b91c1c", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
                <strong>Validation Conflict: </strong> {formError}
              </div>
            )}

            {/* Type selector */}
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <button
                type="button"
                className={`adm-tab ${formData.personType === "DENTIST" ? "active" : ""}`}
                style={{ flex: 1, justifyContent: "center", padding: 8 }}
                onClick={() => setFormData({ ...formData, personType: "DENTIST" })}
              >
                Dentist / Doctor
              </button>
              <button
                type="button"
                className={`adm-tab ${formData.personType === "STAFF" ? "active" : ""}`}
                style={{ flex: 1, justifyContent: "center", padding: 8 }}
                onClick={() => setFormData({ ...formData, personType: "STAFF" })}
              >
                Clinic Staff
              </button>
            </div>

            {/* Person selection */}
            <div className="df-form-group" style={{ marginBottom: 14 }}>
              <label className="df-label" style={{ fontWeight: 700, fontSize: 12.5 }}>
                {formData.personType === "DENTIST" ? "Select Doctor / Dentist" : "Select Staff Member"} *
              </label>
              {formData.personType === "DENTIST" ? (
                <select
                  className="df-select"
                  value={formData.dentistId}
                  onChange={(e) => setFormData({ ...formData, dentistId: e.target.value })}
                  required
                >
                  <option value="">Select a dentist...</option>
                  {dentists.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name || `Dr. ${d.firstName} ${d.lastName}`} {d.specialization ? `— ${d.specialization}` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  className="df-select"
                  value={formData.staffId}
                  onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                  required
                >
                  <option value="">Select a staff member...</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} ({s.role || "Staff"})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Date */}
            <div className="df-form-group" style={{ marginBottom: 14 }}>
              <label className="df-label" style={{ fontWeight: 700, fontSize: 12.5 }}>
                Schedule Date *
              </label>
              <input
                type="date"
                className="df-input"
                value={formData.scheduleDate}
                onChange={(e) => setFormData({ ...formData, scheduleDate: e.target.value })}
                required
              />
            </div>

            {/* Working / Day Off Toggle */}
            <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                id="addWorkingToggle"
                checked={formData.working}
                onChange={(e) => setFormData({ ...formData, working: e.target.checked, status: e.target.checked ? "ACTIVE" : "OFF" })}
                style={{ width: 16, height: 16 }}
              />
              <label htmlFor="addWorkingToggle" style={{ fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#0f172a" }}>
                Active Working Shift (Uncheck to mark as Scheduled Off Day)
              </label>
            </div>

            {/* If working, show shift presets and times */}
            {formData.working && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label className="df-label" style={{ fontWeight: 700, fontSize: 12, color: "#64748b" }}>
                    Quick Shift Presets:
                  </label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                    <button type="button" className="df-btn df-btn-secondary" style={{ padding: "4px 8px", fontSize: 11.5 }} onClick={() => handleShiftPreset("MORNING")}>
                      Morning (09:00 - 14:00)
                    </button>
                    <button type="button" className="df-btn df-btn-secondary" style={{ padding: "4px 8px", fontSize: 11.5 }} onClick={() => handleShiftPreset("EVENING")}>
                      Evening (14:00 - 20:00)
                    </button>
                    <button type="button" className="df-btn df-btn-secondary" style={{ padding: "4px 8px", fontSize: 11.5 }} onClick={() => handleShiftPreset("FULL_DAY")}>
                      Full Day (09:00 - 17:00)
                    </button>
                  </div>
                </div>

                <div className="df-form-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div className="df-form-group">
                    <label className="df-label" style={{ fontWeight: 700, fontSize: 12.5 }}>Start Time *</label>
                    <input
                      type="time"
                      className="df-input"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      required={formData.working}
                    />
                  </div>
                  <div className="df-form-group">
                    <label className="df-label" style={{ fontWeight: 700, fontSize: 12.5 }}>End Time *</label>
                    <input
                      type="time"
                      className="df-input"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      required={formData.working}
                    />
                  </div>
                </div>

                <div className="df-form-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div className="df-form-group">
                    <label className="df-label" style={{ fontWeight: 700, fontSize: 12.5 }}>Shift Name</label>
                    <select
                      className="df-select"
                      value={formData.shift}
                      onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                    >
                      <option value="MORNING">Morning Shift</option>
                      <option value="EVENING">Evening Shift</option>
                      <option value="FULL_DAY">Full Day Shift</option>
                      <option value="ROTATING">Rotating Shift</option>
                    </select>
                  </div>
                  <div className="df-form-group">
                    <label className="df-label" style={{ fontWeight: 700, fontSize: 12.5 }}>Status</label>
                    <select
                      className="df-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="OFF">OFF</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            <div className="df-form-group">
              <label className="df-label" style={{ fontWeight: 700, fontSize: 12.5 }}>Operational Notes / Operatory Room</label>
              <textarea
                className="df-input"
                rows={2}
                placeholder="e.g. Assigned to Operatory 102 (Orthodontics consultation)"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* MODAL: EDIT SCHEDULE                                      */}
      {/* ========================================================= */}
      {editSchedule && (
        <Modal
          title={`Edit Shift: ${editSchedule.name || (editSchedule.dentistId ? "Doctor" : "Staff")}`}
          onClose={() => setEditSchedule(null)}
          footer={
            <>
              <button type="button" className="df-btn df-btn-secondary" onClick={() => setEditSchedule(null)} disabled={formSubmitting}>
                Cancel
              </button>
              <button type="button" className="df-btn df-btn-primary" onClick={handleEditSubmit} disabled={formSubmitting}>
                {formSubmitting ? "Saving Changes..." : "Save Shift"}
              </button>
            </>
          }
        >
          <form onSubmit={handleEditSubmit}>
            {formError && (
              <div style={{ background: "#fee2e2", border: "1px solid #f87171", color: "#b91c1c", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
                <strong>Validation Conflict: </strong> {formError}
              </div>
            )}

            <div style={{ background: "#f8fafc", padding: 10, borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
              <strong>Person:</strong> {editSchedule.name} &bull; <strong>Role:</strong> {editSchedule.role}
            </div>

            {/* Date */}
            <div className="df-form-group" style={{ marginBottom: 14 }}>
              <label className="df-label" style={{ fontWeight: 700, fontSize: 12.5 }}>Schedule Date *</label>
              <input
                type="date"
                className="df-input"
                value={formData.scheduleDate}
                onChange={(e) => setFormData({ ...formData, scheduleDate: e.target.value })}
                required
              />
            </div>

            {/* Working toggle */}
            <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                id="editWorkingToggle"
                checked={formData.working}
                onChange={(e) => setFormData({ ...formData, working: e.target.checked, status: e.target.checked ? "ACTIVE" : "OFF" })}
                style={{ width: 16, height: 16 }}
              />
              <label htmlFor="editWorkingToggle" style={{ fontSize: 13, fontWeight: 700, cursor: "pointer", color: "#0f172a" }}>
                Active Working Shift (Uncheck to mark as Scheduled Off Day)
              </label>
            </div>

            {formData.working && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label className="df-label" style={{ fontWeight: 700, fontSize: 12, color: "#64748b" }}>
                    Quick Shift Presets:
                  </label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                    <button type="button" className="df-btn df-btn-secondary" style={{ padding: "4px 8px", fontSize: 11.5 }} onClick={() => handleShiftPreset("MORNING")}>
                      Morning (09:00 - 14:00)
                    </button>
                    <button type="button" className="df-btn df-btn-secondary" style={{ padding: "4px 8px", fontSize: 11.5 }} onClick={() => handleShiftPreset("EVENING")}>
                      Evening (14:00 - 20:00)
                    </button>
                    <button type="button" className="df-btn df-btn-secondary" style={{ padding: "4px 8px", fontSize: 11.5 }} onClick={() => handleShiftPreset("FULL_DAY")}>
                      Full Day (09:00 - 17:00)
                    </button>
                  </div>
                </div>

                <div className="df-form-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div className="df-form-group">
                    <label className="df-label" style={{ fontWeight: 700, fontSize: 12.5 }}>Start Time *</label>
                    <input
                      type="time"
                      className="df-input"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      required={formData.working}
                    />
                  </div>
                  <div className="df-form-group">
                    <label className="df-label" style={{ fontWeight: 700, fontSize: 12.5 }}>End Time *</label>
                    <input
                      type="time"
                      className="df-input"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      required={formData.working}
                    />
                  </div>
                </div>

                <div className="df-form-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div className="df-form-group">
                    <label className="df-label" style={{ fontWeight: 700, fontSize: 12.5 }}>Shift Name</label>
                    <select
                      className="df-select"
                      value={formData.shift}
                      onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                    >
                      <option value="MORNING">Morning Shift</option>
                      <option value="EVENING">Evening Shift</option>
                      <option value="FULL_DAY">Full Day Shift</option>
                      <option value="ROTATING">Rotating Shift</option>
                    </select>
                  </div>
                  <div className="df-form-group">
                    <label className="df-label" style={{ fontWeight: 700, fontSize: 12.5 }}>Status</label>
                    <select
                      className="df-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="OFF">OFF</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            <div className="df-form-group">
              <label className="df-label" style={{ fontWeight: 700, fontSize: 12.5 }}>Operational Notes / Operatory Room</label>
              <textarea
                className="df-input"
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* MODAL: VIEW DETAILS                                       */}
      {/* ========================================================= */}
      {viewSchedule && (
        <Modal
          title={`Schedule Details: #${viewSchedule.id}`}
          onClose={() => setViewSchedule(null)}
          footer={
            <button type="button" className="df-btn df-btn-secondary" onClick={() => setViewSchedule(null)}>
              Close
            </button>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, fontSize: 13.5 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Practitioner / Staff</span>
              <div style={{ fontWeight: 700, color: "#0f172a", marginTop: 2 }}>{viewSchedule.name || "—"}</div>
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Clinical Role</span>
              <div style={{ fontWeight: 700, color: "#0f172a", marginTop: 2 }}>{viewSchedule.role || "—"}</div>
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Schedule Date</span>
              <div style={{ fontWeight: 700, color: "#0f172a", marginTop: 2 }}>{formatDate(viewSchedule.scheduleDate)}</div>
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Day of Week</span>
              <div style={{ fontWeight: 700, color: "#0f172a", marginTop: 2 }}>{viewSchedule.dayOfWeek || "—"}</div>
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Duty Hours</span>
              <div style={{ fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
                {viewSchedule.working && viewSchedule.startTime && viewSchedule.endTime
                  ? `${formatTime(viewSchedule.startTime)} – ${formatTime(viewSchedule.endTime)}`
                  : "Scheduled Off"}
              </div>
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Shift Category</span>
              <div style={{ fontWeight: 700, color: "#0f172a", marginTop: 2 }}>{viewSchedule.shift || "—"}</div>
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Source</span>
              <div style={{ fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
                {viewSchedule.modifiedByAdmin ? "👤 Admin Modified (Authoritative)" : "⚡ Auto-Generated from Availability"}
              </div>
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Status</span>
              <div style={{ fontWeight: 700, color: "#0f172a", marginTop: 2 }}>{viewSchedule.status || "ACTIVE"}</div>
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Notes / Allocation</span>
              <div style={{ color: "#334155", marginTop: 2, background: "#f8fafc", padding: 8, borderRadius: 6 }}>
                {viewSchedule.notes || "No notes attached to this shift."}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* MODAL: DELETE CONFIRMATION                                */}
      {/* ========================================================= */}
      {deleteSchedule && (
        <Modal
          title="Confirm Shift Removal"
          onClose={() => setDeleteSchedule(null)}
          footer={
            <>
              <button type="button" className="df-btn df-btn-secondary" onClick={() => setDeleteSchedule(null)} disabled={formSubmitting}>
                Cancel
              </button>
              <button
                type="button"
                className="df-btn df-btn-primary"
                style={{ background: "#dc2626", borderColor: "#dc2626" }}
                onClick={handleDeleteSubmit}
                disabled={formSubmitting}
              >
                {formSubmitting ? "Deleting..." : "Delete Schedule"}
              </button>
            </>
          }
        >
          <div style={{ fontSize: 14, color: "#334155" }}>
            <p style={{ marginBottom: 12 }}>
              Are you sure you want to remove the schedule for <strong>{deleteSchedule.name}</strong> on{" "}
              <strong>{formatDate(deleteSchedule.scheduleDate)}</strong>?
            </p>
            <div style={{ background: "#fef3c7", border: "1px solid #fde68a", padding: "10px 14px", borderRadius: 8, fontSize: 12.5, color: "#92400e" }}>
              <strong>Admin Override:</strong> This schedule will be soft-deleted. The automatic scheduling engine will respect this deletion and will NOT automatically recreate this shift.
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================= */}
      {/* MODAL: AUTO-GENERATE SCHEDULES                            */}
      {/* ========================================================= */}
      {generateModalOpen && (
        <Modal
          title="⚡ Automatic Weekly Schedule Generation"
          onClose={() => setGenerateModalOpen(false)}
          footer={
            <>
              <button type="button" className="df-btn df-btn-secondary" onClick={() => setGenerateModalOpen(false)} disabled={generating}>
                Cancel
              </button>
              <button type="button" className="df-btn df-btn-primary" onClick={handleAutoGenerateSubmit} disabled={generating}>
                {generating ? "Generating..." : "Generate Roster"}
              </button>
            </>
          }
        >
          <form onSubmit={handleAutoGenerateSubmit}>
            <p style={{ fontSize: 13.5, color: "#475569", marginBottom: 16, lineHeight: 1.5 }}>
              This tool automatically generates weekly duty shifts for all active doctors and staff members based on recurring <strong>Dentist Availability</strong> rules and clinic working hours.
            </p>

            <div className="df-form-group" style={{ marginBottom: 16 }}>
              <label className="df-label" style={{ fontWeight: 700, fontSize: 12.5 }}>Select Week (Monday) *</label>
              <input
                type="date"
                className="df-input"
                value={generateWeek}
                onChange={(e) => setGenerateWeek(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: 16, display: "flex", alignItems: "flex-start", gap: 8 }}>
              <input
                type="checkbox"
                id="forceGenToggle"
                checked={generateForce}
                onChange={(e) => setGenerateForce(e.target.checked)}
                style={{ width: 16, height: 16, marginTop: 2 }}
              />
              <label htmlFor="forceGenToggle" style={{ fontSize: 12.5, color: "#334155", cursor: "pointer" }}>
                <strong>Re-sync existing unedited auto-generated shifts</strong>
                <div style={{ fontSize: 11.5, color: "#64748b" }}>
                  Admin-edited and Admin-deleted schedules are always preserved and will NEVER be overwritten.
                </div>
              </label>
            </div>

            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "10px 14px", borderRadius: 8, fontSize: 12.5, color: "#1e40af" }}>
              <strong>Conflict Safe:</strong> Schedules already modified or deleted by an Admin remain strictly intact.
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
