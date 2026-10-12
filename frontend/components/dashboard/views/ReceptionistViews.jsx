import { useState, useMemo, useEffect } from "react";
import StatCard from "../../common/StatCard";
import { Breadcrumbs, DataTable, Modal, TabPills, SearchBar } from "../DashboardPrimitives";
import { useDashboardData } from "../../../context/DashboardDataContext";
import { useNotifications } from "../../../context/NotificationContext";
import appointmentApi, {
  normalizeAppointment,
  formatTime24Hour,
  addMinutesToIsoTime,
} from "../../../api/appointments";
import dentistApi from "../../../api/dentists";
import patientApi from "../../../api/patients";
import servicesApi from "../../../api/services";

let recCounter = 7000;
const nextId = (prefix = "Q") => `${prefix}-${++recCounter}`;

export function QueueBoardView({ role }) {
  const { collections, saveRecord } = useDashboardData();
  const { addToast } = useNotifications();
  const [modalOpen, setModalOpen] = useState(false);
  const [dentists, setDentists] = useState([]);
  const [services, setServices] = useState([]);
  const [walkin, setWalkin] = useState({
    patient: "",
    doctorId: "",
    serviceId: "",
    waitTime: "5 mins",
  });

  // Sync today's real appointments into the waiting room queue
  useEffect(() => {
    let mounted = true;
    async function syncTodayAppointments() {
      try {
        const todayIso = new Date().toISOString().split("T")[0];
        const [appts, dentistsData, patientsData, servicesData] = await Promise.all([
          appointmentApi.getAppointmentsByDate(todayIso).catch(() => []),
          dentistApi.getAllDentists().catch(() => []),
          patientApi.getAllPatients().catch(() => []),
          servicesApi.getServices().catch(() => []),
        ]);

        if (mounted) {
          setDentists(dentistsData);
          setServices(servicesData);
          if (dentistsData.length > 0 || servicesData.length > 0) {
            setWalkin((prev) => ({
              ...prev,
              doctorId: prev.doctorId || dentistsData[0]?.id || "",
              serviceId: prev.serviceId || servicesData[0]?.id || "",
            }));
          }
        }

        if (mounted && appts.length > 0) {
          const dLookup = {};
          dentistsData.forEach((d) => { dLookup[d.id] = d; });
          const pLookup = {};
          patientsData.forEach((p) => { pLookup[p.id] = p; });

          appts.forEach((a, idx) => {
            const norm = normalizeAppointment(a, dLookup, pLookup);
            const tokenNum = `Q-${String(idx + 1).padStart(2, "0")}`;
            const existing = (collections.queue || []).find((q) => q.appointmentId === a.id);
            if (!existing) {
              let qStatus = "checked-in";
              if (norm.status === "completed") qStatus = "completed";
              else if (norm.status === "in-consultation") qStatus = "in-consultation";
              else if (norm.status === "waiting") qStatus = "waiting";

              saveRecord("queue", {
                id: `Q-APT-${a.id}`,
                appointmentId: a.id,
                queueNumber: tokenNum,
                patient: norm.patient,
                doctor: norm.doctor,
                service: norm.service,
                waitTime: "10 mins",
                status: qStatus,
              });
            }
          });
        }
      } catch (err) {
        console.warn("Could not sync appointments into queue:", err);
      }
    }

    syncTodayAppointments();
    return () => { mounted = false; };
  }, []);

  const queue = collections.queue || [];

  const checkedIn = queue.filter((q) => q.status === "checked-in");
  const waiting = queue.filter((q) => q.status === "waiting");
  const inConsult = queue.filter((q) => q.status === "in-consultation");
  const completed = queue.filter((q) => q.status === "completed");

  const handleAdvance = (item, nextStatus) => {
    saveRecord("queue", { ...item, status: nextStatus });
    addToast(`Token ${item.queueNumber} (${item.patient}) moved to '${nextStatus}'!`, "info");
  };

  const handleIssueToken = (e) => {
    e.preventDefault();
    if (!walkin.patient.trim()) {
      addToast("Please provide patient name", "warning");
      return;
    }

    const doc = dentists.find((d) => String(d.id) === String(walkin.doctorId)) || dentists[0];
    const srv = services.find((s) => String(s.id) === String(walkin.serviceId)) || services[0];

    const newToken = {
      id: nextId("Q"),
      queueNumber: `Q-0${(recCounter % 30) + 1}`,
      patient: walkin.patient.trim(),
      doctor: doc ? (doc.name || `Dr. ${doc.firstName} ${doc.lastName}`) : "Attending Dentist",
      service: srv ? srv.name : "Dental Consultation",
      waitTime: "10 mins",
      status: "waiting",
    };

    saveRecord("queue", newToken);
    addToast(`Token ${newToken.queueNumber} issued for ${newToken.patient}!`, "success");
    setModalOpen(false);
    setWalkin({
      patient: "",
      doctorId: dentists[0]?.id || "",
      serviceId: services[0]?.id || "",
      waitTime: "5 mins",
    });
  };

  return (
    <div className={`df-role-page df-role-blue`}>
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Patient Queue" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Front Desk Triage</span>
          <h1>Live Patient Check-in & Waiting Room Queue</h1>
          <p>Real-time token management, waiting room flow, and operatory chair call system.</p>
        </div>
        <button className="df-btn df-btn-primary" onClick={() => setModalOpen(true)}>
          + Issue Walk-in Token
        </button>
      </header>

      <div className="df-stat-grid">
        <StatCard label="Active Queue Tokens" value={String(checkedIn.length + waiting.length + inConsult.length)} icon="◷" color="warning" />
        <StatCard label="Currently in Chair" value={String(inConsult.length)} icon="◈" color="primary" />
        <StatCard label="Waiting in Lounge" value={String(waiting.length)} icon="◫" color="primary" />
        <StatCard label="Processed Today" value={String(completed.length)} icon="✓" color="success" />
      </div>

      <div className="df-queue-grid">
        <div className="df-queue-column">
          <div className="df-queue-column-header">
            <span>Checked-in ({checkedIn.length})</span>
            <span className="df-badge df-badge-secondary">Front Desk</span>
          </div>
          {checkedIn.map((q) => (
            <div key={q.id} className="df-queue-card">
              <div className="df-queue-card-top">
                <span className="df-queue-token">{q.queueNumber}</span>
                <small style={{ color: "var(--df-text-muted)" }}>⏱ {q.waitTime}</small>
              </div>
              <div className="df-queue-patient">{q.patient}</div>
              <div className="df-queue-meta">
                <span>{q.service}</span>
                <small>Dentist: {q.doctor}</small>
              </div>
              <button
                className="df-btn df-btn-secondary df-btn-sm"
                onClick={() => handleAdvance(q, "waiting")}
              >
                Call to Lounge →
              </button>
            </div>
          ))}
          {checkedIn.length === 0 && <p style={{ fontSize: 13, color: "var(--df-text-muted)", textAlign: "center", padding: 12 }}>No checked-in arrivals</p>}
        </div>

        <div className="df-queue-column">
          <div className="df-queue-column-header">
            <span>Waiting in Lounge ({waiting.length})</span>
            <span className="df-badge df-badge-warning">Pre-screened</span>
          </div>
          {waiting.map((q) => (
            <div key={q.id} className="df-queue-card">
              <div className="df-queue-card-top">
                <span className="df-queue-token">{q.queueNumber}</span>
                <small style={{ color: "var(--df-text-muted)" }}>⏱ {q.waitTime}</small>
              </div>
              <div className="df-queue-patient">{q.patient}</div>
              <div className="df-queue-meta">
                <span>{q.service}</span>
                <small>Dentist: {q.doctor}</small>
              </div>
              <button
                className="df-btn df-btn-primary df-btn-sm"
                onClick={() => handleAdvance(q, "in-consultation")}
              >
                Call to Chair ▶
              </button>
            </div>
          ))}
          {waiting.length === 0 && <p style={{ fontSize: 13, color: "var(--df-text-muted)", textAlign: "center", padding: 12 }}>Lounge clear</p>}
        </div>

        <div className="df-queue-column">
          <div className="df-queue-column-header">
            <span>In Dental Chair ({inConsult.length})</span>
            <span className="df-badge df-badge-teal">Operatory</span>
          </div>
          {inConsult.map((q) => (
            <div key={q.id} className="df-queue-card" style={{ borderLeft: "4px solid var(--df-primary-500)" }}>
              <div className="df-queue-card-top">
                <span className="df-queue-token">{q.queueNumber}</span>
                <span className="df-badge df-badge-success">In Chair</span>
              </div>
              <div className="df-queue-patient">{q.patient}</div>
              <div className="df-queue-meta">
                <span>{q.service}</span>
                <small>Dentist: {q.doctor}</small>
              </div>
              <button
                className="df-btn df-btn-secondary df-btn-sm"
                onClick={() => handleAdvance(q, "completed")}
              >
                Complete Visit ✓
              </button>
            </div>
          ))}
          {inConsult.length === 0 && <p style={{ fontSize: 13, color: "var(--df-text-muted)", textAlign: "center", padding: 12 }}>No active consults</p>}
        </div>

        <div className="df-queue-column">
          <div className="df-queue-column-header">
            <span>Completed Today ({completed.length})</span>
            <span className="df-badge df-badge-success">Billing/Rx</span>
          </div>
          {completed.map((q) => (
            <div key={q.id} className="df-queue-card" style={{ opacity: 0.85 }}>
              <div className="df-queue-card-top">
                <span className="df-queue-token">{q.queueNumber}</span>
                <small style={{ color: "var(--df-success)" }}>Done ✓</small>
              </div>
              <div className="df-queue-patient">{q.patient}</div>
              <div className="df-queue-meta">
                <span>{q.service}</span>
                <small>Forwarded to Billing & Pharmacy</small>
              </div>
            </div>
          ))}
          {completed.length === 0 && <p style={{ fontSize: 13, color: "var(--df-text-muted)", textAlign: "center", padding: 12 }}>No completed yet</p>}
        </div>
      </div>

      {modalOpen && (
        <Modal
          title="Issue Walk-in Queue Token"
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="df-btn df-btn-secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button className="df-btn df-btn-primary" onClick={handleIssueToken}>
                Issue Token
              </button>
            </>
          }
        >
          <div className="df-form-group">
            <label className="df-label">Patient Full Name *</label>
            <input
              className="df-input"
              value={walkin.patient}
              onChange={(e) => setWalkin({ ...walkin, patient: e.target.value })}
              placeholder="e.g. Priyantha Jayasuriya"
              required
            />
          </div>

          <div className="df-form-2col" style={{ marginTop: 14 }}>
            <div className="df-form-group">
              <label className="df-label">Required Dental Service</label>
              <select
                className="df-select"
                value={walkin.serviceId}
                onChange={(e) => setWalkin({ ...walkin, serviceId: e.target.value })}
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.price})
                  </option>
                ))}
              </select>
            </div>
            <div className="df-form-group">
              <label className="df-label">Available Dentist</label>
              <select
                className="df-select"
                value={walkin.doctorId}
                onChange={(e) => setWalkin({ ...walkin, doctorId: e.target.value })}
              >
                {dentists.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name || `Dr. ${d.firstName} ${d.lastName}`} ({d.specialization || "General Dentistry"})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function ReceptionistAppointmentsView({ role }) {
  const { collections, saveRecord } = useDashboardData();
  const { addToast } = useNotifications();
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [realAppointments, setRealAppointments] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [patients, setPatients] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newBooking, setNewBooking] = useState({
    patientId: "",
    patient: "",
    serviceId: "",
    doctorId: "",
    date: new Date().toISOString().split("T")[0],
    time: "09:00 AM",
    checkInNow: true,
  });

  const reloadAppointments = async () => {
    try {
      setLoading(true);
      const [appts, dList, pList, sList] = await Promise.all([
        appointmentApi.getAllAppointments().catch(() => []),
        dentistApi.getAllDentists().catch(() => []),
        patientApi.getAllPatients().catch(() => []),
        servicesApi.getServices().catch(() => []),
      ]);

      setDentists(dList);
      setPatients(pList);
      setServices(sList);

      const dLookup = {};
      dList.forEach((d) => { dLookup[d.id] = d; });
      const pLookup = {};
      pList.forEach((p) => { pLookup[p.id] = p; });

      const normalized = appts.map((a) => normalizeAppointment(a, dLookup, pLookup));
      setRealAppointments(normalized);
    } catch (err) {
      console.warn("Could not reload appointments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [appts, dList, pList, sList] = await Promise.all([
          appointmentApi.getAllAppointments().catch(() => []),
          dentistApi.getAllDentists().catch(() => []),
          patientApi.getAllPatients().catch(() => []),
          servicesApi.getServices().catch(() => []),
        ]);

        if (!mounted) return;

        setDentists(dList);
        setPatients(pList);
        setServices(sList);

        if (dList.length > 0 && !newBooking.doctorId) {
          setNewBooking((prev) => ({ ...prev, doctorId: String(dList[0].id) }));
        }
        if (pList.length > 0 && !newBooking.patientId) {
          setNewBooking((prev) => ({ ...prev, patientId: String(pList[0].id), patient: pList[0].name }));
        }
        if (sList.length > 0 && !newBooking.serviceId) {
          setNewBooking((prev) => ({ ...prev, serviceId: String(sList[0].id) }));
        }

        const dLookup = {};
        dList.forEach((d) => { dLookup[d.id] = d; });
        const pLookup = {};
        pList.forEach((p) => { pLookup[p.id] = p; });

        const normalized = appts.map((a) => normalizeAppointment(a, dLookup, pLookup));
        setRealAppointments(normalized);
      } catch (err) {
        console.warn("Could not load appointments from API:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const appointments = realAppointments.length > 0 ? realAppointments : (collections.appointments || []);

  const stats = useMemo(() => {
    const total = appointments.length;
    const upcoming = appointments.filter((a) => a.status === "confirmed" || a.status === "booked" || a.status === "pending" || a.status === "rescheduled").length;
    const waiting = appointments.filter((a) => a.status === "waiting" || a.status === "checked-in").length;
    const inChair = appointments.filter((a) => a.status === "in-consultation").length;
    const completed = appointments.filter((a) => a.status === "completed").length;
    return { total, upcoming, waiting, inChair, completed };
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      const matchesSearch =
        !search ||
        (appt.patient && appt.patient.toLowerCase().includes(search.toLowerCase())) ||
        (appt.doctor && appt.doctor.toLowerCase().includes(search.toLowerCase())) ||
        (appt.service && appt.service.toLowerCase().includes(search.toLowerCase()));

      if (!matchesSearch) return false;

      if (activeTab === "all") return true;
      if (activeTab === "upcoming") return appt.status === "confirmed" || appt.status === "booked" || appt.status === "pending" || appt.status === "rescheduled";
      if (activeTab === "waiting") return appt.status === "waiting" || appt.status === "checked-in";
      if (activeTab === "in-chair") return appt.status === "in-consultation";
      if (activeTab === "completed") return appt.status === "completed";
      if (activeTab === "cancelled") return appt.status === "cancelled" || appt.status === "no_show";
      return true;
    });
  }, [appointments, search, activeTab]);

  const handleCheckIn = async (appt) => {
    try {
      if (typeof appt.id === "number") {
        await appointmentApi.transitionStatus(appt.id, "WAITING");
      }
      const updated = { ...appt, status: "waiting" };
      setRealAppointments((prev) => prev.map((a) => (a.id === appt.id ? updated : a)));
      saveRecord("appointments", updated);

      const queueList = collections.queue || [];
      const existingQueue = queueList.find((q) => q.patient === appt.patient && q.status !== "completed");
      if (!existingQueue) {
        const token = {
          id: nextId("Q"),
          queueNumber: `Q-0${(recCounter % 30) + 1}`,
          patient: appt.patient,
          doctor: appt.doctor,
          service: appt.service,
          waitTime: "10 mins",
          status: "waiting",
        };
        saveRecord("queue", token);
        addToast(`Checked in ${appt.patient}! Token ${token.queueNumber} issued to waiting lounge.`, "success");
      } else {
        addToast(`${appt.patient} is already checked in to the waiting lounge.`, "info");
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Failed to check in patient";
      addToast(typeof msg === "string" ? msg : "Check-in failed", "error");
    }
  };

  const handleCallToChair = async (appt) => {
    try {
      if (typeof appt.id === "number") {
        await appointmentApi.transitionStatus(appt.id, "IN_CONSULTATION");
      }
      const updated = { ...appt, status: "in-consultation" };
      setRealAppointments((prev) => prev.map((a) => (a.id === appt.id ? updated : a)));
      saveRecord("appointments", updated);

      const queueList = collections.queue || [];
      const qItem = queueList.find((q) => q.patient === appt.patient && q.status !== "completed");
      if (qItem) {
        saveRecord("queue", { ...qItem, status: "in-consultation" });
      }
      addToast(`${appt.patient} called to dental operatory chair!`, "info");
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Failed to start consult";
      addToast(typeof msg === "string" ? msg : "Call to chair failed", "error");
    }
  };

  const handleCompleteVisit = async (appt) => {
    try {
      if (typeof appt.id === "number") {
        await appointmentApi.completeAppointment(appt.id);
      }
      const updated = { ...appt, status: "completed" };
      setRealAppointments((prev) => prev.map((a) => (a.id === appt.id ? updated : a)));
      saveRecord("appointments", updated);

      const queueList = collections.queue || [];
      const qItem = queueList.find((q) => q.patient === appt.patient && q.status !== "completed");
      if (qItem) {
        saveRecord("queue", { ...qItem, status: "completed" });
      }
      addToast(`Visit completed for ${appt.patient}. Sent to Billing.`, "success");
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Failed to complete visit";
      addToast(typeof msg === "string" ? msg : "Completed status updated", "info");
    }
  };

  const handleConfirmAppt = async (appt) => {
    try {
      if (typeof appt.id === "number") {
        await appointmentApi.confirmAppointment(appt.id);
      }
      const updated = { ...appt, status: "confirmed" };
      setRealAppointments((prev) => prev.map((a) => (a.id === appt.id ? updated : a)));
      saveRecord("appointments", updated);
      addToast(`Appointment for ${appt.patient} confirmed!`, "success");
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Failed to confirm";
      addToast(typeof msg === "string" ? msg : "Confirmed", "info");
    }
  };

  const handleNoShow = async (appt) => {
    try {
      if (typeof appt.id === "number") {
        await appointmentApi.markNoShow(appt.id);
      }
      const updated = { ...appt, status: "no_show" };
      setRealAppointments((prev) => prev.map((a) => (a.id === appt.id ? updated : a)));
      saveRecord("appointments", updated);
      addToast(`Appointment for ${appt.patient} marked as No Show.`, "warning");
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Failed to mark no-show";
      addToast(typeof msg === "string" ? msg : "Marked No Show", "info");
    }
  };

  const handleQuickAction = (appt) => {
    if (appt.status === "in-consultation") {
      handleCompleteVisit(appt);
    } else if (appt.status === "waiting" || appt.status === "checked-in") {
      handleCallToChair(appt);
    } else {
      handleCheckIn(appt);
    }
  };

  const getQuickActionLabel = (appt) => {
    if (appt.status === "in-consultation") return "✓ Complete Visit";
    if (appt.status === "waiting" || appt.status === "checked-in") return "▶ Call to Chair";
    if (appt.status === "completed") return "Completed";
    if (appt.status === "cancelled" || appt.status === "no_show") return "Inactive";
    return "▶ Check-in to Queue";
  };

  const handleSaveEdit = () => {
    if (!selectedAppt) return;
    saveRecord("appointments", selectedAppt);
    setRealAppointments((prev) => prev.map((a) => (a.id === selectedAppt.id ? selectedAppt : a)));
    addToast(`Appointment for ${selectedAppt.patient} updated!`, "success");
    setSelectedAppt(null);
  };

  const handleCancelAppt = async (appt) => {
    try {
      if (typeof appt.id === "number") {
        await appointmentApi.cancelAppointment(appt.id, "Cancelled at front desk");
      }
      const updated = { ...appt, status: "cancelled" };
      setRealAppointments((prev) => prev.map((a) => (a.id === appt.id ? updated : a)));
      saveRecord("appointments", updated);
      addToast(`Appointment for ${appt.patient} cancelled.`, "warning");
      if (selectedAppt) setSelectedAppt(null);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Cannot cancel within 2 hours of appointment time";
      addToast(typeof msg === "string" ? msg : "Cancellation failed", "error");
    }
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    if (!newBooking.patientId && !newBooking.patient.trim()) {
      addToast("Please select or provide patient name", "warning");
      return;
    }
    const doc = dentists.find((d) => String(d.id) === String(newBooking.doctorId)) || dentists[0];
    const srv = services.find((s) => String(s.id) === String(newBooking.serviceId)) || services[0];

    const targetPatientId = newBooking.patientId || (patients[0]?.id || 1);
    const startTime = formatTime24Hour(newBooking.time);
    const endTime = addMinutesToIsoTime(startTime, 30);

    try {
      const saved = await appointmentApi.createAppointment({
        patientId: Number(targetPatientId),
        dentistId: Number(newBooking.doctorId || doc?.id || 1),
        appointmentDate: newBooking.date,
        startTime,
        endTime,
        appointmentType: srv.name,
        reason: srv.name,
        bookingSource: "RECEPTION",
      });

      const apptDisplay = {
        id: saved.id,
        patient: newBooking.patient || `Patient #${targetPatientId}`,
        doctor: doc?.name || "Assigned Dentist",
        service: srv.name,
        date: newBooking.date,
        time: newBooking.time,
        status: newBooking.checkInNow ? "waiting" : "confirmed",
      };

      setRealAppointments((prev) => [apptDisplay, ...prev]);
      saveRecord("appointments", apptDisplay);

      if (newBooking.checkInNow) {
        const token = {
          id: nextId("Q"),
          queueNumber: `Q-0${(recCounter % 30) + 1}`,
          patient: apptDisplay.patient,
          doctor: apptDisplay.doctor,
          service: srv.name,
          waitTime: "10 mins",
          status: "waiting",
        };
        saveRecord("queue", token);
        addToast(`Appointment booked and ${apptDisplay.patient} checked in to queue (${token.queueNumber})!`, "success");
      } else {
        addToast(`Appointment booked for ${apptDisplay.patient} on ${newBooking.date} at ${newBooking.time}!`, "success");
      }

      setIsNewModalOpen(false);
      await reloadAppointments();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Failed to book appointment";
      addToast(typeof msg === "string" ? msg : "Booking failed", "error");
    }
  };

  const columns = [
    { key: "time", label: "Time Slot" },
    { key: "patient", label: "Patient Name" },
    { key: "doctor", label: "Attending Dentist" },
    { key: "service", label: "Dental Service" },
    { key: "date", label: "Date" },
    { key: "status", label: "Status", type: "status" },
  ];

  return (
    <div className="df-role-page df-role-blue">
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Appointments & Check-in" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Front-Desk Triage</span>
          <h1>Patient Appointments & Check-in Desk</h1>
          <p>Triage clinic appointments, process patient arrivals, and dispatch tokens to the waiting lounge.</p>
        </div>
        <button className="df-btn df-btn-primary" onClick={() => setIsNewModalOpen(true)}>
          + Book Walk-in Appointment
        </button>
      </header>

      <div className="df-stat-grid">
        <StatCard label="Total Scheduled" value={String(stats.total)} icon="◷" color="primary" />
        <StatCard label="Waiting in Lounge" value={String(stats.waiting)} icon="◫" color="warning" />
        <StatCard label="In Dental Chair" value={String(stats.inChair)} icon="◈" color="primary" />
        <StatCard label="Completed Today" value={String(stats.completed)} icon="✓" color="success" />
      </div>

      <div className="df-toolbar" style={{ marginBottom: 16 }}>
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by patient, doctor, or service..."
        />
      </div>

      <TabPills
        tabs={[
          { label: "All Appointments", value: "all", count: stats.total },
          { label: "Upcoming / Scheduled", value: "upcoming", count: stats.upcoming },
          { label: "Waiting in Lounge", value: "waiting", count: stats.waiting },
          { label: "In Consultation", value: "in-chair", count: stats.inChair },
          { label: "Completed", value: "completed", count: stats.completed },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      <section className="df-card">
        <div className="df-card-body">
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
              <p>Loading appointments from clinic database...</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              rows={filteredAppointments}
              actionLabel="Details & Edit"
              onEdit={(row) => setSelectedAppt(row)}
              onQuickAction={handleQuickAction}
              quickActionLabel={getQuickActionLabel}
            />
          )}
        </div>
      </section>

      {/* View / Edit Appointment Modal */}
      {selectedAppt && (
        <Modal
          title={`Appointment Details: ${selectedAppt.patient}`}
          onClose={() => setSelectedAppt(null)}
          footer={
            <>
              {selectedAppt.status !== "confirmed" && (
                <button
                  className="df-btn df-btn-secondary"
                  onClick={() => handleConfirmAppt(selectedAppt)}
                >
                  Confirm Appt
                </button>
              )}
              {selectedAppt.status !== "completed" && selectedAppt.status !== "cancelled" && selectedAppt.status !== "no_show" && (
                <button
                  className="df-btn df-btn-secondary"
                  onClick={() => handleNoShow(selectedAppt)}
                >
                  Mark No-Show
                </button>
              )}
              <button
                className="df-btn df-btn-danger"
                onClick={() => handleCancelAppt(selectedAppt)}
              >
                Cancel Appointment
              </button>
              <button className="df-btn df-btn-secondary" onClick={() => setSelectedAppt(null)}>
                Close
              </button>
              <button className="df-btn df-btn-primary" onClick={handleSaveEdit}>
                Save Changes
              </button>
            </>
          }
        >
          <div className="df-form-2col">
            <div className="df-form-group">
              <label className="df-label">Patient Name</label>
              <input
                className="df-input"
                value={selectedAppt.patient || ""}
                onChange={(e) => setSelectedAppt({ ...selectedAppt, patient: e.target.value })}
              />
            </div>
            <div className="df-form-group">
              <label className="df-label">Attending Dentist</label>
              <input
                className="df-input"
                value={selectedAppt.doctor || ""}
                onChange={(e) => setSelectedAppt({ ...selectedAppt, doctor: e.target.value })}
              />
            </div>
          </div>
          <div className="df-form-2col" style={{ marginTop: 14 }}>
            <div className="df-form-group">
              <label className="df-label">Date</label>
              <input
                type="date"
                className="df-input"
                value={selectedAppt.date || ""}
                onChange={(e) => setSelectedAppt({ ...selectedAppt, date: e.target.value })}
              />
            </div>
            <div className="df-form-group">
              <label className="df-label">Time</label>
              <input
                className="df-input"
                value={selectedAppt.time || ""}
                onChange={(e) => setSelectedAppt({ ...selectedAppt, time: e.target.value })}
              />
            </div>
          </div>
          <div className="df-form-group" style={{ marginTop: 14 }}>
            <label className="df-label">Service</label>
            <input
              className="df-input"
              value={selectedAppt.service || ""}
              onChange={(e) => setSelectedAppt({ ...selectedAppt, service: e.target.value })}
            />
          </div>
          <div className="df-form-group" style={{ marginTop: 14 }}>
            <label className="df-label">Status</label>
            <select
              className="df-select"
              value={selectedAppt.status || "confirmed"}
              onChange={(e) => setSelectedAppt({ ...selectedAppt, status: e.target.value })}
            >
              <option value="confirmed">Confirmed / Scheduled</option>
              <option value="waiting">Waiting in Lounge</option>
              <option value="in-consultation">In Consultation</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </Modal>
      )}

      {/* Book Walk-in Appointment Modal */}
      {isNewModalOpen && (
        <Modal
          title="Book Walk-in Patient Appointment"
          onClose={() => setIsNewModalOpen(false)}
          footer={
            <>
              <button className="df-btn df-btn-secondary" onClick={() => setIsNewModalOpen(false)}>
                Cancel
              </button>
              <button className="df-btn df-btn-primary" onClick={handleCreateBooking}>
                Confirm & Create
              </button>
            </>
          }
        >
          <div className="df-form-group">
            <label className="df-label">Select Patient *</label>
            {patients.length > 0 ? (
              <select
                className="df-select"
                value={newBooking.patientId}
                onChange={(e) => {
                  const sel = patients.find((p) => String(p.id) === e.target.value);
                  setNewBooking({
                    ...newBooking,
                    patientId: e.target.value,
                    patient: sel?.name || "",
                  });
                }}
                required
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.patientCode || `ID ${p.id}`})
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="df-input"
                placeholder="e.g. Priyantha Jayasuriya"
                value={newBooking.patient}
                onChange={(e) => setNewBooking({ ...newBooking, patient: e.target.value })}
                required
              />
            )}
          </div>

          <div className="df-form-2col" style={{ marginTop: 14 }}>
            <div className="df-form-group">
              <label className="df-label">Service</label>
              <select
                className="df-select"
                value={newBooking.serviceId}
                onChange={(e) => setNewBooking({ ...newBooking, serviceId: e.target.value })}
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.price})
                  </option>
                ))}
              </select>
            </div>
            <div className="df-form-group">
              <label className="df-label">Dentist</label>
              <select
                className="df-select"
                value={newBooking.doctorId}
                onChange={(e) => setNewBooking({ ...newBooking, doctorId: e.target.value })}
              >
                {dentists.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name || `Dr. ${d.firstName} ${d.lastName}`} ({d.specialization || "Dental Surgery"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="df-form-2col" style={{ marginTop: 14 }}>
            <div className="df-form-group">
              <label className="df-label">Date</label>
              <input
                type="date"
                className="df-input"
                value={newBooking.date}
                onChange={(e) => setNewBooking({ ...newBooking, date: e.target.value })}
              />
            </div>
            <div className="df-form-group">
              <label className="df-label">Time Slot</label>
              <select
                className="df-select"
                value={newBooking.time}
                onChange={(e) => setNewBooking({ ...newBooking, time: e.target.value })}
              >
                <option value="09:00 AM">09:00 AM</option>
                <option value="10:00 AM">10:00 AM</option>
                <option value="11:00 AM">11:00 AM</option>
                <option value="01:30 PM">01:30 PM</option>
                <option value="02:30 PM">02:30 PM</option>
                <option value="04:00 PM">04:00 PM</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              id="checkInNow"
              checked={newBooking.checkInNow}
              onChange={(e) => setNewBooking({ ...newBooking, checkInNow: e.target.checked })}
            />
            <label htmlFor="checkInNow" style={{ fontSize: 14, cursor: "pointer" }}>
              <strong>Check-in immediately</strong> (issues queue token to waiting lounge)
            </label>
          </div>
        </Modal>
      )}
    </div>
  );
}

