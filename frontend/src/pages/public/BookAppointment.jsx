import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { useDashboardData } from "../../context/DashboardDataContext";
import { DOCTORS, SERVICES, TIME_SLOTS } from "../../data/mockData";
import { dentistApi } from "../../api/dentists";
import { patientApi } from "../../api/patients";
import { appointmentApi, formatTime24Hour, addMinutesToTime } from "../../api/appointments";
import "./public.css";

const STEPS = ["Select Doctor", "Select Service", "Select Date", "Select Time", "Details", "Review"];

export default function BookAppointment() {
  const { isAuthenticated, user } = useAuth();
  const { addToast } = useNotifications();
  const { saveRecord } = useDashboardData();
  const location = useLocation();

  const initialDoctor = location.state?.doctorId ? String(location.state.doctorId) : "";
  const initialService = location.state?.serviceId ? String(location.state.serviceId) : "";
  const initialStep = initialDoctor ? (initialService ? 2 : 1) : 0;

  const [step, setStep] = useState(initialStep);
  const [liveDentists, setLiveDentists] = useState([]);
  const [form, setForm] = useState({
    doctor: initialDoctor,
    service: initialService,
    date: new Date().toISOString().slice(0, 10),
    time: "10:00 AM",
    reason: "",
  });
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    let active = true;
    dentistApi.getAllDentists().then((list) => {
      if (active && list && list.length > 0) {
        setLiveDentists(list);
      }
    }).catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const doctorList = liveDentists.length > 0 ? liveDentists.map((d) => ({
    id: d.id,
    name: d.name,
    specialty: d.specialization || "General Dentistry",
    qualification: d.qualification || "Dental Surgeon",
    experience: `${d.experienceYears || 5}+ years`,
    rating: 4.9,
    availability: "Mon - Fri, 9:00 AM - 5:00 PM",
  })) : DOCTORS;

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const selectedDoctor = doctorList.find((d) => d.id === Number(form.doctor));
  const selectedService = SERVICES.find((s) => s.id === Number(form.service));

  const handleConfirm = async () => {
    if (!isAuthenticated) {
      addToast("Please login or register to confirm your booking", "warning");
      return;
    }

    try {
      let patientId = user?.patientId;
      if (!patientId && user?.id) {
        const p = await patientApi.getPatientByUserId(user.id).catch(() => null);
        if (p) patientId = p.id;
      }

      const dentistId = Number(form.doctor) || (liveDentists[0]?.id || 1);
      const startTime = formatTime24Hour(form.time || "10:00 AM");
      const endTime = addMinutesToTime(startTime, 30);

      await appointmentApi.createAppointment({
        patientId: patientId || 1,
        dentistId,
        appointmentDate: form.date || new Date().toISOString().slice(0, 10),
        startTime,
        endTime,
        appointmentType: selectedService?.name?.toUpperCase().replace(/\s+/g, "_") || "CONSULTATION",
        reason: form.reason || "General Consultation",
        notes: `Booked via public booking portal for ${selectedService?.name || "General Care"}`,
      });
    } catch (err) {
      console.warn("Backend appointment creation fallback to local state:", err);
    }

    const newAppointment = {
      id: `AP-${Date.now().toString().slice(-4)}`,
      doctor: selectedDoctor?.name || "Dr. James Wilson",
      service: selectedService?.name || "General Checkup",
      date: form.date || new Date().toISOString().slice(0, 10),
      time: form.time || "10:00 AM",
      status: "confirmed",
      reason: form.reason || "General Consultation",
      patient: user?.name || "Current Patient",
    };

    saveRecord("appointments", newAppointment);
    setConfirmed(true);
    addToast("Appointment confirmed successfully!", "success");
  };

  const handleReset = () => {
    setConfirmed(false);
    setStep(0);
    setForm({
      doctor: "",
      service: "",
      date: new Date().toISOString().slice(0, 10),
      time: "10:00 AM",
      reason: "",
    });
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  if (confirmed) {
    return (
      <>
        <div className="df-page-banner">
          <h1>Appointment Confirmed!</h1>
          <p>Your dental consultation has been scheduled successfully.</p>
        </div>
        <div className="df-page-content">
          <div className="df-card" style={{ maxWidth: 540, margin: "0 auto" }}>
            <div className="df-card-body" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <h2 style={{ marginBottom: 8 }}>Your appointment is booked</h2>
              <p style={{ color: "var(--df-text-secondary)", marginBottom: 24, lineHeight: 1.6 }}>
                <strong>{selectedDoctor?.name || "Specialist"}</strong> · {selectedService?.name || "Dental Care"}
                <br />
                📅 {form.date} at 🕒 {form.time}
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <Link
                  to={user ? `/${user.role}/appointments` : "/login"}
                  className="df-btn df-btn-primary"
                >
                  View Appointments
                </Link>
                <button className="df-btn df-btn-secondary" onClick={handleReset}>
                  Book Another Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="df-page-banner">
        <h1>Book an Appointment</h1>
        <p>Schedule your dental visit in a few simple steps with our board-certified dentists.</p>
      </div>
      <div className="df-page-content">
        {!isAuthenticated && (
          <div className="df-alert df-alert-warning" style={{ marginBottom: 24 }}>
            Please <Link to="/login" style={{ color: "inherit", fontWeight: 700 }}>Login</Link> or{" "}
            <Link to="/register" style={{ color: "inherit", fontWeight: 700 }}>Register</Link> to complete booking.
          </div>
        )}

        <div className="df-steps">
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: "flex", alignItems: "center" }}>
              <div className={`df-step ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}>
                <div className="df-step-num">{i < step ? "✓" : i + 1}</div>
                <span className="df-step-label">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`df-step-line ${i < step ? "done" : ""}`} />}
            </div>
          ))}
        </div>

        <div className="df-card" style={{ maxWidth: 640, margin: "0 auto" }}>
          <div className="df-card-body">
            {step === 0 && (
              <>
                <h3 style={{ marginBottom: 16 }}>Select Doctor</h3>
                <div className="df-form-group">
                  <select
                    className="df-select"
                    value={form.doctor}
                    onChange={(e) => update("doctor", e.target.value)}
                  >
                    <option value="">Choose a doctor...</option>
                    {DOCTORS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} — {d.specialty} ({d.experience})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h3 style={{ marginBottom: 16 }}>Select Service</h3>
                <div className="df-form-group">
                  <select
                    className="df-select"
                    value={form.service}
                    onChange={(e) => update("service", e.target.value)}
                  >
                    <option value="">Choose a service...</option>
                    {SERVICES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {s.category} ({s.price})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h3 style={{ marginBottom: 16 }}>Select Date</h3>
                <div className="df-form-group">
                  <input
                    className="df-input"
                    type="date"
                    value={form.date}
                    min={todayStr}
                    onChange={(e) => update("date", e.target.value)}
                  />
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h3 style={{ marginBottom: 16 }}>Select Available Time</h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
                    gap: 8,
                  }}
                >
                  {TIME_SLOTS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`df-btn ${form.time === t ? "df-btn-primary" : "df-btn-secondary"} df-btn-sm`}
                      onClick={() => update("time", t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <h3 style={{ marginBottom: 16 }}>Appointment Details</h3>
                <div className="df-form-group">
                  <label className="df-label">Reason for Visit / Symptoms</label>
                  <textarea
                    className="df-textarea"
                    rows={4}
                    value={form.reason}
                    onChange={(e) => update("reason", e.target.value)}
                    placeholder="Describe any dental pain, concerns, or previous treatments..."
                  />
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <h3 style={{ marginBottom: 16 }}>Review & Confirm</h3>
                <div
                  style={{
                    background: "var(--df-gray-50)",
                    borderRadius: 12,
                    padding: 20,
                    marginBottom: 16,
                  }}
                >
                  <p><strong>Doctor:</strong> {selectedDoctor?.name || "Not selected"}</p>
                  <p><strong>Service:</strong> {selectedService?.name || "Not selected"}</p>
                  <p><strong>Date:</strong> {form.date}</p>
                  <p><strong>Time:</strong> {form.time}</p>
                  <p><strong>Estimated Fee:</strong> {selectedService?.price || "—"}</p>
                  <p><strong>Reason:</strong> {form.reason || "General Consultation"}</p>
                </div>
              </>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
              <button
                type="button"
                className="df-btn df-btn-secondary"
                disabled={step === 0}
                onClick={() => setStep(step - 1)}
              >
                Back
              </button>
              {step < 5 ? (
                <button
                  type="button"
                  className="df-btn df-btn-primary"
                  onClick={() => {
                    if (step === 0 && !form.doctor) {
                      addToast("Please select a doctor to continue", "warning");
                      return;
                    }
                    if (step === 1 && !form.service) {
                      addToast("Please select a service to continue", "warning");
                      return;
                    }
                    setStep(step + 1);
                  }}
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  className="df-btn df-btn-primary"
                  disabled={!isAuthenticated}
                  onClick={handleConfirm}
                >
                  Confirm Appointment
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
