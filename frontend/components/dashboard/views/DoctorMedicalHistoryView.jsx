import { useState, useMemo, useEffect } from "react";
import {
  Breadcrumbs,
  Modal,
} from "../DashboardPrimitives";
import { useNotifications } from "../../../context/NotificationContext";
import patientApi from "../../../api/patients";
import medicalRecordsApi, { normalizeMedicalRecord } from "../../../api/medicalRecords";
import dentistApi from "../../../api/dentists";
import "../../../styles/MedicalHistory.css";

// Helper to compute age from date of birth
function computeAge(dobStr) {
  if (!dobStr) return "N/A";
  const birthDate = new Date(dobStr);
  if (isNaN(birthDate.getTime())) return "N/A";
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age > 0 ? `${age} yrs` : "<1 yr";
}

// Split comma/semicolon/newline-delimited text into tags
function parseList(str) {
  if (!str) return [];
  return str
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !["none", "nil", "no", "n/a", "none reported"].includes(s.toLowerCase()));
}

export function DoctorMedicalHistoryView({ role = "doctor" }) {
  const { addToast } = useNotifications();

  const [patients, setPatients] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [patientRecords, setPatientRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Edit Medical History Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [medForm, setMedForm] = useState({
    allergies: "",
    medicalConditions: "",
    currentMedications: "",
    previousSurgeries: "",
    medicalNotes: "",
    bloodGroup: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  });

  // Local surgery & clinical notes store per patient (persisted in session/local state)
  const [localHistoryStore, setLocalHistoryStore] = useState(() => {
    try {
      const saved = localStorage.getItem("df_patient_medical_history_extra");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Load patients and dentists on mount
  useEffect(() => {
    let active = true;
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const [allPatients, allDentists] = await Promise.all([
          patientApi.getAllPatients().catch(() => []),
          dentistApi.getAllDentists().catch(() => []),
        ]);

        if (!active) return;
        setPatients(allPatients);
        setDentists(allDentists);

        if (allPatients.length > 0) {
          setSelectedPatientId((prev) => prev || allPatients[0].id);
        }
      } catch (err) {
        console.warn("Failed to load patient history initial data:", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchInitialData();
    return () => {
      active = false;
    };
  }, []);

  // Currently selected patient object
  const selectedPatient = useMemo(() => {
    return patients.find((p) => String(p.id) === String(selectedPatientId)) || patients[0] || null;
  }, [patients, selectedPatientId]);

  // Load records for selected patient
  useEffect(() => {
    if (!selectedPatient?.id) return;

    let active = true;
    const loadPatientRecords = async () => {
      setRecordsLoading(true);
      try {
        const dLookup = {};
        dentists.forEach((d) => {
          dLookup[d.id] = d;
        });
        const pLookup = { [selectedPatient.id]: selectedPatient };

        const rawList = await medicalRecordsApi.getPatientMedicalRecords(selectedPatient.id).catch(() => []);
        if (!active) return;

        // Fallback to all records filtered by patient if patient-specific API returns empty
        let finalList = rawList;
        if (!finalList || finalList.length === 0) {
          const allRecs = await medicalRecordsApi.getAllMedicalRecords().catch(() => []);
          finalList = allRecs.filter(
            (r) =>
              String(r.patientId) === String(selectedPatient.id) ||
              String(r.patient_id) === String(selectedPatient.id)
          );
        }

        const normalized = finalList.map((r) => normalizeMedicalRecord(r, pLookup, dLookup));
        // Sort newest first
        normalized.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        setPatientRecords(normalized);
      } catch (err) {
        console.warn("Failed to load records for patient history:", err);
        if (active) setPatientRecords([]);
      } finally {
        if (active) setRecordsLoading(false);
      }
    };

    loadPatientRecords();
    return () => {
      active = false;
    };
  }, [selectedPatient, dentists]);

  // Search filtered patients list
  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients;
    const q = searchQuery.toLowerCase().trim();
    return patients.filter((p) => {
      const name = `${p.firstName || ""} ${p.lastName || ""} ${p.name || ""}`.toLowerCase();
      const code = (p.patientCode || "").toLowerCase();
      const phone = (p.phone || "").toLowerCase();
      const email = (p.email || "").toLowerCase();
      return name.includes(q) || code.includes(q) || phone.includes(q) || email.includes(q);
    });
  }, [patients, searchQuery]);

  // Extra details from local history store
  const patientExtra = useMemo(() => {
    if (!selectedPatient?.id) return {};
    return localHistoryStore[selectedPatient.id] || {};
  }, [selectedPatient, localHistoryStore]);

  // Parse structured data for the selected patient
  const allergiesList = useMemo(() => {
    const fromPatient = parseList(selectedPatient?.allergies);
    const fromExtra = parseList(patientExtra.allergies);
    const combined = Array.from(new Set([...fromPatient, ...fromExtra]));
    return combined;
  }, [selectedPatient, patientExtra]);

  const conditionsList = useMemo(() => {
    const fromPatient = parseList(selectedPatient?.medicalConditions);
    const fromExtra = parseList(patientExtra.medicalConditions);
    const combined = Array.from(new Set([...fromPatient, ...fromExtra]));
    return combined;
  }, [selectedPatient, patientExtra]);

  const medicationsList = useMemo(() => {
    const fromPatient = parseList(selectedPatient?.currentMedications);
    const fromExtra = parseList(patientExtra.currentMedications);
    const combined = Array.from(new Set([...fromPatient, ...fromExtra]));
    return combined;
  }, [selectedPatient, patientExtra]);

  const surgeriesList = useMemo(() => {
    const defaultSurgeries = patientExtra.previousSurgeries
      ? parseList(patientExtra.previousSurgeries)
      : [];
    return defaultSurgeries;
  }, [patientExtra]);

  const medicalNotesText = useMemo(() => {
    return (
      patientExtra.medicalNotes ||
      (allergiesList.length > 0
        ? `Patient has confirmed sensitivity to ${allergiesList.join(", ")}. Verify all dental anesthetic agents, antibiotics, and latex consumables prior to treatment.`
        : "Standard dental precautions apply. No critical medical warnings reported by patient.")
    );
  }, [patientExtra, allergiesList]);

  // Analytical summary of past diagnoses & treatments
  const { pastDiagnoses, pastTreatments } = useMemo(() => {
    const diagMap = {};
    const treatMap = {};

    patientRecords.forEach((r) => {
      if (r.diagnosis && r.diagnosis !== "Clinical Dental Assessment") {
        diagMap[r.diagnosis] = (diagMap[r.diagnosis] || 0) + 1;
      }
      if (r.treatment && r.treatment !== "Standard Treatment Protocol") {
        treatMap[r.treatment] = (treatMap[r.treatment] || 0) + 1;
      } else if (r.title) {
        treatMap[r.title] = (treatMap[r.title] || 0) + 1;
      }
    });

    return {
      pastDiagnoses: Object.entries(diagMap).map(([title, count]) => ({ title, count })),
      pastTreatments: Object.entries(treatMap).map(([title, count]) => ({ title, count })),
    };
  }, [patientRecords]);

  // Open modal with current patient values
  const handleOpenEditModal = () => {
    if (!selectedPatient) return;
    setMedForm({
      allergies: selectedPatient.allergies || patientExtra.allergies || "",
      medicalConditions: selectedPatient.medicalConditions || patientExtra.medicalConditions || "",
      currentMedications: selectedPatient.currentMedications || patientExtra.currentMedications || "",
      previousSurgeries: patientExtra.previousSurgeries || "",
      medicalNotes: patientExtra.medicalNotes || "",
      bloodGroup: selectedPatient.bloodGroup || "Unknown",
      emergencyContactName: selectedPatient.emergencyContactName || "",
      emergencyContactPhone: selectedPatient.emergencyContactPhone || "",
    });
    setEditModalOpen(true);
  };

  // Save updated medical history
  const handleSaveMedicalHistory = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!selectedPatient || isSaving) return;

    setIsSaving(true);
    try {
      // 1. Persist supported fields to Patient API
      const updatedPatient = await patientApi.updatePatient(selectedPatient.id, {
        ...selectedPatient,
        allergies: medForm.allergies.trim(),
        medicalConditions: medForm.medicalConditions.trim(),
        currentMedications: medForm.currentMedications.trim(),
        bloodGroup: medForm.bloodGroup.trim(),
        emergencyContactName: medForm.emergencyContactName.trim(),
        emergencyContactPhone: medForm.emergencyContactPhone.trim(),
      }).catch((err) => {
        console.warn("Backend update failed, persisting locally:", err);
        return {
          ...selectedPatient,
          allergies: medForm.allergies.trim(),
          medicalConditions: medForm.medicalConditions.trim(),
          currentMedications: medForm.currentMedications.trim(),
          bloodGroup: medForm.bloodGroup.trim(),
          emergencyContactName: medForm.emergencyContactName.trim(),
          emergencyContactPhone: medForm.emergencyContactPhone.trim(),
        };
      });

      // Update patient in state list
      setPatients((prev) =>
        prev.map((p) => (p.id === selectedPatient.id ? { ...p, ...updatedPatient } : p))
      );

      // 2. Persist extended medical fields (surgeries, detailed notes) in local history store
      const updatedExtra = {
        ...localHistoryStore,
        [selectedPatient.id]: {
          allergies: medForm.allergies.trim(),
          medicalConditions: medForm.medicalConditions.trim(),
          currentMedications: medForm.currentMedications.trim(),
          previousSurgeries: medForm.previousSurgeries.trim(),
          medicalNotes: medForm.medicalNotes.trim(),
        },
      };
      setLocalHistoryStore(updatedExtra);
      localStorage.setItem("df_patient_medical_history_extra", JSON.stringify(updatedExtra));

      addToast(`Medical history updated successfully for ${selectedPatient.name || "patient"}!`, "success");
      setEditModalOpen(false);
    } catch (err) {
      addToast(err.message || "Failed to update medical history", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const hasHighRiskAlert = allergiesList.length > 0 || conditionsList.length > 0;

  return (
    <div className="df-role-page df-role-blue df-med-history-page">
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Medical History" }]} />

      {/* Header */}
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Clinical Background & Safety</span>
          <h1>Patient Medical & Dental History</h1>
          <p>
            Longitudinal patient health profile, systemic conditions, allergy alerts, past surgical history, and chronological dental journey.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            type="button"
            className="df-btn df-btn-primary"
            onClick={handleOpenEditModal}
            disabled={!selectedPatient}
          >
            ✏️ Update Medical Profile
          </button>
        </div>
      </header>

      {/* Patient Selection & Search Card */}
      <div className="df-patient-selector-card">
        <div className="df-selector-controls">
          <div className="df-selector-group">
            <label htmlFor="patient-search-input">Search Patient by Name / Code / Phone</label>
            <input
              id="patient-search-input"
              className="df-input"
              type="text"
              placeholder="Type to filter patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="df-selector-group">
            <label htmlFor="patient-dropdown-select">Select Active Patient ({filteredPatients.length} available)</label>
            <select
              id="patient-dropdown-select"
              className="df-select"
              value={selectedPatient?.id || ""}
              onChange={(e) => setSelectedPatientId(Number(e.target.value))}
            >
              {filteredPatients.map((p) => {
                const pName = p.name || `${p.firstName || ""} ${p.lastName || ""}`.trim();
                return (
                  <option key={p.id} value={p.id}>
                    {p.patientCode ? `[${p.patientCode}] ` : ""}{pName} ({p.phone || p.email || "No contact"})
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--df-text-muted)" }}>
          Loading patient directory and clinical profiles...
        </div>
      ) : !selectedPatient ? (
        <div className="df-card" style={{ padding: "40px", textAlign: "center" }}>
          <h3>No Patient Selected</h3>
          <p style={{ color: "var(--df-text-secondary)" }}>
            Please select or register a patient to view their comprehensive medical history.
          </p>
        </div>
      ) : (
        <>
          {/* Patient Dossier Header Card */}
          <div className="df-patient-dossier-card">
            <div className="df-dossier-header-row">
              <div className="df-dossier-patient-info">
                <div className="df-dossier-avatar">
                  {(selectedPatient.firstName?.[0] || selectedPatient.name?.[0] || "P").toUpperCase()}
                </div>
                <div className="df-dossier-titles">
                  <h2>
                    {selectedPatient.name || `${selectedPatient.firstName || ""} ${selectedPatient.lastName || ""}`.trim()}
                    <span className="df-code-pill">{selectedPatient.patientCode || `P${String(selectedPatient.id).padStart(4, "0")}`}</span>
                  </h2>
                  <div className="df-dossier-meta">
                    <span>🎂 Age: <strong>{computeAge(selectedPatient.dateOfBirth)}</strong></span>
                    <span>•</span>
                    <span>⚧ Gender: <strong>{selectedPatient.gender || "Unspecified"}</strong></span>
                    <span>•</span>
                    <span>🩸 Blood Group: <strong>{selectedPatient.bloodGroup || "Unknown"}</strong></span>
                  </div>
                </div>
              </div>

              {/* Quick Stat Counter Badges */}
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <div style={{ padding: "8px 14px", borderRadius: "10px", background: "rgba(37, 99, 235, 0.08)", border: "1px solid rgba(37, 99, 235, 0.2)", textAlign: "center" }}>
                  <div style={{ fontSize: "18px", fontWeight: "800", color: "#2563eb" }}>{patientRecords.length}</div>
                  <small style={{ fontSize: "11px", color: "var(--df-text-secondary)", fontWeight: "600" }}>Past Visits</small>
                </div>
                <div style={{ padding: "8px 14px", borderRadius: "10px", background: allergiesList.length > 0 ? "rgba(239, 68, 68, 0.08)" : "rgba(16, 185, 129, 0.08)", border: allergiesList.length > 0 ? "1px solid rgba(239, 68, 68, 0.25)" : "1px solid rgba(16, 185, 129, 0.25)", textAlign: "center" }}>
                  <div style={{ fontSize: "18px", fontWeight: "800", color: allergiesList.length > 0 ? "#dc2626" : "#059669" }}>{allergiesList.length}</div>
                  <small style={{ fontSize: "11px", color: "var(--df-text-secondary)", fontWeight: "600" }}>Allergies</small>
                </div>
                <div style={{ padding: "8px 14px", borderRadius: "10px", background: conditionsList.length > 0 ? "rgba(245, 158, 11, 0.08)" : "rgba(16, 185, 129, 0.08)", border: conditionsList.length > 0 ? "1px solid rgba(245, 158, 11, 0.25)" : "1px solid rgba(16, 185, 129, 0.25)", textAlign: "center" }}>
                  <div style={{ fontSize: "18px", fontWeight: "800", color: conditionsList.length > 0 ? "#b45309" : "#059669" }}>{conditionsList.length}</div>
                  <small style={{ fontSize: "11px", color: "var(--df-text-secondary)", fontWeight: "600" }}>Conditions</small>
                </div>
                <div style={{ padding: "8px 14px", borderRadius: "10px", background: "rgba(147, 51, 234, 0.08)", border: "1px solid rgba(147, 51, 234, 0.25)", textAlign: "center" }}>
                  <div style={{ fontSize: "18px", fontWeight: "800", color: "#7e22ce" }}>{medicationsList.length}</div>
                  <small style={{ fontSize: "11px", color: "var(--df-text-secondary)", fontWeight: "600" }}>Medications</small>
                </div>
              </div>
            </div>

            {/* Contact & Emergency Row */}
            <div className="df-dossier-contacts">
              <div className="df-contact-item">
                <span>📞 Phone:</span>
                <strong>{selectedPatient.phone || "Not provided"}</strong>
              </div>
              <div className="df-contact-item">
                <span>✉️ Email:</span>
                <strong>{selectedPatient.email || "Not provided"}</strong>
              </div>
              <div className="df-contact-item">
                <span>🚨 Emergency Contact:</span>
                <strong>
                  {selectedPatient.emergencyContactName
                    ? `${selectedPatient.emergencyContactName} (${selectedPatient.emergencyContactPhone || "No phone"})`
                    : "None registered"}
                </strong>
              </div>
            </div>

            {/* High Priority Alert Bar */}
            <div className={`df-dossier-alert-bar ${hasHighRiskAlert ? "danger" : "success"}`}>
              {hasHighRiskAlert ? (
                <>
                  <span style={{ fontSize: "18px" }}>⚠️</span>
                  <span>
                    <strong>Clinical Safety Alert:</strong> Patient has recorded medical conditions/allergies. Review drug interactions and local anesthetic vasoconstrictor contraindications before dental procedures.
                  </span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: "18px" }}>✅</span>
                  <span>
                    <strong>Standard Medical Baseline:</strong> No high-risk systemic conditions or drug allergies recorded.
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Medical Baseline Cards Grid */}
          <div className="df-med-grid">
            {/* Box 1: Allergies & Sensitivities */}
            <div className="df-med-card danger">
              <div className="df-med-card-header">
                <div className="df-med-card-title">
                  <div className="df-med-icon-wrap">🛡️</div>
                  <span>Allergies & Sensitivities</span>
                </div>
                <span className={`df-med-tag ${allergiesList.length > 0 ? "danger" : "muted"}`}>
                  {allergiesList.length > 0 ? `${allergiesList.length} Alert` : "None Reported"}
                </span>
              </div>
              <div className="df-med-card-body">
                {allergiesList.length > 0 ? (
                  <div className="df-tag-cloud">
                    {allergiesList.map((alg, idx) => (
                      <span key={idx} className="df-med-tag danger">
                        ⚠️ {alg}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "var(--df-text-secondary)", fontSize: "13px", margin: "8px 0" }}>
                    No known drug or environmental allergies reported (NKDA).
                  </p>
                )}
              </div>
              <div className="df-med-card-note">
                Always cross-check analgesics, antibiotics, and latex gloves before clinical interventions.
              </div>
            </div>

            {/* Box 2: Systemic Medical Conditions */}
            <div className="df-med-card warning">
              <div className="df-med-card-header">
                <div className="df-med-card-title">
                  <div className="df-med-icon-wrap">❤️</div>
                  <span>Medical Conditions</span>
                </div>
                <span className={`df-med-tag ${conditionsList.length > 0 ? "warning" : "muted"}`}>
                  {conditionsList.length > 0 ? `${conditionsList.length} Chronic` : "None Reported"}
                </span>
              </div>
              <div className="df-med-card-body">
                {conditionsList.length > 0 ? (
                  <div className="df-tag-cloud">
                    {conditionsList.map((cond, idx) => (
                      <span key={idx} className="df-med-tag warning">
                        ◈ {cond}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "var(--df-text-secondary)", fontSize: "13px", margin: "8px 0" }}>
                    No systemic cardiovascular, endocrine, or respiratory conditions noted.
                  </p>
                )}
              </div>
              <div className="df-med-card-note" style={{ borderLeftColor: "#f59e0b" }}>
                Evaluate chair position, stress tolerance, and vitals before invasive periodontal/surgical work.
              </div>
            </div>

            {/* Box 3: Current & Previous Medications */}
            <div className="df-med-card info">
              <div className="df-med-card-header">
                <div className="df-med-card-title">
                  <div className="df-med-icon-wrap">💊</div>
                  <span>Current Medications</span>
                </div>
                <span className={`df-med-tag ${medicationsList.length > 0 ? "info" : "muted"}`}>
                  {medicationsList.length > 0 ? `${medicationsList.length} Prescribed` : "None"}
                </span>
              </div>
              <div className="df-med-card-body">
                {medicationsList.length > 0 ? (
                  <div className="df-tag-cloud">
                    {medicationsList.map((med, idx) => (
                      <span key={idx} className="df-med-tag info">
                        ℞ {med}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "var(--df-text-secondary)", fontSize: "13px", margin: "8px 0" }}>
                    Patient is not currently taking daily prescription pharmaceuticals.
                  </p>
                )}
              </div>
              <div className="df-med-card-note">
                Check for anticoagulants, bisphosphonates, or immunosuppressants affecting oral healing.
              </div>
            </div>

            {/* Box 4: Previous Surgeries & Hospitalizations */}
            <div className="df-med-card purple">
              <div className="df-med-card-header">
                <div className="df-med-card-title">
                  <div className="df-med-icon-wrap">✂️</div>
                  <span>Previous Surgeries</span>
                </div>
                <span className={`df-med-tag ${surgeriesList.length > 0 ? "purple" : "muted"}`}>
                  {surgeriesList.length > 0 ? `${surgeriesList.length} Past` : "None"}
                </span>
              </div>
              <div className="df-med-card-body">
                {surgeriesList.length > 0 ? (
                  <div className="df-tag-cloud">
                    {surgeriesList.map((surg, idx) => (
                      <span key={idx} className="df-med-tag purple">
                        🏥 {surg}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "var(--df-text-secondary)", fontSize: "13px", margin: "8px 0" }}>
                    No prior major surgeries or oral maxillofacial hospitalizations recorded.
                  </p>
                )}
              </div>
              <div className="df-med-card-note" style={{ borderLeftColor: "#9333ea" }}>
                Verify prosthetic joints or cardiac implants that may warrant antibiotic prophylaxis.
              </div>
            </div>
          </div>

          {/* Important Medical Notes Card */}
          <div className="df-card" style={{ marginBottom: "24px", padding: "18px 22px", background: "rgba(254, 243, 199, 0.4)", border: "1px solid rgba(245, 158, 11, 0.4)" }}>
            <h4 style={{ margin: "0 0 8px", color: "#92400e", display: "flex", alignItems: "center", gap: "8px", fontSize: "15px", fontWeight: "700" }}>
              ⚠️ Critical Medical Notes & Dentist Precautions
            </h4>
            <p style={{ margin: 0, fontSize: "13.5px", color: "#78350f", lineHeight: "1.5" }}>
              {medicalNotesText}
            </p>
          </div>

          {/* Analytical Summary: Previous Diagnoses & Dental Treatments */}
          <div className="df-analytics-2col">
            {/* Previous Diagnoses Box */}
            <div className="df-analytics-box">
              <h4>🩺 Previous Diagnoses History ({pastDiagnoses.length})</h4>
              {pastDiagnoses.length === 0 ? (
                <p style={{ color: "var(--df-text-muted)", fontSize: "13px", margin: "10px 0" }}>
                  No prior clinical dental diagnoses logged in the system.
                </p>
              ) : (
                <ul className="df-history-list">
                  {pastDiagnoses.map((item, idx) => (
                    <li key={idx} className="df-history-item">
                      <div className="df-history-item-left">
                        <span>🔍</span>
                        <span>{item.title}</span>
                      </div>
                      <span className="df-history-count-badge">{item.count} encounter{item.count > 1 ? "s" : ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Previous Treatments Box */}
            <div className="df-analytics-box">
              <h4>🦷 Completed Dental Procedures ({pastTreatments.length})</h4>
              {pastTreatments.length === 0 ? (
                <p style={{ color: "var(--df-text-muted)", fontSize: "13px", margin: "10px 0" }}>
                  No previous operative treatments completed yet.
                </p>
              ) : (
                <ul className="df-history-list">
                  {pastTreatments.map((item, idx) => (
                    <li key={idx} className="df-history-item">
                      <div className="df-history-item-left">
                        <span>✓</span>
                        <span>{item.title}</span>
                      </div>
                      <span className="df-history-count-badge" style={{ background: "rgba(16, 185, 129, 0.1)", color: "#059669" }}>
                        {item.count} procedure{item.count > 1 ? "s" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Chronological Timeline of Dental & Medical Events */}
          <div className="df-timeline-card-wrapper">
            <div className="df-timeline-header">
              <div>
                <h3>📅 Chronological Timeline of Dental & Medical Events</h3>
                <small style={{ color: "var(--df-text-secondary)", fontSize: "12.5px" }}>
                  Full longitudinal audit of patient encounters, treatments, radiographic sessions, and clinical outcomes.
                </small>
              </div>
              <span className="df-code-pill" style={{ background: "rgba(37, 99, 235, 0.08)", color: "#2563eb" }}>
                {patientRecords.length} Historical Milestone{patientRecords.length !== 1 ? "s" : ""}
              </span>
            </div>

            {recordsLoading ? (
              <div style={{ padding: "30px", textAlign: "center", color: "var(--df-text-muted)" }}>
                Loading encounter timeline...
              </div>
            ) : patientRecords.length === 0 ? (
              <div style={{ padding: "30px", textAlign: "center", color: "var(--df-text-muted)" }}>
                <p style={{ fontSize: "15px", marginBottom: "6px" }}>No previous clinical records logged for this patient.</p>
                <small>Past treatments and examination records will automatically populate here as encounters occur.</small>
              </div>
            ) : (
              <div className="df-timeline">
                {patientRecords.map((rec) => (
                  <div key={rec.id} className="df-timeline-item">
                    <div className="df-timeline-dot" />
                    <div className="df-timeline-content">
                      <div className="df-timeline-top">
                        <div className="df-timeline-title">
                          {rec.diagnosis || rec.treatment || rec.title}
                        </div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <span
                            className="df-code-pill"
                            style={{
                              background:
                                rec.type === "Treatment"
                                  ? "rgba(16, 185, 129, 0.1)"
                                  : rec.type === "X-Ray"
                                  ? "rgba(147, 51, 234, 0.1)"
                                  : "rgba(37, 99, 235, 0.1)",
                              color:
                                rec.type === "Treatment"
                                  ? "#059669"
                                  : rec.type === "X-Ray"
                                  ? "#7e22ce"
                                  : "#2563eb",
                              borderColor: "transparent",
                            }}
                          >
                            {rec.type || "Clinical"}
                          </span>
                          <span className="df-timeline-date">{rec.date}</span>
                        </div>
                      </div>

                      <div className="df-timeline-doctor">
                        👨‍⚕️ Attending: <strong>{rec.doctor || "Attending Dentist"}</strong>
                      </div>

                      <p className="df-timeline-notes">{rec.notes}</p>

                      <div className="df-timeline-footer">
                        <span>🆔 Encounter: <strong>{rec.id}</strong></span>
                        <span>•</span>
                        <span>🗂️ Treatment: <strong>{rec.treatment || "Operative care"}</strong></span>
                        {rec.attachments && rec.attachments !== "None" && (
                          <>
                            <span>•</span>
                            <span style={{ color: "#7e22ce", fontWeight: "600" }}>📷 {rec.attachments}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Edit Medical Profile Modal */}
      {editModalOpen && (
        <Modal
          title={`Update Medical History: ${selectedPatient?.name || "Patient"}`}
          onClose={() => !isSaving && setEditModalOpen(false)}
          footer={
            <>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setEditModalOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="df-btn df-btn-primary"
                onClick={handleSaveMedicalHistory}
                disabled={isSaving}
              >
                {isSaving ? "Saving Changes..." : "Save Medical Profile"}
              </button>
            </>
          }
        >
          <div className="df-form-2col">
            <div className="df-form-group">
              <label className="df-label" htmlFor="med-allergies">Allergies (comma-separated)</label>
              <input
                id="med-allergies"
                className="df-input"
                value={medForm.allergies}
                onChange={(e) => setMedForm({ ...medForm, allergies: e.target.value })}
                placeholder="e.g. Penicillin, Latex, NSAIDs, Codeine"
              />
              <small style={{ fontSize: "11px", color: "var(--df-text-muted)" }}>Drug, environmental, or material allergies</small>
            </div>

            <div className="df-form-group">
              <label className="df-label" htmlFor="med-conditions">Medical Conditions (comma-separated)</label>
              <input
                id="med-conditions"
                className="df-input"
                value={medForm.medicalConditions}
                onChange={(e) => setMedForm({ ...medForm, medicalConditions: e.target.value })}
                placeholder="e.g. Hypertension, Type 2 Diabetes, Asthma"
              />
              <small style={{ fontSize: "11px", color: "var(--df-text-muted)" }}>Chronic systemic conditions</small>
            </div>

            <div className="df-form-group">
              <label className="df-label" htmlFor="med-medications">Current / Previous Medications</label>
              <input
                id="med-medications"
                className="df-input"
                value={medForm.currentMedications}
                onChange={(e) => setMedForm({ ...medForm, currentMedications: e.target.value })}
                placeholder="e.g. Aspirin 81mg, Metformin 500mg, Lisinopril"
              />
              <small style={{ fontSize: "11px", color: "var(--df-text-muted)" }}>Active daily prescription medications</small>
            </div>

            <div className="df-form-group">
              <label className="df-label" htmlFor="med-surgeries">Previous Surgeries & Hospitalizations</label>
              <input
                id="med-surgeries"
                className="df-input"
                value={medForm.previousSurgeries}
                onChange={(e) => setMedForm({ ...medForm, previousSurgeries: e.target.value })}
                placeholder="e.g. Wisdom Teeth Extraction (2022), Knee Replacement (2020)"
              />
              <small style={{ fontSize: "11px", color: "var(--df-text-muted)" }}>Surgical events & implants</small>
            </div>

            <div className="df-form-group">
              <label className="df-label" htmlFor="med-blood">Blood Group</label>
              <select
                id="med-blood"
                className="df-select"
                value={medForm.bloodGroup}
                onChange={(e) => setMedForm({ ...medForm, bloodGroup: e.target.value })}
              >
                <option value="Unknown">Unknown</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>

            <div className="df-form-group">
              <label className="df-label" htmlFor="med-em-name">Emergency Contact Name</label>
              <input
                id="med-em-name"
                className="df-input"
                value={medForm.emergencyContactName}
                onChange={(e) => setMedForm({ ...medForm, emergencyContactName: e.target.value })}
                placeholder="e.g. John Mitchell (Spouse)"
              />
            </div>

            <div className="df-form-group" style={{ gridColumn: "span 2" }}>
              <label className="df-label" htmlFor="med-em-phone">Emergency Contact Phone</label>
              <input
                id="med-em-phone"
                className="df-input"
                value={medForm.emergencyContactPhone}
                onChange={(e) => setMedForm({ ...medForm, emergencyContactPhone: e.target.value })}
                placeholder="+94 77 123 4567"
              />
            </div>

            <div className="df-form-group" style={{ gridColumn: "span 2" }}>
              <label className="df-label" htmlFor="med-notes">Important Clinical Warnings & Notes</label>
              <textarea
                id="med-notes"
                className="df-input"
                rows={3}
                value={medForm.medicalNotes}
                onChange={(e) => setMedForm({ ...medForm, medicalNotes: e.target.value })}
                placeholder="Special precautions, antibiotic prophylaxis requirements, sedation/vasovagal tendencies..."
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
