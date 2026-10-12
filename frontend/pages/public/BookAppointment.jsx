import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Heart,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import { useDashboardData } from "../../context/DashboardDataContext";

import { dentistApi } from "../../api/dentists";
import { servicesApi } from "../../api/services";
import { patientApi } from "../../api/patients";
import {
  appointmentApi,
  formatTime24Hour,
  addMinutesToTime,
  generateSlotIntervals,
} from "../../api/appointments";

import heroImage from "../../assets/book_appointment_hero.png";

import styles from "./BookAppointment.module.css";

const STEPS = [
  "Select Doctor",
  "Select Service",
  "Select Date",
  "Select Time",
  "Details",
  "Review",
];

const getLocalDateString = () => {
  const d = new Date();

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export default function BookAppointment() {
  const { isAuthenticated, user } = useAuth();
  const { addToast } = useNotifications();
  const { saveRecord } = useDashboardData();
  const location = useLocation();

  const todayStr = useMemo(
      () => getLocalDateString(),
      []
  );

  const initialDoctor = location.state?.doctorId
      ? String(location.state.doctorId)
      : "";

  const initialService = location.state?.serviceId
      ? String(location.state.serviceId)
      : "";

  const initialStep = initialDoctor
      ? initialService
          ? 2
          : 1
      : 0;

  const [step, setStep] = useState(initialStep);

  const [liveDentists, setLiveDentists] = useState([]);
  const [isLoadingDentists, setIsLoadingDentists] =
      useState(true);

  const [services, setServices] = useState([]);
  const [isLoadingServices, setIsLoadingServices] =
      useState(true);

const [isSubmitting, setIsSubmitting] =
       useState(false);

  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState({});

  const [availableSlots, setAvailableSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState("");

const [form, setForm] = useState({
     doctor: initialDoctor,
     service: initialService,
     date: todayStr,
     time: "",
     reason: "",
  });

  /* =========================
     LOAD DOCTORS
  ========================= */

  useEffect(() => {
    let active = true;

    dentistApi
        .getAllDentists()
        .then((list) => {
          if (active && Array.isArray(list)) {
            setLiveDentists(list);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (active) {
            setIsLoadingDentists(false);
          }
        });

    return () => {
      active = false;
    };
  }, []);

  /* =========================
     LOAD SERVICES
  ========================= */

  useEffect(() => {
    let active = true;

    servicesApi
        .getServices()
        .then((list) => {
          if (active && Array.isArray(list)) {
            setServices(list);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (active) {
            setIsLoadingServices(false);
          }
        });

    return () => {
      active = false;
    };
  }, []);

  /* =========================
     DATA
  ========================= */

  const doctorList = useMemo(() => {
    return liveDentists
      .filter((d) => d && (d.status === "active" || d.rawStatus === "ACTIVE"))
      .map((d) => ({
        id: d.id,
        name: d.name,
        specialty:
            d.specialization || "General Dentistry",
        qualification: d.qualification || "",
        experience: d.experienceYears
            ? `${d.experienceYears}+ years`
            : "",
        status: d.status,
      }));
  }, [liveDentists]);

  // Clear inactive or deactivated doctor if previously selected
  useEffect(() => {
    if (!isLoadingDentists && form.doctor) {
      const isDocActive = doctorList.some((d) => String(d.id) === String(form.doctor));
      if (!isDocActive) {
        setForm((prev) => ({ ...prev, doctor: "", time: "" }));
        setAvailableSlots([]);
        addToast("The selected doctor is currently unavailable. Please choose another doctor.", "warning");
        if (step > 0) setStep(0);
      }
    }
  }, [isLoadingDentists, doctorList, form.doctor, step, addToast]);

  const selectedDoctor = useMemo(
      () =>
          form.doctor
              ? doctorList.find(
                  (d) =>
                      String(d.id) === String(form.doctor)
              )
              : null,
      [doctorList, form.doctor]
  );

  const selectedService = useMemo(
      () =>
          form.service
              ? services.find(
                  (s) =>
                      String(s.id) === String(form.service)
              )
              : null,
      [services, form.service]
  );

/* =========================
      FETCH AVAILABLE SLOTS
   ========================= */

  useEffect(() => {
    let active = true;

    if (form.doctor && form.date && !isLoadingSlots) {
      const dentistId = Number(form.doctor);
      const dateStr = form.date;

      setIsLoadingSlots(true);
      setSlotsError("");
      setAvailableSlots([]);

      setForm((current) => ({ ...current, time: "" }));

      appointmentApi
          .getAvailableSlots(dentistId, dateStr)
          .then((ranges) => {
            if (active && Array.isArray(ranges) && ranges.length > 0) {
              const slots = generateSlotIntervals(
                  ranges,
                  dateStr,
                  30
              );
              setAvailableSlots(slots);
            } else if (active) {
              setAvailableSlots([]);
            }
          })
          .catch(() => {
            if (active) {
              setSlotsError(
                  "Unable to load available slots. Please try again."
              );
              setAvailableSlots([]);
            }
          })
          .finally(() => {
            if (active) {
              setIsLoadingSlots(false);
            }
          });
    } else {
      setAvailableSlots([]);
      setIsLoadingSlots(false);
    }

    return () => {
      active = false;
    };
  }, [form.doctor, form.date]);

  /* =========================
      FORM UPDATE
   ========================= */

  const update = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [key]: "",
      submit: "",
    }));
  };

  /* =========================
     VALIDATION
  ========================= */

  const validateStep = (currentStep = step) => {
    let stepError = null;

    if (
        currentStep === 0 &&
        !String(form.doctor || "").trim()
    ) {
      stepError = {
        doctor: "Please select a doctor.",
      };
    } else if (
        currentStep === 1 &&
        !String(form.service || "").trim()
    ) {
      stepError = {
        service: "Please select a dental service.",
      };
    } else if (currentStep === 2) {
      if (!String(form.date || "").trim()) {
        stepError = {
          date: "Appointment date is required.",
        };
      } else if (form.date < todayStr) {
        stepError = {
          date:
              "Appointment date cannot be in the past.",
        };
      }
    } else if (
        currentStep === 3 &&
        !String(form.time || "").trim()
    ) {
      stepError = {
        time:
            "Please select an available time slot.",
      };
    } else if (currentStep === 4) {
      const reason = String(
          form.reason || ""
      ).trim();

      if (reason && reason.length < 3) {
        stepError = {
          reason:
              "Reason must contain at least 3 characters.",
        };
      } else if (
          reason &&
          !/^[\w\s.,!?()'"/\-–—&;:#]+$/.test(reason)
      ) {
        stepError = {
          reason:
              "Reason contains invalid characters.",
        };
      }
    }

    if (stepError) {
      setErrors((previous) => ({
        ...previous,
        ...stepError,
      }));

      return false;
    }

    return true;
  };

  const validateAll = () => {
    const nextErrors = {};

    if (!String(form.doctor || "").trim()) {
      nextErrors.doctor =
          "Please select a doctor.";
    } else {
      const activeDoc = doctorList.find((d) => String(d.id) === String(form.doctor));
      if (!activeDoc) {
        nextErrors.doctor = "The selected doctor is currently unavailable. Please choose another doctor.";
      }
    }

    if (!String(form.service || "").trim()) {
      nextErrors.service =
          "Please select a dental service.";
    }

    if (!String(form.date || "").trim()) {
      nextErrors.date =
          "Appointment date is required.";
    } else if (form.date < todayStr) {
      nextErrors.date =
          "Appointment date cannot be in the past.";
    }

    if (!String(form.time || "").trim()) {
      nextErrors.time =
          "Please select an available time slot.";
    }

    const reason = String(
        form.reason || ""
    ).trim();

    if (reason && reason.length < 3) {
      nextErrors.reason =
          "Reason must contain at least 3 characters.";
    } else if (
        reason &&
        !/^[\w\s.,!?()'"/\-–—&;:#]+$/.test(reason)
    ) {
      nextErrors.reason =
          "Reason contains invalid characters.";
    }

    setErrors(nextErrors);

    return nextErrors;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;

    setStep((current) =>
        Math.min(
            current + 1,
            STEPS.length - 1
        )
    );
  };

  const handleBack = () => {
    setStep((current) =>
        Math.max(current - 1, 0)
    );
  };

  const handleStepClick = (targetIndex) => {
    if (targetIndex < step) {
      setStep(targetIndex);
    }
  };

  /* =========================
     CONFIRM APPOINTMENT
  ========================= */

  const handleConfirm = async () => {
    if (isSubmitting) return;

    if (!isAuthenticated) {
      addToast(
          "Please login or register to confirm your booking",
          "warning"
      );
      return;
    }

    const formErrors = validateAll();

    if (Object.keys(formErrors).length > 0) {
      if (formErrors.doctor) setStep(0);
      else if (formErrors.service) setStep(1);
      else if (formErrors.date) setStep(2);
      else if (formErrors.time) setStep(3);
      else if (formErrors.reason) setStep(4);

      return;
    }

    const dentistId = Number(form.doctor);

    if (
        !Number.isInteger(dentistId) ||
        dentistId <= 0
    ) {
      setErrors({
        doctor: "Please select a valid doctor.",
      });
      setStep(0);
      return;
    }

    setIsSubmitting(true);

    const reason = String(
        form.reason || ""
    ).trim();

    try {
      let patientId = user?.patientId;

      if (!patientId && user?.id) {
        const patient =
            await patientApi
                .getPatientByUserId(user.id)
                .catch(() => null);

        if (patient?.id) {
          patientId = patient.id;
        }
      }

      if (!patientId) {
        const message =
            "Patient profile could not be found. Please login again.";

        addToast(message, "error");

        setErrors({
          submit: message,
        });

        setIsSubmitting(false);
        return;
      }

      const startTime =
          formatTime24Hour(form.time);

      const endTime =
          addMinutesToTime(
              startTime,
              30
          );

      const appointmentPayload = {
        patientId,
        dentistId,
        appointmentDate: form.date,
        startTime,
        endTime,
        appointmentType:
            selectedService?.name
                ?.toUpperCase()
                .replace(/\s+/g, "_") ||
            "CONSULTATION",
        reason:
            reason || "General Consultation",
        notes: `Booked via public booking portal for ${
            selectedService?.name ||
            "General Care"
        }`,
      };

      const createdRecord =
          await appointmentApi.createAppointment(
              appointmentPayload
          );

      if (
          typeof saveRecord === "function" &&
          createdRecord
      ) {
        saveRecord(
            "appointments",
            createdRecord
        );
      }

      setConfirmed(true);

      addToast(
          "Appointment confirmed successfully!",
          "success"
      );
    } catch (err) {
      console.warn(
          "Appointment creation failed:",
          err
      );

      const backendMessage =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          (typeof err?.response?.data ===
          "string"
              ? err.response.data
              : "") ||
          err?.message ||
          "Unable to create appointment.";

      setErrors({
        submit: backendMessage,
      });

      addToast(
          backendMessage,
          "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /* =========================
     RESET
  ========================= */

const handleReset = () => {
     setConfirmed(false);
     setErrors({});
     setStep(0);
     setAvailableSlots([]);
     setIsLoadingSlots(false);
     setSlotsError("");

     setForm({
       doctor: "",
       service: "",
       date: getLocalDateString(),
       time: "",
      reason: "",
    });
  };

  const appointmentsPath = user?.role
      ? `/${user.role.toLowerCase()}/appointments`
      : "/login";

  /* =========================
     CONFIRMED VIEW
  ========================= */

  if (confirmed) {
    return (
        <main className={styles.page}>
          <section className={styles.confirmedSection}>
            <div className={styles.confirmedCard}>
              <div className={styles.successIcon}>
                <CheckCircle2 size={34} />
              </div>

              <span className={styles.confirmedEyebrow}>
              APPOINTMENT CONFIRMED
            </span>

              <h1>Your appointment is booked</h1>

              <p>
                Your dental consultation has been
                scheduled successfully.
              </p>

              <div className={styles.confirmedDetails}>
                <div>
                  <Stethoscope size={18} />
                  <span>
                  {selectedDoctor?.name ||
                      "Specialist"}
                </span>
                </div>

                <div>
                  <Sparkles size={18} />
                  <span>
                  {selectedService?.name ||
                      "Dental Care"}
                </span>
                </div>

                <div>
                  <CalendarDays size={18} />
                  <span>{form.date}</span>
                </div>

                <div>
                  <Clock3 size={18} />
                  <span>{form.time}</span>
                </div>
              </div>

              <div className={styles.confirmedActions}>
                <Link
                    to={appointmentsPath}
                    className={styles.primaryButton}
                >
                  View Appointments
                  <ArrowRight size={17} />
                </Link>

                <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={handleReset}
                >
                  Book Another Appointment
                </button>
              </div>
            </div>
          </section>
        </main>
    );
  }

  /* =========================
     MAIN PAGE
  ========================= */

  return (
      <main className={styles.page}>
        {/* HERO */}

        <section className={styles.hero}>
          <img
              src={heroImage}
              alt="Dental appointment"
              className={styles.heroImage}
          />

          <div className={styles.heroOverlay} />

          <div className={styles.heroContent}>
            <div className={styles.heroText}>
              <div className={styles.eyebrow}>
                <CalendarDays size={15} />
                <span>BOOK APPOINTMENT</span>
              </div>

              <h1>
                Schedule Your
                <span>Dental Visit</span>
              </h1>

              <p>
                Choose your preferred dentist,
                service and time slot. We'll take
                care of the rest, so you can focus
                on your healthy smile.
              </p>

              <div className={styles.heroHighlights}>
                <div className={styles.highlight}>
                  <div className={styles.highlightIcon}>
                    <CalendarDays size={20} />
                  </div>

                  <div>
                    <strong>Easy Booking</strong>
                    <span>Quick & Convenient</span>
                  </div>
                </div>

                <div className={styles.highlight}>
                  <div className={styles.highlightIcon}>
                    <UserRound size={20} />
                  </div>

                  <div>
                    <strong>Expert Dentists</strong>
                    <span>Professional Care</span>
                  </div>
                </div>

                <div className={styles.highlight}>
                  <div className={styles.highlightIcon}>
                    <ShieldCheck size={20} />
                  </div>

                  <div>
                    <strong>Safe & Secure</strong>
                    <span>Your Health First</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LOGIN WARNING */}

        {!isAuthenticated && (
            <div className={styles.loginNotice}>
              <LockKeyhole size={18} />

              <span>
            Please{" "}
                <Link to="/login">
              Login
            </Link>{" "}
                or{" "}
                <Link to="/register">
              Register
            </Link>{" "}
                to complete your booking.
          </span>
            </div>
        )}

        {/* STEPS */}

        <section className={styles.bookingSection}>
          <div className={styles.steps}>
            {STEPS.map((label, index) => (
                <div
                    key={label}
                    className={styles.stepWrapper}
                >
                  <button
                      type="button"
                      className={`${styles.stepItem} ${
                          index === step
                              ? styles.activeStep
                              : ""
                      } ${
                          index < step
                              ? styles.completedStep
                              : ""
                      }`}
                      onClick={() =>
                          handleStepClick(index)
                      }
                      disabled={index > step}
                  >
                <span className={styles.stepNumber}>
                  {index < step
                      ? "✓"
                      : index + 1}
                </span>

                    <span className={styles.stepLabel}>
                  {label}
                </span>
                  </button>

                  {index <
                      STEPS.length - 1 && (
                          <div
                              className={`${styles.stepLine} ${
                                  index < step
                                      ? styles.completedLine
                                      : ""
                              }`}
                          />
                      )}
                </div>
            ))}
          </div>

          {/* FORM CARD */}

          <div className={styles.bookingCard}>
            {/* STEP 1 */}

            {step === 0 && (
                <div className={styles.formStep}>
                  <div className={styles.stepHeading}>
                    <div className={styles.stepHeadingIcon}>
                      <Stethoscope size={22} />
                    </div>

                    <div>
                      <span>STEP 01</span>
                      <h2>Select Your Dentist</h2>
                      <p>
                        Choose a dentist for your
                        appointment.
                      </p>
                    </div>
                  </div>

                  <label className={styles.label}>
                    Choose a Doctor
                  </label>

                  <select
                      className={styles.input}
                      value={form.doctor}
                      onChange={(event) =>
                          update(
                              "doctor",
                              event.target.value
                          )
                      }
                      disabled={
                          isLoadingDentists &&
                          liveDentists.length === 0
                      }
                  >
                    <option value="">
                      {isLoadingDentists &&
                      liveDentists.length === 0
                          ? "Loading dentists..."
                          : doctorList.length === 0
                              ? "No dentists currently available"
                              : "Choose a doctor..."}
                    </option>

                    {doctorList.map((doctor) => (
                        <option
                            key={doctor.id}
                            value={doctor.id}
                        >
                          {doctor.name}
                          {doctor.specialty
                              ? ` — ${doctor.specialty}`
                              : ""}
                          {doctor.experience
                              ? ` (${doctor.experience})`
                              : ""}
                        </option>
                    ))}
                  </select>

                  {errors.doctor && (
                      <span className={styles.error}>
                  {errors.doctor}
                </span>
                  )}
                </div>
            )}

            {/* STEP 2 */}

            {step === 1 && (
                <div className={styles.formStep}>
                  <div className={styles.stepHeading}>
                    <div className={styles.stepHeadingIcon}>
                      <Heart size={22} />
                    </div>

                    <div>
                      <span>STEP 02</span>
                      <h2>Select Dental Service</h2>
                      <p>
                        Choose the service you need.
                      </p>
                    </div>
                  </div>

                  <label className={styles.label}>
                    Choose a Service
                  </label>

                  <select
                      className={styles.input}
                      value={form.service}
                      onChange={(event) =>
                          update(
                              "service",
                              event.target.value
                          )
                      }
                      disabled={
                          isLoadingServices &&
                          services.length === 0
                      }
                  >
                    <option value="">
                      {isLoadingServices &&
                      services.length === 0
                          ? "Loading services..."
                          : services.length === 0
                              ? "No services currently available"
                              : "Choose a service..."}
                    </option>

                    {services.map((service) => (
                        <option
                            key={service.id}
                            value={service.id}
                        >
                          {service.name}
                          {service.category
                              ? ` — ${service.category}`
                              : ""}
                          {service.price
                              ? ` (${service.price})`
                              : ""}
                        </option>
                    ))}
                  </select>

                  {errors.service && (
                      <span className={styles.error}>
                  {errors.service}
                </span>
                  )}
                </div>
            )}

            {/* STEP 3 */}

            {step === 2 && (
                <div className={styles.formStep}>
                  <div className={styles.stepHeading}>
                    <div className={styles.stepHeadingIcon}>
                      <CalendarDays size={22} />
                    </div>

                    <div>
                      <span>STEP 03</span>
                      <h2>Select Appointment Date</h2>
                      <p>
                        Choose a convenient date for
                        your visit.
                      </p>
                    </div>
                  </div>

                  <label
                      className={styles.label}
                      htmlFor="appointment-date"
                  >
                    Appointment Date
                  </label>

                  <input
                      id="appointment-date"
                      className={styles.input}
                      type="date"
                      value={form.date}
                      min={todayStr}
                      onChange={(event) =>
                          update(
                              "date",
                              event.target.value
                          )
                      }
                  />

                  {errors.date && (
                      <span className={styles.error}>
                  {errors.date}
                </span>
                  )}
                </div>
            )}

{/* STEP 4 */}

            {step === 3 && (
                <div className={styles.formStep}>
                  <div className={styles.stepHeading}>
                    <div className={styles.stepHeadingIcon}>
                      <Clock3 size={22} />
                    </div>

                    <div>
                      <span>STEP 04</span>
                      <h2>Select Available Time</h2>
                      <p>
                        Select your preferred
                        appointment time.
                      </p>
                    </div>
                  </div>

                  <label className={styles.label}>
                    Available Time Slots
                  </label>

                  {isLoadingSlots && (
                      <div className={styles.slotLoading}>
                        <Clock3 size={18} />
                        <span>Checking available slots...</span>
                      </div>
                  )}

                  {slotsError && (
                      <div className={styles.slotError}>
                        <span>{slotsError}</span>
                      </div>
                  )}

                  {!isLoadingSlots && !slotsError && (
                      <>
                        {availableSlots.length === 0 ? (
                            <div className={styles.slotEmpty}>
                              <span>
                                No appointment slots configured for this doctor on the selected date.
                              </span>
                            </div>
                        ) : (
                            <div className={styles.timeGrid}>
                              {availableSlots.map((slot) => (
                                  <button
                                      key={slot.displayTime}
                                      type="button"
                                      className={`${styles.timeButton} ${
                                          form.time === slot.displayTime
                                              ? styles.selectedTime
                                              : ""
                                      }`}
                                      onClick={() =>
                                          update("time", slot.displayTime)
                                      }
                                  >
                                    <Clock3 size={15} />
                                    {slot.displayTime}
                                  </button>
                              ))}
                            </div>
                        )}
                      </>
                  )}

                  {errors.time && (
                      <span className={styles.error}>
                    {errors.time}
                  </span>
                  )}
                </div>
            )}

            {/* STEP 5 */}

            {step === 4 && (
                <div className={styles.formStep}>
                  <div className={styles.stepHeading}>
                    <div className={styles.stepHeadingIcon}>
                      <MessageSquareIcon />
                    </div>

                    <div>
                      <span>STEP 05</span>
                      <h2>Appointment Details</h2>
                      <p>
                        Tell us about your visit.
                      </p>
                    </div>
                  </div>

                  <label
                      className={styles.label}
                      htmlFor="appointment-reason"
                  >
                    Reason for Visit / Symptoms
                  </label>

                  <textarea
                      id="appointment-reason"
                      className={styles.textarea}
                      rows={5}
                      value={form.reason}
                      onChange={(event) =>
                          update(
                              "reason",
                              event.target.value
                          )
                      }
                      placeholder="Describe any dental pain, concerns, or previous treatments..."
                      maxLength={500}
                  />

                  <div className={styles.characterCount}>
                    {form.reason.length}/500
                  </div>

                  {errors.reason && (
                      <span className={styles.error}>
                  {errors.reason}
                </span>
                  )}
                </div>
            )}

            {/* STEP 6 */}

            {step === 5 && (
                <div className={styles.formStep}>
                  <div className={styles.stepHeading}>
                    <div className={styles.stepHeadingIcon}>
                      <CheckCircle2 size={22} />
                    </div>

                    <div>
                      <span>STEP 06</span>
                      <h2>Review & Confirm</h2>
                      <p>
                        Check your appointment details
                        before confirming.
                      </p>
                    </div>
                  </div>

                  <div className={styles.summaryCard}>
                    <div className={styles.summaryRow}>
                      <span>Doctor</span>
                      <strong>
                        {selectedDoctor?.name ||
                            "Not selected"}
                      </strong>
                    </div>

                    <div className={styles.summaryRow}>
                      <span>Service</span>
                      <strong>
                        {selectedService?.name ||
                            "Not selected"}
                      </strong>
                    </div>

                    <div className={styles.summaryRow}>
                      <span>Date</span>
                      <strong>{form.date}</strong>
                    </div>

                    <div className={styles.summaryRow}>
                      <span>Time</span>
                      <strong>{form.time}</strong>
                    </div>

                    <div className={styles.summaryRow}>
                      <span>Estimated Fee</span>
                      <strong>
                        {selectedService?.price ||
                            "—"}
                      </strong>
                    </div>

                    <div className={styles.summaryRow}>
                      <span>Reason</span>
                      <strong>
                        {form.reason ||
                            "General Consultation"}
                      </strong>
                    </div>
                  </div>

                  {errors.submit && (
                      <div className={styles.submitError}>
                        {errors.submit}
                      </div>
                  )}
                </div>
            )}

            {/* NAVIGATION */}

            <div className={styles.navigation}>
              <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={
                      step === 0 || isSubmitting
                  }
                  onClick={handleBack}
              >
                <ArrowLeft size={17} />
                Back
              </button>

              {step < STEPS.length - 1 ? (
                  <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={handleNext}
                  >
                    Next
                    <ArrowRight size={17} />
                  </button>
              ) : (
                  <button
                      type="button"
                      className={styles.primaryButton}
                      disabled={
                          !isAuthenticated ||
                          isSubmitting
                      }
                      onClick={handleConfirm}
                  >
                    {isSubmitting
                        ? "Confirming..."
                        : "Confirm Appointment"}
                    {!isSubmitting && (
                        <CheckCircle2 size={17} />
                    )}
                  </button>
              )}
            </div>
          </div>
        </section>
      </main>
  );
}

function MessageSquareIcon() {
  return (
      <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
      >
        <path d="M21 11.5a8.38 8.38 0 0 1-9 8.5 9.7 9.7 0 0 1-4-.8L3 21l1.8-4A8.5 8.5 0 1 1 21 11.5Z" />
      </svg>
  );
}