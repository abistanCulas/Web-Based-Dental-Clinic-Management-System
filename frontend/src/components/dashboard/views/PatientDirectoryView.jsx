import { useState, useMemo, useEffect, useCallback } from "react";
import StatCard from "../../common/StatCard";
import { Breadcrumbs, DataTable, Modal, SearchBar, EmptyState } from "../DashboardPrimitives";
import { useDashboardData } from "../../../context/DashboardDataContext";
import { useNotifications } from "../../../context/NotificationContext";
import patientApi from "../../../api/patients";

let patDirCounter = 8000;
const nextId = (prefix = "PAT") => `${prefix}-${++patDirCounter}`;

export function PatientDirectoryView({ role }) {
  const { collections, saveRecord } = useDashboardData();
  const { addToast } = useNotifications();
  const [query, setQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [apiPatients, setApiPatients] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPatients = useCallback(() => {
    setLoading(true);
    setError(null);
    patientApi.getAllPatients()
      .then((data) => {
        setApiPatients(data);
        setLoading(false);
      })
      .catch((err) => {
        const msg = err.response?.data?.message || err.message || "Failed to load patients from database";
        setError(msg);
        setApiPatients(null);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let ignore = false;
    patientApi.getAllPatients()
      .then((data) => {
        if (!ignore) {
          setApiPatients(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          const msg = err.response?.data?.message || err.message || "Failed to load patients from database";
          setError(msg);
          setApiPatients(null);
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  const patients = useMemo(() => {
    if (apiPatients !== null) return apiPatients;
    return (collections.users || []).filter((u) => u.role === "patient");
  }, [apiPatients, collections]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return patients;
    return patients.filter((p) =>
      `${p.name || ""} ${p.email || ""} ${p.phone || ""} ${p.patientCode || ""} ${p.nic || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [patients, query]);

  const handleCheckinQueue = (patient) => {
    const newToken = {
      id: nextId("Q"),
      queueNumber: `Q-0${(patDirCounter % 30) + 1}`,
      patient: patient.name,
      doctor: patient.doctor || "Dr. James Wilson",
      service: "General Dental Checkup",
      waitTime: "10 mins",
      status: "checked-in",
    };
    saveRecord("queue", newToken);
    addToast(`Patient ${patient.name} checked in! Queue token: ${newToken.queueNumber}`, "success");
  };

  const hasAllergyAlerts = (p) => p.allergies && p.allergies.toLowerCase() !== "none" && p.allergies.toLowerCase() !== "none reported";
  const alertsCount = patients.filter(hasAllergyAlerts).length;

  return (
    <div className={`df-role-page df-role-${role === "doctor" ? "teal" : role === "receptionist" ? "amber" : "violet"}`}>
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Patient Directory" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Patient Management</span>
          <h1>Clinical Patient Directory & Charts</h1>
          <p>Search active patient profiles, view medical history alerts, and initiate clinic check-ins.</p>
        </div>
      </header>

      <div className="df-stat-grid">
        <StatCard label="Registered Patients" value={String(patients.length)} icon="◫" color="primary" />
        <StatCard label="Active Dental Charts" value={String(patients.filter(p => p.status === "active").length || patients.length)} icon="✓" color="success" />
        <StatCard label="Medical Alerts on File" value={`${alertsCount} Alert${alertsCount === 1 ? "" : "s"}`} icon="◈" color="warning" />
        <StatCard label="Data Source" value={apiPatients !== null ? "Live Database" : "Cached Demo"} icon="◷" color="primary" />
      </div>

      {error && (
        <div className="df-alert df-alert-warning" style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>⚠️ {error}. Displaying offline cached patient directory.</span>
          <button className="df-btn df-btn-secondary df-btn-sm" onClick={fetchPatients}>Retry</button>
        </div>
      )}

      <section className="df-card">
        <div className="df-card-body">
          <div className="df-toolbar">
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="Search patients by name, code, email, or telephone..."
            />
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: "center" }}>
              <div className="df-spinner" style={{ margin: "0 auto 12px" }} />
              <p style={{ color: "var(--df-text-muted)" }}>Loading registered patients...</p>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="👥"
              title="No patients found"
              message={query ? `No patient profiles matching "${query}".` : "No patients currently registered in the clinic database."}
              actionLabel={role === "receptionist" ? "Register Patient" : null}
              onAction={role === "receptionist" ? () => window.location.href = "/receptionist/register-patient" : null}
            />
          ) : (
            <DataTable
              columns={[
                { key: "patientCode", label: "Patient Code" },
                { key: "name", label: "Patient Name" },
                { key: "email", label: "Email Address" },
                { key: "phone", label: "Phone" },
                { key: "bloodGroup", label: "Blood" },
                { key: "status", label: "Status", type: "status" },
              ]}
              rows={filtered}
              actionLabel="Inspect Chart"
              onEdit={(row) => setSelectedPatient(row)}
              onQuickAction={role === "receptionist" ? handleCheckinQueue : null}
              quickActionLabel="Check-in to Queue"
            />
          )}
        </div>
      </section>

      {selectedPatient && (
        <Modal
          title={`Patient Dental Chart: ${selectedPatient.name}`}
          onClose={() => setSelectedPatient(null)}
          footer={
            <button className="df-btn df-btn-primary" onClick={() => setSelectedPatient(null)}>
              Done
            </button>
          }
        >
          <div className="df-form-2col">
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Patient Code</small>
              <div style={{ fontWeight: 600, fontSize: 16 }}>
                <span className="df-badge df-badge-primary">{selectedPatient.patientCode || `P${String(selectedPatient.id).padStart(4, "0")}`}</span>
              </div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Full Legal Name</small>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{selectedPatient.name}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Email Address</small>
              <div style={{ fontWeight: 600 }}>{selectedPatient.email || "None"}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Phone Number</small>
              <div style={{ fontWeight: 600 }}>{selectedPatient.phone || "None"}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>National ID (NIC)</small>
              <div style={{ fontWeight: 600 }}>{selectedPatient.nic || "Not provided"}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Date of Birth / Gender</small>
              <div style={{ fontWeight: 600 }}>{selectedPatient.dateOfBirth || "N/A"} · {selectedPatient.gender || "Unspecified"}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Address & City</small>
              <div style={{ fontWeight: 600 }}>
                {[selectedPatient.address, selectedPatient.city].filter(Boolean).join(", ") || "Not on file"}
              </div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Assigned Specialist</small>
              <div style={{ fontWeight: 600 }}>Dr. James Wilson (Oral Surgeon)</div>
            </div>
          </div>

          <div style={{ marginTop: 16, padding: 14, background: "var(--df-gray-50)", borderRadius: 8 }}>
            <strong>Medical & Allergy Alerts:</strong>
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <span className={`df-clinical-alert ${hasAllergyAlerts(selectedPatient) ? "df-alert-red" : "df-alert-blue"}`}>
                {hasAllergyAlerts(selectedPatient) ? `⚠ ${selectedPatient.allergies}` : "✓ No Known Allergies"}
              </span>
              <span className="df-clinical-alert df-alert-blue">Blood Group: {selectedPatient.bloodGroup || "O+"}</span>
              {selectedPatient.medicalConditions && selectedPatient.medicalConditions !== "None" && (
                <span className="df-clinical-alert df-alert-amber">⚠ {selectedPatient.medicalConditions}</span>
              )}
            </div>
          </div>

          {selectedPatient.emergencyContactName && (
            <div style={{ marginTop: 16, padding: 12, border: "1px solid var(--df-border)", borderRadius: 8 }}>
              <small style={{ color: "var(--df-text-muted)" }}>Emergency Contact</small>
              <div><strong>{selectedPatient.emergencyContactName}</strong>: {selectedPatient.emergencyContactPhone || "No telephone"}</div>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <strong>Recent Clinical Timeline:</strong>
            <ul style={{ paddingLeft: 20, marginTop: 8, fontSize: 13, color: "var(--df-text-secondary)", lineHeight: 1.8 }}>
              <li><strong>2026-03-01:</strong> Diagnosis & Cleaning (Upper Molar Filling recommended)</li>
              <li><strong>2026-01-20:</strong> Panoramic Dental X-Ray (Normal bone density)</li>
              <li><strong>2025-08-14:</strong> Annual Scaling and Fluoride Treatment</li>
            </ul>
          </div>
        </Modal>
      )}
    </div>
  );
}

