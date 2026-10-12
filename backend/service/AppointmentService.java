package com.dentaflow.backend.service;

import com.dentaflow.backend.entity.Appointment;
import com.dentaflow.backend.entity.Dentist;
import com.dentaflow.backend.entity.Patient;
import com.dentaflow.backend.repository.AppointmentRepository;
import com.dentaflow.backend.repository.BillRepository;
import com.dentaflow.backend.repository.DentistRepository;
import com.dentaflow.backend.repository.PatientRepository;
import com.dentaflow.backend.repository.TreatmentRepository;
import com.dentaflow.backend.strategy.appointment.AppointmentStrategyContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final DentistRepository dentistRepository;
    private final DentistAvailabilityService availabilityService;
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final TreatmentRepository treatmentRepository;
    private final BillRepository billRepository;
    private final AppointmentStrategyContext appointmentStrategyContext;

    /*
     * These statuses occupy a dentist's time slot.
     *
     * CANCELLED  -> does NOT block the slot
     * COMPLETED  -> does NOT block the slot
     * NO_SHOW    -> does NOT block the slot
     *
     * RESCHEDULED is active because the appointment has already
     * been moved to its new date/time.
     */
    private static final List<String> ACTIVE_STATUSES =
            Arrays.asList(
                    "BOOKED",
                    "CONFIRMED",
                    "RESCHEDULED"
            );

    public AppointmentService(
            AppointmentRepository appointmentRepository,
            PatientRepository patientRepository,
            DentistRepository dentistRepository,
            DentistAvailabilityService availabilityService,
            EmailService emailService,
            NotificationService notificationService,
            TreatmentRepository treatmentRepository,
            BillRepository billRepository,
            AppointmentStrategyContext appointmentStrategyContext) {

        this.appointmentRepository = appointmentRepository;
        this.patientRepository = patientRepository;
        this.dentistRepository = dentistRepository;
        this.availabilityService = availabilityService;
        this.emailService = emailService;
        this.notificationService = notificationService;
        this.treatmentRepository = treatmentRepository;
        this.billRepository = billRepository;
        this.appointmentStrategyContext = appointmentStrategyContext;
    }

    // =========================================================
    // CREATE APPOINTMENT
    // =========================================================

    public Appointment createAppointment(
            Long patientId,
            Long dentistId,
            Appointment appointment) {

        if (appointment == null) {
            throw new RuntimeException(
                    "Appointment data is required"
            );
        }

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Patient not found with id: " + patientId
                        )
                );

        Dentist dentist = dentistRepository.findById(dentistId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Dentist not found with id: " + dentistId
                        )
                );

        validateAppointmentData(appointment);

        if (!"ACTIVE".equalsIgnoreCase(patient.getStatus())) {
            throw new RuntimeException(
                    "Selected patient is not active"
            );
        }

        if (patient.getUser() != null && patient.getUser().getStatus() != null &&
                !"ACTIVE".equalsIgnoreCase(patient.getUser().getStatus())) {
            throw new RuntimeException(
                    "Selected patient account is not active"
            );
        }

        if (!"ACTIVE".equalsIgnoreCase(dentist.getStatus())) {
            throw new RuntimeException(
                    "Selected dentist is not active"
            );
        }

        LocalDate appointmentDate =
                appointment.getAppointmentDate();

        LocalTime startTime =
                appointment.getStartTime();

        LocalTime endTime =
                appointment.getEndTime();

        DayOfWeek dayOfWeek =
                appointmentDate.getDayOfWeek();

        // ---------------------------------------------------------
        // CHECK DENTIST AVAILABILITY
        // ---------------------------------------------------------

        boolean available =
                availabilityService.isDentistAvailable(
                        dentistId,
                        appointmentDate,
                        startTime,
                        endTime
                );

        if (!available) {
            throw new RuntimeException(
                    "Dentist is not available at the selected time"
            );
        }

        // ---------------------------------------------------------
        // CHECK ACTIVE OVERLAPPING APPOINTMENTS (DENTIST)
        // ---------------------------------------------------------

        boolean overlapping =
                hasOverlappingAppointment(
                        dentistId,
                        appointmentDate,
                        startTime,
                        endTime
                );

        if (overlapping) {
            throw new RuntimeException(
                    "Dentist already has an appointment at the selected time"
            );
        }

        // ---------------------------------------------------------
        // CHECK ACTIVE OVERLAPPING APPOINTMENTS (PATIENT)
        // ---------------------------------------------------------

        boolean patientOverlapping =
                hasOverlappingPatientAppointment(
                        patientId,
                        appointmentDate,
                        startTime,
                        endTime
                );

        if (patientOverlapping) {
            throw new RuntimeException(
                    "Patient already has an appointment at the selected time"
            );
        }

        // ---------------------------------------------------------
        // SET RELATIONSHIPS
        // ---------------------------------------------------------

        appointment.setPatient(patient);
        appointment.setDentist(dentist);

        // ---------------------------------------------------------
        // GENERATE APPOINTMENT CODE
        // ---------------------------------------------------------

        appointment.setAppointmentCode(
                generateAppointmentCode()
        );

        // ---------------------------------------------------------
        // DEFAULT STATUS
        // ---------------------------------------------------------

        if (appointment.getStatus() == null ||
                appointment.getStatus().trim().isEmpty()) {

            appointment.setStatus("BOOKED");
        }

        // ---------------------------------------------------------
        // DEFAULT APPOINTMENT TYPE
        // ---------------------------------------------------------

        if (appointment.getAppointmentType() == null ||
                appointment.getAppointmentType().trim().isEmpty()) {

            appointment.setAppointmentType(
                    "CONSULTATION"
            );
        }

        // ---------------------------------------------------------
        // DEFAULT BOOKING SOURCE
        // ---------------------------------------------------------

        if (appointment.getBookingSource() == null ||
                appointment.getBookingSource().trim().isEmpty()) {

            appointment.setBookingSource("ONLINE");
        }

        // ---------------------------------------------------------
        // DEFAULT REMINDER
        // ---------------------------------------------------------

        if (appointment.getReminderSent() == null) {
            appointment.setReminderSent(false);
        }

        Appointment saved = appointmentRepository.save(appointment);

        // Send automatic confirmation email & role notifications
        try {
            String pEmail = (patient.getUser() != null && patient.getUser().getEmail() != null)
                    ? patient.getUser().getEmail() : patient.getEmail();
            String pName = (patient.getFirstName() + " " + (patient.getLastName() != null ? patient.getLastName() : "")).trim();
            String dName = "Dr. " + (dentist.getFirstName() + " " + (dentist.getLastName() != null ? dentist.getLastName() : "")).trim();

            if (pEmail != null && !pEmail.isEmpty()) {
                emailService.sendAppointmentConfirmation(
                        pEmail,
                        pName,
                        dName,
                        saved.getAppointmentDate() != null ? saved.getAppointmentDate().toString() : "Scheduled Date",
                        saved.getStartTime() != null ? saved.getStartTime().toString() : "Scheduled Time",
                        saved.getAppointmentCode()
                );
            }

            // In-app notifications
            if (patient.getUser() != null) {
                com.dentaflow.backend.entity.Notification notif = new com.dentaflow.backend.entity.Notification();
                notif.setTitle("Appointment Confirmed");
                notif.setMessage("Your consultation with " + dName + " on " + saved.getAppointmentDate() + " at " + saved.getStartTime() + " has been booked (" + saved.getAppointmentCode() + ").");
                notif.setType("APPOINTMENT");
                notif.setReferenceType("APPOINTMENT");
                notif.setReferenceId(saved.getId());
                notificationService.createNotification(notif, patient.getUser().getId());
            }

            if (dentist.getUser() != null) {
                com.dentaflow.backend.entity.Notification notif = new com.dentaflow.backend.entity.Notification();
                notif.setTitle("New Appointment Scheduled");
                notif.setMessage("Patient " + pName + " scheduled on " + saved.getAppointmentDate() + " at " + saved.getStartTime() + " (" + saved.getAppointmentCode() + ").");
                notif.setType("APPOINTMENT");
                notif.setReferenceType("APPOINTMENT");
                notif.setReferenceId(saved.getId());
                notificationService.createNotification(notif, dentist.getUser().getId());
            }
        } catch (Exception ex) {
            System.err.println("Warning: Post-booking notifications/emails encountered error: " + ex.getMessage());
        }

        return saved;
    }

    // =========================================================
    // GENERATE APPOINTMENT CODE
    // =========================================================

    private String generateAppointmentCode() {

        long nextNumber =
                appointmentRepository.count() + 1;

        String code;

        do {
            code = String.format(
                    "APT%05d",
                    nextNumber
            );

            nextNumber++;

        } while (
                appointmentRepository
                        .existsByAppointmentCode(code)
        );

        return code;
    }

    // =========================================================
    // GET ALL APPOINTMENTS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Appointment> getAllAppointments() {

        return appointmentRepository.findAll();
    }

    // =========================================================
    // GET APPOINTMENT BY ID
    // =========================================================

    @Transactional(readOnly = true)
    public Appointment getAppointmentById(Long id) {

        return appointmentRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Appointment not found with id: " + id
                        )
                );
    }

    // =========================================================
    // GET APPOINTMENT BY CODE
    // =========================================================

    @Transactional(readOnly = true)
    public Appointment getAppointmentByCode(
            String appointmentCode) {

        if (appointmentCode == null ||
                appointmentCode.trim().isEmpty()) {

            throw new RuntimeException(
                    "Appointment code is required"
            );
        }

        String code = appointmentCode
                .trim()
                .toUpperCase();

        return appointmentRepository
                .findByAppointmentCode(code)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Appointment not found: " + code
                        )
                );
    }

    // =========================================================
    // GET PATIENT APPOINTMENTS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Appointment> getPatientAppointments(
            Long patientId) {

        patientRepository.findById(patientId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Patient not found with id: " + patientId
                        )
                );

        return appointmentRepository
                .findByPatientIdOrderByAppointmentDateDescStartTimeDesc(
                        patientId
                );
    }

    // =========================================================
    // GET DENTIST APPOINTMENTS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Appointment> getDentistAppointments(
            Long dentistId) {

        dentistRepository.findById(dentistId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Dentist not found with id: " + dentistId
                        )
                );

        return appointmentRepository
                .findByDentistIdOrderByAppointmentDateAscStartTimeAsc(
                        dentistId
                );
    }

    // =========================================================
    // GET APPOINTMENTS BY DATE
    // =========================================================

    @Transactional(readOnly = true)
    public List<Appointment> getAppointmentsByDate(
            LocalDate date) {

        if (date == null) {
            throw new RuntimeException(
                    "Appointment date is required"
            );
        }

        return appointmentRepository
                .findByAppointmentDateOrderByStartTimeAsc(
                        date
                );
    }

    // =========================================================
    // GET DENTIST APPOINTMENTS BY DATE
    // =========================================================

    @Transactional(readOnly = true)
    public List<Appointment> getDentistAppointmentsByDate(
            Long dentistId,
            LocalDate date) {

        dentistRepository.findById(dentistId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Dentist not found with id: " + dentistId
                        )
                );

        if (date == null) {
            throw new RuntimeException(
                    "Appointment date is required"
            );
        }

        return appointmentRepository
                .findByDentistIdAndAppointmentDateOrderByStartTimeAsc(
                        dentistId,
                        date
                );
    }

    // =========================================================
    // GET PATIENT APPOINTMENTS BY DATE
    // =========================================================

    @Transactional(readOnly = true)
    public List<Appointment> getPatientAppointmentsByDate(
            Long patientId,
            LocalDate date) {

        patientRepository.findById(patientId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Patient not found with id: " + patientId
                        )
                );

        if (date == null) {
            throw new RuntimeException(
                    "Appointment date is required"
            );
        }

        return appointmentRepository
                .findByPatientIdAndAppointmentDateOrderByStartTimeAsc(
                        patientId,
                        date
                );
    }

    // =========================================================
    // GET BY STATUS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Appointment> getAppointmentsByStatus(
            String status) {

        if (status == null ||
                status.trim().isEmpty()) {

            throw new RuntimeException(
                    "Status is required"
            );
        }

        return appointmentRepository
                .findByStatusIgnoreCaseOrderByAppointmentDateAscStartTimeAsc(
                        status.trim()
                );
    }

    // =========================================================
    // RESCHEDULE APPOINTMENT
    //
    // Reschedule is allowed even within the last 2 hours.
    //
    // OLD SLOT:
    // Automatically becomes available because the appointment
    // date/time is changed.
    //
    // NEW SLOT:
    // Must be available.
    // =========================================================

    public Appointment rescheduleAppointment(
            Long appointmentId,
            LocalDate newDate,
            LocalTime newStartTime,
            LocalTime newEndTime) {

        Appointment appointment =
                getAppointmentById(appointmentId);

        // ---------------------------------------------------------
        // CANCELLED APPOINTMENT
        // ---------------------------------------------------------

        if ("CANCELLED".equalsIgnoreCase(
                appointment.getStatus())) {

            throw new RuntimeException(
                    "Cancelled appointment cannot be rescheduled"
            );
        }

        // ---------------------------------------------------------
        // COMPLETED APPOINTMENT
        // ---------------------------------------------------------

        if ("COMPLETED".equalsIgnoreCase(
                appointment.getStatus())) {

            throw new RuntimeException(
                    "Completed appointment cannot be rescheduled"
            );
        }

        // ---------------------------------------------------------
        // NO-SHOW APPOINTMENT
        // ---------------------------------------------------------

        if ("NO_SHOW".equalsIgnoreCase(
                appointment.getStatus())) {

            throw new RuntimeException(
                    "No-show appointment cannot be rescheduled"
            );
        }

        // ---------------------------------------------------------
        // VALIDATE NEW DATE/TIME
        // ---------------------------------------------------------

        validateDateAndTime(
                newDate,
                newStartTime,
                newEndTime
        );

        // ---------------------------------------------------------
        // TODAY → 15 DAYS RULE
        // ---------------------------------------------------------

        validateBookingDate(
                newDate,
                newStartTime
        );

        Long dentistId =
                appointment.getDentist().getId();

        // ---------------------------------------------------------
        // CHECK DENTIST AVAILABILITY
        // ---------------------------------------------------------

        boolean available =
                availabilityService.isDentistAvailable(
                        dentistId,
                        newDate,
                        newStartTime,
                        newEndTime
                );

        if (!available) {
            throw new RuntimeException(
                    "Dentist is not available at the new time"
            );
        }

        // ---------------------------------------------------------
        // CHECK OVERLAPPING APPOINTMENT
        //
        // Current appointment is excluded.
        // ---------------------------------------------------------

        boolean overlapping =
                hasOverlappingAppointment(
                        dentistId,
                        newDate,
                        newStartTime,
                        newEndTime,
                        appointmentId
                );

        if (overlapping) {
            throw new RuntimeException(
                    "Dentist already has another appointment at the selected time"
            );
        }

        // ---------------------------------------------------------
        // CHECK OVERLAPPING APPOINTMENT (PATIENT)
        //
        // Current appointment is excluded.
        // ---------------------------------------------------------

        boolean patientOverlapping =
                hasOverlappingPatientAppointment(
                        appointment.getPatient().getId(),
                        newDate,
                        newStartTime,
                        newEndTime,
                        appointmentId
                );

        if (patientOverlapping) {
            throw new RuntimeException(
                    "Patient already has another appointment at the selected time"
            );
        }

        // ---------------------------------------------------------
        // DELEGATE EXECUTION TO RESCHEDULED STRATEGY
        // ---------------------------------------------------------

        Map<String, Object> context = new HashMap<>();
        context.put("newDate", newDate);
        context.put("newStartTime", newStartTime);
        context.put("newEndTime", newEndTime);

        return appointmentStrategyContext.executeTransition(
                appointment,
                "RESCHEDULED",
                context
        );
    }

    // =========================================================
    // CANCEL APPOINTMENT
    //
    // Cancellation allowed only if there are more than
    // 2 hours remaining before appointment start.
    //
    // Example:
    //
    // Appointment = 3:00 PM
    //
    // Before 1:00 PM -> Cancel ALLOWED
    // At/after 1:00 PM -> Cancel NOT ALLOWED
    //
    // Within 2 hours:
    // Cancel      -> NOT ALLOWED
    // Reschedule  -> ALLOWED
    // =========================================================

    public Appointment cancelAppointment(
            Long appointmentId,
            String reason) {

        Appointment appointment =
                getAppointmentById(appointmentId);

        Map<String, Object> context = new HashMap<>();
        if (reason != null && !reason.trim().isEmpty()) {
            context.put("reason", reason.trim());
        }

        return appointmentStrategyContext.executeTransition(
                appointment,
                "CANCELLED",
                context
        );
    }

    // =========================================================
    // CHECK WHETHER CANCELLATION IS ALLOWED
    // =========================================================

    @Transactional(readOnly = true)
    public boolean isCancellationAllowed(
            Appointment appointment) {

        if (appointment == null) {
            return false;
        }

        if (appointment.getAppointmentDate() == null ||
                appointment.getStartTime() == null) {

            return false;
        }

        LocalDateTime appointmentDateTime =
                LocalDateTime.of(
                        appointment.getAppointmentDate(),
                        appointment.getStartTime()
                );

        LocalDateTime cancellationDeadline =
                appointmentDateTime.minusHours(2);

        return LocalDateTime.now()
                .isBefore(cancellationDeadline);
    }

    // =========================================================
    // CHECK FULL REFUND ELIGIBILITY
    //
    // PaymentService can use this before cancellation/refund.
    // =========================================================

    @Transactional(readOnly = true)
    public boolean isFullRefundEligible(
            Long appointmentId) {

        Appointment appointment =
                getAppointmentById(appointmentId);

        if ("COMPLETED".equalsIgnoreCase(
                appointment.getStatus())) {

            return false;
        }

        if ("CANCELLED".equalsIgnoreCase(
                appointment.getStatus())) {

            return false;
        }

        if ("NO_SHOW".equalsIgnoreCase(
                appointment.getStatus())) {

            return false;
        }

        return isCancellationAllowed(appointment);
    }

    // =========================================================
    // GET CANCELLATION DEADLINE
    // =========================================================

    @Transactional(readOnly = true)
    public LocalDateTime getCancellationDeadline(
            Long appointmentId) {

        Appointment appointment =
                getAppointmentById(appointmentId);

        if (appointment.getAppointmentDate() == null ||
                appointment.getStartTime() == null) {

            throw new RuntimeException(
                    "Appointment date and start time are required"
            );
        }

        return LocalDateTime.of(
                appointment.getAppointmentDate(),
                appointment.getStartTime()
        ).minusHours(2);
    }

    // =========================================================
    // CONFIRM APPOINTMENT
    // =========================================================

    public Appointment confirmAppointment(
            Long appointmentId) {

        Appointment appointment =
                getAppointmentById(appointmentId);

        return appointmentStrategyContext.executeTransition(
                appointment,
                "CONFIRMED",
                Collections.emptyMap()
        );
    }

    // =========================================================
    // COMPLETE APPOINTMENT
    // =========================================================

    public Appointment completeAppointment(
            Long appointmentId) {

        Appointment appointment =
                getAppointmentById(appointmentId);

        return appointmentStrategyContext.executeTransition(
                appointment,
                "COMPLETED",
                Collections.emptyMap()
        );
    }

    // =========================================================
    // MARK AS NO SHOW
    // =========================================================

    public Appointment markAsNoShow(
            Long appointmentId) {

        Appointment appointment =
                getAppointmentById(appointmentId);

        return appointmentStrategyContext.executeTransition(
                appointment,
                "NO_SHOW",
                Collections.emptyMap()
        );
    }

    // =========================================================
    // STRATEGY PATTERN TRANSITION METHODS
    // =========================================================

    /**
     * Executes a status transition through the Strategy Design Pattern.
     */
    public Appointment transitionAppointmentStatus(
            Long appointmentId,
            String targetStatus,
            Map<String, Object> context) {

        Appointment appointment = getAppointmentById(appointmentId);
        return appointmentStrategyContext.executeTransition(
                appointment,
                targetStatus,
                context != null ? context : Collections.emptyMap()
        );
    }

    /**
     * Queries available status transitions dynamically for a given appointment.
     */
    @Transactional(readOnly = true)
    public List<String> getAvailableTransitions(Long appointmentId) {
        Appointment appointment = getAppointmentById(appointmentId);
        return appointmentStrategyContext.getAvailableTransitions(appointment);
    }

    /**
     * Queries metadata for all registered strategies in the runtime context.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getRegisteredStrategiesMetadata() {
        return appointmentStrategyContext.getRegisteredStrategiesMetadata();
    }

    // =========================================================
    // UPDATE APPOINTMENT
    // =========================================================

    public Appointment updateAppointment(
            Long appointmentId,
            Appointment updatedAppointment) {

        Appointment existing =
                getAppointmentById(appointmentId);

        if (updatedAppointment == null) {
            throw new RuntimeException(
                    "Appointment data is required"
            );
        }

        // ---------------------------------------------------------
        // APPOINTMENT TYPE
        // ---------------------------------------------------------

        if (updatedAppointment.getAppointmentType() != null) {

            String appointmentType =
                    updatedAppointment.getAppointmentType().trim();

            if (!appointmentType.isEmpty()) {
                existing.setAppointmentType(
                        appointmentType
                );
            }
        }

        // ---------------------------------------------------------
        // NOTES
        // ---------------------------------------------------------

        if (updatedAppointment.getNotes() != null) {

            existing.setNotes(
                    updatedAppointment.getNotes().trim()
            );
        }

        // ---------------------------------------------------------
        // REASON
        // ---------------------------------------------------------

        if (updatedAppointment.getReason() != null) {

            existing.setReason(
                    updatedAppointment.getReason().trim()
            );
        }

        // ---------------------------------------------------------
        // STATUS (DELEGATE TO STRATEGY PATTERN IF STATUS CHANGES)
        // ---------------------------------------------------------

        if (updatedAppointment.getStatus() != null) {

            String status =
                    updatedAppointment.getStatus()
                            .trim()
                            .toUpperCase();

            if (!status.isEmpty() && !status.equalsIgnoreCase(existing.getStatus())) {
                Map<String, Object> ctx = new HashMap<>();
                if (existing.getReason() != null) {
                    ctx.put("reason", existing.getReason());
                }
                return appointmentStrategyContext.executeTransition(
                        existing,
                        status,
                        ctx
                );
            }
        }

        return appointmentRepository.save(existing);
    }

    // =========================================================
    // CHECK ACTIVE OVERLAPPING APPOINTMENT
    //
    // ONLY:
    //
    // BOOKED
    // CONFIRMED
    // RESCHEDULED
    //
    // block the slot.
    //
    // CANCELLED / COMPLETED / NO_SHOW
    // do NOT block the slot.
    // =========================================================

    @Transactional(readOnly = true)
    public boolean hasOverlappingAppointment(
            Long dentistId,
            LocalDate date,
            LocalTime startTime,
            LocalTime endTime) {

        List<Appointment> appointments =
                appointmentRepository
                        .findByDentistIdAndAppointmentDateAndStatusInAndStartTimeLessThanAndEndTimeGreaterThan(
                                dentistId,
                                date,
                                ACTIVE_STATUSES,
                                endTime,
                                startTime
                        );

        return !appointments.isEmpty();
    }

    // =========================================================
    // CHECK ACTIVE OVERLAPPING APPOINTMENT
    // EXCLUDING CURRENT APPOINTMENT
    //
    // Used during rescheduling.
    // =========================================================

    @Transactional(readOnly = true)
    public boolean hasOverlappingAppointment(
            Long dentistId,
            LocalDate date,
            LocalTime startTime,
            LocalTime endTime,
            Long excludedAppointmentId) {

        List<Appointment> appointments =
                appointmentRepository
                        .findByDentistIdAndAppointmentDateAndStatusInAndStartTimeLessThanAndEndTimeGreaterThan(
                                dentistId,
                                date,
                                ACTIVE_STATUSES,
                                endTime,
                                startTime
                        );

        return appointments.stream()
                .anyMatch(appointment ->
                        appointment.getId() != null
                                &&
                                !appointment.getId().equals(
                                        excludedAppointmentId
                                )
                );
    }

    // =========================================================
    // CHECK ACTIVE OVERLAPPING APPOINTMENT FOR PATIENT
    // =========================================================

    @Transactional(readOnly = true)
    public boolean hasOverlappingPatientAppointment(
            Long patientId,
            LocalDate date,
            LocalTime startTime,
            LocalTime endTime) {

        List<Appointment> appointments =
                appointmentRepository
                        .findByPatientIdAndAppointmentDateAndStatusInAndStartTimeLessThanAndEndTimeGreaterThan(
                                patientId,
                                date,
                                ACTIVE_STATUSES,
                                endTime,
                                startTime
                        );

        return !appointments.isEmpty();
    }

    @Transactional(readOnly = true)
    public boolean hasOverlappingPatientAppointment(
            Long patientId,
            LocalDate date,
            LocalTime startTime,
            LocalTime endTime,
            Long excludedAppointmentId) {

        List<Appointment> appointments =
                appointmentRepository
                        .findByPatientIdAndAppointmentDateAndStatusInAndStartTimeLessThanAndEndTimeGreaterThan(
                                patientId,
                                date,
                                ACTIVE_STATUSES,
                                endTime,
                                startTime
                        );

        return appointments.stream()
                .anyMatch(appointment ->
                        appointment.getId() != null
                                &&
                                !appointment.getId().equals(
                                        excludedAppointmentId
                                )
                );
    }

    // =========================================================
    // GET ACTIVE APPOINTMENTS FOR DENTIST ON DATE
    //
    // Useful for available slot calculation.
    // =========================================================

    @Transactional(readOnly = true)
    public List<Appointment> getActiveAppointmentsByDentistAndDate(
            Long dentistId,
            LocalDate date) {

        dentistRepository.findById(dentistId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Dentist not found with id: " + dentistId
                        )
                );

        if (date == null) {
            throw new RuntimeException(
                    "Appointment date is required"
            );
        }

        return appointmentRepository
                .findByDentistIdAndAppointmentDateAndStatusInOrderByStartTimeAsc(
                        dentistId,
                        date,
                        ACTIVE_STATUSES
                );
    }

    // =========================================================
    // VALIDATE APPOINTMENT DATA
    // =========================================================

    private void validateAppointmentData(
            Appointment appointment) {

        validateDateAndTime(
                appointment.getAppointmentDate(),
                appointment.getStartTime(),
                appointment.getEndTime()
        );

        /*
         * FINAL BOOKING RULE:
         *
         * TODAY -> NEXT 15 DAYS
         *
         * Example:
         *
         * Today = 24 Aug
         *
         * 24 Aug -> ALLOWED
         * 25 Aug -> ALLOWED
         * ...
         * 08 Sep -> ALLOWED
         * 09 Sep -> NOT ALLOWED
         */

        validateBookingDate(
                appointment.getAppointmentDate(),
                appointment.getStartTime()
        );
    }

    // =========================================================
    // VALIDATE BOOKING DATE
    //
    // FINAL RULE:
    //
    // Today -> Today + 15 days
    //
    // Past date              -> NOT ALLOWED
    // Today + 1 ... +15     -> ALLOWED
    // Today +16 and above   -> NOT ALLOWED
    //
    // TODAY:
    // Only future time slots are allowed.
    // =========================================================

    private void validateBookingDate(
            LocalDate date,
            LocalTime startTime) {

        LocalDate today =
                LocalDate.now();

        LocalDate maximumBookingDate =
                today.plusDays(15);

        // ---------------------------------------------------------
        // PAST DATE
        // ---------------------------------------------------------

        if (date.isBefore(today)) {

            throw new RuntimeException(
                    "Appointment date cannot be in the past"
            );
        }

        // ---------------------------------------------------------
        // MORE THAN 15 DAYS
        // ---------------------------------------------------------

        if (date.isAfter(maximumBookingDate)) {

            throw new RuntimeException(
                    "Appointment can only be booked from today " +
                            "up to the next 15 days"
            );
        }

        // ---------------------------------------------------------
        // SAME DAY
        // ---------------------------------------------------------

        if (date.equals(today)) {

            if (startTime == null ||
                    !startTime.isAfter(LocalTime.now())) {

                throw new RuntimeException(
                        "Same-day appointment time must be in the future"
                );
            }
        }
    }

    // =========================================================
    // VALIDATE DATE AND TIME
    // =========================================================

    private void validateDateAndTime(
            LocalDate date,
            LocalTime startTime,
            LocalTime endTime) {

        if (date == null) {

            throw new RuntimeException(
                    "Appointment date is required"
            );
        }

        if (startTime == null ||
                endTime == null) {

            throw new RuntimeException(
                    "Start time and end time are required"
            );
        }

        if (!startTime.isBefore(endTime)) {

            throw new RuntimeException(
                    "Start time must be before end time"
            );
        }
    }

    // =========================================================
    // DELETE APPOINTMENT
    // =========================================================

    public void deleteAppointment(Long appointmentId) {

        Appointment appointment = getAppointmentById(appointmentId);

        if ("COMPLETED".equalsIgnoreCase(appointment.getStatus())) {
            throw new RuntimeException(
                    "Completed appointments cannot be deleted"
            );
        }

        if (treatmentRepository.existsByAppointmentId(appointmentId)) {
            throw new RuntimeException(
                    "Cannot delete appointment with associated treatment records"
            );
        }

        if (billRepository.existsByAppointmentId(appointmentId)) {
            throw new RuntimeException(
                    "Cannot delete appointment with associated billing records"
            );
        }

        appointmentRepository.delete(appointment);
    }
}