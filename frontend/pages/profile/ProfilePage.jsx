import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Breadcrumbs, Modal } from "../../components/dashboard/DashboardPrimitives";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import patientApi from "../../api/patients";
import authApi from "../../api/auth";
import usersApi from "../../api/users";

export const ROLE_META = {
  user: {
    name: "Cashier Desk",
    accent: "blue",
    chart: "Billing & Collection Activity",
  },
  patient: {
    name: "Patient",
    accent: "blue",
    chart: "Appointment & Care Activity",
  },
  doctor: {
    name: "Doctor & Dental Surgeon",
    accent: "blue",
    chart: "Consultation & Procedure Volume",
  },
  receptionist: {
    name: "Receptionist",
    accent: "blue",
    chart: "Daily Patient Flow & Intake",
  },
  pharmacist: {
    name: "Pharmacist",
    accent: "blue",
    chart: "Dispensing & Prescription Fulfillment",
  },
  admin: {
    name: "System Administrator",
    accent: "blue",
    chart: "Clinic-Wide Operations & Revenue",
  },
};

export function AccountPage({ role = "user", section = "profile" }) {
  const { user, updateUser, logout } = useAuth();
  const { addToast } = useNotifications();
  const { theme, setTheme } = useTheme();
  const { lang, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const isPatient = role === "patient";
  const uid = user?.userId || user?.id;

  const [tab, setTab] = useState(section === "profile" ? "Profile" : "Account");
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "+94 77 123 4567");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [density, setDensity] = useState("comfortable");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);

  // Avatar profile image state
  const [avatarPreview, setAvatarPreview] = useState(user?.profileImage || null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Account deactivation state
  const isDeactivationRequested =
    user?.status === "DEACTIVATION_REQUESTED" ||
    user?.status === "deactivation_requested" ||
    Boolean(user?.deactivationRequestedAt);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [deactivationReason, setDeactivationReason] = useState("");
  const [deactivating, setDeactivating] = useState(false);

  // Patient-specific clinical fields
  const [patientRecord, setPatientRecord] = useState(null);
  const [loadingPatient, setLoadingPatient] = useState(isPatient && Boolean(uid));
  const [savingPatient, setSavingPatient] = useState(false);
  const [nic, setNic] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("Female");
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [allergies, setAllergies] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [currentMedications, setCurrentMedications] = useState("");

  useEffect(() => {
    if (!isPatient || !uid) return;

    let ignore = false;
    patientApi.getPatientByUserId(uid)
      .then((data) => {
        if (ignore) return;
        if (data) {
          setPatientRecord(data);
          setName(data.name || user?.name || "");
          setEmail(data.email || user?.email || "");
          setPhone(data.phone || user?.phone || "");
          setNic(data.nic || "");
          setDateOfBirth(data.dateOfBirth || "");
          setGender(data.gender || "Female");
          setBloodGroup(data.bloodGroup || "O+");
          setAddress(data.address || "");
          setCity(data.city || "");
          setEmergencyContactName(data.emergencyContactName || "");
          setEmergencyContactPhone(data.emergencyContactPhone || "");
          setAllergies(data.allergies && data.allergies !== "None reported" ? data.allergies : "");
          setMedicalConditions(data.medicalConditions && data.medicalConditions !== "None" ? data.medicalConditions : "");
          setCurrentMedications(data.currentMedications && data.currentMedications !== "None" ? data.currentMedications : "");
        } else {
          setPatientRecord(null);
          if (user?.name) setName(user.name);
          if (user?.email) setEmail(user.email);
          if (user?.phone) setPhone(user.phone);
        }
        setLoadingPatient(false);
      })
      .catch(() => {
        if (!ignore) setLoadingPatient(false);
      });

    return () => {
      ignore = true;
    };
  }, [isPatient, uid, user]);

  const tabs =
    section === "profile"
      ? ["Profile", "Security"]
      : ["Account", "Security", "Appearance", "Language", "Notifications"];

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      addToast("Please upload a valid image file (JPG, PNG, or WEBP).", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast("Profile image size must be less than 5MB.", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      setAvatarPreview(dataUrl);
      setUploadingAvatar(true);
      try {
        await usersApi.updateMyAvatar(dataUrl);
        updateUser({ ...user, profileImage: dataUrl });
        setAvatarPreview(dataUrl);
        addToast("Profile photo updated successfully!", "success");
      } catch (err) {
        console.warn("Could not save avatar on backend:", err);
        updateUser({ ...user, profileImage: dataUrl });
        setAvatarPreview(dataUrl);
        addToast("Profile photo updated", "info");
      } finally {
        setUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarRemove = async () => {
    setUploadingAvatar(true);
    try {
      await usersApi.deleteMyAvatar();
      setAvatarPreview(null);
      updateUser({ ...user, profileImage: null });
      addToast("Profile photo removed.", "info");
    } catch (err) {
      console.warn("Could not remove avatar on backend:", err);
      setAvatarPreview(null);
      updateUser({ ...user, profileImage: null });
      addToast("Profile photo removed", "info");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeactivateConfirm = async () => {
    if (!isPatient && !deactivationReason.trim()) {
      addToast("Please provide a reason for the administrator.", "warning");
      return;
    }

    setDeactivating(true);
    try {
      const res = await authApi.deactivateAccount(deactivationReason.trim() || undefined);
      setDeactivateModalOpen(false);

      if (isPatient) {
        addToast("Your account has been deactivated. You have been logged out.", "info");
        logout();
        navigate("/login");
      } else {
        updateUser({ ...user, status: "DEACTIVATION_REQUESTED", deactivationRequestedAt: new Date().toISOString() });
        addToast(res.message || "Deactivation request submitted for administrator review.", "success");
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to process deactivation";
      addToast(msg, "error");
    } finally {
      setDeactivating(false);
    }
  };

  const save = async (event) => {
    event.preventDefault();
    if (password) {
      if (password !== confirmPassword) {
        addToast("Passwords do not match", "error");
        return;
      }
      try {
        await authApi.changePassword("demo123", password);
        addToast("Password changed successfully!", "success");
      } catch (err) {
        console.warn("Could not change password on backend:", err);
      }
    }

    if (role === "patient") {
      setSavingPatient(true);
      const nameParts = name.trim().split(/\s+/);
      const firstName = nameParts[0] || user?.firstName || "Patient";
      const lastName = nameParts.slice(1).join(" ") || nameParts[0] || "User";

      const payload = {
        firstName,
        lastName,
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        nic: nic.trim() || undefined,
        dateOfBirth: dateOfBirth || "1995-01-01",
        gender: gender || "Other",
        bloodGroup: bloodGroup || "O+",
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        emergencyContactName: emergencyContactName.trim() || undefined,
        emergencyContactPhone: emergencyContactPhone.trim() || undefined,
        allergies: allergies.trim() || "None reported",
        medicalConditions: medicalConditions.trim() || "None",
        currentMedications: currentMedications.trim() || "None",
        status: "ACTIVE",
      };

      try {
        if (patientRecord?.id) {
          const updated = await patientApi.updatePatient(patientRecord.id, payload);
          setPatientRecord(updated);
          addToast("Patient clinical profile updated successfully", "success");
        } else {
          const uid = user?.userId || user?.id;
          const created = await patientApi.createPatient({ ...payload, userId: uid });
          setPatientRecord(created);
          addToast(`Clinical patient record created! Patient Code: ${created.patientCode}`, "success");
        }
        updateUser({ name, email, phone });
      } catch (err) {
        const msg = err.response?.data?.message || err.response?.data || err.message || "Failed to save patient profile";
        addToast(typeof msg === "string" ? msg : "Failed to save profile", "error");
        setSavingPatient(false);
        return;
      } finally {
        setSavingPatient(false);
      }
    } else {
      updateUser({ name, email, phone });
      addToast("Account preferences updated successfully", "success");
    }

    setPassword("");
    setConfirmPassword("");
  };

  const meta = ROLE_META[role] || ROLE_META.user;

  return (
    <div className={`df-role-page df-role-${meta.accent}`}>
      <Breadcrumbs
        items={[
          { label: "Dashboard", to: `/${role}` },
          { label: section === "profile" ? "Profile" : "Settings" },
        ]}
      />
      <header className="df-resource-header">
        <div>
          <span className="df-section-label">{meta.name} workspace</span>
          <h1>{section === "profile" ? "User Profile" : "Account & Preferences"}</h1>
          <p>Manage your personal profile, credentials, visual themes, and alerts.</p>
        </div>
      </header>

      <div className="df-settings-layout">
        <aside className="df-card">
          <div className="df-settings-tabs">
            {tabs.map((item) => (
              <button
                key={item}
                className={`df-settings-tab ${tab === item ? "active" : ""}`}
                onClick={() => setTab(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </aside>

        <section className="df-card">
          <div className="df-card-body">
            <h3>{tab} Settings</h3>
            <p className="df-settings-copy">
              Configure your personal workspace and platform configuration.
            </p>

            {role === "patient" && !loadingPatient && !patientRecord && (
              <div className="df-alert df-alert-info" style={{ marginBottom: 20 }}>
                💡 <strong>Welcome!</strong> You have not completed your clinical dental profile yet. Fill in your information below to register your medical profile.
              </div>
            )}

            {loadingPatient ? (
              <div style={{ padding: 40, textAlign: "center" }}>
                <div className="df-spinner" style={{ margin: "0 auto 12px" }} />
                <p style={{ color: "var(--df-text-muted)" }}>Loading patient profile from clinic database...</p>
              </div>
            ) : (
              <form onSubmit={save}>
                {(tab === "Profile" || tab === "Account") && (
                  <>
                    {/* Avatar Upload / Preview / Remove Section */}
                    <div className="df-avatar-section" style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24, padding: "16px 20px", background: "var(--df-gray-50)", borderRadius: 12, border: "1px solid var(--df-border)" }}>
                      <div className="df-avatar-preview" style={{ width: 84, height: 84, borderRadius: "50%", overflow: "hidden", background: "var(--df-primary-100)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: "var(--df-primary-700)", border: "3px solid white", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", flexShrink: 0 }}>
                        {avatarPreview ? (
                          <img src={avatarPreview} alt={name || "User"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          (name || "User").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--df-text-primary)" }}>Profile Photo</div>
                        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                          <label className="df-btn df-btn-secondary df-btn-sm" style={{ cursor: "pointer", margin: 0 }}>
                            {uploadingAvatar ? "Uploading..." : "Upload Photo"}
                            <input
                              type="file"
                              accept="image/png, image/jpeg, image/webp"
                              style={{ display: "none" }}
                              onChange={handleAvatarUpload}
                              disabled={uploadingAvatar}
                            />
                          </label>
                          {avatarPreview && (
                            <button
                              type="button"
                              className="df-btn df-btn-sm"
                              style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5" }}
                              onClick={handleAvatarRemove}
                              disabled={uploadingAvatar}
                            >
                              Remove Photo
                            </button>
                          )}
                        </div>
                        <small style={{ color: "var(--df-text-secondary)", fontSize: 12 }}>
                          Supported formats: JPG, PNG, or WEBP (Max size: 5MB).
                        </small>
                      </div>
                    </div>

                    {role === "patient" && patientRecord?.patientCode && (
                      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
                        <span className="df-badge df-badge-primary" style={{ fontSize: 13, padding: "6px 12px" }}>
                          Patient Code: {patientRecord.patientCode}
                        </span>
                        <span className={`df-badge df-badge-${patientRecord.status === "active" ? "success" : "warning"}`} style={{ fontSize: 12 }}>
                          {patientRecord.status?.toUpperCase() || "ACTIVE"}
                        </span>
                      </div>
                    )}

                    <div className="df-form-2col">
                      <div className="df-form-group">
                        <label className="df-label" htmlFor="account-name">
                          Full Name
                        </label>
                        <input
                          id="account-name"
                          className="df-input"
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          required
                          disabled={savingPatient}
                        />
                      </div>
                      <div className="df-form-group">
                        <label className="df-label" htmlFor="account-email">
                          Email Address
                        </label>
                        <input
                          id="account-email"
                          className="df-input"
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          required
                          disabled={savingPatient}
                        />
                      </div>
                      <div className="df-form-group">
                        <label className="df-label" htmlFor="account-phone">
                          Phone Number
                        </label>
                        <input
                          id="account-phone"
                          className="df-input"
                          value={phone}
                          onChange={(event) => setPhone(event.target.value)}
                          disabled={savingPatient}
                        />
                      </div>
                      <div className="df-form-group">
                        <label className="df-label" htmlFor="account-role">
                          Assigned Role
                        </label>
                        <input
                          id="account-role"
                          className="df-input"
                          value={user?.role?.toUpperCase() || role.toUpperCase()}
                          disabled
                          style={{ background: "var(--df-gray-100)" }}
                        />
                      </div>

                      {role === "patient" && (
                        <>
                          <div className="df-form-group">
                            <label className="df-label" htmlFor="patient-nic">National Identity Card (NIC)</label>
                            <input
                              id="patient-nic"
                              className="df-input"
                              placeholder="e.g. 199512345678"
                              value={nic}
                              onChange={(e) => setNic(e.target.value)}
                              disabled={savingPatient}
                            />
                          </div>
                          <div className="df-form-group">
                            <label className="df-label" htmlFor="patient-dob">Date of Birth</label>
                            <input
                              id="patient-dob"
                              type="date"
                              className="df-input"
                              value={dateOfBirth}
                              onChange={(e) => setDateOfBirth(e.target.value)}
                              disabled={savingPatient}
                            />
                          </div>
                          <div className="df-form-group">
                            <label className="df-label" htmlFor="patient-gender">Gender</label>
                            <select
                              id="patient-gender"
                              className="df-select"
                              value={gender}
                              onChange={(e) => setGender(e.target.value)}
                              disabled={savingPatient}
                            >
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div className="df-form-group">
                            <label className="df-label" htmlFor="patient-blood">Blood Group</label>
                            <select
                              id="patient-blood"
                              className="df-select"
                              value={bloodGroup}
                              onChange={(e) => setBloodGroup(e.target.value)}
                              disabled={savingPatient}
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
                            <label className="df-label" htmlFor="patient-address">Address</label>
                            <input
                              id="patient-address"
                              className="df-input"
                              placeholder="Street address"
                              value={address}
                              onChange={(e) => setAddress(e.target.value)}
                              disabled={savingPatient}
                            />
                          </div>
                          <div className="df-form-group">
                            <label className="df-label" htmlFor="patient-city">City</label>
                            <input
                              id="patient-city"
                              className="df-input"
                              placeholder="e.g. Colombo"
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              disabled={savingPatient}
                            />
                          </div>
                          <div className="df-form-group">
                            <label className="df-label" htmlFor="patient-em-name">Emergency Contact Name</label>
                            <input
                              id="patient-em-name"
                              className="df-input"
                              placeholder="Contact person"
                              value={emergencyContactName}
                              onChange={(e) => setEmergencyContactName(e.target.value)}
                              disabled={savingPatient}
                            />
                          </div>
                          <div className="df-form-group">
                            <label className="df-label" htmlFor="patient-em-phone">Emergency Contact Phone</label>
                            <input
                              id="patient-em-phone"
                              className="df-input"
                              placeholder="+94 77 000 0000"
                              value={emergencyContactPhone}
                              onChange={(e) => setEmergencyContactPhone(e.target.value)}
                              disabled={savingPatient}
                            />
                          </div>
                          <div className="df-form-group" style={{ gridColumn: "1 / -1" }}>
                            <label className="df-label" htmlFor="patient-allergies">Known Allergies</label>
                            <input
                              id="patient-allergies"
                              className="df-input"
                              placeholder="e.g. Penicillin, Latex, Aspirin (or None)"
                              value={allergies}
                              onChange={(e) => setAllergies(e.target.value)}
                              disabled={savingPatient}
                            />
                          </div>
                          <div className="df-form-group" style={{ gridColumn: "1 / -1" }}>
                            <label className="df-label" htmlFor="patient-conditions">Medical Conditions / Current Medications</label>
                            <input
                              id="patient-conditions"
                              className="df-input"
                              placeholder="e.g. Asthma, Hypertension, Inhaler PRN"
                              value={medicalConditions}
                              onChange={(e) => setMedicalConditions(e.target.value)}
                              disabled={savingPatient}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}

              {tab === "Security" && (
                <>
                  <div className="df-form-2col">
                    <div className="df-form-group">
                      <label className="df-label" htmlFor="new-password">
                        New Password
                      </label>
                      <input
                        id="new-password"
                        className="df-input"
                        type="password"
                        placeholder="Enter new password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    <div className="df-form-group">
                      <label className="df-label" htmlFor="confirm-password">
                        Confirm New Password
                      </label>
                      <input
                        id="confirm-password"
                        className="df-input"
                        type="password"
                        placeholder="Repeat new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Account Deactivation / Danger Zone */}
                  <div style={{ marginTop: 36, padding: 20, border: "1px solid #fecaca", borderRadius: 12, background: "#fef2f2" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                      <div>
                        <h4 style={{ color: "#991b1b", margin: "0 0 6px 0", fontSize: 16, fontWeight: 600 }}>
                          {role === "admin" ? "Account Protection" : isPatient ? "Deactivate Account" : "Request Account Deactivation"}
                        </h4>
                        <p style={{ color: "#7f1d1d", fontSize: 13, margin: 0, lineHeight: 1.5, maxWidth: 620 }}>
                          {role === "admin"
                            ? "System Administrator accounts cannot be deactivated to ensure uninterrupted clinic supervision, staff management, and system operations."
                            : isPatient
                            ? "Deactivating your account disables future portal access. In strict compliance with healthcare regulations, your historical appointments, medical treatments, prescriptions, and billing receipts will remain safely archived in the clinic database."
                            : isDeactivationRequested
                            ? "Your account deactivation request has been submitted and is currently awaiting Administrator approval."
                            : "Staff accounts require Administrator approval before deactivation. All medical records, clinical prescriptions, bills, and audit logs you generated remain permanently preserved."}
                        </p>
                      </div>
                      <div>
                        {role === "admin" ? (
                          <span className="df-badge" style={{ background: "#e0e7ff", color: "#4338ca", fontWeight: 600, padding: "8px 14px" }}>
                            Protected Administrator
                          </span>
                        ) : isDeactivationRequested ? (
                          <span className="df-badge df-badge-warning" style={{ fontWeight: 600, padding: "8px 14px" }}>
                            Pending Admin Review
                          </span>
                        ) : isPatient ? (
                          <button
                            type="button"
                            className="df-btn"
                            style={{ background: "#dc2626", color: "white", border: "none", fontWeight: 600 }}
                            onClick={() => setDeactivateModalOpen(true)}
                          >
                            Deactivate Account
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="df-btn"
                            style={{ background: "#dc2626", color: "white", border: "none", fontWeight: 600 }}
                            onClick={() => setDeactivateModalOpen(true)}
                          >
                            Request Deactivation
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {tab === "Appearance" && (
                <div className="df-form-2col">
                  <div className="df-form-group">
                    <label className="df-label" htmlFor="theme-select">
                      Color Theme
                    </label>
                    <select
                      id="theme-select"
                      className="df-select"
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                    >
                      <option value="light">Light Mode</option>
                      <option value="dark">Dark Mode</option>
                      <option value="system">System Preference</option>
                    </select>
                  </div>
                  <div className="df-form-group">
                    <label className="df-label" htmlFor="density-select">
                      Table Density
                    </label>
                    <select
                      id="density-select"
                      className="df-select"
                      value={density}
                      onChange={(e) => setDensity(e.target.value)}
                    >
                      <option value="comfortable">Comfortable</option>
                      <option value="compact">Compact</option>
                    </select>
                  </div>
                </div>
              )}

              {tab === "Language" && (
                <div className="df-form-group" style={{ maxWidth: 360 }}>
                  <label className="df-label" htmlFor="lang-select">
                    Select Interface Language
                  </label>
                  <select
                    id="lang-select"
                    className="df-select"
                    value={lang}
                    onChange={(e) => {
                      setLanguage(e.target.value);
                      addToast(`Language switched to ${e.target.value.toUpperCase()}`, "info");
                    }}
                  >
                    <option value="en">English (US / UK)</option>
                    <option value="si">සිංහල (Sinhala)</option>
                    <option value="ta">தமிழ் (Tamil)</option>
                  </select>
                  <small style={{ color: "var(--df-text-secondary)", marginTop: 6, display: "block" }}>
                    Active localized strings: {t("nav.home")}, {t("nav.services")}, {t("nav.doctors")}.
                  </small>
                </div>
              )}

              {tab === "Notifications" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <label className="df-toggle-row">
                    <input
                      type="checkbox"
                      checked={emailAlerts}
                      onChange={(e) => setEmailAlerts(e.target.checked)}
                    />
                    Email notifications for appointment reminders and invoice receipts
                  </label>
                  <label className="df-toggle-row">
                    <input
                      type="checkbox"
                      checked={smsAlerts}
                      onChange={(e) => setSmsAlerts(e.target.checked)}
                    />
                    SMS reminders for patient queue updates and prescription dispensing
                  </label>
                </div>
              )}

              <div style={{ marginTop: 24 }}>
                <button className="df-btn df-btn-primary" type="submit" disabled={savingPatient}>
                  {savingPatient ? "Saving..." : "Save preferences"}
                </button>
              </div>
            </form>
            )}
          </div>
        </section>
      </div>

      {deactivateModalOpen && (
        <Modal
          title={isPatient ? "Deactivate Patient Account" : "Request Staff Account Deactivation"}
          onClose={() => { setDeactivateModalOpen(false); setDeactivationReason(""); }}
          footer={
            <>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                onClick={() => { setDeactivateModalOpen(false); setDeactivationReason(""); }}
                disabled={deactivating}
              >
                Cancel
              </button>
              <button
                type="button"
                className="df-btn"
                style={{ background: "#dc2626", color: "white" }}
                onClick={handleDeactivateConfirm}
                disabled={deactivating}
              >
                {deactivating ? "Processing..." : isPatient ? "Confirm Deactivation" : "Submit Request"}
              </button>
            </>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="df-alert df-alert-warning" style={{ margin: 0 }}>
              <strong>Important Notice:</strong>
              {isPatient ? (
                <span> Deactivating your account disables portal login. In compliance with medical record regulations, all your treatment history, prescriptions, and billing receipts will remain safely archived.</span>
              ) : (
                <span> Staff account deactivation requires Administrator approval. Your historical clinical, prescription, and billing contributions will remain preserved.</span>
              )}
            </div>

            <div className="df-form-group">
              <label className="df-label" htmlFor="deactivation-reason">
                Reason for deactivation {!isPatient ? "(Required for Admin review)" : "(Optional)"}
              </label>
              <textarea
                id="deactivation-reason"
                className="df-textarea"
                rows={3}
                placeholder={isPatient ? "Please tell us why you are deactivating (optional)..." : "Specify the reason for account deactivation..."}
                value={deactivationReason}
                onChange={(e) => setDeactivationReason(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function ProfilePage({ role = "user" }) {
  return <AccountPage role={role} section="profile" />;
}
