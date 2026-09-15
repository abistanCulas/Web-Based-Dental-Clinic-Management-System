import { useState, useEffect } from "react";
import { Breadcrumbs } from "../../components/dashboard/DashboardPrimitives";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import patientApi from "../../api/patients";

export const ROLE_META = {
  user: {
    name: "General User & Cashier",
    accent: "slate",
    chart: "Billing & Collection Activity",
  },
  patient: {
    name: "Patient",
    accent: "blue",
    chart: "Appointment & Care Activity",
  },
  doctor: {
    name: "Doctor & Dental Surgeon",
    accent: "teal",
    chart: "Consultation & Procedure Volume",
  },
  receptionist: {
    name: "Receptionist",
    accent: "amber",
    chart: "Daily Patient Flow & Intake",
  },
  pharmacist: {
    name: "Pharmacist",
    accent: "rose",
    chart: "Dispensing & Prescription Fulfillment",
  },
  admin: {
    name: "System Administrator",
    accent: "violet",
    chart: "Clinic-Wide Operations & Revenue",
  },
};

export function AccountPage({ role = "user", section = "profile" }) {
  const { user, updateUser } = useAuth();
  const { addToast } = useNotifications();
  const { theme, setTheme } = useTheme();
  const { lang, setLanguage, t } = useLanguage();

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

  const save = async (event) => {
    event.preventDefault();
    if (password && password !== confirmPassword) {
      addToast("Passwords do not match", "error");
      return;
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
    </div>
  );
}

export default function ProfilePage({ role = "user" }) {
  return <AccountPage role={role} section="profile" />;
}
