import { useState, useMemo, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import StatCard from "../../common/StatCard";
import { Breadcrumbs, DataTable, Modal, SearchBar, EmptyState } from "../DashboardPrimitives";
import { useDashboardData } from "../../../context/DashboardDataContext";
import { useNotifications } from "../../../context/NotificationContext";
import patientApi from "../../../api/patients";

let patDirCounter = 8000;
const nextId = (prefix = "PAT") => `${prefix}-${++patDirCounter}`;

const NAME_REGEX = /^[A-Za-z][A-Za-z\s.'-]*$/;
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const normalisePhone = (value) => String(value || "").replace(/[\s\-()]/g, "");
const isValidPhone = (value) => /^(?:0\d{9}|\+94\d{9})$/.test(normalisePhone(value));

const validatePatientName = (value, label) => {
  const name = value?.trim() || "";
  if (!name) return `${label} is required.`;
  if (name.length < 2) return `${label} must be at least 2 characters.`;
  if (name.length > 100) return `${label} must be 100 characters or fewer.`;
  if (!NAME_REGEX.test(name)) return `${label} must contain letters only.`;
  return "";
};

export function PatientDirectoryView({ role }) {
  const { collections, saveRecord } = useDashboardData();
  const { addToast } = useNotifications();
  const [query, setQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [apiPatients, setApiPatients] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editErrors, setEditErrors] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const canManage = role === "admin" || role === "receptionist";

  const fetchPatients = useCallback(() => {
    setLoading(true);
    setError(null);
    patientApi.getAllPatients()
      .then((data) => {
        setApiPatients(data || []);
        setLoading(false);
      })
      .catch((err) => {
        const msg = err.response?.data?.message || err.response?.data?.error || err.message || "Failed to load patients from database";
        setError(msg);
        setApiPatients([]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const patients = useMemo(() => {
    if (apiPatients !== null) return apiPatients;
    return [];
  }, [apiPatients]);

  const location = useLocation();
  useEffect(() => {
    if (location.state?.search && !query) {
      setQuery(location.state.search);
    }
    if ((location.state?.patientId || location.state?.selectedId) && patients.length > 0) {
      const targetId = location.state.patientId || location.state.selectedId;
      const targetCode = location.state.code;
      const match = patients.find(
        (p) => p.id === targetId || String(p.id) === String(targetId) || (targetCode && p.patientCode === targetCode)
      );
      if (match) {
        setSelectedPatient(match);
      }
    }
  }, [location.state, patients]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return patients;
    return patients.filter((p) =>
      `${p.name || ""} ${p.firstName || ""} ${p.lastName || ""} ${p.email || ""} ${p.phone || ""} ${p.patientCode || ""} ${p.nic || ""}`
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

  const openEditModal = (patient) => {
    setEditErrors({});
    setEditForm({
      id: patient.id,
      patientCode: patient.patientCode,
      firstName: patient.firstName || "",
      lastName: patient.lastName || "",
      email: patient.email || "",
      phone: patient.phone || "",
      nic: patient.nic || "",
      dateOfBirth: patient.dateOfBirth || "",
      gender: patient.gender || "MALE",
      bloodGroup: patient.bloodGroup || "O+",
      address: patient.address || "",
      city: patient.city || "",
      emergencyContactName: patient.emergencyContactName || "",
      emergencyContactPhone: patient.emergencyContactPhone || "",
      allergies: patient.allergies || "",
      medicalConditions: patient.medicalConditions || "",
      currentMedications: patient.currentMedications || "",
      status: patient.status?.toUpperCase() || "ACTIVE",
    });
    setEditModalOpen(true);
  };

  const setEditField = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    setEditErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const validateEditForm = () => {
    const errors = {};

    const firstNameError = validatePatientName(editForm.firstName, "First name");
    if (firstNameError) errors.firstName = firstNameError;

    const lastNameError = validatePatientName(editForm.lastName, "Last name");
    if (lastNameError) errors.lastName = lastNameError;

    const email = editForm.email?.trim() || "";
    if (email && !EMAIL_REGEX.test(email)) errors.email = "Enter a valid email address.";

    const phone = editForm.phone?.trim() || "";
    if (phone && !isValidPhone(phone)) errors.phone = "Enter a valid phone number (e.g. 0771234567 or +94771234567).";

    const emergencyPhone = editForm.emergencyContactPhone?.trim() || "";
    if (emergencyPhone && !isValidPhone(emergencyPhone)) errors.emergencyContactPhone = "Enter a valid phone number.";

    if (editForm.dateOfBirth) {
      const dob = new Date(editForm.dateOfBirth);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (Number.isNaN(dob.getTime())) errors.dateOfBirth = "Enter a valid date of birth.";
      else if (dob > today) errors.dateOfBirth = "Date of birth cannot be in the future.";
      else if (dob.getFullYear() < 1900) errors.dateOfBirth = "Enter a valid date of birth.";
    }

    return errors;
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();

    const errors = validateEditForm();
    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSavingEdit(true);
    try {
      const payload = {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        email: editForm.email?.trim().toLowerCase() || null,
        phone: editForm.phone?.trim() || null,
        nic: editForm.nic?.trim() || null,
        dateOfBirth: editForm.dateOfBirth || null,
        gender: editForm.gender,
        bloodGroup: editForm.bloodGroup,
        address: editForm.address?.trim() || null,
        city: editForm.city?.trim() || null,
        emergencyContactName: editForm.emergencyContactName?.trim() || null,
        emergencyContactPhone: editForm.emergencyContactPhone?.trim() || null,
        allergies: editForm.allergies?.trim() || "None reported",
        medicalConditions: editForm.medicalConditions?.trim() || "None",
        currentMedications: editForm.currentMedications?.trim() || "None",
        status: editForm.status || "ACTIVE",
      };

      const updated = await patientApi.updatePatient(editForm.id, payload);
      addToast(`Patient ${updated.name} updated successfully!`, "success");

      setApiPatients((prev) => (prev || []).map((p) => (p.id === updated.id ? updated : p)));
      if (selectedPatient?.id === updated.id) {
        setSelectedPatient(updated);
      }
      setEditModalOpen(false);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to update patient";
      addToast(typeof msg === "string" ? msg : "Update failed", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleStatus = async (patient) => {
    const isCurrentlyActive = (patient.status || "").toLowerCase() === "active";
    setActionLoading(true);
    try {
      let updated;
      if (isCurrentlyActive) {
        updated = await patientApi.deactivatePatient(patient.id);
        addToast(`Patient ${patient.name} deactivated (status: INACTIVE).`, "info");
      } else {
        updated = await patientApi.activatePatient(patient.id);
        addToast(`Patient ${patient.name} reactivated (status: ACTIVE).`, "success");
      }

      setApiPatients((prev) => (prev || []).map((p) => (p.id === updated.id ? updated : p)));
      if (selectedPatient?.id === updated.id) {
        setSelectedPatient(updated);
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to change patient status";
      addToast(msg, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePatient = async (patient) => {
    if (!window.confirm(`Are you sure you want to permanently delete patient ${patient.name} (${patient.patientCode})?\n\nNOTE: If the patient has existing appointments, prescriptions, treatments, or billing history, deletion will be blocked and the patient must be deactivated instead.`)) {
      return;
    }

    setActionLoading(true);
    try {
      await patientApi.deletePatient(patient.id);
      addToast(`Patient ${patient.name} (${patient.patientCode}) deleted successfully from database.`, "success");
      setApiPatients((prev) => (prev || []).filter((p) => p.id !== patient.id));
      setSelectedPatient(null);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to delete patient";
      addToast(typeof msg === "string" ? msg : "Cannot delete patient with active records", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const hasAllergyAlerts = (p) => p.allergies && p.allergies.toLowerCase() !== "none" && p.allergies.toLowerCase() !== "none reported";
  const alertsCount = patients.filter(hasAllergyAlerts).length;

  return (
    <div className="df-role-page df-role-blue">
      <Breadcrumbs items={[{ label: "Dashboard", to: `/${role}` }, { label: "Patient Directory" }]} />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">Patient Management</span>
          <h1>Patient Directory</h1>
          <p>Manage registered patients, account status, appointments, and clinical records.</p>
        </div>
      </header>

      <div className="df-stat-grid">
        <StatCard label="Registered Patients" value={String(patients.length)} icon="◫" color="primary" />
        <StatCard label="Active Dental Charts" value={String(patients.filter(p => p.status === "active").length)} icon="✓" color="success" />
        <StatCard label="Medical Alerts on File" value={`${alertsCount} Alert${alertsCount === 1 ? "" : "s"}`} icon="◈" color="warning" />
        <StatCard label="Data Source" value={apiPatients !== null ? "Live Database" : "Connecting..."} icon="◷" color="primary" />
      </div>

      {error && (
        <div className="df-alert df-alert-warning" style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>⚠️ {error}</span>
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
              actionLabel={canManage ? "Register Patient" : null}
              onAction={canManage ? () => window.location.href = `/${role}/register-patient` : null}
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

      {/* PATIENT CHART INSPECTION MODAL */}
      {selectedPatient && (
        <Modal
          title={`Patient Dental Chart: ${selectedPatient.name}`}
          onClose={() => setSelectedPatient(null)}
          footer={
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
              <div>
                {canManage && (
                  <>
                    <button
                      className="df-btn df-btn-secondary df-btn-sm"
                      style={{ marginRight: 8 }}
                      onClick={() => openEditModal(selectedPatient)}
                      disabled={actionLoading}
                    >
                      ✏ Edit Profile
                    </button>
                    <button
                      className={`df-btn df-btn-sm ${selectedPatient.status === "active" ? "df-btn-outline-warning" : "df-btn-outline-success"}`}
                      style={{ marginRight: 8 }}
                      onClick={() => handleToggleStatus(selectedPatient)}
                      disabled={actionLoading}
                    >
                      {selectedPatient.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      className="df-btn df-btn-outline-danger df-btn-sm"
                      onClick={() => handleDeletePatient(selectedPatient)}
                      disabled={actionLoading}
                      hidden={role === "admin"}
                    >
                      🗑 Delete
                    </button>
                  </>
                )}
              </div>
              <button className="df-btn df-btn-primary" onClick={() => setSelectedPatient(null)}>
                Done
              </button>
            </div>
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
              <small style={{ color: "var(--df-text-muted)" }}>Status</small>
              <div>
                <span className={`df-badge df-badge-${selectedPatient.status === "active" ? "success" : "secondary"}`}>
                  {(selectedPatient.status || "ACTIVE").toUpperCase()}
                </span>
              </div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Full Legal Name</small>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{selectedPatient.name}</div>
            </div>
            <div>
              <small style={{ color: "var(--df-text-muted)" }}>Date of Birth / Gender</small>
              <div style={{ fontWeight: 600 }}>{selectedPatient.dateOfBirth || "N/A"} · {selectedPatient.gender || "Unspecified"}</div>
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
              <small style={{ color: "var(--df-text-muted)" }}>Blood Group</small>
              <div style={{ fontWeight: 600 }}>{selectedPatient.bloodGroup || "Unknown"}</div>
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <small style={{ color: "var(--df-text-muted)" }}>Address & City</small>
              <div style={{ fontWeight: 600 }}>
                {[selectedPatient.address, selectedPatient.city].filter(Boolean).join(", ") || "Not on file"}
              </div>
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

      {/* EDIT PATIENT MODAL */}
      {editModalOpen && editForm && (
        <Modal
          title={`Edit Patient Profile: ${editForm.patientCode}`}
          onClose={() => setEditModalOpen(false)}
          footer={
            <>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => setEditModalOpen(false)}
                disabled={savingEdit}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-patient-form"
                className="df-btn df-btn-primary"
                disabled={savingEdit}
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </>
          }
        >
          <form id="edit-patient-form" onSubmit={handleSaveEdit}>
            <div className="df-form-2col">
              <div className="df-form-group">
                <label className="df-label">First Name *</label>
                <input
                  type="text"
                  className="df-input"
                  required
                  aria-invalid={Boolean(editErrors.firstName)}
                  value={editForm.firstName}
                  onChange={(e) => setEditField("firstName", e.target.value)}
                />
                {editErrors.firstName && <small className="df-field-error">{editErrors.firstName}</small>}
              </div>

              <div className="df-form-group">
                <label className="df-label">Last Name *</label>
                <input
                  type="text"
                  className="df-input"
                  required
                  aria-invalid={Boolean(editErrors.lastName)}
                  value={editForm.lastName}
                  onChange={(e) => setEditField("lastName", e.target.value)}
                />
                {editErrors.lastName && <small className="df-field-error">{editErrors.lastName}</small>}
              </div>

              <div className="df-form-group">
                <label className="df-label">Email Address</label>
                <input
                  type="email"
                  className="df-input"
                  aria-invalid={Boolean(editErrors.email)}
                  value={editForm.email}
                  onChange={(e) => setEditField("email", e.target.value)}
                />
                {editErrors.email && <small className="df-field-error">{editErrors.email}</small>}
              </div>

              <div className="df-form-group">
                <label className="df-label">Phone Number</label>
                <input
                  type="text"
                  className="df-input"
                  aria-invalid={Boolean(editErrors.phone)}
                  value={editForm.phone}
                  onChange={(e) => setEditField("phone", e.target.value)}
                />
                {editErrors.phone && <small className="df-field-error">{editErrors.phone}</small>}
              </div>

              <div className="df-form-group">
                <label className="df-label">National ID (NIC)</label>
                <input
                  type="text"
                  className="df-input"
                  value={editForm.nic}
                  onChange={(e) => setEditForm({ ...editForm, nic: e.target.value })}
                />
              </div>

              <div className="df-form-group">
                <label className="df-label">Date of Birth</label>
                <input
                  type="date"
                  className="df-input"
                  aria-invalid={Boolean(editErrors.dateOfBirth)}
                  value={editForm.dateOfBirth}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setEditField("dateOfBirth", e.target.value)}
                />
                {editErrors.dateOfBirth && <small className="df-field-error">{editErrors.dateOfBirth}</small>}
              </div>

              <div className="df-form-group">
                <label className="df-label">Gender</label>
                <select
                  className="df-select"
                  value={editForm.gender}
                  onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="df-form-group">
                <label className="df-label">Blood Group</label>
                <select
                  className="df-select"
                  value={editForm.bloodGroup}
                  onChange={(e) => setEditForm({ ...editForm, bloodGroup: e.target.value })}
                >
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
                <label className="df-label">Address</label>
                <input
                  type="text"
                  className="df-input"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                />
              </div>

              <div className="df-form-group">
                <label className="df-label">City</label>
                <input
                  type="text"
                  className="df-input"
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                />
              </div>

              <div className="df-form-group">
                <label className="df-label">Emergency Contact Name</label>
                <input
                  type="text"
                  className="df-input"
                  value={editForm.emergencyContactName}
                  onChange={(e) => setEditForm({ ...editForm, emergencyContactName: e.target.value })}
                />
              </div>

              <div className="df-form-group">
                <label className="df-label">Emergency Contact Phone</label>
                <input
                  type="text"
                  className="df-input"
                  aria-invalid={Boolean(editErrors.emergencyContactPhone)}
                  value={editForm.emergencyContactPhone}
                  onChange={(e) => setEditField("emergencyContactPhone", e.target.value)}
                />
                {editErrors.emergencyContactPhone && <small className="df-field-error">{editErrors.emergencyContactPhone}</small>}
              </div>

              <div className="df-form-group" style={{ gridColumn: "span 2" }}>
                <label className="df-label">Allergies</label>
                <input
                  type="text"
                  className="df-input"
                  value={editForm.allergies}
                  placeholder="e.g. Penicillin, Latex"
                  onChange={(e) => setEditForm({ ...editForm, allergies: e.target.value })}
                />
              </div>

              <div className="df-form-group" style={{ gridColumn: "span 2" }}>
                <label className="df-label">Medical Conditions</label>
                <input
                  type="text"
                  className="df-input"
                  value={editForm.medicalConditions}
                  placeholder="e.g. Hypertension, Diabetes"
                  onChange={(e) => setEditForm({ ...editForm, medicalConditions: e.target.value })}
                />
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
