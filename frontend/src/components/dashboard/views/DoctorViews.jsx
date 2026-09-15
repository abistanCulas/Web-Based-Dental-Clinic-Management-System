import { useState, useMemo, useEffect } from "react";
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
import patientApi from "../../../api/patients";
import pharmacyApi, { normalizePrescription } from "../../../api/pharmacy";
import medicalRecordsApi, { normalizeMedicalRecord } from "../../../api/medicalRecords";
import treatmentPlanApi, { normalizeTreatmentPlan } from "../../../api/treatmentPlans";
import { parseLkr } from "../../../api/billing";

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

  const todayIso = useMemo(() => new Date().toISOString().split("T")[0], []);

  const loadTodayAppointments = async () => {
    try {
      let dentist = null;
      if (user?.id) {
        dentist = await dentistApi.getDentistByUserId(user.id);
        if (dentist) setDentistRecord(dentist);
      }

      const dentistId = dentist?.id || 1;
      const [appts, patients] = await Promise.all([
        appointmentApi.getDentistAppointments(dentistId).catch(() => []),
        patientApi.getAllPatients().catch(() => []),
      ]);

      const pLookup = {};
      patients.forEach((p) => { pLookup[p.id] = p; });
      const dLookup = dentist ? { [dentist.id]: dentist } : {};

      const normalized = appts.map((a) => normalizeAppointment(a, dLookup, pLookup));
      const todayList = normalized.filter((a) => a.date === todayIso);
      setDoctorAppts(todayList.length > 0 ? todayList : normalized);
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

  const appointments = doctorAppts.length > 0 ? doctorAppts : (collections.appointments || []);

  const stats = useMemo(() => {
    const total = appointments.length;
    const inChair = appointments.filter((a) => a.status === "in-consultation").length;
    const waiting = appointments.filter((a) => a.status === "confirmed" || a.status === "waiting" || a.status === "booked").length;
    const completed = appointments.filter((a) => a.status === "completed").length;
    return { total, inChair, waiting, completed };
  }, [appointments]);

  const filtered = useMemo(() => {
    if (activeTab === "all") return appointments;
    if (activeTab === "in-chair") return appointments.filter((a) => a.status === "in-consultation");
    if (activeTab === "waiting") return appointments.filter((a) => a.status === "confirmed" || a.status === "waiting" || a.status === "booked");
    if (activeTab === "completed") return appointments.filter((a) => a.status === "completed");
    return appointments;
  }, [appointments, activeTab]);

  const handleStartConsult = (appt) => {
    setDoctorAppts((prev) => prev.map((a) => (a.id === appt.id ? { ...a, status: "in-consultation" } : a)));
    saveRecord("appointments", { ...appt, status: "in-consultation" });
    addToast(`Consultation started for ${appt.patient}`, "info");
  };

  const handleCompleteVisit = async (appt) => {
    try {
      if (typeof appt.id === "number") {
        await appointmentApi.completeAppointment(appt.id);
      }
      setDoctorAppts((prev) => prev.map((a) => (a.id === appt.id ? { ...a, status: "completed" } : a)));
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
    <div className={`df-role-page df-role-teal`}>
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
  const { collections, saveRecord } = useDashboardData();
  const { addToast } = useNotifications();
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [advanceModal, setAdvanceModal] = useState(false);
  const [plans, setPlans] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [patients, setPatients] = useState([]);
  const [currentDentist, setCurrentDentist] = useState(null);

  const [newPlan, setNewPlan] = useState({
    patient: "Sarah Mitchell",
    doctor: "Dr. James Wilson",
    procedure: "Full Arch Dental Implant Reconstruction",
    stage: "Stage 1: Diagnosis & 3D Imaging",
    estimatedCost: "LKR 180,000",
    actualCost: "LKR 45,000",
    status: "in-progress",
  });

  useEffect(() => {
    let active = true;
    const loadPlans = async () => {
      try {
        const [allDentists, allPatients, backendPlans] = await Promise.all([
          dentistApi.getAllDentists().catch(() => []),
          patientApi.getAllPatients().catch(() => []),
          treatmentPlanApi.getAllTreatmentPlans().catch(() => []),
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
          setNewPlan((prev) => ({ ...prev, doctor: dName }));
        }

        if (backendPlans.length > 0) {
          const dLookup = {};
          allDentists.forEach((d) => {
            dLookup[d.id] = d;
          });
          const pLookup = {};
          allPatients.forEach((p) => {
            pLookup[p.id] = p;
          });

          const normalized = backendPlans.map((p) => normalizeTreatmentPlan(p, pLookup, dLookup));
          setPlans(normalized);
        } else {
          setPlans(collections.treatmentPlans || []);
        }
      } catch (err) {
        console.warn("Could not load backend treatment plans:", err);
        if (active) setPlans(collections.treatmentPlans || []);
      }
    };

    loadPlans();
    return () => {
      active = false;
    };
  }, [user, collections.treatmentPlans]);

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!newPlan.procedure.trim()) return;

    try {
      const matchedPat = patients.find(
        (p) =>
          `${p.firstName || ""} ${p.lastName || ""}`.toLowerCase().trim() === newPlan.patient.toLowerCase().trim() ||
          p.name?.toLowerCase().trim() === newPlan.patient.toLowerCase().trim()
      );
      const patientId = matchedPat?.id || (patients[0]?.id || 1);
      const dentistId = currentDentist?.id || (dentists[0]?.id || 1);
      const todayIso = new Date().toISOString().slice(0, 10);
      const estCost = parseLkr(newPlan.estimatedCost) || 150000;

      const created = await treatmentPlanApi.createTreatmentPlan(patientId, dentistId, {
        planName: newPlan.procedure,
        description: newPlan.stage,
        startDate: todayIso,
        estimatedTotalCost: estCost,
        status: "IN_PROGRESS",
        dentistNotes: newPlan.stage,
      });

      const pLookup = { [patientId]: matchedPat || { name: newPlan.patient } };
      const dLookup = { [dentistId]: currentDentist || { name: newPlan.doctor } };
      const normalized = normalizeTreatmentPlan(created, pLookup, dLookup);

      setPlans((prev) => [normalized, ...prev]);
      saveRecord("treatmentPlans", normalized);
      addToast(`Treatment Plan created for ${normalized.patient}!`, "success");
      setModalOpen(false);
    } catch (err) {
      console.warn("Backend treatment plan creation failed, falling back to local:", err);
      const plan = {
        id: nextId("TP"),
        ...newPlan,
        date: new Date().toISOString().slice(0, 10),
      };
      saveRecord("treatmentPlans", plan);
      setPlans((prev) => [plan, ...prev]);
      addToast(`Treatment Plan created for ${plan.patient}!`, "success");
      setModalOpen(false);
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

  return (
    <div className={`df-role-page df-role-teal`}>
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Treatment Plans" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Complex Dental Care</span>
          <h1>Multi-Stage Treatment Plans</h1>
          <p>Track multi-stage reconstructive, orthodontic, and implant procedures from diagnostic to delivery.</p>
        </div>
        <button className="df-btn df-btn-primary" onClick={() => setModalOpen(true)}>
          + Create Treatment Plan
        </button>
      </header>

      <div style={{ display: "grid", gap: 20 }}>
        {plans.map((plan) => (
          <section key={plan.id} className="df-card">
            <div className="df-card-body">
              <div className="df-card-title-row">
                <div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
                    <span className="df-badge df-badge-primary">{plan.id}</span>
                    <strong style={{ fontSize: 16 }}>{plan.procedure}</strong>
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
                <span className="df-badge df-badge-teal">Current Phase: {plan.stage}</span>
                <button
                  className="df-btn df-btn-secondary df-btn-sm"
                  onClick={() => {
                    setSelectedPlan(plan);
                    setAdvanceModal(true);
                  }}
                >
                  ▶ Advance Clinical Phase
                </button>
              </div>
            </div>
          </section>
        ))}
      </div>

      {modalOpen && (
        <Modal
          title="Create New Treatment Plan"
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="df-btn df-btn-secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button className="df-btn df-btn-primary" onClick={handleCreatePlan}>
                Create Plan
              </button>
            </>
          }
        >
          <div className="df-form-2col">
            <div className="df-form-group">
              <label className="df-label">Patient Name</label>
              <input
                className="df-input"
                value={newPlan.patient}
                onChange={(e) => setNewPlan({ ...newPlan, patient: e.target.value })}
                required
              />
            </div>
            <div className="df-form-group">
              <label className="df-label">Treating Dentist</label>
              <input
                className="df-input"
                value={newPlan.doctor}
                onChange={(e) => setNewPlan({ ...newPlan, doctor: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="df-form-group" style={{ marginTop: 14 }}>
            <label className="df-label">Procedure / Treatment Type</label>
            <input
              className="df-input"
              value={newPlan.procedure}
              onChange={(e) => setNewPlan({ ...newPlan, procedure: e.target.value })}
              placeholder="e.g. Ceramic Veneers (6 teeth)"
              required
            />
          </div>

          <div className="df-form-2col" style={{ marginTop: 14 }}>
            <div className="df-form-group">
              <label className="df-label">Estimated Total Cost</label>
              <input
                className="df-input"
                value={newPlan.estimatedCost}
                onChange={(e) => setNewPlan({ ...newPlan, estimatedCost: e.target.value })}
                placeholder="LKR 120,000"
              />
            </div>
            <div className="df-form-group">
              <label className="df-label">Initial Stage</label>
              <select
                className="df-select"
                value={newPlan.stage}
                onChange={(e) => setNewPlan({ ...newPlan, stage: e.target.value })}
              >
                <option value="Stage 1: Diagnosis & 3D Imaging">Stage 1: Diagnosis & 3D Imaging</option>
                <option value="Stage 2: Surgical Prep">Stage 2: Surgical Prep</option>
                <option value="Stage 3: Fixture Placement">Stage 3: Fixture Placement</option>
                <option value="Stage 4: Crown Delivery">Stage 4: Crown Delivery</option>
              </select>
            </div>
          </div>
        </Modal>
      )}

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
    </div>
  );
}

export function DoctorMessagesView({ role }) {
  const { addToast } = useNotifications();
  const [activeThreadId, setActiveThreadId] = useState(1);
  const [replyText, setReplyText] = useState("");

  const threads = [
    {
      id: 1,
      sender: "Emma (Front Desk)",
      role: "Receptionist",
      subject: "Urgent: Acute pain walk-in patient in Room 102",
      preview: "Patient Amanda Foster arrived with severe lower molar pain.",
      time: "10:15 AM",
      messages: [
        { id: 1, sender: "Emma", text: "Dr. Wilson, patient Amanda Foster has arrived with severe lower right molar pain. She's seated in Room 102.", time: "10:15 AM", incoming: true },
        { id: 2, sender: "You", text: "Thank you Emma. Please check her blood pressure and have a periapical X-Ray taken.", time: "10:18 AM", incoming: false },
        { id: 3, sender: "Emma", text: "X-ray taken and uploaded to Medical Records. Patient is ready for your evaluation.", time: "10:22 AM", incoming: true },
      ],
    },
    {
      id: 2,
      sender: "Lisa Thompson",
      role: "Pharmacist",
      subject: "Amoxicillin alternative for David Chen",
      preview: "Patient reports mild rash from penicillin.",
      time: "Yesterday",
      messages: [
        { id: 1, sender: "Lisa", text: "Hi Doctor, David Chen mentioned a prior rash from penicillin. Would you like to substitute with Clindamycin 300mg?", time: "Yesterday 3:30 PM", incoming: true },
        { id: 2, sender: "You", text: "Yes please, prescribe Clindamycin 300mg 3x daily for 5 days. Updated on his chart.", time: "Yesterday 3:45 PM", incoming: false },
      ],
    },
    {
      id: 3,
      sender: "Sarah Mitchell",
      role: "Patient",
      subject: "Post-op sensitivity after filling",
      preview: "Is cold sensitivity normal 24 hours after?",
      time: "Mar 13",
      messages: [
        { id: 1, sender: "Sarah", text: "Hello Dr. Wilson, my tooth feels slightly sensitive to cold water today. Should I be concerned?", time: "Mar 13, 11:00 AM", incoming: true },
        { id: 2, sender: "You", text: "Mild cold sensitivity for 48 hours is completely normal as the pulp settles. Take Ibuprofen as directed and let us know if pain throbs.", time: "Mar 13, 11:30 AM", incoming: false },
      ],
    },
  ];

  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0];

  const handleSend = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    activeThread.messages.push({
      id: nextId("MSG"),
      sender: "You",
      text: replyText.trim(),
      time: "Just now",
      incoming: false,
    });
    addToast("Message sent successfully", "success");
    setReplyText("");
  };

  return (
    <div className={`df-role-page df-role-teal`}>
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Messages" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Intra-Clinic Comms</span>
          <h1>Clinical Messages & Consult Requests</h1>
          <p>Direct communication channel with front desk, pharmacy, dental assistants, and patients.</p>
        </div>
      </header>

      <div className="df-chat-layout">
        <div className="df-chat-threads">
          <div style={{ padding: "12px 14px", fontWeight: 700, fontSize: 13, borderBottom: "1px solid var(--df-border)" }}>
            Inbox ({threads.length})
          </div>
          {threads.map((t) => (
            <div
              key={t.id}
              className={`df-chat-thread-item ${t.id === activeThreadId ? "active" : ""}`}
              onClick={() => setActiveThreadId(t.id)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <strong>{t.sender}</strong>
                <small style={{ color: "var(--df-text-muted)" }}>{t.time}</small>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--df-primary-600)" }}>{t.subject}</div>
              <p style={{ fontSize: 12, color: "var(--df-text-secondary)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t.preview}
              </p>
            </div>
          ))}
        </div>

        <div className="df-chat-main">
          <div className="df-chat-header">
            <div>
              <strong style={{ fontSize: 15 }}>{activeThread.sender}</strong>
              <div style={{ fontSize: 12, color: "var(--df-text-secondary)" }}>{activeThread.subject}</div>
            </div>
            <span className="df-badge df-badge-primary">{activeThread.role}</span>
          </div>

          <div className="df-chat-messages-area">
            {activeThread.messages.map((m) => (
              <div key={m.id} className={`df-chat-bubble ${m.incoming ? "incoming" : "outgoing"}`}>
                <div>{m.text}</div>
                <small style={{ display: "block", textAlign: "right", marginTop: 4, opacity: 0.8, fontSize: 10 }}>
                  {m.time}
                </small>
              </div>
            ))}
          </div>

          <form onSubmit={handleSend} className="df-chat-compose">
            <input
              className="df-input"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your clinical response..."
              style={{ flex: 1 }}
            />
            <button className="df-btn df-btn-primary" type="submit">
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function ScheduleView({ role }) {
  const { collections, saveRecord } = useDashboardData();
  const { addToast } = useNotifications();
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [realSchedules, setRealSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadScheduleData() {
      try {
        setLoading(true);
        const [dentists, availability] = await Promise.all([
          dentistApi.getAllDentists().catch(() => []),
          dentistApi.getAllAvailability().catch(() => []),
        ]);

        if (mounted && availability.length > 0) {
          const dLookup = {};
          dentists.forEach((d) => { dLookup[d.id] = d; });

          const byDentist = {};
          availability.forEach((a) => {
            if (!byDentist[a.dentistId]) byDentist[a.dentistId] = [];
            byDentist[a.dentistId].push(a);
          });

          const rows = Object.entries(byDentist).map(([dentistId, items], idx) => {
            const doc = dLookup[dentistId];
            const days = items.map((i) => i.dayOfWeek.slice(0, 3)).join(", ");
            const sample = items[0];
            const timeRange = sample?.startTime && sample?.endTime
              ? `${sample.startTime.slice(0, 5)} - ${sample.endTime.slice(0, 5)}`
              : "09:00 - 17:00";

            return {
              id: Number(dentistId),
              doctor: doc?.name || `Dr. Dentist #${dentistId}`,
              day: days || "Mon - Sat",
              time: timeRange,
              room: `Operatory ${101 + idx}`,
              maxPatients: String(items.length * 12),
              status: items.some((i) => i.available) ? "active" : "disabled",
            };
          });

          if (rows.length > 0) setRealSchedules(rows);
        }
      } catch (err) {
        console.warn("Could not load schedules from API:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadScheduleData();
    return () => { mounted = false; };
  }, []);

  const schedules = realSchedules.length > 0 ? realSchedules : (collections.schedule || []);

  const handleSaveSchedule = () => {
    if (!editingSchedule) return;
    saveRecord("schedule", editingSchedule);
    addToast(`Duty schedule updated for ${editingSchedule.doctor}!`, "success");
    setEditingSchedule(null);
  };

  return (
    <div className={`df-role-page df-role-teal`}>
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Doctor Schedule" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Clinic Rosters</span>
          <h1>Doctor Duty Schedule & Availability</h1>
          <p>Consultation hours, dental chair room allocations, and daily patient capacity.</p>
        </div>
      </header>

      <div className="df-stat-grid">
        <StatCard label="Consultants on Duty" value={String(schedules.length)} icon="◫" color="primary" />
        <StatCard label="Active Dental Chairs" value="5 Operatories" icon="◈" color="success" />
        <StatCard label="Operating Hours" value="08:00 AM - 06:00 PM" icon="◷" color="primary" />
        <StatCard label="Daily Capacity" value="75 Patients/Day" icon="✓" color="primary" />
      </div>

      <section className="df-card">
        <div className="df-card-body">
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
              <p>Loading clinic duty schedules...</p>
            </div>
          ) : (
            <DataTable
              columns={[
                { key: "doctor", label: "Consulting Dentist" },
                { key: "day", label: "Assigned Days" },
                { key: "time", label: "Shift Hours" },
                { key: "room", label: "Operatory Room" },
                { key: "maxPatients", label: "Max Patients" },
                { key: "status", label: "Availability", type: "status" },
              ]}
              rows={schedules}
              actionLabel="Edit Shift"
              onEdit={(row) => setEditingSchedule(row)}
            />
          )}
        </div>
      </section>

      {editingSchedule && (
        <Modal
          title={`Edit Shift: ${editingSchedule.doctor}`}
          onClose={() => setEditingSchedule(null)}
          footer={
            <>
              <button className="df-btn df-btn-secondary" onClick={() => setEditingSchedule(null)}>
                Cancel
              </button>
              <button className="df-btn df-btn-primary" onClick={handleSaveSchedule}>
                Save Shift
              </button>
            </>
          }
        >
          <div className="df-form-2col">
            <div className="df-form-group">
              <label className="df-label">Working Days</label>
              <input
                className="df-input"
                value={editingSchedule.day}
                onChange={(e) => setEditingSchedule({ ...editingSchedule, day: e.target.value })}
              />
            </div>
            <div className="df-form-group">
              <label className="df-label">Shift Hours</label>
              <input
                className="df-input"
                value={editingSchedule.time}
                onChange={(e) => setEditingSchedule({ ...editingSchedule, time: e.target.value })}
              />
            </div>
          </div>

          <div className="df-form-2col" style={{ marginTop: 14 }}>
            <div className="df-form-group">
              <label className="df-label">Operatory Room</label>
              <select
                className="df-select"
                value={editingSchedule.room}
                onChange={(e) => setEditingSchedule({ ...editingSchedule, room: e.target.value })}
              >
                <option value="Room 101">Room 101 (Oral Surgery)</option>
                <option value="Room 102">Room 102 (Orthodontics)</option>
                <option value="Room 103">Room 103 (Cosmetic & Whitening)</option>
                <option value="Room 104">Room 104 (Endodontics)</option>
                <option value="Room 105">Room 105 (Pediatric Care)</option>
              </select>
            </div>
            <div className="df-form-group">
              <label className="df-label">Max Patients / Day</label>
              <input
                type="number"
                className="df-input"
                value={editingSchedule.maxPatients}
                onChange={(e) => setEditingSchedule({ ...editingSchedule, maxPatients: e.target.value })}
              />
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
        dentist = await dentistApi.getDentistByUserId(user.id);
      }

      const dentistId = dentist?.id || 1;
      const [appts, patients] = await Promise.all([
        appointmentApi.getDentistAppointments(dentistId).catch(() => []),
        patientApi.getAllPatients().catch(() => []),
      ]);

      const pLookup = {};
      patients.forEach((p) => { pLookup[p.id] = p; });
      const dLookup = dentist ? { [dentist.id]: dentist } : {};

      const normalized = appts.map((a) => normalizeAppointment(a, dLookup, pLookup));
      if (normalized.length > 0) {
        setDoctorAppts(normalized);
      }
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

  const appointments = doctorAppts.length > 0 ? doctorAppts : (collections.appointments || []);

  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      const matchQuery = `${a.patient} ${a.service} ${a.reason || ""}`.toLowerCase().includes(query.toLowerCase());
      const matchStatus =
        activeTab === "all"
          ? true
          : activeTab === "confirmed"
          ? (a.status === "confirmed" || a.status === "booked" || a.status === "rescheduled")
          : activeTab === "in-consultation"
          ? a.status === "in-consultation"
          : activeTab === "completed"
          ? a.status === "completed"
          : (a.status === "cancelled" || a.status === "no_show");
      return matchQuery && matchStatus;
    });
  }, [appointments, query, activeTab]);

  const handleStartConsult = (appt) => {
    setDoctorAppts((prev) => prev.map((a) => (a.id === appt.id ? { ...a, status: "in-consultation" } : a)));
    saveRecord("appointments", { ...appt, status: "in-consultation" });
    addToast(`Started consultation for ${appt.patient}`, "info");
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
    <div className="df-role-page df-role-teal">
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
          value={String(appointments.filter((a) => a.status === "confirmed" || a.status === "pending").length)}
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
          { label: "Confirmed", value: "confirmed" },
          { label: "In Consultation", value: "in-consultation" },
          { label: "Completed", value: "completed" },
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

export function DoctorRecordsView({ role = "doctor", isHistory = false }) {
  const { collections, saveRecord } = useDashboardData();
  const { addToast } = useNotifications();
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [inspectModal, setInspectModal] = useState(null);
  const [apiRecords, setApiRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [currentDentist, setCurrentDentist] = useState(null);

  const [newRec, setNewRec] = useState({
    patient: "Sarah Mitchell",
    title: "Molar Restoration & Scaling",
    type: "Treatment",
    doctor: "Dr. James Wilson",
    notes: "Restoration completed successfully under local anesthesia.",
  });

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
          setNewRec((prev) => ({ ...prev, doctor: dName }));
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

  const handleAddRecord = async (e) => {
    e.preventDefault();
    if (!newRec.title.trim() || !newRec.notes.trim()) return;

    try {
      const matchedPat = patients.find(
        (p) =>
          `${p.firstName || ""} ${p.lastName || ""}`.toLowerCase().trim() === newRec.patient.toLowerCase().trim() ||
          p.name?.toLowerCase().trim() === newRec.patient.toLowerCase().trim()
      );
      const patientId = matchedPat?.id || (patients[0]?.id || 1);
      const dentistId = currentDentist?.id || (dentists[0]?.id || 1);
      const todayIso = new Date().toISOString().slice(0, 10);

      let backendType = "GENERAL";
      const t = (newRec.type || "").toUpperCase();
      if (t.includes("TREATMENT")) backendType = "TREATMENT";
      else if (t.includes("DIAGNOSIS")) backendType = "DIAGNOSIS";
      else if (t.includes("RAY")) backendType = "RADIOLOGY";
      else if (t.includes("CONSULT")) backendType = "CONSULTATION";

      const created = await medicalRecordsApi.createMedicalRecord(patientId, dentistId, {
        recordDate: todayIso,
        recordType: backendType,
        diagnosis: newRec.title,
        clinicalNotes: newRec.notes,
        symptoms: "Clinical examination and charting",
        status: "ACTIVE",
      });

      const pLookup = { [patientId]: matchedPat || { name: newRec.patient } };
      const dLookup = { [dentistId]: currentDentist || { name: newRec.doctor } };
      const normalized = normalizeMedicalRecord(created, pLookup, dLookup);

      setApiRecords((prev) => [normalized, ...prev]);
      saveRecord("records", normalized);
      addToast(`Dental record added for ${normalized.patient}!`, "success");
      setModalOpen(false);
      setNewRec((prev) => ({
        ...prev,
        title: "",
        notes: "",
      }));
    } catch (err) {
      console.warn("Backend record creation failed, falling back to local:", err);
      const recordObj = {
        id: nextId("REC"),
        date: new Date().toISOString().slice(0, 10),
        ...newRec,
      };
      saveRecord("records", recordObj);
      setApiRecords((prev) => [recordObj, ...prev]);
      addToast(`Dental record added for ${recordObj.patient}!`, "success");
      setModalOpen(false);
      setNewRec((prev) => ({
        ...prev,
        title: "",
        notes: "",
      }));
    }
  };

  const breadcrumbLabel = isHistory ? "Medical History" : "Patient Records";
  const pageTitle = isHistory
    ? "Patient Medical History & Treatment Archive"
    : "Dental Clinical Records & History";
  const pageDesc = isHistory
    ? "Review historical patient dental charts, past clinical interventions, and longitudinal oral health outcomes."
    : "Document patient diagnoses, operative treatments, radiographs, and post-procedure progress.";

  const diagCount = records.filter((r) => r.type === "Diagnosis" || (r.raw?.recordType || "").includes("DIAG")).length;
  const treatCount = records.filter((r) => r.type === "Treatment" || (r.raw?.recordType || "").includes("TREAT")).length;
  const rayCount = records.filter((r) => r.type === "X-Ray" || (r.raw?.recordType || "").includes("RADIO")).length;

  return (
    <div className="df-role-page df-role-teal">
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: breadcrumbLabel }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Clinical Charting</span>
          <h1>{pageTitle}</h1>
          <p>{pageDesc}</p>
        </div>
        <button className="df-btn df-btn-primary" onClick={() => setModalOpen(true)}>
          + Add Clinical Record
        </button>
      </header>

      <div className="df-stat-grid">
        <StatCard label="Total Dental Records" value={String(records.length)} icon="◫" color="primary" />
        <StatCard label="Diagnostic Reports" value={String(diagCount || 2)} icon="◈" color="primary" />
        <StatCard label="Operative Procedures" value={String(treatCount || Math.max(0, records.length - 1))} icon="✓" color="success" />
        <StatCard label="Imaging Attached" value={`${rayCount || 1} Radiographs`} icon="◷" color="primary" />
      </div>

      <section className="df-card">
        <div className="df-card-body">
          <DataTable
            columns={[
              { key: "id", label: "Record #" },
              { key: "title", label: "Procedure / Diagnosis" },
              { key: "type", label: "Category" },
              { key: "patient", label: "Patient Name" },
              { key: "doctor", label: "Attending Dentist" },
              { key: "date", label: "Date" },
            ]}
            rows={records}
            actionLabel="Inspect"
            onEdit={(row) => setInspectModal(row)}
          />
        </div>
      </section>

      {modalOpen && (
        <Modal
          title="Add Patient Clinical Record"
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="df-btn df-btn-secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button className="df-btn df-btn-primary" onClick={handleAddRecord}>
                Save Clinical Record
              </button>
            </>
          }
        >
          <div className="df-form-2col">
            <div className="df-form-group">
              <label className="df-label">Patient Name *</label>
              <input
                className="df-input"
                value={newRec.patient}
                onChange={(e) => setNewRec({ ...newRec, patient: e.target.value })}
                required
              />
            </div>
            <div className="df-form-group">
              <label className="df-label">Record Category</label>
              <select
                className="df-select"
                value={newRec.type}
                onChange={(e) => setNewRec({ ...newRec, type: e.target.value })}
              >
                <option value="Treatment">Treatment / Operative</option>
                <option value="Diagnosis">Clinical Diagnosis</option>
                <option value="X-Ray">Radiograph (X-Ray / 3D CT)</option>
                <option value="Consultation">General Consultation</option>
              </select>
            </div>
          </div>

          <div className="df-form-group" style={{ marginTop: 14 }}>
            <label className="df-label">Record Title & Tooth Number *</label>
            <input
              className="df-input"
              value={newRec.title}
              onChange={(e) => setNewRec({ ...newRec, title: e.target.value })}
              placeholder="e.g. Resin Composite Filling - Tooth #16"
              required
            />
          </div>

          <div className="df-form-group" style={{ marginTop: 14 }}>
            <label className="df-label">Clinical Findings & Operative Notes *</label>
            <textarea
              className="df-input"
              rows={4}
              value={newRec.notes}
              onChange={(e) => setNewRec({ ...newRec, notes: e.target.value })}
              placeholder="Record decay depth, anesthesia used, restoration material, patient tolerance..."
              required
            />
          </div>
        </Modal>
      )}

      {inspectModal && (
        <Modal
          title={`Clinical Record: ${inspectModal.title || inspectModal.id}`}
          onClose={() => setInspectModal(null)}
          footer={
            <button className="df-btn df-btn-primary" onClick={() => setInspectModal(null)}>
              Close
            </button>
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
              <small style={{ color: "var(--df-text-muted)" }}>Patient</small>
              <div style={{ fontWeight: 600 }}>{inspectModal.patient}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Attending Specialist</small>
              <div style={{ fontWeight: 600 }}>{inspectModal.doctor}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Examination Date</small>
              <div style={{ fontWeight: 600 }}>{inspectModal.date}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Status</small>
              <div style={{ fontWeight: 600 }}>{(inspectModal.status || "active").toUpperCase()}</div>
            </div>
          </div>

          <div style={{ marginTop: 14, padding: 12, background: "var(--df-gray-50)", borderRadius: 6 }}>
            <strong>Procedure / Diagnosis:</strong>
            <p style={{ marginTop: 4, color: "var(--df-text-secondary)" }}>{inspectModal.title}</p>
          </div>

          <div style={{ marginTop: 14, padding: 12, background: "var(--df-gray-50)", borderRadius: 6 }}>
            <strong>Clinical Findings & Operative Notes:</strong>
            <p style={{ marginTop: 4, color: "var(--df-text-secondary)", lineHeight: 1.5 }}>{inspectModal.notes}</p>
          </div>

          {inspectModal.allergies && (
            <div style={{ marginTop: 10, padding: 10, background: "rgba(239, 68, 68, 0.08)", borderRadius: 6, color: "var(--df-danger)" }}>
              <strong>Allergies:</strong> {inspectModal.allergies}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

export function DoctorPrescriptionsView({ role }) {
  const { collections, saveRecord } = useDashboardData();
  const { addToast } = useNotifications();
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [currentDentist, setCurrentDentist] = useState(null);
  const [newRx, setNewRx] = useState({
    patient: "Sarah Mitchell",
    doctor: "Dr. James Wilson",
    medicineName: "Amoxicillin 500mg",
    dosage: "1 capsule",
    freq: "3 times daily",
    duration: "7 days",
    instructions: "Take with food. Complete entire course.",
  });

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
          myDentist = allDentists.find((d) => d.userId === user.id || d.id === user.id) || allDentists[0];
        }
        setCurrentDentist(myDentist);
        if (myDentist) {
          const dName = myDentist.name || `Dr. ${myDentist.firstName || ""} ${myDentist.lastName || ""}`.trim();
          setNewRx((prev) => ({ ...prev, doctor: dName }));
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

  const handleIssueRx = async (e) => {
    e.preventDefault();
    if (!newRx.medicineName.trim()) return;

    try {
      const matchedPat = patients.find(
        (p) =>
          `${p.firstName || ""} ${p.lastName || ""}`.toLowerCase().trim() === newRx.patient.toLowerCase().trim() ||
          p.name?.toLowerCase().trim() === newRx.patient.toLowerCase().trim()
      );
      const patientId = matchedPat?.id || (patients[0]?.id || 1);
      const dentistId = currentDentist?.id || (dentists[0]?.id || 1);
      const todayIso = new Date().toISOString().slice(0, 10);

      const created = await pharmacyApi.createPrescription({
        patientId,
        dentistId,
        prescriptionDate: todayIso,
        diagnosis: "Dental Treatment",
        instructions: newRx.instructions,
        dentistNotes: `Dosage: ${newRx.dosage}, Duration: ${newRx.duration}`,
        status: "ACTIVE",
      });

      const matchedMed = medicines.find(
        (m) => m.name?.toLowerCase().includes(newRx.medicineName.toLowerCase().slice(0, 5))
      );
      if (matchedMed && created?.id) {
        await pharmacyApi.addPrescriptionMedicine(created.id, matchedMed.id, {
          dosage: newRx.dosage || "1 dose",
          frequency: newRx.freq || "3x daily",
          durationDays: parseInt(newRx.duration, 10) || 5,
          quantity: 15,
          route: "ORAL",
          instructions: newRx.instructions,
        }).catch((err) => console.warn("Could not add prescription medicine item:", err));
      }

      const pLookup = { [patientId]: matchedPat || { name: newRx.patient } };
      const dLookup = { [dentistId]: currentDentist || { name: newRx.doctor } };
      const normalizedNew = normalizePrescription(created, pLookup, dLookup, [
        {
          id: Date.now(),
          medicine: matchedMed || { name: newRx.medicineName },
          dosage: newRx.dosage || "1 dose",
          frequency: newRx.freq || "3x daily",
          durationDays: parseInt(newRx.duration, 10) || 5,
        },
      ]);
      setPrescriptions((prev) => [normalizedNew, ...prev]);
      saveRecord("prescriptions", normalizedNew);
      addToast(`Prescription ${created.prescriptionCode || `RX-${created.id}`} issued for ${newRx.patient}! Sent to Pharmacy.`, "success");
      setModalOpen(false);
    } catch (err) {
      console.warn("Backend prescription creation failed, falling back to local:", err);
      const rxObj = {
        id: nextId("RX"),
        patient: newRx.patient,
        doctor: newRx.doctor,
        date: new Date().toISOString().slice(0, 10),
        status: "ready",
        medicine: `${newRx.medicineName} (${newRx.dosage}, ${newRx.freq})`,
        medicines: [
          {
            name: newRx.medicineName,
            dosage: newRx.dosage,
            freq: newRx.freq,
            duration: newRx.duration,
          },
        ],
        instructions: newRx.instructions,
      };
      saveRecord("prescriptions", rxObj);
      setPrescriptions((prev) => [rxObj, ...prev]);
      addToast(`Prescription ${rxObj.id} issued for ${rxObj.patient}! Sent to Pharmacy.`, "success");
      setModalOpen(false);
    }
  };

  return (
    <div className="df-role-page df-role-teal">
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Prescriptions" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Pharmacotherapy</span>
          <h1>Clinical Prescriptions Management</h1>
          <p>Issue electronic medical prescriptions directly linked to the hospital dispensing pharmacy.</p>
        </div>
        <button className="df-btn df-btn-primary" onClick={() => setModalOpen(true)}>
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
        <StatCard label="Prescription Security" value="Digitally Signed" icon="◈" color="primary" />
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
            actionLabel="View Details"
            onEdit={(row) => addToast(`Prescription ${row.id}: ${row.instructions || "Standard dose"}`, "info")}
          />
        </div>
      </section>

      {modalOpen && (
        <Modal
          title="Issue Electronic Dental Prescription"
          onClose={() => setModalOpen(false)}
          footer={
            <>
              <button className="df-btn df-btn-secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button className="df-btn df-btn-primary" onClick={handleIssueRx}>
                ✓ Issue & Send to Pharmacy
              </button>
            </>
          }
        >
          <div className="df-form-2col">
            <div className="df-form-group">
              <label className="df-label">Patient Name *</label>
              <input
                className="df-input"
                value={newRx.patient}
                onChange={(e) => setNewRx({ ...newRx, patient: e.target.value })}
                required
              />
            </div>
            <div className="df-form-group">
              <label className="df-label">Attending Dentist</label>
              <input className="df-input" value={newRx.doctor} disabled />
            </div>
          </div>

          <div className="df-form-2col" style={{ marginTop: 14 }}>
            <div className="df-form-group">
              <label className="df-label">Medication Name *</label>
              <select
                className="df-select"
                value={newRx.medicineName}
                onChange={(e) => setNewRx({ ...newRx, medicineName: e.target.value })}
              >
                {medicines.length > 0 ? (
                  medicines.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name} ({m.category || "Medicine"})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Amoxicillin 500mg">Amoxicillin 500mg (Antibiotic)</option>
                    <option value="Ibuprofen 400mg">Ibuprofen 400mg (Analgesic / Anti-inflammatory)</option>
                    <option value="Chlorhexidine 0.2% Mouthwash">Chlorhexidine 0.2% Mouthwash (Antiseptic)</option>
                    <option value="Paracetamol 500mg">Paracetamol 500mg (Pain relief)</option>
                    <option value="Metronidazole 400mg">Metronidazole 400mg (Periodontal antibiotic)</option>
                  </>
                )}
              </select>
            </div>
            <div className="df-form-group">
              <label className="df-label">Dosage & Frequency</label>
              <input
                className="df-input"
                value={newRx.dosage}
                onChange={(e) => setNewRx({ ...newRx, dosage: e.target.value })}
                placeholder="e.g. 1 tablet every 8 hours"
              />
            </div>
          </div>

          <div className="df-form-2col" style={{ marginTop: 14 }}>
            <div className="df-form-group">
              <label className="df-label">Duration</label>
              <input
                className="df-input"
                value={newRx.duration}
                onChange={(e) => setNewRx({ ...newRx, duration: e.target.value })}
                placeholder="e.g. 5 days"
              />
            </div>
            <div className="df-form-group">
              <label className="df-label">Patient Instructions</label>
              <input
                className="df-input"
                value={newRx.instructions}
                onChange={(e) => setNewRx({ ...newRx, instructions: e.target.value })}
                placeholder="e.g. Take after meals with plenty of water"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

