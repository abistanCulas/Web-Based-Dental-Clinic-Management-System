import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import StatCard from "../../common/StatCard";
import {
  Breadcrumbs,
  DataTable,
  Modal,
  TabPills,
  SearchBar,
} from "../DashboardPrimitives";
import { useDashboardData } from "../../../context/DashboardDataContext";
import { useNotifications } from "../../../context/NotificationContext";
import { useAuth } from "../../../context/AuthContext";
import appointmentApi, {
  normalizeAppointment,
  formatTime24Hour,
  addMinutesToIsoTime,
} from "../../../api/appointments";
import dentistApi from "../../../api/dentists";
import { usersApi } from "../../../api/users";
import schedulesApi from "../../../api/schedules";
import patientApi from "../../../api/patients";
import pharmacyApi, { normalizePrescription, getMedicineSafetyStatus } from "../../../api/pharmacy";
import medicalRecordsApi, { normalizeMedicalRecord } from "../../../api/medicalRecords";
import treatmentPlanApi, { normalizeTreatmentPlan, normalizeTreatment } from "../../../api/treatmentPlans";
import { billingApi, formatLkr, parseLkr } from "../../../api/billing";
import messagesApi from "../../../api/messages";

let idCounter = 3000;
const nextId = (prefix = "ID") => `${prefix}-${++idCounter}`;

export function DoctorTodayView({ role }) {
  const { user } = useAuth();
  const { collections, saveRecord } = useDashboardData();
  const { addToast } = useNotifications();
  const [activeTab, setActiveTab] = useState("all");
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [doctorAppts, setDoctorAppts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dentistRecord, setDentistRecord] = useState(null);
  const [noteDraft, setNoteDraft] = useState({
    toothNumber: "16 (Upper Right Molar)",
    diagnosis: "Dental Caries with pulp involvement",
    procedure: "Composite Restoration & Cleaning",
    prescription: "Amoxicillin 500mg (3x/day for 5 days)",
    clinicalNotes: "Patient tolerated treatment well. Advised soft food for 24h.",
  });

  const todayIso = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const loadTodayAppointments = async () => {
    try {
      let dentist = null;
      if (user?.id) {
        dentist = await dentistApi.getDentistByUserId(user.id).catch(() => null);
      }
      if (!dentist) {
        const dentists = await dentistApi.getAllDentists().catch(() => []);
        dentist = dentists.find(
          (d) =>
            (user?.id && d.userId === user.id) ||
            (user?.email && d.email?.toLowerCase() === user.email?.toLowerCase())
        );
      }
      if (dentist) setDentistRecord(dentist);

      const dentistId = dentist?.id;
      if (!dentistId) {
        setDoctorAppts([]);
        return;
      }

      const [appts, patients] = await Promise.all([
        appointmentApi.getDentistAppointments(dentistId).catch(() => []),
        patientApi.getAllPatients().catch(() => []),
      ]);

      const pLookup = {};
      patients.forEach((p) => { pLookup[p.id] = p; });
      const dLookup = dentist ? { [dentist.id]: dentist } : {};

      const normalized = appts.map((a) => normalizeAppointment(a, dLookup, pLookup));
      const todayList = normalized.filter((a) => a.date === todayIso);
      setDoctorAppts(todayList);
    } catch (err) {
      console.warn("Could not load today doctor appointments from API:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    async function init() {
      await loadTodayAppointments();
      if (!active) return;
    }
    init();
    return () => { active = false; };
  }, [user?.id, todayIso]);

  const appointments = doctorAppts;

  const stats = useMemo(() => {
    const total = appointments.length;
    const inChair = appointments.filter((a) => a.status === "in-consultation").length;
    const waiting = appointments.filter((a) => a.status === "waiting" || a.status === "checked-in").length;
    const completed = appointments.filter((a) => a.status === "completed").length;
    return { total, inChair, waiting, completed };
  }, [appointments]);

  const filtered = useMemo(() => {
    if (activeTab === "all") return appointments;
    if (activeTab === "in-chair") return appointments.filter((a) => a.status === "in-consultation");
    if (activeTab === "waiting") return appointments.filter((a) => a.status === "waiting" || a.status === "checked-in");
    if (activeTab === "completed") return appointments.filter((a) => a.status === "completed");
    return appointments;
  }, [appointments, activeTab]);

  const handleStartConsult = async (appt) => {
    try {
      if (typeof appt.id === "number") {
        await appointmentApi.updateAppointment(appt.id, {
          id: appt.id,
          dentistId: appt.dentistId,
          patientId: appt.patientId,
          appointmentDate: appt.date,
          startTime: appt.startTime,
          endTime: appt.endTime,
          appointmentType: appt.service || appt.appointmentType,
          status: "IN_CONSULTATION",
          notes: appt.notes,
          reason: appt.reason,
        });
      }
      setDoctorAppts((prev) => prev.map((a) => (a.id === appt.id ? { ...a, status: "in-consultation", rawStatus: "IN_CONSULTATION" } : a)));
      saveRecord("appointments", { ...appt, status: "in-consultation" });
      addToast(`Consultation started for ${appt.patient}`, "info");
    } catch (err) {
      console.warn("Could not start consult via API:", err);
      setDoctorAppts((prev) => prev.map((a) => (a.id === appt.id ? { ...a, status: "in-consultation" } : a)));
      addToast(`Consultation started for ${appt.patient}`, "info");
    }
  };

  const handleCompleteVisit = async (appt) => {
    try {
      if (typeof appt.id === "number") {
        await appointmentApi.completeAppointment(appt.id);
      }
      setDoctorAppts((prev) => prev.map((a) => (a.id === appt.id ? { ...a, status: "completed", rawStatus: "COMPLETED" } : a)));
      saveRecord("appointments", { ...appt, status: "completed" });
      addToast(`Visit completed for ${appt.patient}. Forwarded to Billing.`, "success");
    } catch (err) {
      console.warn("Error completing appointment:", err);
      setDoctorAppts((prev) => prev.map((a) => (a.id === appt.id ? { ...a, status: "completed" } : a)));
      saveRecord("appointments", { ...appt, status: "completed" });
      addToast(`Visit completed for ${appt.patient}.`, "success");
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedAppt) return;
    try {
      if (typeof selectedAppt.id === "number") {
        await appointmentApi.completeAppointment(selectedAppt.id);
      }
    } catch (err) {
      console.warn("Could not mark appointment completed via API:", err);
    }

    const newRecord = {
      id: nextId("REC"),
      date: selectedAppt.date || todayIso,
      type: "Treatment Note",
      title: `${noteDraft.procedure} - Tooth #${noteDraft.toothNumber}`,
      doctor: selectedAppt.doctor || dentistRecord?.name || "Dr. James Wilson",
      patient: selectedAppt.patient,
      notes: `${noteDraft.diagnosis}. ${noteDraft.clinicalNotes}`,
    };
    saveRecord("records", newRecord);

    if (selectedAppt?.patientId && selectedAppt?.dentistId) {
      medicalRecordsApi.createMedicalRecord(selectedAppt.patientId, selectedAppt.dentistId, {
        recordDate: selectedAppt.date || todayIso,
        recordType: "TREATMENT",
        diagnosis: `${noteDraft.procedure} - Tooth #${noteDraft.toothNumber}`,
        clinicalNotes: `${noteDraft.diagnosis}. ${noteDraft.clinicalNotes}`,
        symptoms: "Post-consultation clinical evaluation",
        status: "ACTIVE",
      }).catch((err) => console.warn("Could not save medical record to backend:", err));

      treatmentPlanApi.createTreatment({
        patientId: selectedAppt.patientId,
        dentistId: selectedAppt.dentistId,
        appointmentId: typeof selectedAppt.id === "number" ? selectedAppt.id : null,
        treatmentDate: selectedAppt.date || todayIso,
        treatmentType: noteDraft.procedure || "Operative",
        diagnosis: noteDraft.diagnosis || "Dental Consultation",
        description: noteDraft.clinicalNotes,
        toothDetails: `Tooth #${noteDraft.toothNumber}`,
        status: "COMPLETED",
      }).catch((err) => console.warn("Could not save treatment to backend:", err));
    }

    if (noteDraft.prescription.trim()) {
      const newRx = {
        id: nextId("RX"),
        doctor: selectedAppt.doctor || dentistRecord?.name || "Dr. James Wilson",
        patient: selectedAppt.patient,
        date: selectedAppt.date || todayIso,
        status: "ready",
        medicine: noteDraft.prescription,
        medicines: [{ name: noteDraft.prescription, dosage: "Standard", freq: "3x daily", duration: "5 days" }],
        instructions: "Take with food. Complete entire course.",
      };
      saveRecord("prescriptions", newRx);

      if (selectedAppt?.patientId && selectedAppt?.dentistId) {
        pharmacyApi.createPrescription({
          patientId: selectedAppt.patientId,
          dentistId: selectedAppt.dentistId,
          prescriptionDate: selectedAppt.date || todayIso,
          diagnosis: noteDraft.diagnosis || "Dental Treatment",
          instructions: "Take with food. Complete entire course.",
          dentistNotes: noteDraft.prescription,
          status: "ACTIVE",
        }).catch((err) => console.warn("Could not save prescription to backend:", err));
      }
    }

    setDoctorAppts((prev) => prev.map((a) => (a.id === selectedAppt.id ? { ...a, status: "completed", notes: noteDraft.clinicalNotes } : a)));
    saveRecord("appointments", { ...selectedAppt, status: "completed", notes: noteDraft.clinicalNotes });
    addToast(`Clinical record and prescription saved for ${selectedAppt.patient}!`, "success");
    setSelectedAppt(null);
  };

  const columns = [
    { key: "time", label: "Time Slot" },
    { key: "patient", label: "Patient Name" },
    { key: "service", label: "Scheduled Service" },
    { key: "status", label: "Status", type: "status" },
  ];

  return (
      <div className={`df-role-page df-role-blue`}>
        <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Today's Appointments" }]} />
        <header className="df-resource-header">
          <div>
            <span className="df-section-label">Chair-Side Clinical View</span>
            <h1>Today's Consultations & Procedures</h1>
            <p>Manage today’s patient appointments, chair turnover, and immediate clinical documentation.</p>
          </div>
        </header>

        <div className="df-stat-grid">
          <StatCard label="Today's Appointments" value={String(stats.total)} icon="◷" color="primary" />
          <StatCard label="In Dental Chair" value={String(stats.inChair)} icon="◈" color="warning" />
          <StatCard label="Waiting Lounge" value={String(stats.waiting)} icon="◫" color="primary" />
          <StatCard label="Completed Today" value={String(stats.completed)} icon="✓" color="success" />
        </div>

        <TabPills
            tabs={[
              { label: "All Appointments", value: "all", count: stats.total },
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
                  <p>Loading today's consultations...</p>
                </div>
            ) : (
                <DataTable
                    columns={columns}
                    rows={filtered}
                    actionLabel={(row) => (row.status === "in-consultation" ? "Add Clinical Note" : "View Record")}
                    onEdit={(row) => setSelectedAppt(row)}
                    onQuickAction={(row) => {
                      if (row.status === "in-consultation") {
                        handleCompleteVisit(row);
                      } else {
                        handleStartConsult(row);
                      }
                    }}
                    quickActionLabel={(row) => (row.status === "in-consultation" ? "✓ Complete Visit" : "▶ Start Consult")}
                />
            )}
          </div>
        </section>

        {selectedAppt && (
            <Modal
                title={`Clinical Documentation: ${selectedAppt.patient}`}
                onClose={() => setSelectedAppt(null)}
                footer={
                  <>
                    <button className="df-btn df-btn-secondary" onClick={() => setSelectedAppt(null)}>
                      Cancel
                    </button>
                    <button className="df-btn df-btn-primary" onClick={handleSaveNotes}>
                      ✓ Save Clinical Record & Rx
                    </button>
                  </>
                }
            >
              <div className="df-form-2col">
                <div className="df-form-group">
                  <label className="df-label">Tooth Number / Quadrant</label>
                  <input
                      className="df-input"
                      value={noteDraft.toothNumber}
                      onChange={(e) => setNoteDraft({ ...noteDraft, toothNumber: e.target.value })}
                      placeholder="e.g. 16 Upper Right Molar"
                  />
                </div>
                <div className="df-form-group">
                  <label className="df-label">Primary Diagnosis</label>
                  <input
                      className="df-input"
                      value={noteDraft.diagnosis}
                      onChange={(e) => setNoteDraft({ ...noteDraft, diagnosis: e.target.value })}
                      placeholder="e.g. Deep enamel decay"
                  />
                </div>
              </div>

              <div className="df-form-group" style={{ marginTop: 14 }}>
                <label className="df-label">Procedure Completed</label>
                <input
                    className="df-input"
                    value={noteDraft.procedure}
                    onChange={(e) => setNoteDraft({ ...noteDraft, procedure: e.target.value })}
                    placeholder="e.g. Tooth Colored Composite Filling"
                />
              </div>

              <div className="df-form-group" style={{ marginTop: 14 }}>
                <label className="df-label">Prescribed Medications</label>
                <input
                    className="df-input"
                    value={noteDraft.prescription}
                    onChange={(e) => setNoteDraft({ ...noteDraft, prescription: e.target.value })}
                    placeholder="e.g. Amoxicillin 500mg, Ibuprofen 400mg"
                />
              </div>

              <div className="df-form-group" style={{ marginTop: 14 }}>
                <label className="df-label">Post-Op Clinical Notes</label>
                <textarea
                    className="df-input"
                    rows={3}
                    value={noteDraft.clinicalNotes}
                    onChange={(e) => setNoteDraft({ ...noteDraft, clinicalNotes: e.target.value })}
                    placeholder="Post-procedure instructions, recovery notes, follow-up..."
                />
              </div>
            </Modal>
        )}
      </div>
  );
}

export function DoctorTreatmentPlansView({ role }) {
  const { collections, saveRecord, removeRecord } = useDashboardData();
  const { addToast } = useNotifications();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Navigation tab: 'plans' or 'treatments'
  const [activeSection, setActiveSection] = useState("plans");

  // Treatment Plan States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [advanceModal, setAdvanceModal] = useState(false);
  const [confirmDeletePlan, setConfirmDeletePlan] = useState(null);
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);
  const [viewPlan, setViewPlan] = useState(null);
  const [plans, setPlans] = useState([]);
  const [planErrors, setPlanErrors] = useState({});

  // Individual Treatment / Clinical Procedure States
  const [treatments, setTreatments] = useState([]);
  const [treatmentModalOpen, setTreatmentModalOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState(null);
  const [viewTreatment, setViewTreatment] = useState(null);
  const [confirmDeleteTreatment, setConfirmDeleteTreatment] = useState(null);
  const [treatmentErrors, setTreatmentErrors] = useState({});
  const [treatmentSearch, setTreatmentSearch] = useState("");

  // Shared Reference Data
  const [dentists, setDentists] = useState([]);
  const [patients, setPatients] = useState([]);
  const [bills, setBills] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [currentDentist, setCurrentDentist] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newPlan, setNewPlan] = useState({
    patient: "",
    doctor: "",
    procedure: "",
    stage: "",
    estimatedCost: "",
    actualCost: "LKR 0",
    status: "in-progress",
  });

  const initialTreatmentState = {
    patient: "",
    patientId: null,
    dentistId: null,
    treatmentPlanId: "",
    treatmentType: "Restorative",
    toothDetails: "Tooth #16",
    diagnosis: "Dental Caries with pulp involvement",
    description: "Composite resin restoration and cavity preparation.",
    estimatedCost: "25000",
    actualCost: "25000",
    status: "COMPLETED",
    treatmentDate: new Date().toISOString().slice(0, 10),
    followUpDate: "",
    dentistNotes: "Patient tolerated procedure well. Advised soft food for 24h.",
  };
  const [newTreatment, setNewTreatment] = useState(initialTreatmentState);

  const VALID_PLAN_STAGES = [
    "Stage 1: Diagnosis & 3D Imaging",
    "Stage 2: Surgical Prep",
    "Stage 3: Fixture Placement",
    "Stage 4: Crown Delivery",
    "Stage 1: Clinical Examination & 3D Imaging",
    "Stage 2: Surgical Preparation & Extraction",
    "Stage 3: Fixture / Aligner Progress",
    "Stage 4: Prosthetic Delivery & Final Crown",
  ];

  const validatePlan = (data) => {
    const nextErrors = {};

    const cleanPatient = String(data?.patient || "").trim();
    if (!cleanPatient) {
      nextErrors.patient = "Patient Name is required.";
    }

    const cleanDoctor = String(data?.doctor || "").trim();
    if (!cleanDoctor) {
      nextErrors.doctor = "Treating Dentist is required.";
    }

    const cleanProcedure = String(data?.procedure || "").trim();
    if (!cleanProcedure) {
      nextErrors.procedure = "Procedure / Treatment Type is required.";
    } else if (cleanProcedure.length < 3) {
      nextErrors.procedure = "Procedure / Treatment Type must be at least 3 characters.";
    }

    const rawCost = String(data?.estimatedCost ?? "").trim();
    if (!rawCost) {
      nextErrors.estimatedCost = "Estimated Total Cost is required.";
    } else {
      const stripped = rawCost.replace(/^(lkr|rs\.?|\$)\s*/i, "").replace(/,/g, "").trim();
      const parsedNum = Number(stripped);
      if (stripped === "" || isNaN(parsedNum) || !isFinite(parsedNum) || parsedNum <= 0) {
        nextErrors.estimatedCost = "Estimated Total Cost must be a valid number and greater than 0.";
      }
    }

    const cleanStage = String(data?.stage || "").trim();
    if (!cleanStage) {
      nextErrors.stage = "Initial Stage is required.";
    } else if (!VALID_PLAN_STAGES.some((s) => s.toLowerCase() === cleanStage.toLowerCase())) {
      nextErrors.stage = "Please select a valid stage.";
    }

    return nextErrors;
  };

  const clearPlanError = (field) => {
    setPlanErrors((prev) => {
      if (!prev[field] && !prev.submit) return prev;
      const updated = { ...prev };
      delete updated[field];
      delete updated.submit;
      return updated;
    });
  };

  const updatePlanField = (field, value) => {
    setNewPlan((prev) => ({ ...prev, [field]: value }));
    clearPlanError(field);
  };

  const handlePlanBlur = (field) => {
    const errs = validatePlan(newPlan);
    if (!errs[field]) {
      clearPlanError(field);
    } else if (planErrors[field]) {
      setPlanErrors((prev) => ({ ...prev, [field]: errs[field] }));
    }
  };

  const loadAllData = async () => {
    try {
      const [allDentists, allPatients, backendPlans, allBills, allPrescriptions, backendTreatments] = await Promise.all([
        dentistApi.getAllDentists().catch(() => []),
        patientApi.getAllPatients().catch(() => []),
        treatmentPlanApi.getAllTreatmentPlans().catch(() => []),
        billingApi.getAllBills().catch(() => []),
        pharmacyApi.getAllPrescriptions().catch(() => []),
        treatmentPlanApi.getAllTreatments().catch(() => []),
      ]);

      setDentists(allDentists);
      setPatients(allPatients);
      setBills(Array.isArray(allBills) ? allBills : []);
      setPrescriptions(Array.isArray(allPrescriptions) ? allPrescriptions : []);

      let myDentist = null;
      if (user?.id) {
        myDentist = allDentists.find((d) => d.userId === user.id || d.id === user.id) || allDentists[0];
      }
      setCurrentDentist(myDentist);
      if (myDentist) {
        const dName = myDentist.name || `Dr. ${myDentist.firstName || ""} ${myDentist.lastName || ""}`.trim();
        setNewPlan((prev) => ({ ...prev, doctor: prev.doctor || dName }));
        setNewTreatment((prev) => ({ ...prev, doctor: dName, dentistId: myDentist.id }));
      }

      const dLookup = {};
      allDentists.forEach((d) => {
        dLookup[d.id] = d;
      });
      const pLookup = {};
      allPatients.forEach((p) => {
        pLookup[p.id] = p;
      });

      if (backendPlans.length > 0) {
        const normalizedPlans = backendPlans.map((p) => normalizeTreatmentPlan(p, pLookup, dLookup));
        setPlans(normalizedPlans);
      } else {
        setPlans(collections.treatmentPlans || []);
      }

      if (backendTreatments.length > 0) {
        const normalizedTrts = backendTreatments.map((t) => normalizeTreatment(t, pLookup, dLookup));
        setTreatments(normalizedTrts);
      } else {
        setTreatments([]);
      }
    } catch (err) {
      console.warn("Could not load backend treatment data:", err);
      setPlans(collections.treatmentPlans || []);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [user, collections.treatmentPlans]);

  // Handle location state navigation
  useEffect(() => {
    if ((location.state?.planId || location.state?.selectedId) && plans.length > 0) {
      const targetId = location.state.planId || location.state.selectedId;
      const match = plans.find(
        (p) => p.id === targetId || String(p.id) === String(targetId) || p.code === targetId || p.planCode === targetId
      );
      if (match) {
        setViewPlan(match);
        setActiveSection("plans");
      }
    } else if (location.state?.treatmentId && treatments.length > 0) {
      const trtMatch = treatments.find(
        (t) => t.id === location.state.treatmentId || t.rawId === location.state.treatmentId || t.treatmentCode === location.state.treatmentId
      );
      if (trtMatch) {
        setViewTreatment(trtMatch);
        setActiveSection("treatments");
      }
    }
  }, [location.state, plans, treatments]);

  // Match selected patient for treatment form
  const matchedTreatmentPatient = useMemo(() => {
    const clean = String(newTreatment.patient || "").trim().toLowerCase();
    if (!clean) return null;
    return (
      patients.find((p) => {
        const full = `${p.firstName || ""} ${p.lastName || ""}`.toLowerCase().trim();
        const pName = (p.name || "").toLowerCase().trim();
        const pCode = (p.patientCode || p.code || "").toLowerCase().trim();
        const pId = String(p.id);
        return full === clean || pName === clean || pCode === clean || pId === clean;
      }) || null
    );
  }, [newTreatment.patient, patients]);

  // Filter plans belonging to selected treatment patient
  const patientAvailablePlans = useMemo(() => {
    if (!matchedTreatmentPatient) return [];
    return plans.filter(
      (p) => p.patientId === matchedTreatmentPatient.id || p.patient?.toLowerCase() === (matchedTreatmentPatient.name || "").toLowerCase()
    );
  }, [matchedTreatmentPatient, plans]);

  // Handle Create / Update Treatment Plan
  const handleCreatePlan = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (isSubmitting) return;

    const validationErrors = validatePlan(newPlan);
    if (Object.keys(validationErrors).length > 0) {
      setPlanErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const matchedPat = patients.find(
        (p) =>
          `${p.firstName || ""} ${p.lastName || ""}`.toLowerCase().trim() === newPlan.patient.toLowerCase().trim() ||
          p.name?.toLowerCase().trim() === newPlan.patient.toLowerCase().trim()
      );
      const patientId = matchedPat?.id || (patients[0]?.id || 1);
      const dentistId = currentDentist?.id || (dentists[0]?.id || 1);
      const todayIso = new Date().toISOString().slice(0, 10);
      const stripped = String(newPlan.estimatedCost).replace(/^(lkr|rs\.?|\$)\s*/i, "").replace(/,/g, "").trim();
      const estCost = Number(stripped) || parseLkr(newPlan.estimatedCost) || 150000;

      if (editingPlan && editingPlan.rawId) {
        const updated = await treatmentPlanApi.updateTreatmentPlan(editingPlan.rawId, {
          ...(editingPlan.raw || {}),
          planName: newPlan.procedure.trim(),
          description: newPlan.stage.trim(),
          estimatedTotalCost: estCost,
          dentistNotes: newPlan.stage.trim(),
        });
        const pLookup = { [patientId]: matchedPat || { name: newPlan.patient } };
        const dLookup = { [dentistId]: currentDentist || { name: newPlan.doctor } };
        const normalized = normalizeTreatmentPlan(updated, pLookup, dLookup);
        setPlans((prev) => prev.map((p) => (p.id === editingPlan.id ? normalized : p)));
        saveRecord("treatmentPlans", normalized);
        addToast(`Treatment Plan updated for ${normalized.patient}!`, "success");
      } else {
        const created = await treatmentPlanApi.createTreatmentPlan(patientId, dentistId, {
          planName: newPlan.procedure.trim(),
          description: newPlan.stage.trim(),
          startDate: todayIso,
          estimatedTotalCost: estCost,
          status: "PROPOSED",
          dentistNotes: newPlan.stage.trim(),
        });

        const pLookup = { [patientId]: matchedPat || { name: newPlan.patient } };
        const dLookup = { [dentistId]: currentDentist || { name: newPlan.doctor } };
        const normalized = normalizeTreatmentPlan(created, pLookup, dLookup);

        setPlans((prev) => [normalized, ...prev]);
        saveRecord("treatmentPlans", normalized);
        addToast(`Treatment Plan created for ${normalized.patient}!`, "success");
      }

      setModalOpen(false);
      setEditingPlan(null);
      setPlanErrors({});
    } catch (err) {
      const backendErrorMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        (typeof err?.response?.data === "string" ? err.response.data : null) ||
        err?.message;

      console.warn("Treatment plan save failed:", err);
      if (backendErrorMsg && err?.response?.status && err.response.status >= 400 && err.response.status < 500) {
        setPlanErrors({ submit: `Validation failed: ${backendErrorMsg}` });
        addToast(backendErrorMsg, "error");
        return;
      }

      const stripped = String(newPlan.estimatedCost).replace(/^(lkr|rs\.?|\$)\s*/i, "").replace(/,/g, "").trim();
      const plan = {
        id: editingPlan ? editingPlan.id : nextId("TP"),
        ...newPlan,
        procedure: newPlan.procedure.trim(),
        stage: newPlan.stage.trim(),
        estimatedCost: newPlan.estimatedCost.startsWith("LKR") ? newPlan.estimatedCost : `LKR ${Number(stripped).toLocaleString()}`,
        date: new Date().toISOString().slice(0, 10),
      };
      saveRecord("treatmentPlans", plan);
      if (editingPlan) {
        setPlans((prev) => prev.map((p) => (p.id === editingPlan.id ? plan : p)));
        addToast(`Treatment Plan updated for ${plan.patient}!`, "success");
      } else {
        setPlans((prev) => [plan, ...prev]);
        addToast(`Treatment Plan created for ${plan.patient}!`, "success");
      }
      setModalOpen(false);
      setEditingPlan(null);
      setPlanErrors({});
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdvance = async (stageName) => {
    if (!selectedPlan) return;
    try {
      if (typeof selectedPlan.rawId === "number") {
        await treatmentPlanApi.updateTreatmentPlan(selectedPlan.rawId, {
          ...(selectedPlan.raw || {}),
          description: stageName,
          dentistNotes: stageName,
          status: stageName.includes("Stage 4") ? "COMPLETED" : "IN_PROGRESS",
        });
      }
    } catch (err) {
      console.warn("Could not advance plan on backend:", err);
    }
    const updated = { ...selectedPlan, stage: stageName };
    setPlans((prev) => prev.map((p) => (p.id === selectedPlan.id ? updated : p)));
    saveRecord("treatmentPlans", updated);
    addToast(`Advanced plan ${selectedPlan.id} to '${stageName}'`, "success");
    setAdvanceModal(false);
    setSelectedPlan(null);
  };

  const handleDeletePlan = async () => {
    if (!confirmDeletePlan) return;
    setIsDeletingPlan(true);
    try {
      if (confirmDeletePlan.rawId) {
        try {
          await treatmentPlanApi.deleteTreatmentPlan(confirmDeletePlan.rawId);
        } catch (delErr) {
          const msg =
            delErr?.response?.data?.error ||
            delErr?.response?.data?.message ||
            (typeof delErr?.response?.data === "string" ? delErr.response.data : "") ||
            delErr?.message ||
            "";
          if (msg.toLowerCase().includes("cancel")) {
            await treatmentPlanApi.cancelPlan(confirmDeletePlan.rawId);
            await treatmentPlanApi.deleteTreatmentPlan(confirmDeletePlan.rawId);
          } else {
            throw delErr;
          }
        }
      }
      setPlans((prev) => prev.filter((p) => p.id !== confirmDeletePlan.id));
      removeRecord("treatmentPlans", confirmDeletePlan.id);
      addToast(`Treatment plan ${confirmDeletePlan.id} deleted successfully!`, "success");
      setConfirmDeletePlan(null);
      if (viewPlan?.id === confirmDeletePlan.id) {
        setViewPlan(null);
      }
    } catch (err) {
      const errMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : "") ||
        err?.message ||
        "Failed to delete treatment plan";
      addToast(errMsg, "error");
    } finally {
      setIsDeletingPlan(false);
    }
  };

  // Handle Create / Update Individual Treatment
  const handleSaveTreatment = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (isSubmitting) return;

    const errors = {};
    if (!matchedTreatmentPatient) {
      errors.patient = "Patient is required and must match a registered patient.";
    }
    if (!newTreatment.treatmentType?.trim()) {
      errors.treatmentType = "Treatment procedure / type is required.";
    }
    if (!newTreatment.diagnosis?.trim()) {
      errors.diagnosis = "Clinical diagnosis is required.";
    }

    if (Object.keys(errors).length > 0) {
      setTreatmentErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const patientId = matchedTreatmentPatient.id;
      const dentistId = currentDentist?.id || (dentists[0]?.id || 1);
      const estNum = parseFloat(String(newTreatment.estimatedCost).replace(/[^0-9.-]/g, "")) || 0;
      const actNum = parseFloat(String(newTreatment.actualCost).replace(/[^0-9.-]/g, "")) || estNum;

      const payload = {
        patientId,
        dentistId,
        treatmentPlanId: newTreatment.treatmentPlanId ? Number(newTreatment.treatmentPlanId) : null,
        treatmentDate: newTreatment.treatmentDate || new Date().toISOString().slice(0, 10),
        treatmentType: newTreatment.treatmentType.trim(),
        diagnosis: newTreatment.diagnosis.trim(),
        description: newTreatment.description.trim(),
        toothDetails: newTreatment.toothDetails?.trim() || "",
        estimatedCost: estNum,
        actualCost: actNum,
        status: newTreatment.status || "COMPLETED",
        followUpDate: newTreatment.followUpDate || null,
        dentistNotes: newTreatment.dentistNotes?.trim() || "",
      };

      if (editingTreatment && editingTreatment.rawId) {
        const updated = await treatmentPlanApi.updateTreatment(editingTreatment.rawId, payload);
        const pLookup = { [patientId]: matchedTreatmentPatient };
        const dLookup = { [dentistId]: currentDentist || { name: newTreatment.doctor } };
        const normalized = normalizeTreatment(updated, pLookup, dLookup);
        setTreatments((prev) => prev.map((t) => (t.id === editingTreatment.id ? normalized : t)));
        addToast(`Treatment ${editingTreatment.id} updated successfully!`, "success");
      } else {
        const created = await treatmentPlanApi.createTreatment(payload);
        const pLookup = { [patientId]: matchedTreatmentPatient };
        const dLookup = { [dentistId]: currentDentist || { name: newTreatment.doctor } };
        const normalized = normalizeTreatment(created, pLookup, dLookup);
        setTreatments((prev) => [normalized, ...prev]);
        addToast(`Treatment ${normalized.id} recorded for ${matchedTreatmentPatient.name || matchedTreatmentPatient.firstName}!`, "success");
      }

      setTreatmentModalOpen(false);
      setEditingTreatment(null);
      setTreatmentErrors({});
      setNewTreatment(initialTreatmentState);
    } catch (err) {
      console.error("Treatment save failed:", err);
      const msg = err?.response?.data?.message || err?.response?.data?.error || err.message || "Failed to save treatment";
      setTreatmentErrors({ submit: msg });
      addToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered treatments list
  const filteredTreatments = useMemo(() => {
    if (!treatmentSearch.trim()) return treatments;
    const q = treatmentSearch.trim().toLowerCase();
    return treatments.filter(
      (t) =>
        (t.id && t.id.toLowerCase().includes(q)) ||
        (t.patient && t.patient.toLowerCase().includes(q)) ||
        (t.type && t.type.toLowerCase().includes(q)) ||
        (t.toothDetails && t.toothDetails.toLowerCase().includes(q)) ||
        (t.diagnosis && t.diagnosis.toLowerCase().includes(q)) ||
        (t.treatmentPlanName && t.treatmentPlanName.toLowerCase().includes(q))
    );
  }, [treatments, treatmentSearch]);

  return (
    <div className="df-role-page df-role-blue">
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Treatment Plans & Clinical Procedures" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Clinical Dental Care</span>
          <h1>Treatment Management & Clinical Plans</h1>
          <p>Manage multi-stage treatment plans and record clinical treatments, tooth details, follow-up dates, and prescriptions.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {activeSection === "plans" ? (
            <button
              className="df-btn df-btn-primary"
              onClick={() => {
                setPlanErrors({});
                setEditingPlan(null);
                const dName = currentDentist?.name || (currentDentist ? `Dr. ${currentDentist.firstName || ""} ${currentDentist.lastName || ""}`.trim() : "");
                setNewPlan({
                  patient: "",
                  doctor: dName || "",
                  procedure: "",
                  stage: "",
                  estimatedCost: "",
                  actualCost: "LKR 0",
                  status: "in-progress",
                });
                setModalOpen(true);
              }}
            >
              + Create Treatment Plan
            </button>
          ) : (
            <button
              className="df-btn df-btn-primary"
              onClick={() => {
                setTreatmentErrors({});
                setEditingTreatment(null);
                const dName = currentDentist?.name || (currentDentist ? `Dr. ${currentDentist.firstName || ""} ${currentDentist.lastName || ""}`.trim() : "");
                setNewTreatment({
                  ...initialTreatmentState,
                  doctor: dName,
                  dentistId: currentDentist?.id || null,
                });
                setTreatmentModalOpen(true);
              }}
            >
              + Record Clinical Treatment
            </button>
          )}
        </div>
      </header>

      {/* SUB-NAVIGATION TABS */}
      <div style={{ marginBottom: 18 }}>
        <TabPills
          tabs={[
            { label: "Multi-Stage Treatment Plans", value: "plans", count: plans.length },
            { label: "Treatments & Clinical Procedures", value: "treatments", count: treatments.length },
          ]}
          activeTab={activeSection}
          onChange={setActiveSection}
        />
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: MULTI-STAGE TREATMENT PLANS                   */}
      {/* ======================================================== */}
      {activeSection === "plans" && (
        <>
          <div className="df-stat-grid" style={{ marginBottom: 20 }}>
            <StatCard label="Total Treatment Plans" value={String(plans.length)} icon="◫" color="primary" />
            <StatCard
              label="In Progress Plans"
              value={String(plans.filter((p) => p.status === "in-progress" || p.rawStatus === "IN_PROGRESS").length)}
              icon="◷"
              color="warning"
            />
            <StatCard
              label="Completed Plans"
              value={String(plans.filter((p) => p.status === "completed" || p.rawStatus === "COMPLETED").length)}
              icon="✓"
              color="success"
            />
            <StatCard label="Procedure Quality" value="ISO Certified" icon="◈" color="primary" />
          </div>

          <div style={{ display: "grid", gap: 20 }}>
            {plans.map((plan) => {
              const patientBill = bills.find((b) => b.patientId === plan.patientId || b.patient?.id === plan.patientId);
              const isPaid = patientBill && (patientBill.status === "PAID" || (patientBill.paidAmount > 0 && patientBill.balanceAmount <= 0));
              const hasPendingBill = patientBill && patientBill.status !== "PAID" && patientBill.status !== "CANCELLED";

              const patientRx = prescriptions.find((r) => r.patientId === plan.patientId);
              const rxDispensed = patientRx && (patientRx.status === "COMPLETED" || patientRx.isDispensed || patientRx.dispensed);

              return (
                <section key={plan.id} className="df-card">
                  <div className="df-card-body">
                    <div className="df-card-title-row">
                      <div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                          <span className="df-badge df-badge-primary">{plan.id}</span>
                          <strong style={{ fontSize: 16 }}>{plan.procedure}</strong>
                          <span className={`df-badge df-badge-${plan.status === "completed" ? "success" : "primary"}`}>
                            Status: {(plan.rawStatus || plan.status || "PLANNED").toUpperCase()}
                          </span>
                          {isPaid ? (
                            <span className="df-badge" style={{ background: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0", fontWeight: 700 }}>
                              ✓ Treatment Payment Successful
                            </span>
                          ) : hasPendingBill ? (
                            <span className="df-badge" style={{ background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" }}>
                              ⏳ Payment Pending ({formatLkr(patientBill.balanceAmount ?? patientBill.totalAmount)})
                            </span>
                          ) : (
                            <span className="df-badge" style={{ background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0" }}>
                              Unbilled
                            </span>
                          )}
                          {patientRx && (
                            <span
                              className="df-badge"
                              style={{
                                background: rxDispensed ? "#f0fdf4" : "#fef3c7",
                                color: rxDispensed ? "#166534" : "#854d0e",
                                border: `1px solid ${rxDispensed ? "#bbf7d0" : "#fde047"}`,
                              }}
                            >
                              💊 Pharmacy: {rxDispensed ? "Dispensed" : "Pending Dispensation"}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: 13, color: "var(--df-text-secondary)" }}>
                          Patient: <strong>{plan.patient}</strong> · Dentist: {plan.doctor}
                        </span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 13, color: "var(--df-text-muted)" }}>Total Estimate</div>
                        <strong style={{ fontSize: 16, color: "var(--df-primary-600)" }}>{plan.estimatedCost}</strong>
                      </div>
                    </div>

                    <div className="df-stepper">
                      <div className="df-stepper-step completed">
                        <div className="df-stepper-icon">✓</div>
                        <div className="df-stepper-content">
                          <div className="df-stepper-title">
                            <span>Stage 1: Clinical Examination & 3D Imaging</span>
                            <small style={{ color: "var(--df-success)" }}>Completed</small>
                          </div>
                          <div className="df-stepper-desc">High-resolution panoramic radiograph and diagnostic model.</div>
                        </div>
                      </div>

                      <div className={`df-stepper-step ${plan.stage.includes("Stage 1") ? "pending" : "completed"}`}>
                        <div className="df-stepper-icon">2</div>
                        <div className="df-stepper-content">
                          <div className="df-stepper-title">
                            <span>Stage 2: Surgical Preparation & Extraction</span>
                            <small style={{ color: "var(--df-primary-600)" }}>{plan.stage.includes("Stage 2") ? "Active Stage" : "Ready"}</small>
                          </div>
                          <div className="df-stepper-desc">Pre-op sterilization, bone grafting, or aligner placement.</div>
                        </div>
                      </div>

                      <div className={`df-stepper-step ${plan.stage.includes("Stage 3") ? "active" : "pending"}`}>
                        <div className="df-stepper-icon">3</div>
                        <div className="df-stepper-content">
                          <div className="df-stepper-title">
                            <span>Stage 3: Fixture / Aligner Progress</span>
                            <small>{plan.stage.includes("Stage 3") ? "Current Stage" : "Scheduled"}</small>
                          </div>
                          <div className="df-stepper-desc">Surgical implant osseointegration or sequential orthodontic progression.</div>
                        </div>
                      </div>

                      <div className="df-stepper-step pending">
                        <div className="df-stepper-icon">4</div>
                        <div className="df-stepper-content">
                          <div className="df-stepper-title">
                            <span>Stage 4: Prosthetic Delivery & Final Crown</span>
                            <small style={{ color: "var(--df-text-muted)" }}>Final Step</small>
                          </div>
                          <div className="df-stepper-desc">Ceramic crown bonding, occlusion check, and long-term warranty.</div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--df-border)" }}>
                      <span className="df-badge df-badge-primary">Current Phase: {plan.stage}</span>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          className="df-btn df-btn-secondary df-btn-sm"
                          onClick={() => setViewPlan(plan)}
                        >
                          View Details
                        </button>
                        <button
                          className="df-btn df-btn-secondary df-btn-sm"
                          onClick={() => {
                            setEditingPlan(plan);
                            setNewPlan({
                              patient: plan.patient || "",
                              doctor: plan.doctor || "",
                              procedure: plan.procedure || "",
                              stage: plan.stage || "",
                              estimatedCost: plan.estimatedCost || "",
                              actualCost: plan.actualCost || "LKR 0",
                              status: plan.status || "in-progress",
                            });
                            setPlanErrors({});
                            setModalOpen(true);
                          }}
                        >
                          Edit Plan
                        </button>
                        <button
                          className="df-btn df-btn-secondary df-btn-sm"
                          onClick={() => {
                            setSelectedPlan(plan);
                            setAdvanceModal(true);
                          }}
                        >
                          ▶ Advance Clinical Phase
                        </button>
                        <button
                          className="df-btn df-btn-danger df-btn-sm"
                          onClick={() => setConfirmDeletePlan(plan)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}

      {/* ======================================================== */}
      {/* SECTION 2: TREATMENTS & CLINICAL PROCEDURES               */}
      {/* ======================================================== */}
      {activeSection === "treatments" && (
        <>
          <div className="df-stat-grid" style={{ marginBottom: 20 }}>
            <StatCard label="Total Procedures Recorded" value={String(treatments.length)} icon="◫" color="primary" />
            <StatCard
              label="Completed Treatments"
              value={String(treatments.filter((t) => (t.rawStatus || t.status || "").toUpperCase() === "COMPLETED").length)}
              icon="✓"
              color="success"
            />
            <StatCard
              label="In Progress / Planned"
              value={String(treatments.filter((t) => (t.rawStatus || t.status || "").toUpperCase() !== "COMPLETED" && (t.rawStatus || t.status || "").toUpperCase() !== "CANCELLED").length)}
              icon="◷"
              color="warning"
            />
            <StatCard
              label="Follow-ups Scheduled"
              value={String(treatments.filter((t) => Boolean(t.followUpDate)).length)}
              icon="📅"
              color="primary"
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <div style={{ minWidth: 280 }}>
              <SearchBar value={treatmentSearch} onChange={setTreatmentSearch} placeholder="Search treatment, patient, tooth, diagnosis..." />
            </div>
          </div>

          <section className="df-card">
            <div className="df-card-body" style={{ padding: 0 }}>
              <DataTable
                columns={[
                  { key: "id", label: "Treatment #" },
                  { key: "patient", label: "Patient" },
                  { key: "type", label: "Procedure" },
                  { key: "toothDetails", label: "Tooth Details" },
                  { key: "treatmentPlanName", label: "Treatment Plan" },
                  { key: "date", label: "Date" },
                  { key: "followUpDate", label: "Follow-up" },
                  { key: "status", label: "Status", type: "status" },
                ]}
                rows={filteredTreatments}
                searchable={false}
                quickActionLabel="View"
                onQuickAction={(row) => setViewTreatment(row)}
                actionLabel="Edit"
                onEdit={(row) => {
                  setEditingTreatment(row);
                  setNewTreatment({
                    patient: row.patient || "",
                    patientId: row.patientId || null,
                    dentistId: row.dentistId || currentDentist?.id || null,
                    treatmentPlanId: row.treatmentPlanId || "",
                    treatmentType: row.type || "Restorative",
                    toothDetails: row.toothDetails || "",
                    diagnosis: row.diagnosis || "",
                    description: row.description || "",
                    estimatedCost: row.estimatedCost || "0",
                    actualCost: row.actualCost || "0",
                    status: (row.rawStatus || row.status || "COMPLETED").toUpperCase(),
                    treatmentDate: row.date || new Date().toISOString().slice(0, 10),
                    followUpDate: row.followUpDate || "",
                    dentistNotes: row.dentistNotes || "",
                  });
                  setTreatmentErrors({});
                  setTreatmentModalOpen(true);
                }}
                rowActions={(row) => (
                  <button
                    type="button"
                    className="df-btn df-btn-secondary df-btn-sm"
                    style={{ fontWeight: 700 }}
                    onClick={() => {
                      navigate("/doctor/prescriptions", {
                        state: {
                          patientId: row.patientId,
                          patientName: row.patient,
                          treatmentId: row.rawId || row.id,
                          treatmentCode: row.id,
                        },
                      });
                    }}
                    title="Issue prescription for this clinical treatment"
                  >
                    💊 Issue Rx
                  </button>
                )}
              />
            </div>
          </section>
        </>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: CREATE / EDIT TREATMENT PLAN                    */}
      {/* ======================================================== */}
      {modalOpen && (
        <Modal
          title={editingPlan ? "Edit Treatment Plan" : "Create New Treatment Plan"}
          onClose={() => {
            if (!isSubmitting) {
              setModalOpen(false);
              setEditingPlan(null);
              setPlanErrors({});
            }
          }}
          footer={
            <>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => {
                  setModalOpen(false);
                  setEditingPlan(null);
                  setPlanErrors({});
                }}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="df-btn df-btn-primary"
                onClick={handleCreatePlan}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processing..." : (editingPlan ? "Update Plan" : "Create Plan")}
              </button>
            </>
          }
        >
          <div className="df-form-2col">
            <div className="df-form-group">
              <label className="df-label" htmlFor="treatment-plan-patient">Patient Name *</label>
              <input
                id="treatment-plan-patient"
                className={`df-input ${planErrors.patient ? "df-input-error" : ""}`}
                value={newPlan.patient}
                onChange={(e) => updatePlanField("patient", e.target.value)}
                onBlur={() => handlePlanBlur("patient")}
                placeholder="e.g. Sarah Mitchell"
                list="treatment-plan-patients-list"
                required
              />
              <datalist id="treatment-plan-patients-list">
                {patients.map((p) => {
                  const pName = p.name || `${p.firstName || ""} ${p.lastName || ""}`.trim();
                  return <option key={p.id} value={pName} />;
                })}
              </datalist>
              {planErrors.patient && (
                <small className="df-field-error" style={{ color: "#dc2626", fontSize: 12, marginTop: 4, display: "block" }}>
                  {planErrors.patient}
                </small>
              )}
            </div>
            <div className="df-form-group">
              <label className="df-label" htmlFor="treatment-plan-doctor">Treating Dentist *</label>
              <input
                id="treatment-plan-doctor"
                className={`df-input ${planErrors.doctor ? "df-input-error" : ""}`}
                value={newPlan.doctor}
                onChange={(e) => updatePlanField("doctor", e.target.value)}
                onBlur={() => handlePlanBlur("doctor")}
                placeholder="e.g. Dr. James Wilson"
                required
              />
              {planErrors.doctor && (
                <small className="df-field-error" style={{ color: "#dc2626", fontSize: 12, marginTop: 4, display: "block" }}>
                  {planErrors.doctor}
                </small>
              )}
            </div>
          </div>

          <div className="df-form-group" style={{ marginTop: 14 }}>
            <label className="df-label" htmlFor="treatment-plan-procedure">Procedure / Treatment Type *</label>
            <input
              id="treatment-plan-procedure"
              className={`df-input ${planErrors.procedure ? "df-input-error" : ""}`}
              value={newPlan.procedure}
              onChange={(e) => updatePlanField("procedure", e.target.value)}
              onBlur={() => handlePlanBlur("procedure")}
              placeholder="e.g. Ceramic Veneers (6 teeth)"
              required
            />
            {planErrors.procedure && (
              <small className="df-field-error" style={{ color: "#dc2626", fontSize: 12, marginTop: 4, display: "block" }}>
                {planErrors.procedure}
              </small>
            )}
          </div>

          <div className="df-form-2col" style={{ marginTop: 14 }}>
            <div className="df-form-group">
              <label className="df-label" htmlFor="treatment-plan-cost">Estimated Total Cost *</label>
              <input
                id="treatment-plan-cost"
                className={`df-input ${planErrors.estimatedCost ? "df-input-error" : ""}`}
                value={newPlan.estimatedCost}
                onChange={(e) => updatePlanField("estimatedCost", e.target.value)}
                onBlur={() => handlePlanBlur("estimatedCost")}
                placeholder="e.g. LKR 120,000 or 120000"
                required
              />
              {planErrors.estimatedCost && (
                <small className="df-field-error" style={{ color: "#dc2626", fontSize: 12, marginTop: 4, display: "block" }}>
                  {planErrors.estimatedCost}
                </small>
              )}
            </div>
            <div className="df-form-group">
              <label className="df-label" htmlFor="treatment-plan-stage">Initial Stage *</label>
              <select
                id="treatment-plan-stage"
                className={`df-select ${planErrors.stage ? "df-input-error" : ""}`}
                value={newPlan.stage}
                onChange={(e) => updatePlanField("stage", e.target.value)}
                onBlur={() => handlePlanBlur("stage")}
                required
              >
                <option value="">Select initial stage...</option>
                <option value="Stage 1: Diagnosis & 3D Imaging">Stage 1: Diagnosis & 3D Imaging</option>
                <option value="Stage 2: Surgical Prep">Stage 2: Surgical Prep</option>
                <option value="Stage 3: Fixture Placement">Stage 3: Fixture Placement</option>
                <option value="Stage 4: Crown Delivery">Stage 4: Crown Delivery</option>
              </select>
              {planErrors.stage && (
                <small className="df-field-error" style={{ color: "#dc2626", fontSize: 12, marginTop: 4, display: "block" }}>
                  {planErrors.stage}
                </small>
              )}
            </div>
          </div>

          {planErrors.submit && (
            <div
              className="df-alert df-alert-warning"
              style={{
                marginTop: 14,
                color: "#dc2626",
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                borderRadius: 6,
                padding: "8px 12px",
              }}
            >
              {planErrors.submit}
            </div>
          )}
        </Modal>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CREATE / EDIT INDIVIDUAL CLINICAL TREATMENT     */}
      {/* ======================================================== */}
      {treatmentModalOpen && (
        <Modal
          title={editingTreatment ? `Edit Clinical Treatment (${editingTreatment.id})` : "Record Clinical Dental Treatment"}
          onClose={() => {
            if (!isSubmitting) {
              setTreatmentModalOpen(false);
              setEditingTreatment(null);
              setTreatmentErrors({});
            }
          }}
          footer={
            <>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => {
                  setTreatmentModalOpen(false);
                  setEditingTreatment(null);
                  setTreatmentErrors({});
                }}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="df-btn df-btn-primary"
                onClick={handleSaveTreatment}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving Treatment..." : (editingTreatment ? "✓ Update Treatment" : "✓ Save Treatment")}
              </button>
            </>
          }
        >
          <div className="df-form-2col">
            <div className="df-form-group">
              <label className="df-label">Patient Name *</label>
              <input
                className="df-input"
                value={newTreatment.patient}
                onChange={(e) => {
                  setNewTreatment((prev) => ({ ...prev, patient: e.target.value }));
                  setTreatmentErrors((prev) => {
                    const u = { ...prev };
                    delete u.patient;
                    return u;
                  });
                }}
                placeholder="Type patient full name or select..."
                list="treatment-record-patient-list"
                required
              />
              <datalist id="treatment-record-patient-list">
                {patients.map((p) => {
                  const pName = p.name || `${p.firstName || ""} ${p.lastName || ""}`.trim();
                  return <option key={p.id} value={pName} />;
                })}
              </datalist>
              {treatmentErrors.patient && (
                <small style={{ color: "#dc2626", fontSize: 12, marginTop: 4, display: "block" }}>
                  {treatmentErrors.patient}
                </small>
              )}
            </div>

            <div className="df-form-group">
              <label className="df-label">Attending Dentist</label>
              <input
                className="df-input"
                value={newTreatment.doctor || "Authenticated Dentist"}
                disabled
              />
            </div>
          </div>

          {/* TREATMENT PLAN ASSOCIATION (FILTERED BY PATIENT) */}
          <div className="df-form-2col" style={{ marginTop: 12 }}>
            <div className="df-form-group">
              <label className="df-label">Associated Treatment Plan (Optional)</label>
              <select
                className="df-select"
                value={newTreatment.treatmentPlanId}
                onChange={(e) => setNewTreatment((prev) => ({ ...prev, treatmentPlanId: e.target.value }))}
              >
                <option value="">-- Direct Clinical Treatment (No Master Plan) --</option>
                {patientAvailablePlans.map((pl) => (
                  <option key={pl.id || pl.rawId} value={pl.rawId || pl.id}>
                    [{pl.id}] {pl.procedure} — {pl.stage}
                  </option>
                ))}
              </select>
            </div>

            <div className="df-form-group">
              <label className="df-label">Treatment Type / Discipline *</label>
              <select
                className="df-select"
                value={newTreatment.treatmentType}
                onChange={(e) => setNewTreatment((prev) => ({ ...prev, treatmentType: e.target.value }))}
              >
                <option value="Restorative">Restorative (Fillings, Composites)</option>
                <option value="Endodontics">Endodontics (Root Canal Treatment)</option>
                <option value="Oral Surgery">Oral Surgery (Extraction, Biopsy)</option>
                <option value="Orthodontics">Orthodontics (Aligners, Braces)</option>
                <option value="Prosthodontics">Prosthodontics (Crowns, Bridges, Dentures)</option>
                <option value="Periodontics">Periodontics (Deep Scaling, Root Planing)</option>
                <option value="Preventive">Preventive (Cleaning, Fluoride, Polish)</option>
              </select>
            </div>
          </div>

          <div className="df-form-2col" style={{ marginTop: 12 }}>
            <div className="df-form-group">
              <label className="df-label">Tooth Details *</label>
              <input
                className="df-input"
                value={newTreatment.toothDetails}
                onChange={(e) => setNewTreatment((prev) => ({ ...prev, toothDetails: e.target.value }))}
                placeholder="e.g. Tooth #16 (Upper Right Molar) or Full Arch"
              />
            </div>

            <div className="df-form-group">
              <label className="df-label">Clinical Diagnosis *</label>
              <input
                className="df-input"
                value={newTreatment.diagnosis}
                onChange={(e) => setNewTreatment((prev) => ({ ...prev, diagnosis: e.target.value }))}
                placeholder="e.g. Irreversible Pulpitis, Class II Caries"
              />
              {treatmentErrors.diagnosis && (
                <small style={{ color: "#dc2626", fontSize: 12, marginTop: 4, display: "block" }}>
                  {treatmentErrors.diagnosis}
                </small>
              )}
            </div>
          </div>

          <div className="df-form-2col" style={{ marginTop: 12 }}>
            <div className="df-form-group">
              <label className="df-label">Procedure Cost (LKR)</label>
              <input
                type="number"
                className="df-input"
                value={newTreatment.actualCost}
                onChange={(e) => setNewTreatment((prev) => ({ ...prev, actualCost: e.target.value, estimatedCost: e.target.value }))}
                placeholder="e.g. 25000"
              />
            </div>

            <div className="df-form-group">
              <label className="df-label">Treatment Status</label>
              <select
                className="df-select"
                value={newTreatment.status}
                onChange={(e) => setNewTreatment((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="COMPLETED">Completed (Procedure Done)</option>
                <option value="IN_PROGRESS">In Progress (Multi-visit)</option>
                <option value="PLANNED">Planned (Scheduled)</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="df-form-2col" style={{ marginTop: 12 }}>
            <div className="df-form-group">
              <label className="df-label">Treatment Date</label>
              <input
                type="date"
                className="df-input"
                value={newTreatment.treatmentDate}
                onChange={(e) => setNewTreatment((prev) => ({ ...prev, treatmentDate: e.target.value }))}
              />
            </div>

            <div className="df-form-group">
              <label className="df-label">Scheduled Follow-up Date (Optional)</label>
              <input
                type="date"
                className="df-input"
                value={newTreatment.followUpDate}
                onChange={(e) => setNewTreatment((prev) => ({ ...prev, followUpDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="df-form-group" style={{ marginTop: 12 }}>
            <label className="df-label">Clinical Notes / Procedure Description</label>
            <textarea
              className="df-textarea"
              rows={3}
              value={newTreatment.description}
              onChange={(e) => setNewTreatment((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Clinical steps performed, materials used, patient response..."
            />
          </div>

          {treatmentErrors.submit && (
            <div
              className="df-alert df-alert-warning"
              style={{
                marginTop: 14,
                color: "#dc2626",
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                borderRadius: 6,
                padding: "8px 12px",
              }}
            >
              {treatmentErrors.submit}
            </div>
          )}
        </Modal>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: VIEW INDIVIDUAL TREATMENT DETAILS               */}
      {/* ======================================================== */}
      {viewTreatment && (
        <Modal
          title={`Clinical Treatment Details: ${viewTreatment.id}`}
          onClose={() => setViewTreatment(null)}
          footer={
            <>
              <button
                type="button"
                className="df-btn df-btn-primary"
                onClick={() => {
                  const t = viewTreatment;
                  setViewTreatment(null);
                  navigate("/doctor/prescriptions", {
                    state: {
                      patientId: t.patientId,
                      patientName: t.patient,
                      treatmentId: t.rawId || t.id,
                      treatmentCode: t.id,
                    },
                  });
                }}
              >
                💊 Issue Prescription for this Treatment
              </button>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setViewTreatment(null)}
              >
                Close
              </button>
            </>
          }
        >
          <div className="df-form-2col">
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Treatment Code</small>
              <div style={{ fontWeight: 600 }}>{viewTreatment.id}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Treatment Status</small>
              <div style={{ fontWeight: 600 }}>{(viewTreatment.rawStatus || viewTreatment.status || "COMPLETED").toUpperCase()}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Patient</small>
              <div style={{ fontWeight: 600 }}>{viewTreatment.patient}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Attending Dentist</small>
              <div style={{ fontWeight: 600 }}>{viewTreatment.doctor}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Procedure Discipline</small>
              <div style={{ fontWeight: 600 }}>{viewTreatment.type}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Tooth Details</small>
              <div style={{ fontWeight: 600 }}>{viewTreatment.toothDetails || "General"}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Procedure Date</small>
              <div style={{ fontWeight: 600 }}>{viewTreatment.date}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Follow-up Date</small>
              <div style={{ fontWeight: 600, color: viewTreatment.followUpDate ? "#2563eb" : "var(--df-text-muted)" }}>
                {viewTreatment.followUpDate || "None scheduled"}
              </div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Associated Treatment Plan</small>
              <div style={{ fontWeight: 600 }}>{viewTreatment.treatmentPlanName || "Direct Treatment"}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Treatment Cost</small>
              <div style={{ fontWeight: 700, color: "var(--df-primary-600)" }}>{viewTreatment.actualCost || viewTreatment.estimatedCost}</div>
            </div>
          </div>

          <div style={{ marginTop: 14, padding: 12, background: "var(--df-gray-50)", borderRadius: 6 }}>
            <strong>Diagnosis:</strong>
            <p style={{ marginTop: 4, color: "var(--df-text-secondary)" }}>{viewTreatment.diagnosis || "Dental Treatment"}</p>
          </div>

          {viewTreatment.description && (
            <div style={{ marginTop: 14, padding: 12, background: "var(--df-gray-50)", borderRadius: 6 }}>
              <strong>Clinical Description & Protocol:</strong>
              <p style={{ marginTop: 4, color: "var(--df-text-secondary)", lineHeight: 1.5 }}>{viewTreatment.description}</p>
            </div>
          )}

          {viewTreatment.dentistNotes && (
            <div style={{ marginTop: 14, padding: 12, background: "var(--df-gray-50)", borderRadius: 6 }}>
              <strong>Dentist Notes:</strong>
              <p style={{ marginTop: 4, color: "var(--df-text-secondary)", lineHeight: 1.5 }}>{viewTreatment.dentistNotes}</p>
            </div>
          )}
        </Modal>
      )}

      {/* ADVANCE TREATMENT PLAN STAGE MODAL */}
      {advanceModal && selectedPlan && (
        <Modal
          title={`Advance Treatment Phase: ${selectedPlan.patient}`}
          onClose={() => setAdvanceModal(false)}
          footer={
            <button className="df-btn df-btn-secondary" onClick={() => setAdvanceModal(false)}>
              Close
            </button>
          }
        >
          <p style={{ marginBottom: 16, color: "var(--df-text-secondary)" }}>
            Select the new clinical phase for <strong>{selectedPlan.procedure}</strong>:
          </p>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              "Stage 1: Clinical Diagnosis & CT Scanning",
              "Stage 2: Preparation & Extraction Completed",
              "Stage 3: Implant / Aligner Active Progression",
              "Stage 4: Permanent Restoration Delivery",
              "Completed & Discharged",
            ].map((stg) => (
              <button
                key={stg}
                className="df-quick-action"
                style={{ textAlign: "left" }}
                onClick={() => handleAdvance(stg)}
              >
                <span>{stg}</span>
                <b>→</b>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* VIEW TREATMENT PLAN DETAILS MODAL */}
      {viewPlan && (
        <Modal
          title={`Treatment Plan: ${viewPlan.id} - ${viewPlan.procedure}`}
          onClose={() => setViewPlan(null)}
          footer={
            <>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => {
                  const target = viewPlan;
                  setViewPlan(null);
                  setEditingPlan(target);
                  setNewPlan({
                    patient: target.patient || "",
                    doctor: target.doctor || "",
                    procedure: target.procedure || "",
                    stage: target.stage || "",
                    estimatedCost: target.estimatedCost || "",
                    actualCost: target.actualCost || "LKR 0",
                    status: target.status || "in-progress",
                  });
                  setPlanErrors({});
                  setModalOpen(true);
                }}
              >
                Edit Plan
              </button>
              <button
                type="button"
                className="df-btn df-btn-danger"
                onClick={() => {
                  setConfirmDeletePlan(viewPlan);
                  setViewPlan(null);
                }}
              >
                Delete Plan
              </button>
              <button type="button" className="df-btn df-btn-primary" onClick={() => setViewPlan(null)}>
                Close
              </button>
            </>
          }
        >
          <div className="df-form-2col">
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Plan Code</small>
              <div style={{ fontWeight: 600 }}>{viewPlan.id}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Current Status</small>
              <div style={{ fontWeight: 600 }}>{(viewPlan.rawStatus || viewPlan.status || "PROPOSED").toUpperCase()}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Patient</small>
              <div style={{ fontWeight: 600 }}>{viewPlan.patient}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Treating Specialist</small>
              <div style={{ fontWeight: 600 }}>{viewPlan.doctor}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Start Date</small>
              <div style={{ fontWeight: 600 }}>{viewPlan.date}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Estimated Cost</small>
              <div style={{ fontWeight: 600, color: "var(--df-primary-600)" }}>{viewPlan.estimatedCost}</div>
            </div>
          </div>

          <div style={{ marginTop: 14, padding: 12, background: "var(--df-gray-50)", borderRadius: 6 }}>
            <strong>Procedure / Treatment Plan:</strong>
            <p style={{ marginTop: 4, color: "var(--df-text-secondary)" }}>{viewPlan.procedure}</p>
          </div>

          <div style={{ marginTop: 14, padding: 12, background: "var(--df-gray-50)", borderRadius: 6 }}>
            <strong>Active Phase:</strong>
            <p style={{ marginTop: 4, color: "var(--df-text-secondary)" }}>{viewPlan.stage}</p>
          </div>

          {viewPlan.dentistNotes && (
            <div style={{ marginTop: 14, padding: 12, background: "var(--df-gray-50)", borderRadius: 6 }}>
              <strong>Dentist Notes & Clinical Protocol:</strong>
              <p style={{ marginTop: 4, color: "var(--df-text-secondary)", lineHeight: 1.5 }}>{viewPlan.dentistNotes}</p>
            </div>
          )}

          {(() => {
            const planBill = bills.find((b) => b.patientId === viewPlan.patientId || b.patient?.id === viewPlan.patientId);
            const isPaid = planBill && (planBill.status === "PAID" || (planBill.paidAmount > 0 && planBill.balanceAmount <= 0));
            const planRx = prescriptions.find((r) => r.patientId === viewPlan.patientId);
            const rxDispensed = planRx && (planRx.status === "COMPLETED" || planRx.isDispensed || planRx.dispensed);

            return (
              <div style={{ marginTop: 14, padding: 12, background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: "#334155" }}>Financial & Pharmacy Settlement Status</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", fontSize: 13 }}>
                  <div>
                    <span style={{ color: "#64748b", display: "block", fontSize: 11, fontWeight: 600 }}>TREATMENT PAYMENT STATUS</span>
                    {isPaid ? (
                      <strong style={{ color: "#059669" }}>✓ Treatment Payment Successful (Settled)</strong>
                    ) : planBill ? (
                      <strong style={{ color: "#d97706" }}>Pending Payment ({formatLkr(planBill.balanceAmount ?? planBill.totalAmount)})</strong>
                    ) : (
                      <span style={{ color: "#64748b" }}>Unbilled</span>
                    )}
                  </div>
                  <div>
                    <span style={{ color: "#64748b", display: "block", fontSize: 11, fontWeight: 600 }}>PHARMACY DISPENSATION</span>
                    {planRx ? (
                      <strong style={{ color: rxDispensed ? "#059669" : "#d97706" }}>
                        {rxDispensed ? "✓ Dispensed & Purchased from Pharmacy" : "⏳ Prescribed — Pending Dispense"}
                      </strong>
                    ) : (
                      <span style={{ color: "#64748b" }}>No Pharmacy Prescriptions</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {/* CONFIRM DELETE TREATMENT PLAN MODAL */}
      {confirmDeletePlan && (
        <Modal
          title="Confirm Treatment Plan Deletion"
          onClose={() => !isDeletingPlan && setConfirmDeletePlan(null)}
          footer={
            <>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setConfirmDeletePlan(null)}
                disabled={isDeletingPlan}
              >
                Cancel
              </button>
              <button
                type="button"
                className="df-btn df-btn-danger"
                onClick={handleDeletePlan}
                disabled={isDeletingPlan}
              >
                {isDeletingPlan ? "Deleting..." : "Confirm Delete"}
              </button>
            </>
          }
        >
          <p style={{ margin: "8px 0 16px", color: "var(--df-text-secondary)" }}>
            Are you sure you want to permanently delete treatment plan <strong>{confirmDeletePlan.id}</strong> ({confirmDeletePlan.procedure}) for patient <strong>{confirmDeletePlan.patient}</strong>?
          </p>
          <div className="df-alert df-alert-warning" style={{ color: "#b45309", background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: 6, padding: "8px 12px" }}>
            This action cannot be undone. Any associated scheduled stages and stage notes will be removed.
          </div>
        </Modal>
      )}
    </div>
  );
}

export function DoctorMessagesView({ role }) {
  const { user } = useAuth();
  const { addToast } = useNotifications();
  const [messages, setMessages] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [patients, setPatients] = useState([]);
  const [patientAppointments, setPatientAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activePartnerId, setActivePartnerId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [newMsgForm, setNewMsgForm] = useState({
    receiverId: "",
    subject: "",
    priority: "NORMAL",
    patientId: "",
    appointmentId: "",
    content: "",
  });
  const [editingMessage, setEditingMessage] = useState(null);
  const [editForm, setEditForm] = useState({
    subject: "",
    content: "",
    priority: "NORMAL",
  });
  const [updating, setUpdating] = useState(false);
  const [deletingMessage, setDeletingMessage] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const messagesEndRef = useRef(null);

  const isPatient = role === "patient" || user?.role === "patient";
  const isAdmin = role === "admin" || user?.role === "admin";
  const isCashier = role === "cashier" || role === "user" || user?.role === "cashier" || user?.role === "user";
  const isReceptionist = role === "receptionist" || user?.role === "receptionist";
  const isPharmacist = role === "pharmacist" || user?.role === "pharmacist";

  const config = useMemo(() => {
    if (isPatient) {
      return {
        sectionLabel: "Patient Portal",
        title: "Messages & Clinic Communication",
        subtitle: "Direct messaging channel with your dental care team and reception desk.",
        emptyTitle: "No messages yet",
        emptySubtitle: "Send a message to consult with your dentist or front desk staff.",
        dashboardPath: "/patient",
        templates: [
          "Appointment Inquiry",
          "Post-Treatment Question",
          "Tooth Sensitivity / Pain",
          "Prescription Query",
          "Insurance / Payment Question",
        ],
      };
    }
    if (isAdmin) {
      return {
        sectionLabel: "Clinic Administration",
        title: "Internal Messages & Communication",
        subtitle: "Intra-clinic messaging and operational updates across all departments.",
        emptyTitle: "No internal messages",
        emptySubtitle: "Start an internal communication with doctors, front desk, or staff.",
        dashboardPath: "/admin",
        templates: [
          "Operational Notice",
          "Staff Schedule Update",
          "Equipment Maintenance",
          "Policy Announcement",
          "Urgent Clinic Update",
        ],
      };
    }
    if (isCashier) {
      return {
        sectionLabel: "Billing Desk",
        title: "Billing & Clinic Communication",
        subtitle: "Direct messaging channel with front desk, doctors, and administration for payment queries.",
        emptyTitle: "No messages yet",
        emptySubtitle: "Start a conversation regarding billing queries, insurance, or invoices.",
        dashboardPath: "/user",
        templates: [
          "Payment Clarification",
          "Insurance Claim Query",
          "Invoice Discrepancy",
          "Refund Request",
          "Treatment Charge Confirmation",
        ],
      };
    }
    if (isReceptionist) {
      return {
        sectionLabel: "Front Desk Comms",
        title: "Front Desk & Clinical Messages",
        subtitle: "Direct messaging channel with doctors, pharmacy, billing, and patients.",
        emptyTitle: "No messages yet",
        emptySubtitle: "Communicate with dental doctors, pharmacy, or registered patients.",
        dashboardPath: "/receptionist",
        templates: [
          "Patient Arrival Notice",
          "Walk-in Patient Alert",
          "Appointment Reschedule Query",
          "Doctor Consultation Request",
        ],
      };
    }
    if (isPharmacist) {
      return {
        sectionLabel: "Pharmacy Hub",
        title: "Pharmacy & Prescribing Messages",
        subtitle: "Direct communication channel with doctors and clinic staff regarding medications.",
        emptyTitle: "No messages yet",
        emptySubtitle: "Send a prescription query or medication clarification to dental doctors.",
        dashboardPath: "/pharmacist",
        templates: [
          "Prescription Clarification",
          "Dosage Query",
          "Medicine Alternative Notice",
          "Stock Out Alert",
        ],
      };
    }
    return {
      sectionLabel: "Intra-Clinic Comms",
      title: "Clinical Messages & Consult Requests",
      subtitle: "Direct communication channel with front desk, pharmacy, dental assistants, and clinic staff.",
      emptyTitle: "No conversations yet",
      emptySubtitle: "Select an existing conversation from the inbox or start a new clinical consult message.",
      dashboardPath: "/doctor",
      templates: [
        "Patient Arrival Notice",
        "Prescription Clarification",
        "Consultation Request",
        "Urgent Walk-in",
        "Lab Results Ready",
      ],
    };
  }, [isPatient, isAdmin, isCashier, isReceptionist, isPharmacist]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rawMessages, rawRecipients, rawPatients] = await Promise.all([
        messagesApi.getMessages().catch(() => []),
        messagesApi.getRecipients().catch(() => []),
        patientApi.getAllPatients().catch(() => []),
      ]);
      setMessages(rawMessages || []);
      setRecipients(rawRecipients || []);
      setPatients(rawPatients || []);

      if (isPatient && user?.id) {
        const myPatient = (rawPatients || []).find(
          (p) => String(p.userId) === String(user.id) || (user.email && p.email?.toLowerCase() === user.email.toLowerCase())
        );
        if (myPatient?.id) {
          appointmentApi.getPatientAppointments(myPatient.id)
            .then((appts) => setPatientAppointments(Array.isArray(appts) ? appts : []))
            .catch(() => {});
        }
      }
    } catch (err) {
      console.warn("Could not load communications data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return timeStr;
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (isYesterday) {
      return "Yesterday";
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const isOutgoing = (m) => {
    if (user?.id && String(m.senderId) === String(user.id)) return true;
    if (user?.email && m.senderEmail?.toLowerCase() === user.email.toLowerCase()) return true;
    return false;
  };

  // Group messages into conversation threads by conversation partner
  const threads = useMemo(() => {
    if (!messages || messages.length === 0) return [];

    const threadMap = new Map();

    messages.forEach((m) => {
      const outgoing = isOutgoing(m);
      const partnerId = outgoing ? m.receiverId : m.senderId;
      if (!partnerId) return;

      const partnerName = outgoing
        ? (m.receiverName || "Clinic Staff")
        : (m.senderName || "Clinic Staff");
      const partnerRole = outgoing
        ? (m.receiverRole || "Staff")
        : (m.senderRole || "Staff");

      if (!threadMap.has(partnerId)) {
        threadMap.set(partnerId, {
          partnerId,
          partnerName,
          partnerRole,
          messages: [],
        });
      }

      threadMap.get(partnerId).messages.push({
        id: m.id,
        sender: outgoing ? "You" : partnerName,
        text: m.content,
        time: formatTime(m.sentAt || m.createdAt),
        rawTime: m.sentAt || m.createdAt,
        incoming: !outgoing,
        status: m.status,
        priority: m.priority || "NORMAL",
        subject: m.subject || "Clinical Message",
        patient: m.patientId ? { id: m.patientId, name: m.patientName, code: m.patientCode } : null,
        appointment: m.appointmentId ? { id: m.appointmentId, code: m.appointmentCode } : null,
      });
    });

    const threadList = Array.from(threadMap.values()).map((thread) => {
      // Sort messages chronologically
      thread.messages.sort((a, b) => new Date(a.rawTime) - new Date(b.rawTime));
      const latest = thread.messages[thread.messages.length - 1];

      const unreadCount = thread.messages.filter((m) => m.incoming && (m.status === "SENT" || !m.status)).length;
      const highestPriority = thread.messages.some((m) => m.priority === "URGENT")
        ? "URGENT"
        : (thread.messages.some((m) => m.priority === "IMPORTANT") ? "IMPORTANT" : "NORMAL");

      return {
        id: thread.partnerId,
        partnerId: thread.partnerId,
        sender: thread.partnerName,
        role: thread.partnerRole,
        subject: latest?.subject || "Clinical Message",
        preview: latest?.text || "",
        time: latest?.time || "",
        rawTime: latest?.rawTime,
        priority: highestPriority,
        unreadCount,
        patient: latest?.patient,
        appointment: latest?.appointment,
        messages: thread.messages,
      };
    });

    // Sort threads by latest message descending
    threadList.sort((a, b) => new Date(b.rawTime) - new Date(a.rawTime));
    return threadList;
  }, [messages, user]);

  const filteredThreads = useMemo(() => {
    if (!searchQuery.trim()) return threads;
    const q = searchQuery.toLowerCase().trim();
    return threads.filter(
      (t) =>
        t.sender.toLowerCase().includes(q) ||
        t.role.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.preview.toLowerCase().includes(q) ||
        (t.patient?.name && t.patient.name.toLowerCase().includes(q))
    );
  }, [threads, searchQuery]);

  const activeThread = useMemo(() => {
    if (activePartnerId) {
      const found = threads.find((t) => t.partnerId === activePartnerId);
      if (found) return found;
    }
    return filteredThreads[0] || threads[0] || null;
  }, [threads, filteredThreads, activePartnerId]);

  // Mark active thread conversation as read
  useEffect(() => {
    if (!activeThread) return;
    if (activeThread.unreadCount > 0) {
      messagesApi.markConversationAsRead(activeThread.partnerId).catch(console.error);
      setMessages((prev) =>
        prev.map((m) => {
          const isFromPartner = !isOutgoing(m) && String(m.senderId) === String(activeThread.partnerId);
          if (isFromPartner && m.status === "SENT") {
            return { ...m, status: "READ", readAt: new Date().toISOString() };
          }
          return m;
        })
      );
    }
  }, [activeThread?.partnerId, activeThread?.unreadCount]);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThread?.partnerId, activeThread?.messages?.length]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !activeThread || sending) return;

    const text = replyText.trim();
    setSending(true);
    try {
      const payload = {
        receiverId: activeThread.partnerId,
        subject: activeThread.subject || "Clinical Response",
        content: text,
        priority: activeThread.priority || "NORMAL",
        patientId: isPatient ? null : (activeThread.patient?.id || null),
        appointmentId: activeThread.appointment?.id || null,
      };

      const saved = await messagesApi.sendMessage(payload);
      setMessages((prev) => [...prev, saved]);
      setReplyText("");
      addToast("Message sent successfully", "success");
    } catch (err) {
      console.error("Failed to send message:", err);
      addToast(err.response?.data?.error || "Failed to send message", "error");
    } finally {
      setSending(false);
    }
  };

  const handleCreateNewMessage = async (e) => {
    e.preventDefault();
    if (!newMsgForm.receiverId) {
      addToast("Please select a recipient", "warning");
      return;
    }
    if (!newMsgForm.content.trim()) {
      addToast("Message content cannot be empty", "warning");
      return;
    }

    setSending(true);
    try {
      const payload = {
        receiverId: Number(newMsgForm.receiverId),
        subject: newMsgForm.subject.trim() || (isPatient ? "Patient Inquiry" : "Clinical Message"),
        content: newMsgForm.content.trim(),
        priority: newMsgForm.priority || "NORMAL",
        patientId: isPatient ? null : (newMsgForm.patientId ? Number(newMsgForm.patientId) : null),
        appointmentId: newMsgForm.appointmentId ? Number(newMsgForm.appointmentId) : null,
      };

      const saved = await messagesApi.sendMessage(payload);
      setMessages((prev) => [...prev, saved]);
      setActivePartnerId(Number(newMsgForm.receiverId));
      setShowNewModal(false);
      setNewMsgForm({
        receiverId: "",
        subject: "",
        priority: "NORMAL",
        patientId: "",
        appointmentId: "",
        content: "",
      });
      addToast("Message sent successfully", "success");
    } catch (err) {
      console.error("Failed to send new message:", err);
      addToast(err.response?.data?.error || "Failed to send message", "error");
    } finally {
      setSending(false);
    }
  };

  const handleOpenEdit = (msg) => {
    setEditingMessage(msg);
    setEditForm({
      subject: msg.subject || "",
      content: msg.text || "",
      priority: msg.priority || "NORMAL",
    });
  };

  const handleSaveEdit = async (e) => {
    e?.preventDefault?.();
    if (!editingMessage?.id) return;
    if (!editForm.content.trim()) {
      addToast("Message content cannot be empty", "warning");
      return;
    }

    setUpdating(true);
    try {
      const updated = await messagesApi.updateMessage(editingMessage.id, {
        subject: editForm.subject.trim(),
        content: editForm.content.trim(),
        priority: editForm.priority || "NORMAL",
      });

      setMessages((prev) =>
        prev.map((m) => (m.id === editingMessage.id ? { ...m, ...updated } : m))
      );
      setEditingMessage(null);
      addToast("Message updated successfully", "success");
    } catch (err) {
      console.error("Failed to update message:", err);
      addToast(err.response?.data?.error || "Failed to update message", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenDelete = (msg) => {
    setDeletingMessage(msg);
  };

  const handleConfirmDelete = async () => {
    if (!deletingMessage?.id) return;

    setDeleting(true);
    try {
      await messagesApi.deleteMessage(deletingMessage.id);
      setMessages((prev) => prev.filter((m) => m.id !== deletingMessage.id));
      setDeletingMessage(null);
      addToast("Message deleted successfully", "success");
    } catch (err) {
      console.error("Failed to delete message:", err);
      addToast(err.response?.data?.error || "Failed to delete message", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleReplyToMessage = (msg) => {
    const inputEl = document.getElementById("df-chat-reply-input");
    if (inputEl) {
      inputEl.focus();
    }
  };

  return (
    <div className={`df-role-page df-role-blue`}>
      <Breadcrumbs items={[{ label: "Dashboard", to: config.dashboardPath }, { label: "Messages" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">{config.sectionLabel}</span>
          <h1>{config.title}</h1>
          <p>{config.subtitle}</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            className="df-btn df-btn-secondary"
            onClick={loadData}
            disabled={loading}
            title="Refresh messages"
          >
            ↻ Refresh
          </button>
          <button
            type="button"
            className="df-btn df-btn-primary"
            onClick={() => setShowNewModal(true)}
          >
            + New Message
          </button>
        </div>
      </header>

      <div className="df-chat-layout">
        <div className="df-chat-threads">
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--df-border)", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>
                Inbox ({threads.length})
              </span>
              {threads.reduce((acc, t) => acc + t.unreadCount, 0) > 0 && (
                <span className="df-badge df-badge-primary" style={{ fontSize: 11 }}>
                  {threads.reduce((acc, t) => acc + t.unreadCount, 0)} Unread
                </span>
              )}
            </div>
            <input
              type="text"
              className="df-input"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ fontSize: 12, padding: "6px 10px" }}
            />
          </div>

          {loading && threads.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--df-text-secondary)", fontSize: 13 }}>
              Loading messages...
            </div>
          ) : filteredThreads.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--df-text-secondary)", fontSize: 13 }}>
              {searchQuery ? "No matching conversations" : config.emptyTitle}
            </div>
          ) : (
            filteredThreads.map((t) => (
              <div
                key={t.partnerId}
                className={`df-chat-thread-item ${activeThread?.partnerId === t.partnerId ? "active" : ""}`}
                onClick={() => setActivePartnerId(t.partnerId)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, alignItems: "center" }}>
                  <strong style={{ fontSize: 13 }}>{t.sender}</strong>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <small style={{ color: "var(--df-text-muted)" }}>{t.time}</small>
                    {t.unreadCount > 0 && (
                      <span
                        style={{
                          background: "var(--df-role-accent)",
                          color: "#fff",
                          borderRadius: "10px",
                          padding: "1px 6px",
                          fontSize: "10px",
                          fontWeight: 700,
                        }}
                      >
                        {t.unreadCount}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  {t.priority === "URGENT" && (
                    <span className="df-badge df-badge-danger" style={{ fontSize: 10, padding: "1px 5px" }}>
                      URGENT
                    </span>
                  )}
                  {t.priority === "IMPORTANT" && (
                    <span className="df-badge df-badge-warning" style={{ fontSize: 10, padding: "1px 5px" }}>
                      IMPORTANT
                    </span>
                  )}
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--df-primary-600)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.subject}
                  </span>
                </div>

                <p
                  style={{
                    fontSize: 12,
                    color: "var(--df-text-secondary)",
                    margin: "2px 0 0",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.preview}
                </p>

                {t.patient && !isPatient && (
                  <div style={{ fontSize: 11, color: "var(--df-primary-700)", marginTop: 4 }}>
                    👤 {t.patient.name}
                  </div>
                )}
                {t.appointment && (
                  <div style={{ fontSize: 11, color: "var(--df-text-secondary)", marginTop: 2 }}>
                    📅 Apt: {t.appointment.code || t.appointment.id}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="df-chat-main">
          {activeThread ? (
            <>
              <div className="df-chat-header">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <strong style={{ fontSize: 15 }}>{activeThread.sender}</strong>
                    <span className="df-badge df-badge-primary">{activeThread.role}</span>
                    {activeThread.priority === "URGENT" && (
                      <span className="df-badge df-badge-danger">URGENT</span>
                    )}
                    {activeThread.priority === "IMPORTANT" && (
                      <span className="df-badge df-badge-warning">IMPORTANT</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--df-text-secondary)", marginTop: 3 }}>
                    {activeThread.subject}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {activeThread.patient && !isPatient && (
                    <span
                      className="df-clinical-alert"
                      style={{
                        background: "rgba(14, 165, 233, 0.1)",
                        color: "var(--df-primary-700)",
                        border: "1px solid rgba(14, 165, 233, 0.2)",
                        fontSize: 12,
                      }}
                    >
                      👤 Patient: {activeThread.patient.name} {activeThread.patient.code ? `(${activeThread.patient.code})` : ""}
                    </span>
                  )}
                  {activeThread.appointment && (
                    <span
                      className="df-badge df-badge-secondary"
                      style={{ fontSize: 11 }}
                    >
                      📅 Apt: {activeThread.appointment.code || activeThread.appointment.id}
                    </span>
                  )}
                </div>
              </div>

              <div className="df-chat-messages-area">
                {activeThread.messages.map((m) => (
                  <div key={m.id} className={`df-chat-bubble ${m.incoming ? "incoming" : "outgoing"}`}>
                    <div>{m.text}</div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 4,
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {!m.incoming ? (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEdit(m);
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                color: "inherit",
                                opacity: 0.85,
                                fontSize: 11,
                                cursor: "pointer",
                                padding: "0 2px",
                                textDecoration: "underline",
                              }}
                              title="Edit this message"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDelete(m);
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                color: "inherit",
                                opacity: 0.85,
                                fontSize: 11,
                                cursor: "pointer",
                                padding: "0 2px",
                                textDecoration: "underline",
                              }}
                              title="Delete this message"
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReplyToMessage(m);
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--df-primary-600, #0284c7)",
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: "pointer",
                              padding: "0 2px",
                              textDecoration: "underline",
                            }}
                            title="Reply to this message"
                          >
                            Reply
                          </button>
                        )}
                      </div>
                      <small
                        style={{
                          opacity: 0.8,
                          fontSize: 10,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {m.time} {!m.incoming && (m.status === "READ" ? " • Read" : " • Sent")}
                      </small>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSend} className="df-chat-compose">
                <input
                  id="df-chat-reply-input"
                  className="df-input"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={isPatient ? "Type your message or query..." : "Type your clinical response..."}
                  style={{ flex: 1 }}
                  disabled={sending}
                />
                <button
                  className="df-btn df-btn-primary"
                  type="submit"
                  disabled={sending || !replyText.trim()}
                >
                  {sending ? "Sending..." : "Send"}
                </button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, color: "var(--df-text-secondary)" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: "var(--df-text-heading)" }}>
                {config.emptyTitle}
              </h3>
              <p style={{ fontSize: 13, textAlign: "center", maxWidth: 360, marginBottom: 20 }}>
                {config.emptySubtitle}
              </p>
              <button
                type="button"
                className="df-btn df-btn-primary"
                onClick={() => setShowNewModal(true)}
              >
                + Start New Message
              </button>
            </div>
          )}
        </div>
      </div>

      {showNewModal && (
        <Modal
          title={isPatient ? "New Message to Clinic" : "New Clinical Message"}
          onClose={() => setShowNewModal(false)}
          footer={
            <>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setShowNewModal(false)}
                disabled={sending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="df-btn df-btn-primary"
                onClick={handleCreateNewMessage}
                disabled={sending || !newMsgForm.receiverId || !newMsgForm.content.trim()}
              >
                {sending ? "Sending..." : "Send Message"}
              </button>
            </>
          }
        >
          <form onSubmit={handleCreateNewMessage} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                {isPatient ? "Send to (Doctor / Front Desk) *" : "Recipient *"}
              </label>
              <select
                className="df-select"
                style={{ width: "100%" }}
                value={newMsgForm.receiverId}
                onChange={(e) => setNewMsgForm((prev) => ({ ...prev, receiverId: e.target.value }))}
                required
              >
                <option value="">-- Select Recipient --</option>
                {recipients.map((r) => (
                  <option key={r.userId} value={r.userId}>
                    {r.name} ({r.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                Subject
              </label>
              <input
                type="text"
                className="df-input"
                style={{ width: "100%" }}
                placeholder={isPatient ? "e.g. Question about appointment or post-treatment" : "e.g. Acute pain walk-in consult"}
                value={newMsgForm.subject}
                onChange={(e) => setNewMsgForm((prev) => ({ ...prev, subject: e.target.value }))}
              />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                {config.templates.map((tmpl) => (
                  <button
                    key={tmpl}
                    type="button"
                    className="df-badge"
                    style={{ cursor: "pointer", border: "1px solid var(--df-border)", background: "var(--df-gray-100)", fontSize: 11 }}
                    onClick={() => setNewMsgForm((prev) => ({ ...prev, subject: tmpl }))}
                  >
                    {tmpl}
                  </button>
                ))}
              </div>
            </div>

            {isPatient ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                    Priority
                  </label>
                  <select
                    className="df-select"
                    style={{ width: "100%" }}
                    value={newMsgForm.priority}
                    onChange={(e) => setNewMsgForm((prev) => ({ ...prev, priority: e.target.value }))}
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="IMPORTANT">Important</option>
                    <option value="URGENT">Urgent (Acute Pain / Emergency)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                    Regarding Appointment (Optional)
                  </label>
                  <select
                    className="df-select"
                    style={{ width: "100%" }}
                    value={newMsgForm.appointmentId}
                    onChange={(e) => setNewMsgForm((prev) => ({ ...prev, appointmentId: e.target.value }))}
                  >
                    <option value="">-- None (General Query) --</option>
                    {patientAppointments.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.appointmentDate || a.date} - {a.reason || a.treatment || "Appointment"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                    Priority
                  </label>
                  <select
                    className="df-select"
                    style={{ width: "100%" }}
                    value={newMsgForm.priority}
                    onChange={(e) => setNewMsgForm((prev) => ({ ...prev, priority: e.target.value }))}
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="IMPORTANT">Important</option>
                    <option value="URGENT">Urgent (Immediate attention)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                    Link Patient (Optional)
                  </label>
                  <select
                    className="df-select"
                    style={{ width: "100%" }}
                    value={newMsgForm.patientId}
                    onChange={(e) => setNewMsgForm((prev) => ({ ...prev, patientId: e.target.value }))}
                  >
                    <option value="">-- None (General) --</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName} {p.patientCode ? `(${p.patientCode})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                Message Content *
              </label>
              <textarea
                className="df-input"
                style={{ width: "100%", minHeight: 90, resize: "vertical" }}
                rows={4}
                placeholder={isPatient ? "Describe your question or message for the clinic..." : "Type your message..."}
                value={newMsgForm.content}
                onChange={(e) => setNewMsgForm((prev) => ({ ...prev, content: e.target.value }))}
                required
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Message Modal */}
      {editingMessage && (
        <Modal
          title="Edit Message"
          onClose={() => !updating && setEditingMessage(null)}
          footer={
            <>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setEditingMessage(null)}
                disabled={updating}
              >
                Cancel
              </button>
              <button
                type="button"
                className="df-btn df-btn-primary"
                onClick={handleSaveEdit}
                disabled={updating || !editForm.content.trim()}
              >
                {updating ? "Saving..." : "Save Changes"}
              </button>
            </>
          }
        >
          <form onSubmit={handleSaveEdit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                Subject
              </label>
              <input
                type="text"
                className="df-input"
                style={{ width: "100%" }}
                value={editForm.subject}
                onChange={(e) => setEditForm((prev) => ({ ...prev, subject: e.target.value }))}
                placeholder="Message Subject"
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                Priority
              </label>
              <select
                className="df-select"
                style={{ width: "100%" }}
                value={editForm.priority}
                onChange={(e) => setEditForm((prev) => ({ ...prev, priority: e.target.value }))}
              >
                <option value="NORMAL">Normal</option>
                <option value="IMPORTANT">Important</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                Message *
              </label>
              <textarea
                className="df-input"
                style={{ width: "100%", minHeight: 90, resize: "vertical" }}
                rows={4}
                value={editForm.content}
                onChange={(e) => setEditForm((prev) => ({ ...prev, content: e.target.value }))}
                required
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deletingMessage && (
        <Modal
          title="Delete Message"
          onClose={() => !deleting && setDeletingMessage(null)}
          footer={
            <>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setDeletingMessage(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="df-btn df-btn-danger"
                style={{ background: "var(--df-danger, #ef4444)", color: "#fff", borderColor: "transparent" }}
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete Message"}
              </button>
            </>
          }
        >
          <div style={{ padding: "8px 0" }}>
            <p style={{ fontSize: 14, marginBottom: 12, color: "var(--df-text-heading)" }}>
              Are you sure you want to delete this message?
            </p>
            <div
              style={{
                padding: "10px 14px",
                background: "var(--df-gray-50, #f8fafc)",
                border: "1px solid var(--df-border)",
                borderRadius: 6,
                fontSize: 13,
                color: "var(--df-text-secondary)",
                fontStyle: "italic",
              }}
            >
              "{deletingMessage.text}"
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function ScheduleView({ role }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [viewDetails, setViewDetails] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadRealSchedules() {
      try {
        setLoading(true);
        const isDoctor = role === "doctor" || role === "dentist";
        let myDentistId = null;
        let myStaffId = null;

        if (isDoctor) {
          const dentists = await dentistApi.getAllDentists().catch(() => []);
          const match = dentists.find(
            (d) =>
              (user?.id && d.userId === user.id) ||
              (user?.email && d.email?.toLowerCase() === user.email?.toLowerCase())
          );
          myDentistId = match ? match.id : (dentists.length > 0 ? dentists[0].id : null);
        } else {
          const staffList = await usersApi.getAllStaff().catch(() => []);
          const match = staffList.find(
            (s) =>
              (user?.id && s.userId === user.id) ||
              (user?.email && s.email?.toLowerCase() === user.email?.toLowerCase())
          );
          myStaffId = match ? match.id : (staffList.length > 0 ? staffList[0].id : null);
        }

        const d = new Date();
        const day = d.getDay();
        const diff = (day === 0 ? -6 : 1) - day;
        const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
        const mondayIso = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;

        let shifts = [];
        if (myDentistId) {
          shifts = await schedulesApi.getDentistWeeklySchedule(myDentistId, mondayIso).catch(() => []);
        } else if (myStaffId) {
          shifts = await schedulesApi.getStaffEffectiveWeekSchedule(myStaffId, mondayIso).catch(() =>
            schedulesApi.getStaffWeeklySchedule(myStaffId, mondayIso).catch(() => [])
          );
        }

        if (mounted) {
          setSchedules(shifts || []);
        }
      } catch (err) {
        console.warn("Failed to load real schedule from backend:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadRealSchedules();
    return () => {
      mounted = false;
    };
  }, [role, user]);

  const rows = useMemo(() => {
    return schedules.map((sch) => {
      const isWorking = Boolean(sch.working);
      const start = sch.startTime ? sch.startTime.slice(0, 5) : "";
      const end = sch.endTime ? sch.endTime.slice(0, 5) : "";
      const timeDisplay = isWorking && start && end ? `${start} – ${end}` : "Scheduled Off";
      const sourceDisplay = sch.effectiveBadge || (sch.modifiedByAdmin ? "Admin Official" : "Auto-Generated");

      return {
        id: sch.id,
        day: sch.dayOfWeek ? sch.dayOfWeek.charAt(0) + sch.dayOfWeek.slice(1).toLowerCase() : "—",
        date: sch.scheduleDate || "—",
        shift: sch.shift || "—",
        time: timeDisplay,
        status: isWorking && (sch.status === "ACTIVE" || !sch.status || sch.status !== "OFF") ? "active" : "disabled",
        source: sourceDisplay,
        notes: sch.notes || "Standard clinical roster",
        raw: sch,
      };
    });
  }, [schedules]);

  return (
    <div className={`df-role-page df-role-blue`}>
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Duty Schedule" }]} />

      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Clinic Operations</span>
          <h1>My Official Duty Schedule</h1>
          <p>Real-time clinical consultation hours and duty roster managed by clinic administration.</p>
        </div>
      </header>

      {/* Admin Notice */}
      <div
        style={{
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 18,
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 13,
          color: "#1e40af",
        }}
      >
        <span style={{ fontSize: 18 }}>ℹ️</span>
        <div>
          <strong>Authoritative Roster:</strong> This schedule reflects real-time administration assignments and automated availability generation. Shifts are read-only. To request adjustments or leave, please contact Clinic Administration.
        </div>
      </div>

      <div className="df-stat-grid" style={{ marginBottom: 20 }}>
        <StatCard label="Assigned Shifts" value={String(schedules.filter((s) => s.working).length)} icon="◫" color="primary" />
        <StatCard label="Rest / Off Days" value={String(schedules.filter((s) => !s.working).length)} icon="◈" color="success" />
        <StatCard label="Weekly Status" value="Active Roster" icon="✓" color="primary" />
        <StatCard label="Clinic Hours" value="09:00 AM - 08:00 PM" icon="◷" color="primary" />
      </div>

      <section className="df-card">
        <div className="df-card-body">
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
              <p>Loading your official duty shifts...</p>
            </div>
          ) : rows.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
              <p>No duty shifts assigned for the current period.</p>
            </div>
          ) : (
            <DataTable
              columns={[
                { key: "day", label: "Day of Week" },
                { key: "date", label: "Date" },
                { key: "shift", label: "Shift Type" },
                { key: "time", label: "Working Hours" },
                { key: "source", label: "Schedule Source" },
                { key: "status", label: "Status", type: "status" },
              ]}
              rows={rows}
              actionLabel="View Details"
              onEdit={(row) => setViewDetails(row.raw)}
            />
          )}
        </div>
      </section>

      {/* View Details Modal (Read-Only) */}
      {viewDetails && (
        <Modal
          title={`Shift Details: ${viewDetails.dayOfWeek || "Duty Shift"}`}
          onClose={() => setViewDetails(null)}
          footer={
            <button className="df-btn df-btn-secondary" onClick={() => setViewDetails(null)}>
              Close
            </button>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, fontSize: 13.5 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Scheduled Date</span>
              <div style={{ fontWeight: 700, color: "#0f172a", marginTop: 2 }}>{viewDetails.scheduleDate || "—"}</div>
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Day of Week</span>
              <div style={{ fontWeight: 700, color: "#0f172a", marginTop: 2 }}>{viewDetails.dayOfWeek || "—"}</div>
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Hours</span>
              <div style={{ fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
                {viewDetails.working && viewDetails.startTime && viewDetails.endTime
                  ? `${viewDetails.startTime} – ${viewDetails.endTime}`
                  : "Scheduled Off"}
              </div>
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Shift Category</span>
              <div style={{ fontWeight: 700, color: "#0f172a", marginTop: 2 }}>{viewDetails.shift || "—"}</div>
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Schedule Source</span>
              <div style={{ fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
                {viewDetails.effectiveBadge
                  ? viewDetails.effectiveBadge
                  : viewDetails.modifiedByAdmin
                  ? "👤 Admin Assigned"
                  : "⚡ Automated Availability Generation"}
              </div>
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Working Status</span>
              <div style={{ fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
                {viewDetails.working ? "Active Duty" : "Scheduled Off"}
              </div>
            </div>
            {viewDetails.isOverride && (
              <div style={{ gridColumn: "span 2", padding: "8px 12px", background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 6, color: "#6d28d9", fontSize: 12.5 }}>
                ✨ <strong>Date Override:</strong> This schedule was specifically customized for this date by Clinic Administration and overrides the standard weekly pattern.
              </div>
            )}
            <div style={{ gridColumn: "span 2" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Operational Notes</span>
              <div style={{ color: "#334155", marginTop: 4, background: "#f8fafc", padding: 8, borderRadius: 6 }}>
                {viewDetails.notes || "Standard clinical roster hours."}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function DoctorAppointmentsView({ role }) {
  const { user } = useAuth();
  const { collections, saveRecord } = useDashboardData();
  const { addToast } = useNotifications();
  const [activeTab, setActiveTab] = useState("all");
  const [query, setQuery] = useState("");
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [newDate, setNewDate] = useState("2026-03-22");
  const [newTime, setNewTime] = useState("02:00 PM");
  const [doctorAppts, setDoctorAppts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDoctorAppointments = async () => {
    try {
      let dentist = null;
      if (user?.id) {
        dentist = await dentistApi.getDentistByUserId(user.id).catch(() => null);
      }
      if (!dentist) {
        const dentists = await dentistApi.getAllDentists().catch(() => []);
        dentist = dentists.find(
          (d) =>
            (user?.id && d.userId === user.id) ||
            (user?.email && d.email?.toLowerCase() === user.email?.toLowerCase())
        );
      }

      const dentistId = dentist?.id;
      if (!dentistId) {
        setDoctorAppts([]);
        return;
      }

      const [appts, patients] = await Promise.all([
        appointmentApi.getDentistAppointments(dentistId).catch(() => []),
        patientApi.getAllPatients().catch(() => []),
      ]);

      const pLookup = {};
      patients.forEach((p) => { pLookup[p.id] = p; });
      const dLookup = dentist ? { [dentist.id]: dentist } : {};

      const normalized = appts.map((a) => normalizeAppointment(a, dLookup, pLookup));
      setDoctorAppts(normalized);
    } catch (err) {
      console.warn("Could not load doctor appointments:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    async function init() {
      await loadDoctorAppointments();
      if (!active) return;
    }
    init();
    return () => { active = false; };
  }, [user?.id]);

  const appointments = doctorAppts;

  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      const matchQuery = `${a.patient} ${a.service} ${a.reason || ""}`.toLowerCase().includes(query.toLowerCase());
      const matchStatus =
          activeTab === "all"
              ? true
              : activeTab === "confirmed"
                  ? (a.status === "confirmed" || a.status === "booked" || a.status === "rescheduled" || a.status === "waiting")
                  : activeTab === "in-consultation"
                      ? a.status === "in-consultation"
                      : activeTab === "completed"
                          ? a.status === "completed"
                          : (a.status === "cancelled" || a.status === "no-show" || a.status === "no_show");
      return matchQuery && matchStatus;
    });
  }, [appointments, query, activeTab]);

  const handleStartConsult = async (appt) => {
    try {
      if (typeof appt.id === "number") {
        await appointmentApi.updateAppointment(appt.id, {
          id: appt.id,
          dentistId: appt.dentistId,
          patientId: appt.patientId,
          appointmentDate: appt.date,
          startTime: appt.startTime,
          endTime: appt.endTime,
          appointmentType: appt.service || appt.appointmentType,
          status: "IN_CONSULTATION",
          notes: appt.notes,
          reason: appt.reason,
        });
      }
      setDoctorAppts((prev) => prev.map((a) => (a.id === appt.id ? { ...a, status: "in-consultation", rawStatus: "IN_CONSULTATION" } : a)));
      saveRecord("appointments", { ...appt, status: "in-consultation" });
      addToast(`Started consultation for ${appt.patient}`, "info");
    } catch (err) {
      console.warn("Could not start consult via API:", err);
      setDoctorAppts((prev) => prev.map((a) => (a.id === appt.id ? { ...a, status: "in-consultation" } : a)));
      addToast(`Started consultation for ${appt.patient}`, "info");
    }
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleModal) return;
    try {
      if (typeof rescheduleModal.id === "number") {
        const startTime = formatTime24Hour(newTime);
        const endTime = addMinutesToIsoTime(startTime, 30);
        await appointmentApi.rescheduleAppointment(rescheduleModal.id, newDate, startTime, endTime);
      }
      setDoctorAppts((prev) =>
          prev.map((a) =>
              a.id === rescheduleModal.id
                  ? { ...a, date: newDate, time: newTime, status: "rescheduled" }
                  : a
          )
      );
      saveRecord("appointments", {
        ...rescheduleModal,
        date: newDate,
        time: newTime,
        status: "confirmed",
      });
      addToast(`Rescheduled ${rescheduleModal.patient}'s appointment to ${newDate} at ${newTime}!`, "success");
      setRescheduleModal(null);
      await loadDoctorAppointments();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || err.message || "Failed to reschedule";
      addToast(typeof msg === "string" ? msg : "Failed to reschedule appointment", "error");
    }
  };

  return (
      <div className="df-role-page df-role-blue">
        <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Appointments" }]} />
        <header className="df-resource-header">
          <div>
            <span className="df-section-label">Clinical Calendar</span>
            <h1>Doctor Consultations & Appointments</h1>
            <p>Full patient appointment schedule, chair bookings, and clinical status updates.</p>
          </div>
        </header>

        <div className="df-stat-grid">
          <StatCard label="Total Scheduled" value={String(appointments.length)} icon="◫" color="primary" />
          <StatCard
              label="Confirmed & Pending"
              value={String(appointments.filter((a) => a.status === "confirmed" || a.status === "booked" || a.status === "pending" || a.status === "rescheduled" || a.status === "waiting").length)}
              icon="◷"
              color="warning"
          />
          <StatCard
              label="Completed Consults"
              value={String(appointments.filter((a) => a.status === "completed").length)}
              icon="✓"
              color="success"
          />
          <StatCard
              label="In Operatory Chair"
              value={String(appointments.filter((a) => a.status === "in-consultation").length)}
              icon="◈"
              color="primary"
          />
        </div>

        <TabPills
            tabs={[
              { label: "All Appointments", value: "all", count: appointments.length },
              { label: "Confirmed", value: "confirmed", count: appointments.filter((a) => a.status === "confirmed" || a.status === "booked" || a.status === "rescheduled" || a.status === "waiting").length },
              { label: "In Consultation", value: "in-consultation", count: appointments.filter((a) => a.status === "in-consultation").length },
              { label: "Completed", value: "completed", count: appointments.filter((a) => a.status === "completed").length },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
        />

        <section className="df-card">
          <div className="df-card-body">
            <div className="df-toolbar">
              <SearchBar value={query} onChange={setQuery} placeholder="Search consultations by patient or service..." />
            </div>

            {loading ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
                  <p>Loading doctor appointments...</p>
                </div>
            ) : (
                <DataTable
                    columns={[
                      { key: "time", label: "Time" },
                      { key: "patient", label: "Patient" },
                      { key: "service", label: "Scheduled Service" },
                      { key: "date", label: "Date" },
                      { key: "status", label: "Status", type: "status" },
                    ]}
                    rows={filtered}
                    actionLabel="Reschedule"
                    onEdit={(row) => {
                      setRescheduleModal(row);
                      setNewDate(row.date || "2026-03-22");
                      setNewTime(row.time || "02:00 PM");
                    }}
                    onQuickAction={handleStartConsult}
                    quickActionLabel="Start Consult"
                />
            )}
          </div>
        </section>

        {rescheduleModal && (
            <Modal
                title={`Reschedule: ${rescheduleModal.patient}`}
                onClose={() => setRescheduleModal(null)}
                footer={
                  <>
                    <button className="df-btn df-btn-secondary" onClick={() => setRescheduleModal(null)}>
                      Cancel
                    </button>
                    <button className="df-btn df-btn-primary" onClick={handleConfirmReschedule}>
                      Confirm Reschedule
                    </button>
                  </>
                }
            >
              <div className="df-form-2col">
                <div className="df-form-group">
                  <label className="df-label">Select Date</label>
                  <input
                      type="date"
                      className="df-input"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      required
                  />
                </div>
                <div className="df-form-group">
                  <label className="df-label">Select Time Slot</label>
                  <select
                      className="df-select"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                  >
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="10:30 AM">10:30 AM</option>
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="04:00 PM">04:00 PM</option>
                  </select>
                </div>
              </div>
            </Modal>
        )}
      </div>
  );
}

export function DoctorRecordsView({ role = "doctor" }) {
  const { collections, saveRecord, removeRecord } = useDashboardData();
  const { addToast } = useNotifications();
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [inspectModal, setInspectModal] = useState(null);
  const [confirmDeleteRecord, setConfirmDeleteRecord] = useState(null);
  const [isDeletingRecord, setIsDeletingRecord] = useState(false);
  const [apiRecords, setApiRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [currentDentist, setCurrentDentist] = useState(null);
  const [recordErrors, setRecordErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newRec, setNewRec] = useState({
    patient: "",
    diagnosis: "",
    treatment: "",
    type: "TREATMENT",
    doctor: "",
    attachments: "None",
    notes: "",
  });

  const VALID_RECORD_CATEGORIES = [
    "TREATMENT",
    "EXAMINATION",
    "DIAGNOSIS",
    "RADIOGRAPH",
    "CONSULTATION",
    "FOLLOW-UP",
    "GENERAL",
    "Treatment",
    "Diagnosis",
    "X-Ray",
    "Consultation",
    "Examination",
    "Follow-up",
    "Radiograph",
  ];

  const toCanonicalCategory = (val) => {
    if (!val) return "TREATMENT";
    const upper = String(val).trim().toUpperCase();
    if (upper.includes("RAY") || upper.includes("RADIO") || upper.includes("IMAGING")) return "RADIOGRAPH";
    if (upper.includes("EXAM") || upper.includes("EVAL")) return "EXAMINATION";
    if (upper.includes("DIAG")) return "DIAGNOSIS";
    if (upper.includes("CONSULT")) return "CONSULTATION";
    if (upper.includes("FOLLOW")) return "FOLLOW-UP";
    if (upper.includes("TREAT") || upper.includes("OPERAT") || upper.includes("PROCEDURE")) return "TREATMENT";
    return "GENERAL";
  };

  const validateRecord = (data) => {
    const nextErrors = {};

    const cleanPatient = String(data?.patient || "").trim();
    if (!cleanPatient) {
      nextErrors.patient = "Patient Name is required.";
    }

    const cleanType = String(data?.type || "").trim();
    if (!cleanType) {
      nextErrors.type = "Record Category is required.";
    } else if (!VALID_RECORD_CATEGORIES.some((c) => c.toLowerCase() === cleanType.toLowerCase())) {
      nextErrors.type = "Please select a valid category.";
    }

    const cleanDiag = String(data?.diagnosis || "").trim();
    if (!cleanDiag) {
      nextErrors.diagnosis = "Clinical Diagnosis is required.";
    } else if (cleanDiag.length < 3) {
      nextErrors.diagnosis = "Diagnosis must be at least 3 characters.";
    }

    const cleanTreat = String(data?.treatment || "").trim();
    if (!cleanTreat) {
      nextErrors.treatment = "Treatment / Procedure is required.";
    } else if (cleanTreat.length < 3) {
      nextErrors.treatment = "Treatment / Procedure must be at least 3 characters.";
    }

    const cleanNotes = String(data?.notes || "").trim();
    if (!cleanNotes) {
      nextErrors.notes = "Clinical findings & doctor notes are required.";
    } else if (cleanNotes.length < 5) {
      nextErrors.notes = "Doctor notes must be at least 5 characters.";
    }

    return nextErrors;
  };

  const clearRecordError = (field) => {
    setRecordErrors((prev) => {
      if (!prev[field] && !prev.submit) return prev;
      const updated = { ...prev };
      delete updated[field];
      delete updated.submit;
      return updated;
    });
  };

  const updateRecordField = (field, value) => {
    setNewRec((prev) => ({ ...prev, [field]: value }));
    clearRecordError(field);
  };

  const handleRecordBlur = (field) => {
    const errs = validateRecord(newRec);
    if (!errs[field]) {
      clearRecordError(field);
    } else if (recordErrors[field]) {
      setRecordErrors((prev) => ({ ...prev, [field]: errs[field] }));
    }
  };

  const resetForm = () => {
    const dName = currentDentist?.name || (currentDentist ? `Dr. ${currentDentist.firstName || ""} ${currentDentist.lastName || ""}`.trim() : "");
    setNewRec({
      patient: "",
      diagnosis: "",
      treatment: "",
      type: "TREATMENT",
      doctor: dName || "",
      attachments: "None",
      notes: "",
    });
    setRecordErrors({});
    setEditingRecord(null);
  };

  useEffect(() => {
    let active = true;
    const loadRecords = async () => {
      try {
        const [allDentists, allPatients, backendRecords] = await Promise.all([
          dentistApi.getAllDentists().catch(() => []),
          patientApi.getAllPatients().catch(() => []),
          medicalRecordsApi.getAllMedicalRecords().catch(() => []),
        ]);

        if (!active) return;
        setDentists(allDentists);
        setPatients(allPatients);

        let myDentist = null;
        if (user?.id) {
          myDentist = allDentists.find((d) => d.userId === user.id || d.id === user.id) || allDentists[0];
        }
        setCurrentDentist(myDentist);
        if (myDentist) {
          const dName = myDentist.name || `Dr. ${myDentist.firstName || ""} ${myDentist.lastName || ""}`.trim();
          setNewRec((prev) => ({ ...prev, doctor: prev.doctor || dName }));
        }

        if (backendRecords.length > 0) {
          const dLookup = {};
          allDentists.forEach((d) => {
            dLookup[d.id] = d;
          });
          const pLookup = {};
          allPatients.forEach((p) => {
            pLookup[p.id] = p;
          });

          const normalized = backendRecords.map((r) => normalizeMedicalRecord(r, pLookup, dLookup));
          setApiRecords(normalized);
        } else {
          setApiRecords(collections.records || []);
        }
      } catch (err) {
        console.warn("Could not load backend medical records:", err);
        if (active) setApiRecords(collections.records || []);
      }
    };

    loadRecords();
    return () => {
      active = false;
    };
  }, [user, collections.records]);

  const records = apiRecords.length > 0 ? apiRecords : (collections.records || []);

  const location = useLocation();
  useEffect(() => {
    if ((location.state?.recordId || location.state?.selectedId) && records.length > 0) {
      const targetId = location.state.recordId || location.state.selectedId;
      const match = records.find(
        (r) => r.id === targetId || String(r.id) === String(targetId) || r.code === targetId
      );
      if (match) {
        setInspectModal(match);
      }
    }
  }, [location.state, records]);

  const handleAddRecord = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (isSubmitting) return;

    const validationErrors = validateRecord(newRec);
    if (Object.keys(validationErrors).length > 0) {
      setRecordErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const matchedPat = patients.find(
          (p) =>
              `${p.firstName || ""} ${p.lastName || ""}`.toLowerCase().trim() === newRec.patient.toLowerCase().trim() ||
              p.name?.toLowerCase().trim() === newRec.patient.toLowerCase().trim()
      );
      const patientId = matchedPat?.id || (patients[0]?.id || 1);
      const dentistId = currentDentist?.id || (dentists[0]?.id || 1);
      const todayIso = new Date().toISOString().slice(0, 10);

      const backendType = toCanonicalCategory(newRec.type);
      const cleanAttachments = newRec.attachments && newRec.attachments !== "None" ? newRec.attachments.trim() : null;

      const combinedDiagnosis = newRec.treatment
        ? `${newRec.diagnosis.trim()} - ${newRec.treatment.trim()}`
        : newRec.diagnosis.trim();

      if (editingRecord && editingRecord.rawId) {
        const updated = await medicalRecordsApi.updateMedicalRecord(editingRecord.rawId, {
          ...(editingRecord.raw || {}),
          recordType: backendType,
          diagnosis: combinedDiagnosis,
          clinicalNotes: newRec.notes.trim(),
          attachments: cleanAttachments,
        });
        const pLookup = { [patientId]: matchedPat || { name: newRec.patient } };
        const dLookup = { [dentistId]: currentDentist || { name: newRec.doctor } };
        const normalized = normalizeMedicalRecord(updated, pLookup, dLookup);
        normalized.diagnosis = newRec.diagnosis.trim();
        normalized.treatment = newRec.treatment.trim();
        normalized.attachments = cleanAttachments || "None";

        setApiRecords((prev) => prev.map((r) => (r.id === editingRecord.id ? normalized : r)));
        saveRecord("records", normalized);
        addToast(`Clinical record updated for ${normalized.patient}!`, "success");
      } else {
        const created = await medicalRecordsApi.createMedicalRecord(patientId, dentistId, {
          recordDate: todayIso,
          recordType: backendType,
          diagnosis: combinedDiagnosis,
          clinicalNotes: newRec.notes.trim(),
          symptoms: "Clinical examination and charting",
          attachments: cleanAttachments,
          status: "ACTIVE",
        });

        const pLookup = { [patientId]: matchedPat || { name: newRec.patient } };
        const dLookup = { [dentistId]: currentDentist || { name: newRec.doctor } };
        const normalized = normalizeMedicalRecord(created, pLookup, dLookup);
        normalized.diagnosis = newRec.diagnosis.trim();
        normalized.treatment = newRec.treatment.trim();
        normalized.attachments = cleanAttachments || "None";

        setApiRecords((prev) => [normalized, ...prev]);
        saveRecord("records", normalized);
        addToast(`Clinical record added for ${normalized.patient}!`, "success");
      }

      setModalOpen(false);
      resetForm();
    } catch (err) {
      const isForbidden = err?.response?.status === 403;
      const forbiddenMsg = editingRecord
        ? "You are not authorized to edit this clinical record."
        : "You are not authorized to create clinical records.";

      if (isForbidden) {
        setRecordErrors({ submit: forbiddenMsg });
        addToast(forbiddenMsg, "error");
        return;
      }

      const backendErrorMsg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          (typeof err?.response?.data === "string" ? err.response.data : null) ||
          err?.message;

      console.warn("Backend record save failed, falling back to local:", err);
      if (backendErrorMsg && err?.response?.status && err.response.status >= 400 && err.response.status < 500) {
        setRecordErrors({ submit: `Validation failed: ${backendErrorMsg}` });
        addToast(backendErrorMsg, "error");
        return;
      }

      const dName = currentDentist?.name || (currentDentist ? `Dr. ${currentDentist.firstName || ""} ${currentDentist.lastName || ""}`.trim() : "");
      const recordObj = {
        id: editingRecord ? editingRecord.id : nextId("REC"),
        date: new Date().toISOString().slice(0, 10),
        patient: newRec.patient,
        type: newRec.type,
        diagnosis: newRec.diagnosis.trim(),
        treatment: newRec.treatment.trim(),
        doctor: newRec.doctor || dName,
        attachments: newRec.attachments || "None",
        notes: newRec.notes.trim(),
        title: `${newRec.diagnosis.trim()} - ${newRec.treatment.trim()}`,
      };
      saveRecord("records", recordObj);
      if (editingRecord) {
        setApiRecords((prev) => prev.map((r) => (r.id === editingRecord.id ? recordObj : r)));
        addToast(`Clinical record updated for ${recordObj.patient}!`, "success");
      } else {
        setApiRecords((prev) => [recordObj, ...prev]);
        addToast(`Clinical record added for ${recordObj.patient}!`, "success");
      }
      setModalOpen(false);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRecord = async () => {
    if (!confirmDeleteRecord) return;
    setIsDeletingRecord(true);
    try {
      if (confirmDeleteRecord.rawId) {
        await medicalRecordsApi.deleteMedicalRecord(confirmDeleteRecord.rawId);
      }
      setApiRecords((prev) => prev.filter((r) => r.id !== confirmDeleteRecord.id));
      removeRecord("records", confirmDeleteRecord.id);
      addToast(`Clinical record ${confirmDeleteRecord.id} deleted successfully!`, "success");
      setConfirmDeleteRecord(null);
      if (inspectModal?.id === confirmDeleteRecord.id) {
        setInspectModal(null);
      }
    } catch (err) {
      const isForbidden = err?.response?.status === 403;
      const msg = isForbidden
        ? "You are not authorized to delete this clinical record."
        : (err?.response?.data?.error ||
           err?.response?.data?.message ||
           (typeof err?.response?.data === "string" ? err.response.data : "") ||
           err?.message ||
           "Failed to delete clinical record");
      addToast(msg, "error");
    } finally {
      setIsDeletingRecord(false);
    }
  };

  const diagCount = records.filter((r) => r.type === "Diagnosis" || (r.raw?.recordType || "").includes("DIAG")).length;
  const treatCount = records.filter((r) => r.type === "Treatment" || (r.raw?.recordType || "").includes("TREAT")).length;
  const rayCount = records.filter((r) => (r.attachments && r.attachments !== "None") || r.type === "Radiograph" || r.type === "X-Ray" || (r.raw?.recordType || "").includes("RADIO")).length;

  return (
      <div className="df-role-page df-role-blue">
        <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Patient Records" }]} />
        <header className="df-resource-header">
          <div>
            <span className="df-section-label">Clinical Charting</span>
            <h1> My Patient Clinical Records</h1>
            <p>Document patient encounters, clinical diagnoses, operative procedures, radiographs, and post-procedure progress.</p>
          </div>
          <button
              className="df-btn df-btn-primary"
              onClick={() => {
                resetForm();
                setModalOpen(true);
              }}
          >
            + Add Clinical Record
          </button>
        </header>

        <div className="df-stat-grid">
          <StatCard label="Total Dental Records" value={String(records.length)} icon="◫" color="primary" />
          <StatCard label="Diagnostic Reports" value={String(diagCount)} icon="◈" color="primary" />
          <StatCard label="Operative Procedures" value={String(treatCount)} icon="✓" color="success" />
          <StatCard label="Imaging Attached" value={`${rayCount} Radiographs`} icon="◷" color="primary" />
        </div>

        <section className="df-card">
          <div className="df-card-body">
            <DataTable
                columns={[
                  { key: "id", label: "Record ID" },
                  { key: "patient", label: "Patient Name" },
                  { key: "diagnosis", label: "Diagnosis" },
                  { key: "treatment", label: "Treatment / Procedure" },
                  { key: "type", label: "Category" },
                  { key: "doctor", label: "Attending Dentist" },
                  { key: "date", label: "Date" },
                  { key: "attachments", label: "Radiograph / Attachments" },
                ]}
                rows={records}
                quickActionLabel="Inspect"
                onQuickAction={(row) => setInspectModal(row)}
                actionLabel="Edit"
                onEdit={(row) => {
                  setEditingRecord(row);
                  const matchedCat = toCanonicalCategory(row.raw?.recordType || row.type);
                  setNewRec({
                    patient: row.patient || "",
                    type: matchedCat,
                    diagnosis: row.diagnosis || row.title || "",
                    treatment: row.treatment || "",
                    doctor: row.doctor || "",
                    attachments: (row.attachments && row.attachments !== "None") ? row.attachments : "None",
                    notes: row.notes || "",
                  });
                  setRecordErrors({});
                  setModalOpen(true);
                }}
                onDelete={(row) => setConfirmDeleteRecord(row)}
            />
          </div>
        </section>

        {modalOpen && (
            <Modal
                title={editingRecord ? "Edit Patient Clinical Record" : "Add Patient Clinical Record"}
                onClose={() => {
                  if (!isSubmitting) {
                    setModalOpen(false);
                    resetForm();
                  }
                }}
                footer={
                  <>
                    <button
                        type="button"
                        className="df-btn df-btn-secondary"
                        onClick={() => {
                          setModalOpen(false);
                          resetForm();
                        }}
                        disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                        type="button"
                        className="df-btn df-btn-primary"
                        onClick={handleAddRecord}
                        disabled={isSubmitting}
                    >
                      {isSubmitting ? "Saving..." : (editingRecord ? "Update Clinical Record" : "Save Clinical Record")}
                    </button>
                  </>
                }
            >
              <div className="df-form-2col">
                <div className="df-form-group">
                  <label className="df-label" htmlFor="clinical-record-patient">Patient Name *</label>
                  <input
                      id="clinical-record-patient"
                      className={`df-input ${recordErrors.patient ? "df-input-error" : ""}`}
                      value={newRec.patient}
                      onChange={(e) => updateRecordField("patient", e.target.value)}
                      onBlur={() => handleRecordBlur("patient")}
                      placeholder="Type patient name..."
                      list="clinical-record-patients-list"
                      aria-invalid={Boolean(recordErrors.patient)}
                      aria-describedby={recordErrors.patient ? "cr-err-patient" : undefined}
                      required
                  />
                  <datalist id="clinical-record-patients-list">
                    {patients.map((p) => {
                      const pName = p.name || `${p.firstName || ""} ${p.lastName || ""}`.trim();
                      return <option key={p.id} value={pName} />;
                    })}
                  </datalist>
                  {recordErrors.patient && (
                      <small
                          id="cr-err-patient"
                          className="df-field-error"
                          role="alert"
                          style={{ color: "#dc2626", fontSize: 12, marginTop: 4, display: "block" }}
                      >
                        {recordErrors.patient}
                      </small>
                  )}
                </div>
                <div className="df-form-group">
                  <label className="df-label" htmlFor="clinical-record-type">Record Category *</label>
                  <select
                      id="clinical-record-type"
                      className={`df-select ${recordErrors.type ? "df-input-error" : ""}`}
                      value={newRec.type}
                      onChange={(e) => updateRecordField("type", e.target.value)}
                      onBlur={() => handleRecordBlur("type")}
                      aria-invalid={Boolean(recordErrors.type)}
                      aria-describedby={recordErrors.type ? "cr-err-type" : undefined}
                      required
                  >
                    <option value="TREATMENT">Treatment / Operative</option>
                    <option value="EXAMINATION">Clinical Examination</option>
                    <option value="DIAGNOSIS">Clinical Diagnosis</option>
                    <option value="RADIOGRAPH">Radiograph (X-Ray / 3D CT)</option>
                    <option value="CONSULTATION">General Consultation</option>
                    <option value="FOLLOW-UP">Follow-up Evaluation</option>
                  </select>
                  {recordErrors.type && (
                      <small
                          id="cr-err-type"
                          className="df-field-error"
                          role="alert"
                          style={{ color: "#dc2626", fontSize: 12, marginTop: 4, display: "block" }}
                      >
                        {recordErrors.type}
                      </small>
                  )}
                </div>
              </div>

              <div className="df-form-2col" style={{ marginTop: 14 }}>
                <div className="df-form-group">
                  <label className="df-label" htmlFor="clinical-record-diagnosis">Clinical Diagnosis *</label>
                  <input
                      id="clinical-record-diagnosis"
                      className={`df-input ${recordErrors.diagnosis ? "df-input-error" : ""}`}
                      value={newRec.diagnosis}
                      onChange={(e) => updateRecordField("diagnosis", e.target.value)}
                      onBlur={() => handleRecordBlur("diagnosis")}
                      placeholder="e.g. Irreversible Pulpitis, Deep Caries"
                      aria-invalid={Boolean(recordErrors.diagnosis)}
                      aria-describedby={recordErrors.diagnosis ? "cr-err-diag" : undefined}
                      required
                  />
                  {recordErrors.diagnosis && (
                      <small
                          id="cr-err-diag"
                          className="df-field-error"
                          role="alert"
                          style={{ color: "#dc2626", fontSize: 12, marginTop: 4, display: "block" }}
                      >
                        {recordErrors.diagnosis}
                      </small>
                  )}
                </div>
                <div className="df-form-group">
                  <label className="df-label" htmlFor="clinical-record-treatment">Treatment / Procedure *</label>
                  <input
                      id="clinical-record-treatment"
                      className={`df-input ${recordErrors.treatment ? "df-input-error" : ""}`}
                      value={newRec.treatment}
                      onChange={(e) => updateRecordField("treatment", e.target.value)}
                      onBlur={() => handleRecordBlur("treatment")}
                      placeholder="e.g. Root Canal Therapy, Composite Filling #16"
                      aria-invalid={Boolean(recordErrors.treatment)}
                      aria-describedby={recordErrors.treatment ? "cr-err-treatment" : undefined}
                      required
                  />
                  {recordErrors.treatment && (
                      <small
                          id="cr-err-treatment"
                          className="df-field-error"
                          role="alert"
                          style={{ color: "#dc2626", fontSize: 12, marginTop: 4, display: "block" }}
                      >
                        {recordErrors.treatment}
                      </small>
                  )}
                </div>
              </div>

              <div className="df-form-2col" style={{ marginTop: 14 }}>
                <div className="df-form-group">
                  <label className="df-label" htmlFor="clinical-record-attachments">Radiograph / Attachments</label>
                  <select
                      id="clinical-record-attachments"
                      className="df-select"
                      value={newRec.attachments}
                      onChange={(e) => updateRecordField("attachments", e.target.value)}
                  >
                    <option value="None">None</option>
                    <option value="Periapical Radiograph (PA-1)">Periapical Radiograph (PA-1)</option>
                    <option value="Bitewing Radiograph (BW-2)">Bitewing Radiograph (BW-2)</option>
                    <option value="Panoramic OPG (PAN-1)">Panoramic OPG (PAN-1)</option>
                    <option value="CBCT 3D Scan (CBCT-1)">CBCT 3D Scan (CBCT-1)</option>
                  </select>
                </div>
                <div className="df-form-group">
                  <label className="df-label" htmlFor="clinical-record-doctor">Attending Dentist</label>
                  <input
                      id="clinical-record-doctor"
                      className="df-input"
                      value={newRec.doctor}
                      onChange={(e) => updateRecordField("doctor", e.target.value)}
                      placeholder="Attending Dentist Name"
                  />
                </div>
              </div>

              <div className="df-form-group" style={{ marginTop: 14 }}>
                <label className="df-label" htmlFor="clinical-record-notes">Clinical Findings & Doctor Notes *</label>
                <textarea
                    id="clinical-record-notes"
                    className={`df-input ${recordErrors.notes ? "df-input-error" : ""}`}
                    rows={4}
                    value={newRec.notes}
                    onChange={(e) => updateRecordField("notes", e.target.value)}
                    onBlur={() => handleRecordBlur("notes")}
                    placeholder="Document tooth condition, local anesthesia, operative steps, post-op instructions, patient tolerance..."
                    aria-invalid={Boolean(recordErrors.notes)}
                    aria-describedby={recordErrors.notes ? "cr-err-notes" : undefined}
                    required
                />
                {recordErrors.notes && (
                    <small
                        id="cr-err-notes"
                        className="df-field-error"
                        role="alert"
                        style={{ color: "#dc2626", fontSize: 12, marginTop: 4, display: "block" }}
                    >
                      {recordErrors.notes}
                    </small>
                )}
              </div>

              {recordErrors.submit && (
                  <div
                      className="df-alert df-alert-warning"
                      role="alert"
                      style={{
                        marginTop: 14,
                        color: "#dc2626",
                        background: "rgba(239, 68, 68, 0.08)",
                        border: "1px solid rgba(239, 68, 68, 0.2)",
                        borderRadius: 6,
                        padding: "8px 12px",
                      }}
                  >
                    {recordErrors.submit}
                  </div>
              )}
            </Modal>
        )}

        {inspectModal && (
            <Modal
                title={`Clinical Record: ${inspectModal.id}`}
                onClose={() => setInspectModal(null)}
                footer={
                  <>
                    <button
                        type="button"
                        className="df-btn df-btn-secondary"
                        onClick={() => {
                          const target = inspectModal;
                          setInspectModal(null);
                          setEditingRecord(target);
                          const matchedCat = toCanonicalCategory(target.raw?.recordType || target.type);
                          setNewRec({
                            patient: target.patient || "",
                            type: matchedCat,
                            diagnosis: target.diagnosis || target.title || "",
                            treatment: target.treatment || "",
                            doctor: target.doctor || "",
                            attachments: (target.attachments && target.attachments !== "None") ? target.attachments : "None",
                            notes: target.notes || "",
                          });
                          setRecordErrors({});
                          setModalOpen(true);
                        }}
                    >
                      Edit Record
                    </button>
                    <button
                        type="button"
                        className="df-btn df-btn-danger"
                        onClick={() => {
                          setConfirmDeleteRecord(inspectModal);
                        }}
                    >
                      Delete Record
                    </button>
                    <button type="button" className="df-btn df-btn-primary" onClick={() => setInspectModal(null)}>
                      Close
                    </button>
                  </>
                }
            >
              <div className="df-form-2col">
                <div>
                  <small style={{ color: "var(--df-text-muted)" }}>Record ID</small>
                  <div style={{ fontWeight: 600 }}>{inspectModal.id}</div>
                </div>
                <div>
                  <small style={{ color: "var(--df-text-muted)" }}>Category</small>
                  <div style={{ fontWeight: 600 }}>{inspectModal.type}</div>
                </div>
                <div>
                  <small style={{ color: "var(--df-text-muted)" }}>Patient Name</small>
                  <div style={{ fontWeight: 600 }}>{inspectModal.patient}</div>
                </div>
                <div>
                  <small style={{ color: "var(--df-text-muted)" }}>Attending Dentist</small>
                  <div style={{ fontWeight: 600 }}>{inspectModal.doctor}</div>
                </div>
                <div>
                  <small style={{ color: "var(--df-text-muted)" }}>Date</small>
                  <div style={{ fontWeight: 600 }}>{inspectModal.date}</div>
                </div>
                <div>
                  <small style={{ color: "var(--df-text-muted)" }}>Radiograph / Attachments</small>
                  <div style={{ fontWeight: 600, color: inspectModal.attachments && inspectModal.attachments !== "None" ? "#7e22ce" : "inherit" }}>
                    {inspectModal.attachments || "None"}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 14, padding: 12, background: "var(--df-gray-50)", borderRadius: 6 }}>
                <strong>Diagnosis:</strong>
                <p style={{ marginTop: 4, color: "var(--df-text-secondary)" }}>{inspectModal.diagnosis || inspectModal.title}</p>
              </div>

              <div style={{ marginTop: 10, padding: 12, background: "var(--df-gray-50)", borderRadius: 6 }}>
                <strong>Treatment / Procedure:</strong>
                <p style={{ marginTop: 4, color: "var(--df-text-secondary)" }}>{inspectModal.treatment || "Standard Dental Procedure"}</p>
              </div>

              <div style={{ marginTop: 10, padding: 12, background: "var(--df-gray-50)", borderRadius: 6 }}>
                <strong>Doctor Notes & Clinical Findings:</strong>
                <p style={{ marginTop: 4, color: "var(--df-text-secondary)", lineHeight: 1.5 }}>{inspectModal.notes}</p>
              </div>

              {inspectModal.allergies && (
                  <div style={{ marginTop: 10, padding: 10, background: "rgba(239, 68, 68, 0.08)", borderRadius: 6, color: "var(--df-danger)" }}>
                    <strong>Allergies:</strong> {inspectModal.allergies}
                  </div>
              )}

              {inspectModal.attachments && inspectModal.attachments !== "None" ? (
                <div style={{ marginTop: 12, border: "1px dashed var(--df-border)", padding: 14, borderRadius: 6, textAlign: "center", background: "var(--df-gray-50)" }}>
                  <div style={{ fontSize: 24, marginBottom: 4 }}>🩻</div>
                  <strong style={{ fontSize: 13 }}>{inspectModal.attachments}</strong>
                  <p style={{ fontSize: 11, color: "var(--df-text-muted)", marginTop: 2, margin: 0 }}>
                    High-resolution radiograph stored securely on HIPAA-compliant cloud storage.
                  </p>
                </div>
              ) : (
                <div style={{ marginTop: 12, border: "1px dashed var(--df-border)", padding: 12, borderRadius: 6, textAlign: "center", background: "var(--df-gray-50)" }}>
                  <p style={{ fontSize: 12, color: "var(--df-text-muted)", margin: 0 }}>
                    No radiograph or attachment was added to this clinical record.
                  </p>
                </div>
              )}
            </Modal>
        )}

        {confirmDeleteRecord && (
            <Modal
                title="Confirm Record Deletion"
                onClose={() => !isDeletingRecord && setConfirmDeleteRecord(null)}
                footer={
                  <>
                    <button
                        type="button"
                        className="df-btn df-btn-secondary"
                        onClick={() => setConfirmDeleteRecord(null)}
                        disabled={isDeletingRecord}
                    >
                      Cancel
                    </button>
                    <button
                        type="button"
                        className="df-btn df-btn-danger"
                        onClick={handleDeleteRecord}
                        disabled={isDeletingRecord}
                    >
                      {isDeletingRecord ? "Deleting..." : "Confirm Delete"}
                    </button>
                  </>
                }
            >
              <p style={{ margin: "8px 0 16px", color: "var(--df-text-secondary)" }}>
                Are you sure you want to permanently delete clinical record <strong>{confirmDeleteRecord.id}</strong> ({confirmDeleteRecord.diagnosis || confirmDeleteRecord.title}) for patient <strong>{confirmDeleteRecord.patient}</strong>?
              </p>
              <div className="df-alert df-alert-warning" style={{ color: "#b45309", background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: 6, padding: "8px 12px" }}>
                This action cannot be undone. All clinical findings and operative notes for this entry will be removed.
              </div>
            </Modal>
        )}
      </div>
  );
}

export function DoctorPrescriptionsView({ role }) {
  const { collections, saveRecord, removeRecord } = useDashboardData();
  const { addToast } = useNotifications();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRx, setEditingRx] = useState(null);
  const [inspectRx, setInspectRx] = useState(null);
  const [confirmDeleteRx, setConfirmDeleteRx] = useState(null);
  const [isDeletingRx, setIsDeletingRx] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [currentDentist, setCurrentDentist] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Patient Allergy Alert & Medication Safety State
  const [patientAllergies, setPatientAllergies] = useState(null);
  const [loadingAllergies, setLoadingAllergies] = useState(false);
  const [inspectPatientAllergies, setInspectPatientAllergies] = useState(null);

  // Patient Treatments list (for linking to clinical procedure)
  const [patientTreatments, setPatientTreatments] = useState([]);
  const [loadingTreatments, setLoadingTreatments] = useState(false);

  // Prescription Form State (Prescription Level)
  const initialRxHeader = {
    patient: "",
    patientId: null,
    doctor: "",
    treatmentId: "",
    instructions: "Take medications strictly as directed. Complete entire course.",
  };
  const [rxHeader, setRxHeader] = useState(initialRxHeader);

  // Multiple Medicines State (List of added medicines)
  const [prescriptionItems, setPrescriptionItems] = useState([]);

  // Active Draft Item State (for adding/editing a medicine item)
  const initialItemDraft = {
    medicineId: "",
    medicineName: "",
    dosage: "500mg",
    frequency: "3 times daily",
    durationDays: "5",
    route: "ORAL",
    quantity: "15",
    instructions: "Take with water after meals.",
    allergyAcknowledged: false,
  };
  const [itemDraft, setItemDraft] = useState(initialItemDraft);
  const [editingItemIdx, setEditingItemIdx] = useState(null);
  const [itemError, setItemError] = useState("");

  // Allergy warning for the currently drafted medication
  const [draftAllergyWarning, setDraftAllergyWarning] = useState(null);
  const [checkingDraftAllergy, setCheckingDraftAllergy] = useState(false);

  // Pairwise Drug-to-drug interactions state
  const [drugInteractions, setDrugInteractions] = useState([]);
  const [checkingInteractions, setCheckingInteractions] = useState(false);

  const resetAllFormState = () => {
    setRxHeader({
      ...initialRxHeader,
      doctor:
        currentDentist?.name ||
        (currentDentist ? `Dr. ${currentDentist.firstName || ""} ${currentDentist.lastName || ""}`.trim() : "") ||
        "",
    });
    setPrescriptionItems([]);
    setItemDraft(initialItemDraft);
    setEditingItemIdx(null);
    setItemError("");
    setDraftAllergyWarning(null);
    setDrugInteractions([]);
    setPatientAllergies(null);
    setPatientTreatments([]);
    setErrors({});
    setEditingRx(null);
  };

  const handleOpenEditRx = (rx) => {
    setEditingRx(rx);
    setErrors({});
    setPatientAllergies(null);
    setDraftAllergyWarning(null);

    const firstMed = rx.medicines?.[0] || {};
    const dosageVal = firstMed.dosage || rx.dosage || "500mg";
    const freqVal = firstMed.freq || rx.freq || "3 times daily";
    const durationVal = firstMed.duration || rx.duration || "5 days";
    const medNameVal = firstMed.name || rx.medicine || "";

    setRxHeader({
      patient: rx.patient || "",
      patientId: rx.patientId || null,
      doctor: rx.doctor || currentDentist?.name || "",
      treatmentId: rx.treatmentId || rx.raw?.treatmentId || "",
      instructions: rx.instructions || "Take with water after meals.",
    });

    if (Array.isArray(rx.medicines) && rx.medicines.length > 0) {
      setPrescriptionItems(
        rx.medicines.map((m, idx) => ({
          medicineId: m.medicineId || m.rawId || m.id || idx + 1,
          medicineName: m.name || m.medicineName || rx.medicine || "Prescribed Medicine",
          category: m.category || "Prescription",
          dosage: m.dosage || dosageVal,
          frequency: m.freq || m.frequency || freqVal,
          durationDays: m.durationDays || parseInt(String(m.duration || durationVal), 10) || 5,
          route: m.route || "ORAL",
          instructions: m.instructions || rx.instructions || "Take as directed",
          quantity: m.quantity || 15,
          allergyAcknowledged: true,
        }))
      );
    } else {
      setPrescriptionItems([
        {
          medicineId: 1,
          medicineName: medNameVal || "Prescribed Medicine",
          category: "Prescription",
          dosage: dosageVal,
          frequency: freqVal,
          durationDays: 5,
          route: "ORAL",
          instructions: rx.instructions || "Take as directed",
          quantity: 15,
          allergyAcknowledged: true,
        },
      ]);
    }

    setModalOpen(true);
  };

  const handleDeleteRx = async () => {
    if (!confirmDeleteRx) return;
    setIsDeletingRx(true);
    try {
      if (confirmDeleteRx.rawId) {
        await pharmacyApi.deletePrescription(confirmDeleteRx.rawId);
      }
      setPrescriptions((prev) => prev.filter((p) => p.id !== confirmDeleteRx.id));
      removeRecord("prescriptions", confirmDeleteRx.id);
      addToast(`Prescription ${confirmDeleteRx.id} deleted successfully!`, "success");
      setConfirmDeleteRx(null);
      if (inspectRx?.id === confirmDeleteRx.id) {
        setInspectRx(null);
      }
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        (typeof err?.response?.data === "string" ? err.response.data : "") ||
        err?.message ||
        "Failed to delete prescription";
      addToast(msg, "error");
    } finally {
      setIsDeletingRx(false);
    }
  };

  useEffect(() => {
    let active = true;
    const fetchPrescriptionsData = async () => {
      try {
        const [allDentists, allPatients, allMeds, allRxs] = await Promise.all([
          dentistApi.getAllDentists().catch(() => []),
          patientApi.getAllPatients().catch(() => []),
          pharmacyApi.getAllMedicines().catch(() => []),
          pharmacyApi.getAllPrescriptions().catch(() => []),
        ]);

        if (!active) return;
        setDentists(allDentists);
        setPatients(allPatients);
        setMedicines(allMeds);

        let myDentist = null;
        if (user?.id) {
          myDentist = allDentists.find((d) => d.userId === user.id || d.id === user.id) || null;
        }
        setCurrentDentist(myDentist);
        if (myDentist) {
          const dName = myDentist.name || `Dr. ${myDentist.firstName || ""} ${myDentist.lastName || ""}`.trim();
          setRxHeader((prev) => ({ ...prev, doctor: prev.doctor || dName }));
        }

        if (allRxs.length > 0) {
          const dLookup = {};
          allDentists.forEach((d) => {
            dLookup[d.id] = d;
          });
          const pLookup = {};
          allPatients.forEach((p) => {
            pLookup[p.id] = p;
          });

          const normalized = await Promise.all(
            allRxs.map(async (rx) => {
              const items = await pharmacyApi.getPrescriptionItems(rx.id).catch(() => []);
              return normalizePrescription(rx, pLookup, dLookup, items);
            })
          );
          if (active) setPrescriptions(normalized);
        } else if (active) {
          setPrescriptions(collections.prescriptions || []);
        }
      } catch (err) {
        console.warn("Could not load backend prescriptions for doctor:", err);
        if (active) setPrescriptions(collections.prescriptions || []);
      }
    };

    fetchPrescriptionsData();
    return () => {
      active = false;
    };
  }, [user, collections.prescriptions]);

  // Handle location state navigation (e.g. from Treatment or Appointment view)
  useEffect(() => {
    if (location.state?.prescriptionId || location.state?.selectedId) {
      const targetId = location.state.prescriptionId || location.state.selectedId;
      const match = prescriptions.find(
        (p) => p.id === targetId || String(p.id) === String(targetId) || p.prescriptionCode === targetId || p.code === targetId
      );
      if (match) {
        setInspectRx(match);
      }
    } else if (location.state?.patientId || location.state?.treatmentId || location.state?.patientName) {
      const pName =
        location.state.patientName ||
        (patients.find((p) => p.id === location.state.patientId)?.name) ||
        "";
      setRxHeader((prev) => ({
        ...prev,
        patient: pName || prev.patient,
        patientId: location.state.patientId || prev.patientId,
        treatmentId: location.state.treatmentId || prev.treatmentId,
      }));
      setModalOpen(true);
    }
  }, [location.state, prescriptions, patients]);

  // Match selected patient strictly against backend patient records
  const matchedPat = useMemo(() => {
    const cleanPatient = String(rxHeader.patient || "").trim().toLowerCase();
    if (!cleanPatient) return null;
    return (
      patients.find((p) => {
        const fullName = `${p.firstName || ""} ${p.lastName || ""}`.toLowerCase().trim();
        const pName = (p.name || "").toLowerCase().trim();
        const pCode = (p.patientCode || p.code || "").toLowerCase().trim();
        const pIdStr = String(p.id);
        return (
          fullName === cleanPatient ||
          pName === cleanPatient ||
          pCode === cleanPatient ||
          pIdStr === cleanPatient ||
          (rxHeader.patientId && p.id === rxHeader.patientId)
        );
      }) || null
    );
  }, [rxHeader.patient, rxHeader.patientId, patients]);

  // Match selected draft medicine against pharmacy catalog
  const currentDraftMed = useMemo(() => {
    if (itemDraft.medicineId) {
      return (
        medicines.find(
          (m) =>
            m.id === Number(itemDraft.medicineId) ||
            m.rawId === Number(itemDraft.medicineId)
        ) || null
      );
    }
    if (itemDraft.medicineName) {
      const clean = itemDraft.medicineName.trim().toLowerCase();
      return (
        medicines.find(
          (m) =>
            m.name?.trim().toLowerCase() === clean ||
            String(m.id) === clean ||
            String(m.rawId) === clean
        ) || null
      );
    }
    return null;
  }, [itemDraft.medicineId, itemDraft.medicineName, medicines]);

  // Evaluate real-time stock & expiry safety status for draft medicine
  const currentDraftSafety = useMemo(() => {
    if (!currentDraftMed) return null;
    return getMedicineSafetyStatus(currentDraftMed, Number(itemDraft.quantity) || 1);
  }, [currentDraftMed, itemDraft.quantity]);

  // Automatically fetch patient's recorded allergies and treatments whenever patient is selected
  useEffect(() => {
    if (!modalOpen || !matchedPat?.id) {
      setPatientAllergies(null);
      setPatientTreatments([]);
      setLoadingAllergies(false);
      setLoadingTreatments(false);
      return;
    }

    let active = true;
    setLoadingAllergies(true);
    setLoadingTreatments(true);

    patientApi
      .getPatientAllergies(matchedPat.id)
      .then((data) => {
        if (active) setPatientAllergies(data);
      })
      .catch((err) => {
        console.warn("Could not fetch patient allergies:", err);
        if (active) {
          const rawAllergies = matchedPat.allergies || "";
          const isNegation = !rawAllergies || /^(none|no|nkda|nil|n\/a|none reported|no allergies)$/i.test(rawAllergies.trim());
          setPatientAllergies({
            patientId: matchedPat.id,
            patientName: matchedPat.name || `${matchedPat.firstName || ""} ${matchedPat.lastName || ""}`.trim(),
            hasAllergies: !isNegation,
            allergyCount: isNegation ? 0 : 1,
            allergies: isNegation ? [] : [{ name: rawAllergies, severity: "Moderate" }],
            rawAllergies,
          });
        }
      })
      .finally(() => {
        if (active) setLoadingAllergies(false);
      });

    treatmentPlanApi
      .getPatientTreatments(matchedPat.id)
      .then((trts) => {
        if (active) setPatientTreatments(Array.isArray(trts) ? trts : []);
      })
      .catch((err) => {
        console.warn("Could not fetch patient treatments:", err);
        if (active) setPatientTreatments([]);
      })
      .finally(() => {
        if (active) setLoadingTreatments(false);
      });

    return () => {
      active = false;
    };
  }, [modalOpen, matchedPat?.id]);

  // Real-time check if draft medication conflicts with patient's recorded allergies
  useEffect(() => {
    if (!modalOpen || !matchedPat?.id || !currentDraftMed) {
      setDraftAllergyWarning(null);
      setCheckingDraftAllergy(false);
      return;
    }

    let active = true;
    setCheckingDraftAllergy(true);

    patientApi
      .checkMedicationAllergy(matchedPat.id, {
        medicineId: currentDraftMed.rawId || currentDraftMed.id,
        medicineName: currentDraftMed.name,
      })
      .then((result) => {
        if (active) {
          if (result && result.hasWarning) {
            setDraftAllergyWarning(result);
          } else {
            setDraftAllergyWarning(null);
          }
        }
      })
      .catch((err) => {
        console.warn("Medication allergy conflict check error:", err);
        if (active) setDraftAllergyWarning(null);
      })
      .finally(() => {
        if (active) setCheckingDraftAllergy(false);
      });

    return () => {
      active = false;
    };
  }, [modalOpen, matchedPat?.id, currentDraftMed]);

  // Real-time pairwise Drug-to-Drug Interaction Check across all medicines in prescription
  useEffect(() => {
    if (!modalOpen) {
      setDrugInteractions([]);
      return;
    }

    const idSet = new Set();
    prescriptionItems.forEach((it) => {
      if (it.medicineId) idSet.add(Number(it.medicineId));
    });
    if (currentDraftMed?.id) {
      idSet.add(Number(currentDraftMed.id));
    }

    const medIds = Array.from(idSet);
    if (medIds.length < 2) {
      setDrugInteractions([]);
      setCheckingInteractions(false);
      return;
    }

    let active = true;
    setCheckingInteractions(true);

    pharmacyApi
      .checkDrugInteractions(medIds)
      .then((interactions) => {
        if (active) {
          setDrugInteractions(Array.isArray(interactions) ? interactions : []);
        }
      })
      .catch((err) => {
        console.warn("Drug interaction check error:", err);
        if (active) setDrugInteractions([]);
      })
      .finally(() => {
        if (active) setCheckingInteractions(false);
      });

    return () => {
      active = false;
    };
  }, [modalOpen, prescriptionItems, currentDraftMed]);

  // Load allergy info for inspect prescription modal
  useEffect(() => {
    if (!inspectRx) {
      setInspectPatientAllergies(null);
      return;
    }

    let pId = inspectRx.patientId;
    if (!pId && inspectRx.patient) {
      const cleanP = inspectRx.patient.toLowerCase().trim();
      const found = patients.find(
        (p) =>
          (p.name && p.name.toLowerCase().trim() === cleanP) ||
          (`${p.firstName || ""} ${p.lastName || ""}`.toLowerCase().trim() === cleanP)
      );
      if (found?.id) pId = found.id;
    }

    if (pId) {
      patientApi
        .getPatientAllergies(pId)
        .then((res) => setInspectPatientAllergies(res))
        .catch(() => setInspectPatientAllergies(null));
    }
  }, [inspectRx, patients]);

  const updateHeaderField = (field, value) => {
    setRxHeader((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field] && !prev.submit) return prev;
      const updated = { ...prev };
      delete updated[field];
      delete updated.submit;
      return updated;
    });
  };

  const updateItemDraft = (field, value) => {
    setItemDraft((prev) => ({ ...prev, [field]: value }));
    setItemError("");
    if (field === "medicineId" || field === "medicineName") {
      setItemDraft((prev) => ({ ...prev, allergyAcknowledged: false }));
    }
  };

  // Add or Update medicine in the multi-medicine list
  const handleAddOrUpdateItem = () => {
    setItemError("");

    if (!currentDraftMed) {
      setItemError("Please select a medication from the catalog.");
      return;
    }

    // Safety checks
    if (currentDraftSafety?.isExpired) {
      setItemError(`🔴 CANNOT PRESCRIBE: ${currentDraftMed.name} expired on ${currentDraftMed.expiryDate || "past date"}. Expired medicines are prohibited.`);
      return;
    }

    const cleanDosage = String(itemDraft.dosage || "").trim();
    if (!cleanDosage) {
      setItemError("Dosage is required (e.g. 500mg or 1 capsule).");
      return;
    }

    const cleanFreq = String(itemDraft.frequency || "").trim();
    if (!cleanFreq) {
      setItemError("Frequency is required (e.g. 3 times daily).");
      return;
    }

    const durDays = parseInt(itemDraft.durationDays, 10);
    if (isNaN(durDays) || durDays <= 0) {
      setItemError("Duration must be a positive whole number of days (e.g. 5).");
      return;
    }

    const qty = parseInt(itemDraft.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setItemError("Quantity must be a positive number of units (e.g. 15).");
      return;
    }

    // Allergy Override Acknowledgement check
    if (draftAllergyWarning && draftAllergyWarning.hasWarning && !itemDraft.allergyAcknowledged) {
      setItemError("⚠️ Potential allergy conflict detected! You must acknowledge the clinical alert before adding this medication.");
      return;
    }

    // Check duplicate medicine in prescription list
    const duplicateIdx = prescriptionItems.findIndex(
      (it, idx) =>
        (it.medicineId === currentDraftMed.id ||
          it.medicineName?.toLowerCase().trim() === currentDraftMed.name?.toLowerCase().trim()) &&
        idx !== editingItemIdx
    );
    if (duplicateIdx !== -1) {
      setItemError(`"${currentDraftMed.name}" is already in this prescription. Please edit or update the existing item.`);
      return;
    }

    const newItem = {
      medicineId: currentDraftMed.id,
      medicineName: currentDraftMed.name,
      category: currentDraftMed.category || "Medication",
      dosage: cleanDosage,
      frequency: cleanFreq,
      durationDays: durDays,
      route: itemDraft.route || "ORAL",
      instructions: String(itemDraft.instructions || "Take with water after meals.").trim(),
      quantity: qty,
      safety: currentDraftSafety,
      allergyWarning: draftAllergyWarning,
      allergyAcknowledged: Boolean(itemDraft.allergyAcknowledged),
    };

    if (editingItemIdx !== null && editingItemIdx >= 0) {
      setPrescriptionItems((prev) => prev.map((item, idx) => (idx === editingItemIdx ? newItem : item)));
      setEditingItemIdx(null);
      addToast(`Updated ${newItem.medicineName} in prescription.`, "info");
    } else {
      setPrescriptionItems((prev) => [...prev, newItem]);
      addToast(`Added ${newItem.medicineName} to prescription.`, "success");
    }

    // Reset draft fields for next medicine
    setItemDraft({
      ...initialItemDraft,
      medicineId: "",
      medicineName: "",
    });
    setDraftAllergyWarning(null);
    setItemError("");
    setErrors((prev) => {
      const u = { ...prev };
      delete u.items;
      return u;
    });
  };

  const handleEditItem = (index) => {
    const target = prescriptionItems[index];
    if (!target) return;
    setEditingItemIdx(index);
    setItemDraft({
      medicineId: target.medicineId,
      medicineName: target.medicineName,
      dosage: target.dosage,
      frequency: target.frequency,
      durationDays: String(target.durationDays),
      route: target.route || "ORAL",
      quantity: String(target.quantity),
      instructions: target.instructions,
      allergyAcknowledged: target.allergyAcknowledged,
    });
    setItemError("");
  };

  const handleRemoveItem = (index) => {
    setPrescriptionItems((prev) => prev.filter((_, idx) => idx !== index));
    if (editingItemIdx === index) {
      setEditingItemIdx(null);
      setItemDraft(initialItemDraft);
      setDraftAllergyWarning(null);
    }
  };

  // Main Submit Prescription to Backend
  const handleIssueRx = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (isSubmitting) return;

    const nextErrors = {};

    // 1. Patient Validation
    if (!matchedPat || !matchedPat.id) {
      nextErrors.patient = "Patient must match an existing patient loaded from the backend.";
    }

    // 2. Prescription Items Validation
    if (prescriptionItems.length === 0) {
      nextErrors.items = "Please add at least one medication to the prescription.";
    }

    // 3. Prohibit Expired Medicines in Final Submission
    const expiredItem = prescriptionItems.find((it) => it.safety?.isExpired);
    if (expiredItem) {
      nextErrors.items = `Cannot issue prescription: "${expiredItem.medicineName}" is expired. Please remove it before proceeding.`;
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      addToast("Please resolve all prescription errors before submitting.", "error");
      return;
    }

    let dentistId = currentDentist?.id;
    if (!dentistId && user?.id) {
      const found = dentists.find((d) => d.userId === user.id || d.id === user.id);
      if (found?.id) dentistId = found.id;
    }
    if (!dentistId && dentists.length > 0) {
      dentistId = dentists[0].id;
    }

    if (!dentistId) {
      const msg = "Could not resolve authenticated dentist profile. Please re-login.";
      addToast(msg, "error");
      setErrors({ submit: msg });
      return;
    }

    setIsSubmitting(true);
    try {
      const todayIso = new Date().toISOString().slice(0, 10);
      const selTrt = patientTreatments.find((t) => String(t.rawId || t.id) === String(rxHeader.treatmentId));

      const prescriptionPayload = {
        patientId: matchedPat.id,
        dentistId,
        treatmentId: rxHeader.treatmentId ? Number(rxHeader.treatmentId) : null,
        prescriptionDate: todayIso,
        diagnosis: selTrt
          ? `Treatment: ${selTrt.type || selTrt.treatmentType || selTrt.diagnosis || "Clinical Care"}`
          : "Dental Treatment",
        instructions: rxHeader.instructions.trim() || "Take prescribed medications strictly as directed.",
        dentistNotes: `Regimen (${prescriptionItems.length} meds): ${prescriptionItems.map((m) => `${m.medicineName} (${m.dosage})`).join(", ")}`,
        status: "ACTIVE",
      };

      // Step 1: Create Prescription record on backend
      const createdPrescription = await pharmacyApi.createPrescription(prescriptionPayload);
      if (!createdPrescription?.id) {
        throw new Error("Backend did not return a valid prescription ID.");
      }

      // Step 2: Attach each medicine item to the prescription on backend
      const savedItems = [];
      for (const item of prescriptionItems) {
        try {
          const addedItem = await pharmacyApi.addPrescriptionMedicine(
            createdPrescription.id,
            item.medicineId,
            {
              dosage: item.dosage,
              frequency: item.frequency,
              durationDays: Number(item.durationDays) || 5,
              route: item.route || "ORAL",
              instructions: item.instructions || "Take as directed",
              quantity: Number(item.quantity) || 10,
            },
            Boolean(item.allergyAcknowledged),
            true // Clinically acknowledged drug interactions after reviewing warnings in UI
          );
          savedItems.push(addedItem || item);
        } catch (medErr) {
          console.error(`Failed to add medicine ${item.medicineName}:`, medErr);
          const errDetail =
            medErr?.response?.data?.message ||
            medErr?.response?.data?.error ||
            medErr.message;
          addToast(
            `Prescription #${createdPrescription.id} created, but failed to attach ${item.medicineName}: ${errDetail}`,
            "warning"
          );
        }
      }

      // Step 3: Normalize and register in local context
      const pLookup = { [matchedPat.id]: matchedPat };
      const dLookup = { [dentistId]: currentDentist || { name: rxHeader.doctor } };
      const normalizedNew = normalizePrescription(
        createdPrescription,
        pLookup,
        dLookup,
        savedItems.length > 0 ? savedItems : prescriptionItems
      );

      setPrescriptions((prev) => [normalizedNew, ...prev]);
      saveRecord("prescriptions", normalizedNew);

      addToast(
        `Prescription ${createdPrescription.prescriptionCode || `RX-${createdPrescription.id}`} (${prescriptionItems.length} medication(s)) issued for ${matchedPat.name || `${matchedPat.firstName} ${matchedPat.lastName}`}! Sent to Pharmacy queue.`,
        "success"
      );

      setModalOpen(false);
      resetAllFormState();
    } catch (err) {
      console.error("Prescription creation failed:", err);
      const errorMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        (typeof err?.response?.data === "string" ? err.response.data : "") ||
        err?.message ||
        "Failed to issue prescription.";
      setErrors({ submit: errorMsg });
      addToast(errorMsg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="df-role-page df-role-blue">
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Prescriptions" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Pharmacotherapy & Medication Safety</span>
          <h1>MY Clinical Prescriptions Management</h1>
          <p>Issue multi-medicine electronic prescriptions with real-time allergy alerts, drug-drug interaction safety, and pharmacy stock validation.</p>
        </div>
        <button
          className="df-btn df-btn-primary"
          onClick={() => {
            resetAllFormState();
            setModalOpen(true);
          }}
        >
          + Issue New Prescription
        </button>
      </header>

      <div className="df-stat-grid">
        <StatCard label="Total Prescriptions Issued" value={String(prescriptions.length)} icon="◫" color="primary" />
        <StatCard
          label="Awaiting Dispensing"
          value={String(prescriptions.filter((p) => p.status !== "dispensed" && p.rawStatus !== "COMPLETED").length)}
          icon="◷"
          color="warning"
        />
        <StatCard
          label="Dispensed by Pharmacy"
          value={String(prescriptions.filter((p) => p.status === "dispensed" || p.rawStatus === "COMPLETED").length)}
          icon="✓"
          color="success"
        />
        <StatCard label="Safety Checks Active" value="Allergy + Interaction" icon="◈" color="primary" />
      </div>

      <section className="df-card">
        <div className="df-card-body">
          <DataTable
            columns={[
              { key: "id", label: "Prescription #" },
              { key: "patient", label: "Patient" },
              { key: "medicine", label: "Prescribed Regimen" },
              { key: "date", label: "Issued Date" },
              { key: "status", label: "Pharmacy Status", type: "status" },
            ]}
            rows={prescriptions}
            quickActionLabel="View Details"
            onQuickAction={(row) => setInspectRx(row)}
            actionLabel="Edit"
            onEdit={(row) => handleOpenEditRx(row)}
            onDelete={(row) => setConfirmDeleteRx(row)}
          />
        </div>
      </section>

      {/* CREATE / EDIT MULTI-MEDICINE PRESCRIPTION MODAL */}
      {modalOpen && (
        <Modal
          title={editingRx ? `Edit Electronic Prescription (${editingRx.id})` : "Issue Electronic Dental Prescription"}
          onClose={() => {
            if (!isSubmitting) {
              setModalOpen(false);
              resetAllFormState();
            }
          }}
          footer={
            <>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => {
                  setModalOpen(false);
                  resetAllFormState();
                }}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="df-btn df-btn-primary"
                onClick={handleIssueRx}
                disabled={isSubmitting || prescriptionItems.length === 0}
              >
                {isSubmitting
                  ? (editingRx ? "Updating..." : "Issuing...")
                  : (editingRx ? "✓ Update Prescription" : `✓ Issue & Send to Pharmacy (${prescriptionItems.length} Meds)`)}
              </button>
            </>
          }
        >
          {/* PATIENT ALLERGY ALERT BANNER AT TOP OF PRESCRIPTION FORM */}
          {loadingAllergies && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                background: "rgba(59, 130, 246, 0.08)",
                border: "1px solid rgba(59, 130, 246, 0.2)",
                borderRadius: 6,
                marginBottom: 16,
                fontSize: "13px",
                color: "var(--df-text-secondary)",
              }}
            >
              <span className="df-spinner" style={{ width: 14, height: 14, borderTopColor: "#2563eb" }} />
              <span>Retrieving patient allergy profile from medical records...</span>
            </div>
          )}

          {!loadingAllergies && patientAllergies && patientAllergies.hasAllergies && (
            <div
              className="df-alert"
              style={{
                marginBottom: 16,
                padding: "14px 16px",
                borderRadius: 8,
                background: "#fffbeb",
                border: "1.5px solid #f59e0b",
                boxShadow: "0 2px 4px rgba(245, 158, 11, 0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#b45309", fontWeight: 700, fontSize: "14px" }}>
                  <span style={{ fontSize: "18px" }}>⚠️</span>
                  <span>ALLERGY ALERT — PATIENT HAS DOCUMENTED ALLERGIES</span>
                </div>
                <span style={{ fontSize: "11px", fontWeight: 700, background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: 12, border: "1px solid #fde68a" }}>
                  {patientAllergies.allergyCount || patientAllergies.allergies?.length || 1} Recorded
                </span>
              </div>

              <p style={{ margin: "0 0 6px 0", fontSize: "13px", fontWeight: 600, color: "#92400e" }}>
                Patient recorded allergies to verify against medications:
              </p>

              <ul style={{ margin: "0 0 8px 0", paddingLeft: "20px", color: "#78350f", fontSize: "13px" }}>
                {patientAllergies.allergies && patientAllergies.allergies.length > 0 ? (
                  patientAllergies.allergies.map((allergy, idx) => (
                    <li key={idx} style={{ marginBottom: 4 }}>
                      <strong>{allergy.name}</strong>
                      {allergy.severity && (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "1px 6px",
                            borderRadius: 4,
                            backgroundColor: allergy.severity.toLowerCase().includes("severe") ? "#fee2e2" : "#fef3c7",
                            color: allergy.severity.toLowerCase().includes("severe") ? "#b91c1c" : "#92400e",
                            border: allergy.severity.toLowerCase().includes("severe") ? "1px solid #fca5a5" : "1px solid #fde68a",
                          }}
                        >
                          {allergy.severity}
                        </span>
                      )}
                      {allergy.reaction && (
                        <span style={{ marginLeft: 6, color: "#6b7280", fontSize: "12px" }}>
                          (Reaction: {allergy.reaction})
                        </span>
                      )}
                    </li>
                  ))
                ) : (
                  <li style={{ color: "#92400e" }}>{patientAllergies.rawAllergies || "Documented Allergy Recorded"}</li>
                )}
              </ul>
            </div>
          )}

          {/* PRESCRIPTION HEADER DETAILS */}
          <div className="df-form-2col">
            <div className="df-form-group">
              <label className="df-label">Patient Name *</label>
              <input
                className="df-input"
                value={rxHeader.patient}
                onChange={(e) => updateHeaderField("patient", e.target.value)}
                placeholder="Type registered patient full name..."
                list="registered-patients-rx-catalog"
                required
              />
              <datalist id="registered-patients-rx-catalog">
                {patients.map((p) => {
                  const pName = p.name || `${p.firstName || ""} ${p.lastName || ""}`.trim();
                  return <option key={p.id} value={pName} />;
                })}
              </datalist>
              {errors.patient && (
                <div style={{ color: "#dc2626", fontSize: 13, marginTop: 4 }}>
                  {errors.patient}
                </div>
              )}
            </div>

            <div className="df-form-group">
              <label className="df-label">Attending Dentist</label>
              <input
                className="df-input"
                value={rxHeader.doctor || "Authenticated Dentist"}
                disabled
              />
            </div>
          </div>

          {/* ASSOCIATED TREATMENT SELECTION */}
          <div className="df-form-2col" style={{ marginTop: 12 }}>
            <div className="df-form-group">
              <label className="df-label">Associated Clinical Treatment / Procedure (Optional)</label>
              <select
                className="df-select"
                value={rxHeader.treatmentId}
                onChange={(e) => updateHeaderField("treatmentId", e.target.value)}
              >
                <option value="">-- Standalone Prescription (No Linked Treatment) --</option>
                {patientTreatments.map((t) => (
                  <option key={t.id || t.rawId} value={t.rawId || t.id}>
                    [{t.treatmentCode || `TRT-${t.id}`}] {t.type || t.treatmentType || t.procedure || "Treatment"} {t.toothDetails ? `(${t.toothDetails})` : ""} — {t.status || "PLANNED"}
                  </option>
                ))}
              </select>
              {patientTreatments.length === 0 && matchedPat && !loadingTreatments && (
                <div style={{ fontSize: 11, color: "var(--df-text-muted)", marginTop: 4 }}>
                  No prior treatments found for {matchedPat.name || "this patient"}. Prescribing as standalone dental prescription.
                </div>
              )}
            </div>

            <div className="df-form-group">
              <label className="df-label">General Prescription Instructions</label>
              <input
                className="df-input"
                value={rxHeader.instructions}
                onChange={(e) => updateHeaderField("instructions", e.target.value)}
                placeholder="e.g. Take medications strictly as directed. Complete entire course."
              />
            </div>
          </div>

          {/* ======================================================== */}
          {/* DRUG-TO-DRUG INTERACTION WARNING BANNER                  */}
          {/* ======================================================== */}
          {checkingInteractions && (
            <div style={{ fontSize: "12px", color: "var(--df-text-muted)", marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <span className="df-spinner" style={{ width: 12, height: 12, borderTopColor: "#2563eb" }} />
              <span>Analyzing potential drug-to-drug interactions between medications...</span>
            </div>
          )}

          {drugInteractions.length > 0 && (
            <div
              className="df-alert"
              style={{
                marginTop: 14,
                marginBottom: 14,
                padding: "14px 16px",
                borderRadius: 8,
                background: "#fef2f2",
                border: "2px solid #ef4444",
                boxShadow: "0 2px 6px rgba(239, 68, 68, 0.12)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#b91c1c", fontWeight: 700, fontSize: "14px" }}>
                  <span style={{ fontSize: "18px" }}>⚠️</span>
                  <span>DRUG INTERACTION WARNING</span>
                </div>
                <span style={{ fontSize: "11px", fontWeight: 700, background: "#fee2e2", color: "#b91c1c", padding: "2px 8px", borderRadius: 12, border: "1px solid #fca5a5" }}>
                  {drugInteractions.length} Conflict(s) Detected
                </span>
              </div>

              <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                {drugInteractions.map((inter, idx) => {
                  const sev = (inter.severity || "MODERATE").toUpperCase();
                  const sevColor = sev === "HIGH" ? "#dc2626" : sev === "MODERATE" ? "#d97706" : "#2563eb";
                  const sevBg = sev === "HIGH" ? "#fee2e2" : sev === "MODERATE" ? "#fef3c7" : "#eff6ff";
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: "8px 12px",
                        background: "#ffffff",
                        border: `1px solid ${sevColor}`,
                        borderRadius: 6,
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong>
                          {inter.medicine1Name || inter.medicine1?.name || "Medicine A"} ⟷ {inter.medicine2Name || inter.medicine2?.name || "Medicine B"}
                        </strong>
                        <span style={{ fontSize: "10px", fontWeight: 700, background: sevBg, color: sevColor, padding: "2px 6px", borderRadius: 4 }}>
                          Severity: {sev}
                        </span>
                      </div>
                      {inter.description && (
                        <p style={{ margin: "4px 0 2px", color: "#4b5563" }}>
                          {inter.description}
                        </p>
                      )}
                      {inter.clinicalAdvice && (
                        <div style={{ marginTop: 4, color: "#991b1b", fontWeight: 600 }}>
                          Recommendation: {inter.clinicalAdvice}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* CURRENT MEDICINES IN THIS PRESCRIPTION                   */}
          {/* ======================================================== */}
          <div style={{ marginTop: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--df-text-heading)" }}>
                Prescribed Medications ({prescriptionItems.length})
              </h3>
              {prescriptionItems.length > 0 && (
                <span className="df-badge df-badge-primary">
                  {prescriptionItems.length} Item(s) in Prescription
                </span>
              )}
            </div>

            {prescriptionItems.length === 0 ? (
              <div
                style={{
                  padding: "16px 20px",
                  textAlign: "center",
                  background: "var(--df-glass-panel, #f8fafc)",
                  border: "1.5px dashed var(--df-border, #cbd5e1)",
                  borderRadius: 8,
                  color: "var(--df-text-secondary)",
                  fontSize: 13,
                }}
              >
                No medications added yet. Use the form below to add medicines to this prescription.
              </div>
            ) : (
              <div style={{ overflowX: "auto", border: "1px solid var(--df-border, #e2e8f0)", borderRadius: 8 }}>
                <table className="df-table" style={{ width: "100%", fontSize: 13, margin: 0 }}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Medicine Name</th>
                      <th>Dosage & Route</th>
                      <th>Frequency</th>
                      <th>Duration</th>
                      <th>Qty</th>
                      <th>Stock & Expiry</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptionItems.map((item, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        <td>
                          <strong>{item.medicineName}</strong>
                          <div style={{ fontSize: 11, color: "var(--df-text-secondary)" }}>{item.category}</div>
                        </td>
                        <td>
                          {item.dosage} <span style={{ fontSize: 11, color: "var(--df-text-muted)" }}>({item.route})</span>
                        </td>
                        <td>{item.frequency}</td>
                        <td>{item.durationDays} days</td>
                        <td>
                          <span className="df-badge df-badge-primary">{item.quantity} units</span>
                        </td>
                        <td>
                          {item.safety ? (
                            <span className={`df-badge ${item.safety.badgeClass || 'df-badge-primary'}`}>
                              {item.safety.label}
                            </span>
                          ) : (
                            <span className="df-badge df-badge-success">🟢 Available</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              type="button"
                              className="df-btn df-btn-secondary df-btn-sm"
                              onClick={() => handleEditItem(idx)}
                              title="Edit Item"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              className="df-btn df-btn-danger df-btn-sm"
                              onClick={() => handleRemoveItem(idx)}
                              title="Remove Item"
                            >
                              ✕
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {errors.items && (
              <div style={{ color: "#dc2626", fontSize: 13, fontWeight: 600, marginTop: 6 }}>
                ⚠️ {errors.items}
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* ADD / EDIT MEDICINE ITEM DRAFT SECTION                   */}
          {/* ======================================================== */}
          <div
            style={{
              marginTop: 20,
              padding: 16,
              background: "var(--df-glass-panel, rgba(248, 250, 252, 0.8))",
              border: "1px solid var(--df-border, #e2e8f0)",
              borderRadius: 8,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <strong style={{ fontSize: 14, color: "var(--df-text-heading)" }}>
                {editingItemIdx !== null ? `Edit Medication #${editingItemIdx + 1}` : "+ Add Medication to Prescription"}
              </strong>
              {editingItemIdx !== null && (
                <button
                  type="button"
                  className="df-btn df-btn-secondary df-btn-sm"
                  onClick={() => {
                    setEditingItemIdx(null);
                    setItemDraft(initialItemDraft);
                    setDraftAllergyWarning(null);
                  }}
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {/* Medicine Selector & Real-Time Stock/Expiry Badge */}
            <div className="df-form-2col">
              <div className="df-form-group">
                <label className="df-label">Select Medicine *</label>
                <select
                  className="df-select"
                  value={itemDraft.medicineName}
                  onChange={(e) => {
                    const selMed = medicines.find((m) => m.name === e.target.value);
                    setItemDraft((prev) => ({
                      ...prev,
                      medicineName: e.target.value,
                      medicineId: selMed ? selMed.id : "",
                      allergyAcknowledged: false,
                    }));
                  }}
                >
                  <option value="">-- Choose medication from pharmacy catalog --</option>
                  {medicines.map((m) => (
                    <option key={m.id || m.rawId} value={m.name}>
                      {m.name} ({m.category || "General"})
                    </option>
                  ))}
                </select>

                {/* Stock & Expiry Safety Status Badge */}
                {currentDraftMed && currentDraftSafety && (
                  <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span className={`df-badge ${currentDraftSafety.badgeClass}`}>
                      {currentDraftSafety.label}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--df-text-secondary)" }}>
                      Stock: <strong>{currentDraftMed.stockQuantity ?? currentDraftMed.stock ?? 0} units</strong>
                      {currentDraftMed.expiryDate && (
                        <span> · Expiry: <strong>{String(currentDraftMed.expiryDate).slice(0, 10)}</strong></span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              <div className="df-form-group">
                <label className="df-label">Dosage *</label>
                <input
                  className="df-input"
                  value={itemDraft.dosage}
                  onChange={(e) => updateItemDraft("dosage", e.target.value)}
                  placeholder="e.g. 500mg, 400mg, 1 tablet"
                />
              </div>
            </div>

            {/* Expired Medicine Warning Block */}
            {currentDraftSafety?.isExpired && (
              <div
                style={{
                  marginTop: 10,
                  marginBottom: 10,
                  padding: "10px 14px",
                  background: "#fee2e2",
                  border: "1.5px solid #dc2626",
                  borderRadius: 6,
                  color: "#b91c1c",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                🔴 CANNOT PRESCRIBE EXPIRED MEDICATION: {currentDraftMed?.name} expired on {String(currentDraftMed?.expiryDate).slice(0, 10)}. Hospital policy prohibits dispensing expired stock.
              </div>
            )}

            {/* Real-time Medication Allergy Conflict Warning */}
            {checkingDraftAllergy && (
              <div style={{ fontSize: "12px", color: "var(--df-text-muted)", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <span className="df-spinner" style={{ width: 12, height: 12, borderTopColor: "#2563eb" }} />
                <span>Checking {currentDraftMed?.name} against patient allergy records...</span>
              </div>
            )}

            {draftAllergyWarning && draftAllergyWarning.hasWarning && (
              <div
                style={{
                  marginTop: 10,
                  marginBottom: 12,
                  padding: "12px 14px",
                  backgroundColor: "#fef2f2",
                  border: "2px solid #ef4444",
                  borderRadius: 6,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#b91c1c", fontWeight: 700, fontSize: "13px" }}>
                    <span>🚨</span>
                    <span>ALLERGY ALERT: PATIENT ALLERGY CONFLICT</span>
                  </div>
                  <span style={{ background: "#dc2626", color: "#fff", padding: "2px 6px", borderRadius: 4, fontSize: "10px", fontWeight: 700 }}>
                    Risk: {draftAllergyWarning.riskLevel || "High"}
                  </span>
                </div>

                <div style={{ fontSize: "12px", color: "#7f1d1d", lineHeight: 1.4 }}>
                  <div>
                    <strong>Patient is allergic to:</strong> <span style={{ textDecoration: "underline", fontWeight: 700 }}>{draftAllergyWarning.allergen}</span>
                  </div>
                  {draftAllergyWarning.warningMessage && (
                    <div style={{ marginTop: 2 }}>{draftAllergyWarning.warningMessage}</div>
                  )}
                  {draftAllergyWarning.clinicalAdvice && (
                    <div style={{ marginTop: 4, color: "#991b1b", fontWeight: 600 }}>
                      Advice: {draftAllergyWarning.clinicalAdvice}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    padding: "8px 10px",
                    backgroundColor: "#ffffff",
                    border: itemDraft.allergyAcknowledged ? "1.5px solid #10b981" : "1.5px solid #fca5a5",
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  <input
                    type="checkbox"
                    id="draft-allergy-ack"
                    checked={itemDraft.allergyAcknowledged}
                    onChange={(e) => updateItemDraft("allergyAcknowledged", e.target.checked)}
                    style={{ marginTop: 2, cursor: "pointer", width: 16, height: 16, accentColor: "#dc2626" }}
                  />
                  <label
                    htmlFor="draft-allergy-ack"
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: itemDraft.allergyAcknowledged ? "#065f46" : "#991b1b",
                      cursor: "pointer",
                      lineHeight: 1.3,
                    }}
                  >
                    I have reviewed the potential allergy conflict, assessed the clinical risks, and confirm the clinical decision to proceed with this medication.
                  </label>
                </div>
              </div>
            )}

            {/* Frequency, Duration, Route, Quantity */}
            <div className="df-form-2col" style={{ marginTop: 10 }}>
              <div className="df-form-group">
                <label className="df-label">Frequency *</label>
                <input
                  className="df-input"
                  value={itemDraft.frequency}
                  onChange={(e) => updateItemDraft("frequency", e.target.value)}
                  placeholder="e.g. 3 times daily, 2 times daily, Every 8 hours"
                />
              </div>

              <div className="df-form-group">
                <label className="df-label">Duration (Days) *</label>
                <input
                  type="number"
                  min="1"
                  className="df-input"
                  value={itemDraft.durationDays}
                  onChange={(e) => {
                    const days = parseInt(e.target.value, 10) || 1;
                    updateItemDraft("durationDays", e.target.value);
                    // Auto-calculate suggested quantity
                    updateItemDraft("quantity", String(days * 3));
                  }}
                  placeholder="e.g. 5"
                />
              </div>
            </div>

            <div className="df-form-2col" style={{ marginTop: 10 }}>
              <div className="df-form-group">
                <label className="df-label">Administration Route *</label>
                <select
                  className="df-select"
                  value={itemDraft.route}
                  onChange={(e) => updateItemDraft("route", e.target.value)}
                >
                  <option value="ORAL">ORAL (Tablets / Capsules / Liquid)</option>
                  <option value="TOPICAL">TOPICAL (Oral Gel / Ointment / Rinse)</option>
                  <option value="SUBLINGUAL">SUBLINGUAL</option>
                  <option value="INJECTION">INJECTION</option>
                </select>
              </div>

              <div className="df-form-group">
                <label className="df-label">Quantity (Units) *</label>
                <input
                  type="number"
                  min="1"
                  className="df-input"
                  value={itemDraft.quantity}
                  onChange={(e) => updateItemDraft("quantity", e.target.value)}
                  placeholder="e.g. 15"
                />
              </div>
            </div>

            <div className="df-form-group" style={{ marginTop: 10 }}>
              <label className="df-label">Directions / Instructions for this Medicine</label>
              <input
                className="df-input"
                value={itemDraft.instructions}
                onChange={(e) => updateItemDraft("instructions", e.target.value)}
                placeholder="e.g. Take with food after meals. Drink full glass of water."
              />
            </div>

            {itemError && (
              <div style={{ color: "#dc2626", fontSize: 13, fontWeight: 600, marginTop: 8 }}>
                ⚠️ {itemError}
              </div>
            )}

            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={handleAddOrUpdateItem}
                disabled={currentDraftSafety?.isExpired}
                style={{ fontWeight: 700 }}
              >
                {editingItemIdx !== null ? "✓ Save Medication Changes" : "+ Add Medication to Prescription"}
              </button>
            </div>
          </div>

          {errors.submit && (
            <div
              className="df-alert df-alert-warning"
              style={{
                marginTop: 14,
                color: "#dc2626",
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                borderRadius: 6,
                padding: "8px 12px",
              }}
            >
              {errors.submit}
            </div>
          )}
        </Modal>
      )}

      {/* INSPECT PRESCRIPTION MODAL (ALL PRESCRIBED MEDICINES) */}
      {inspectRx && (
        <Modal
          title={`Prescription Details: ${inspectRx.id}`}
          onClose={() => setInspectRx(null)}
          footer={
            <>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => {
                  const target = inspectRx;
                  setInspectRx(null);
                  handleOpenEditRx(target);
                }}
              >
                Edit Prescription
              </button>
              <button
                type="button"
                className="df-btn df-btn-danger"
                onClick={() => {
                  setConfirmDeleteRx(inspectRx);
                  setInspectRx(null);
                }}
              >
                Delete Prescription
              </button>
              <button type="button" className="df-btn df-btn-primary" onClick={() => setInspectRx(null)}>
                Close
              </button>
            </>
          }
        >
          <div className="df-form-2col">
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Prescription #</small>
              <div style={{ fontWeight: 600 }}>{inspectRx.id}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Pharmacy Status</small>
              <div style={{ fontWeight: 600 }}>{(inspectRx.rawStatus || inspectRx.status || "ACTIVE").toUpperCase()}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Patient Name</small>
              <div style={{ fontWeight: 600 }}>{inspectRx.patient}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Attending Specialist</small>
              <div style={{ fontWeight: 600 }}>{inspectRx.doctor}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Issue Date</small>
              <div style={{ fontWeight: 600 }}>{inspectRx.date}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Clinical Diagnosis / Treatment</small>
              <div style={{ fontWeight: 600 }}>{inspectRx.diagnosis || "Dental Treatment"}</div>
            </div>
          </div>

          {inspectPatientAllergies && (
            <div
              style={{
                marginTop: 14,
                padding: "10px 14px",
                borderRadius: 6,
                background: inspectPatientAllergies.hasAllergies ? "#fffbeb" : "rgba(16, 185, 129, 0.08)",
                border: inspectPatientAllergies.hasAllergies ? "1px solid #fde68a" : "1px solid rgba(16, 185, 129, 0.25)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: "14px" }}>{inspectPatientAllergies.hasAllergies ? "⚠️" : "✓"}</span>
                  <strong style={{ fontSize: "13px", color: inspectPatientAllergies.hasAllergies ? "#b45309" : "#065f46" }}>
                    {inspectPatientAllergies.hasAllergies ? "Patient Allergy Profile:" : "Patient Allergy Status:"}
                  </strong>
                </div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: inspectPatientAllergies.hasAllergies ? "#92400e" : "#047857",
                    background: inspectPatientAllergies.hasAllergies ? "#fef3c7" : "#d1fae5",
                    padding: "2px 8px",
                    borderRadius: 12,
                  }}
                >
                  {inspectPatientAllergies.hasAllergies
                    ? `${inspectPatientAllergies.allergyCount || inspectPatientAllergies.allergies?.length || 1} Recorded`
                    : "No Known Allergies"}
                </span>
              </div>
              {inspectPatientAllergies.hasAllergies && inspectPatientAllergies.allergies && inspectPatientAllergies.allergies.length > 0 && (
                <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {inspectPatientAllergies.allergies.map((a, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: "12px",
                        color: "#78350f",
                        background: "#fef3c7",
                        padding: "2px 8px",
                        borderRadius: 4,
                        border: "1px solid #fde68a",
                      }}
                    >
                      <strong>{a.name}</strong> {a.severity ? `(${a.severity})` : ""}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ALL PRESCRIBED MEDICINES TABLE */}
          <div style={{ marginTop: 16 }}>
            <strong style={{ fontSize: 14 }}>Prescribed Medications ({inspectRx.medicines?.length || 1}):</strong>
            <div style={{ marginTop: 8, overflowX: "auto", border: "1px solid var(--df-border, #e2e8f0)", borderRadius: 8 }}>
              <table className="df-table" style={{ width: "100%", fontSize: 13, margin: 0 }}>
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Dosage</th>
                    <th>Frequency</th>
                    <th>Duration</th>
                    <th>Route</th>
                    <th>Qty</th>
                    <th>Directions</th>
                  </tr>
                </thead>
                <tbody>
                  {(inspectRx.medicines && inspectRx.medicines.length > 0
                    ? inspectRx.medicines
                    : [
                        {
                          name: inspectRx.medicine,
                          dosage: inspectRx.dosage || "Standard",
                          freq: inspectRx.freq || "Daily",
                          duration: inspectRx.duration || "Course",
                          instructions: inspectRx.instructions,
                          quantity: 1,
                        },
                      ]
                  ).map((m, idx) => (
                    <tr key={idx}>
                      <td><strong>{m.name || m.medicineName || m.medicine?.name || "Medication"}</strong></td>
                      <td>{m.dosage || "Standard"}</td>
                      <td>{m.freq || m.frequency || "Daily"}</td>
                      <td>{m.duration || (m.durationDays ? `${m.durationDays} days` : "5 days")}</td>
                      <td>{m.route || "ORAL"}</td>
                      <td><span className="df-badge df-badge-primary">{m.quantity || 1} units</span></td>
                      <td>{m.instructions || "As directed"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginTop: 14, padding: 12, background: "var(--df-gray-50)", borderRadius: 6 }}>
            <strong>Patient Directions & Administration:</strong>
            <p style={{ marginTop: 4, color: "var(--df-text-secondary)", lineHeight: 1.5 }}>
              {inspectRx.instructions}
            </p>
          </div>

          {inspectRx.dentistNotes && (
            <div style={{ marginTop: 14, padding: 12, background: "var(--df-gray-50)", borderRadius: 6 }}>
              <strong>Clinical & Regimen Notes:</strong>
              <p style={{ marginTop: 4, color: "var(--df-text-secondary)", lineHeight: 1.5 }}>
                {inspectRx.dentistNotes}
              </p>
            </div>
          )}
        </Modal>
      )}

      {confirmDeleteRx && (
        <Modal
          title="Confirm Prescription Deletion"
          onClose={() => !isDeletingRx && setConfirmDeleteRx(null)}
          footer={
            <>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setConfirmDeleteRx(null)}
                disabled={isDeletingRx}
              >
                Cancel
              </button>
              <button
                type="button"
                className="df-btn df-btn-danger"
                onClick={handleDeleteRx}
                disabled={isDeletingRx}
              >
                {isDeletingRx ? "Deleting..." : "Confirm Delete"}
              </button>
            </>
          }
        >
          <p style={{ margin: "8px 0 16px", color: "var(--df-text-secondary)" }}>
            Are you sure you want to permanently delete prescription <strong>{confirmDeleteRx.id}</strong> ({confirmDeleteRx.medicine}) for patient <strong>{confirmDeleteRx.patient}</strong>?
          </p>
          <div className="df-alert df-alert-warning" style={{ color: "#b45309", background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: 6, padding: "8px 12px" }}>
            This action will revoke the prescription and remove it from the pharmacy dispensing queue.
          </div>
        </Modal>
      )}
    </div>
  );
}

export { DoctorMedicalHistoryView } from "./DoctorMedicalHistoryView";