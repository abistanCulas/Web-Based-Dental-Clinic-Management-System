package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.AppointmentDTO;
import com.dentaflow.backend.entity.Appointment;
import com.dentaflow.backend.entity.Patient;
import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.mapper.AppointmentMapper;
import com.dentaflow.backend.security.AccessControlService;
import com.dentaflow.backend.security.CustomUserDetails;
import com.dentaflow.backend.service.AppointmentAvailabilityService;
import com.dentaflow.backend.service.AppointmentService;
import com.dentaflow.backend.service.PatientService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    private final AppointmentService appointmentService;
    private final AppointmentMapper appointmentMapper;
    private final AppointmentAvailabilityService appointmentAvailabilityService;
    private final PatientService patientService;
    private final AccessControlService accessControlService;

    // =========================================================
    // CONSTRUCTOR
    // =========================================================

    @Autowired
    public AppointmentController(
            AppointmentService appointmentService,
            AppointmentMapper appointmentMapper,
            AppointmentAvailabilityService appointmentAvailabilityService,
            PatientService patientService,
            AccessControlService accessControlService) {

        this.appointmentService = appointmentService;
        this.appointmentMapper = appointmentMapper;
        this.appointmentAvailabilityService = appointmentAvailabilityService;
        this.patientService = patientService;
        this.accessControlService = accessControlService;
    }

    public AppointmentController(
            AppointmentService appointmentService,
            AppointmentMapper appointmentMapper,
            AppointmentAvailabilityService appointmentAvailabilityService,
            PatientService patientService) {

        this(appointmentService, appointmentMapper, appointmentAvailabilityService, patientService, null);
    }

    private User getCurrentUser(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails)) {
            return null;
        }
        return ((CustomUserDetails) authentication.getPrincipal()).getUser();
    }

    private boolean isPatientRole(Authentication authentication) {
        if (authentication == null) return false;
        return authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_PATIENT"));
    }

    private Long getLoggedInPatientId(Authentication authentication) {
        User user = getCurrentUser(authentication);
        if (user == null) return null;
        try {
            Patient p = patientService.getPatientByUserId(user.getId());
            return p != null ? p.getId() : null;
        } catch (Exception e) {
            return null;
        }
    }

    private ResponseEntity<?> checkDentistOwnership(Appointment existing, String actionDescription) {
        if (accessControlService != null && !accessControlService.isAdmin()
                && !accessControlService.hasRole("RECEPTIONIST")
                && (accessControlService.hasRole("DENTIST") || accessControlService.hasRole("DOCTOR"))) {
            Long dentistId = (existing != null && existing.getDentist() != null)
                    ? existing.getDentist().getId()
                    : null;
            if (!accessControlService.canAccessDentistRecords(dentistId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("Access denied: You cannot " + actionDescription + " another dentist's appointment");
            }
        }
        return null;
    }

    private ResponseEntity<?> checkDentistOwnership(Long appointmentId, String actionDescription) {
        if (accessControlService != null && !accessControlService.isAdmin()
                && !accessControlService.hasRole("RECEPTIONIST")
                && (accessControlService.hasRole("DENTIST") || accessControlService.hasRole("DOCTOR"))) {
            Appointment existing = appointmentService.getAppointmentById(appointmentId);
            return checkDentistOwnership(existing, actionDescription);
        }
        return null;
    }

    // =========================================================
    // CREATE APPOINTMENT
    // =========================================================

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('RECEPTIONIST') or (hasRole('PATIENT') and @accessControl.isSelfPatientOrAdmin(#dto?.patientId)) or (hasAnyRole('DENTIST', 'DOCTOR') and @accessControl.canAccessDentistRecords(#dto?.dentistId))")
    public ResponseEntity<?> createAppointment(
            @RequestBody AppointmentDTO dto,
            Authentication authentication) {

        if (accessControlService != null) {
            if (accessControlService.getCurrentUserId() == null && !accessControlService.isAdmin()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Authentication required");
            }

            if (!accessControlService.isAdmin()
                    && !accessControlService.hasRole("RECEPTIONIST")
                    && !accessControlService.hasRole("PATIENT")
                    && !accessControlService.hasRole("DENTIST")
                    && !accessControlService.hasRole("DOCTOR")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("Access denied: Unauthorized role");
            }
        }

        try {

            if (dto == null) {
                return ResponseEntity.badRequest().body("Appointment data is required");
            }

            if (isPatientRole(authentication)) {
                Long myPatientId = getLoggedInPatientId(authentication);
                if (myPatientId == null || !myPatientId.equals(dto.getPatientId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body("Patients can only book appointments for themselves");
                }
            } else if (accessControlService != null && accessControlService.hasRole("PATIENT")) {
                if (!accessControlService.isSelfPatientOrAdmin(dto.getPatientId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body("Patients can only book appointments for themselves");
                }
            }

            if (accessControlService != null && !accessControlService.isAdmin()
                    && (accessControlService.hasRole("DENTIST") || accessControlService.hasRole("DOCTOR"))) {
                if (!accessControlService.canAccessDentistRecords(dto.getDentistId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body("Access denied: You cannot create appointments for another dentist");
                }
            }

            if (dto.getPatientId() == null) {
                return ResponseEntity
                        .badRequest()
                        .body("Patient ID is required");
            }

            if (dto.getDentistId() == null) {
                return ResponseEntity
                        .badRequest()
                        .body("Dentist ID is required");
            }

            if (dto.getAppointmentDate() == null) {
                return ResponseEntity
                        .badRequest()
                        .body("Appointment date is required");
            }

            // =====================================================
            // TODAY -> NEXT 15 DAYS
            // =====================================================

            if (!appointmentAvailabilityService
                    .isDateWithinBookingWindow(
                            dto.getAppointmentDate()
                    )) {

                return ResponseEntity
                        .badRequest()
                        .body(
                                "Appointments can only be booked from today up to 15 days in advance."
                        );
            }

            // =====================================================
            // SAME-DAY TIME VALIDATION
            // =====================================================

            if (dto.getAppointmentDate()
                    .equals(LocalDate.now())) {

                if (dto.getStartTime() == null ||
                        !dto.getStartTime().isAfter(
                                LocalTime.now()
                        )) {

                    return ResponseEntity
                            .badRequest()
                            .body(
                                    "For today's appointment, the start time must be in the future."
                            );
                }
            }

            // =====================================================
            // CHECK SPECIFIC TIME AVAILABILITY
            // =====================================================

            if (dto.getStartTime() != null &&
                    dto.getEndTime() != null) {

                boolean available =
                        appointmentAvailabilityService
                                .isTimeAvailable(
                                        dto.getDentistId(),
                                        dto.getAppointmentDate(),
                                        dto.getStartTime(),
                                        dto.getEndTime()
                                );

                if (!available) {

                    return ResponseEntity
                            .badRequest()
                            .body(
                                    "The selected appointment time is not available."
                            );
                }
            }

            Appointment appointment =
                    appointmentMapper.toEntity(dto);

            Appointment saved =
                    appointmentService.createAppointment(
                            dto.getPatientId(),
                            dto.getDentistId(),
                            appointment
                    );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(
                            appointmentMapper.toDTO(saved)
                    );

        } catch (AccessDeniedException ade) {
            throw ade;
        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET ALL APPOINTMENTS
    // =========================================================

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'DENTIST', 'DOCTOR', 'RECEPTIONIST', 'STAFF', 'PHARMACIST', 'CASHIER')")
    public ResponseEntity<List<AppointmentDTO>>
    getAllAppointments() {

        List<AppointmentDTO> appointments =
                appointmentService
                        .getAllAppointments()
                        .stream()
                        .map(appointmentMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(appointments);
    }

    // =========================================================
    // GET APPOINTMENT BY ID
    // =========================================================

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DENTIST', 'DOCTOR', 'RECEPTIONIST', 'STAFF', 'PATIENT', 'PHARMACIST', 'CASHIER')")
    public ResponseEntity<?> getAppointmentById(
            @PathVariable Long id,
            Authentication authentication) {

        try {

            Appointment appointment =
                    appointmentService
                            .getAppointmentById(id);

            if (isPatientRole(authentication)) {
                Long myPatientId = getLoggedInPatientId(authentication);
                if (myPatientId == null || appointment.getPatient() == null || !appointment.getPatient().getId().equals(myPatientId)) {
                    throw new AccessDeniedException("Patients can only view their own appointments");
                }
            }

            return ResponseEntity.ok(
                    appointmentMapper.toDTO(
                            appointment
                    )
            );

        } catch (AccessDeniedException ade) {
            throw ade;
        } catch (RuntimeException exception) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET APPOINTMENT BY CODE
    // =========================================================

    @GetMapping("/code/{appointmentCode}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DENTIST', 'DOCTOR', 'RECEPTIONIST', 'STAFF', 'PATIENT', 'PHARMACIST', 'CASHIER')")
    public ResponseEntity<?> getAppointmentByCode(
            @PathVariable String appointmentCode,
            Authentication authentication) {

        try {

            Appointment appointment =
                    appointmentService
                            .getAppointmentByCode(
                                    appointmentCode
                            );

            if (isPatientRole(authentication)) {
                Long myPatientId = getLoggedInPatientId(authentication);
                if (myPatientId == null || appointment.getPatient() == null || !appointment.getPatient().getId().equals(myPatientId)) {
                    throw new AccessDeniedException("Patients can only view their own appointments");
                }
            }

            return ResponseEntity.ok(
                    appointmentMapper.toDTO(
                            appointment
                    )
            );

        } catch (AccessDeniedException ade) {
            throw ade;
        } catch (RuntimeException exception) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET PATIENT APPOINTMENTS
    // =========================================================

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DENTIST', 'DOCTOR', 'RECEPTIONIST', 'STAFF', 'PATIENT', 'PHARMACIST', 'CASHIER')")
    public ResponseEntity<?> getPatientAppointments(
            @PathVariable Long patientId,
            Authentication authentication) {

        try {

            if (isPatientRole(authentication)) {
                Long myPatientId = getLoggedInPatientId(authentication);
                if (myPatientId == null || !myPatientId.equals(patientId)) {
                    throw new AccessDeniedException("Patients can only view their own appointments");
                }
            }

            List<AppointmentDTO> appointments =
                    appointmentService
                            .getPatientAppointments(
                                    patientId
                            )
                            .stream()
                            .map(appointmentMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(appointments);

        } catch (AccessDeniedException ade) {
            throw ade;
        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET DENTIST APPOINTMENTS
    // =========================================================

    @GetMapping("/dentist/{dentistId}")
    @PreAuthorize("hasRole('ADMIN') or hasAnyRole('RECEPTIONIST', 'STAFF', 'PHARMACIST', 'CASHIER') or (hasAnyRole('DENTIST', 'DOCTOR') and @accessControl.canAccessDentistRecords(#dentistId))")
    public ResponseEntity<?> getDentistAppointments(
            @PathVariable Long dentistId) {

        if (accessControlService != null) {
            if (accessControlService.getCurrentUserId() == null && !accessControlService.isAdmin()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Authentication required");
            }

            if (!accessControlService.isAdmin()
                    && !accessControlService.hasRole("RECEPTIONIST")
                    && !accessControlService.hasRole("STAFF")
                    && !accessControlService.hasRole("PHARMACIST")
                    && !accessControlService.hasRole("CASHIER")
                    && !accessControlService.hasRole("DENTIST")
                    && !accessControlService.hasRole("DOCTOR")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("Access denied: Unauthorized role");
            }

            if (!accessControlService.isAdmin()
                    && !accessControlService.hasRole("RECEPTIONIST")
                    && !accessControlService.hasRole("STAFF")
                    && !accessControlService.hasRole("PHARMACIST")
                    && !accessControlService.hasRole("CASHIER")
                    && (accessControlService.hasRole("DENTIST") || accessControlService.hasRole("DOCTOR"))) {
                if (!accessControlService.canAccessDentistRecords(dentistId)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body("Access denied: You cannot view another dentist's appointments");
                }
            }
        }

        try {

            List<AppointmentDTO> appointments =
                    appointmentService
                            .getDentistAppointments(
                                    dentistId
                            )
                            .stream()
                            .map(appointmentMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(appointments);

        } catch (AccessDeniedException ade) {
            throw ade;
        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET APPOINTMENTS BY DATE
    // =========================================================

    @GetMapping("/date/{date}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DENTIST', 'DOCTOR', 'RECEPTIONIST', 'STAFF', 'PHARMACIST', 'CASHIER')")
    public ResponseEntity<?> getAppointmentsByDate(
            @PathVariable LocalDate date) {

        try {

            List<AppointmentDTO> appointments =
                    appointmentService
                            .getAppointmentsByDate(date)
                            .stream()
                            .map(appointmentMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(appointments);

        } catch (AccessDeniedException ade) {
            throw ade;
        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET DENTIST APPOINTMENTS BY DATE
    // =========================================================

    @GetMapping("/dentist/{dentistId}/date/{date}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DENTIST', 'DOCTOR', 'RECEPTIONIST', 'STAFF', 'PHARMACIST', 'CASHIER')")
    public ResponseEntity<?> getDentistAppointmentsByDate(
            @PathVariable Long dentistId,
            @PathVariable LocalDate date) {

        try {

            List<AppointmentDTO> appointments =
                    appointmentService
                            .getDentistAppointmentsByDate(
                                    dentistId,
                                    date
                            )
                            .stream()
                            .map(appointmentMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(appointments);

        } catch (AccessDeniedException ade) {
            throw ade;
        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET PATIENT APPOINTMENTS BY DATE
    // =========================================================

    @GetMapping("/patient/{patientId}/date/{date}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DENTIST', 'DOCTOR', 'RECEPTIONIST', 'STAFF', 'PATIENT', 'PHARMACIST', 'CASHIER')")
    public ResponseEntity<?> getPatientAppointmentsByDate(
            @PathVariable Long patientId,
            @PathVariable LocalDate date,
            Authentication authentication) {

        try {

            if (isPatientRole(authentication)) {
                Long myPatientId = getLoggedInPatientId(authentication);
                if (myPatientId == null || !myPatientId.equals(patientId)) {
                    throw new AccessDeniedException("Patients can only view their own appointments");
                }
            }

            List<AppointmentDTO> appointments =
                    appointmentService
                            .getPatientAppointmentsByDate(
                                    patientId,
                                    date
                            )
                            .stream()
                            .map(appointmentMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(appointments);

        } catch (AccessDeniedException ade) {
            throw ade;
        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET BY STATUS
    // =========================================================

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DENTIST', 'DOCTOR', 'RECEPTIONIST', 'STAFF', 'PHARMACIST', 'CASHIER')")
    public ResponseEntity<?> getAppointmentsByStatus(
            @PathVariable String status) {

        try {

            List<AppointmentDTO> appointments =
                    appointmentService
                            .getAppointmentsByStatus(status)
                            .stream()
                            .map(appointmentMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(appointments);

        } catch (AccessDeniedException ade) {
            throw ade;
        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET AVAILABLE TIME RANGES
    //
    // TODAY -> NEXT 15 DAYS ONLY
    //
    // CANCELLED appointments do NOT block slots.
    // RESCHEDULED appointments block only their new slot.
    // =========================================================

    @GetMapping("/available-slots")
    public ResponseEntity<?> getAvailableSlots(
            @RequestParam Long dentistId,
            @RequestParam LocalDate date) {

        try {

            if (!appointmentAvailabilityService
                    .isDateWithinBookingWindow(date)) {

                return ResponseEntity
                        .badRequest()
                        .body(
                                "Available slots can only be checked from today up to 15 days in advance."
                        );
            }

            List<AppointmentAvailabilityService.AvailableTimeSlot>
                    slots =
                    appointmentAvailabilityService
                            .getAvailableTimeRanges(
                                    dentistId,
                                    date
                            );

            return ResponseEntity.ok(slots);

        } catch (AccessDeniedException ade) {
            throw ade;
        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // CHECK SPECIFIC TIME AVAILABILITY
    // =========================================================

    @GetMapping("/check-availability")
    public ResponseEntity<?> checkAvailability(
            @RequestParam Long dentistId,
            @RequestParam LocalDate date,
            @RequestParam LocalTime startTime,
            @RequestParam LocalTime endTime) {

        try {

            boolean available =
                    appointmentAvailabilityService
                            .isTimeAvailable(
                                    dentistId,
                                    date,
                                    startTime,
                                    endTime
                            );

            return ResponseEntity.ok(available);

        } catch (AccessDeniedException ade) {
            throw ade;
        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET BOOKING WINDOW
    //
    // Useful for frontend calendar.
    //
    // Returns:
    // today
    // maximumBookingDate
    // =========================================================

    @GetMapping("/booking-window")
    public ResponseEntity<?> getBookingWindow() {

        LocalDate today =
                LocalDate.now();

        LocalDate maximumDate =
                appointmentAvailabilityService
                        .getMaximumBookingDate();

        return ResponseEntity.ok(
                new BookingWindowResponse(
                        today,
                        maximumDate
                )
        );
    }

    // =========================================================
    // RESCHEDULE
    // =========================================================

    @PutMapping("/{id}/reschedule")
    @PreAuthorize("hasRole('ADMIN') or hasRole('RECEPTIONIST') or hasRole('PATIENT') or (hasAnyRole('DENTIST', 'DOCTOR') and @accessControl.canAccessDentistRecords(@appointmentService.getAppointmentById(#id)?.dentist?.id))")
    public ResponseEntity<?> rescheduleAppointment(
            @PathVariable Long id,
            @RequestParam LocalDate newDate,
            @RequestParam LocalTime newStartTime,
            @RequestParam LocalTime newEndTime,
            Authentication authentication) {

        if (accessControlService != null) {
            if (accessControlService.getCurrentUserId() == null && !accessControlService.isAdmin()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Authentication required");
            }

            if (!accessControlService.isAdmin()
                    && !accessControlService.hasRole("RECEPTIONIST")
                    && !accessControlService.hasRole("PATIENT")
                    && !accessControlService.hasRole("DENTIST")
                    && !accessControlService.hasRole("DOCTOR")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("Access denied: Unauthorized role");
            }
        }

        try {

            Appointment existing =
                    appointmentService
                            .getAppointmentById(id);

            if (isPatientRole(authentication)) {
                Long myPatientId = getLoggedInPatientId(authentication);
                if (myPatientId == null || existing.getPatient() == null || !existing.getPatient().getId().equals(myPatientId)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body("Patients can only reschedule their own appointments");
                }
            }
            if (accessControlService != null && accessControlService.hasRole("PATIENT")) {
                Long patientId = (existing.getPatient() != null) ? existing.getPatient().getId() : null;
                if (!accessControlService.isSelfPatientOrAdmin(patientId)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body("Patients can only reschedule their own appointments");
                }
            }

            ResponseEntity<?> ownershipCheck = checkDentistOwnership(existing, "reschedule");
            if (ownershipCheck != null) {
                return ownershipCheck;
            }

            // =====================================================
            // CHECK BOOKING WINDOW
            // =====================================================

            if (!appointmentAvailabilityService
                    .isDateWithinBookingWindow(newDate)) {

                return ResponseEntity
                        .badRequest()
                        .body(
                                "The new appointment date must be from today up to 15 days in advance."
                        );
            }

            // =====================================================
            // CHECK NEW SLOT
            // =====================================================

            boolean available =
                    appointmentAvailabilityService
                            .isTimeAvailable(
                                    existing.getDentist().getId(),
                                    newDate,
                                    newStartTime,
                                    newEndTime
                            );

            if (!available) {

                return ResponseEntity
                        .badRequest()
                        .body(
                                "The selected new appointment time is not available."
                        );
            }

            Appointment appointment =
                    appointmentService.rescheduleAppointment(
                            id,
                            newDate,
                            newStartTime,
                            newEndTime
                    );

            return ResponseEntity.ok(
                    appointmentMapper.toDTO(
                            appointment
                    )
            );

        } catch (AccessDeniedException ade) {
            throw ade;
        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // CANCEL
    //
    // After cancellation the old slot becomes available.
    // =========================================================

    @PutMapping("/{id}/cancel")
    @PreAuthorize("hasRole('ADMIN') or hasRole('RECEPTIONIST') or hasRole('PATIENT') or (hasAnyRole('DENTIST', 'DOCTOR') and @accessControl.canAccessDentistRecords(@appointmentService.getAppointmentById(#id)?.dentist?.id))")
    public ResponseEntity<?> cancelAppointment(
            @PathVariable Long id,
            @RequestParam(required = false) String reason,
            Authentication authentication) {

        if (accessControlService != null) {
            if (accessControlService.getCurrentUserId() == null && !accessControlService.isAdmin()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Authentication required");
            }

            if (!accessControlService.isAdmin()
                    && !accessControlService.hasRole("RECEPTIONIST")
                    && !accessControlService.hasRole("PATIENT")
                    && !accessControlService.hasRole("DENTIST")
                    && !accessControlService.hasRole("DOCTOR")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("Access denied: Unauthorized role");
            }
        }

        try {

            Appointment existing =
                    appointmentService.getAppointmentById(id);

            if (isPatientRole(authentication)) {
                Long myPatientId = getLoggedInPatientId(authentication);
                if (myPatientId == null || existing.getPatient() == null || !existing.getPatient().getId().equals(myPatientId)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body("Patients can only cancel their own appointments");
                }
            }
            if (accessControlService != null && accessControlService.hasRole("PATIENT")) {
                Long patientId = (existing.getPatient() != null) ? existing.getPatient().getId() : null;
                if (!accessControlService.isSelfPatientOrAdmin(patientId)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body("Patients can only cancel their own appointments");
                }
            }

            ResponseEntity<?> ownershipCheck = checkDentistOwnership(existing, "cancel");
            if (ownershipCheck != null) {
                return ownershipCheck;
            }

            Appointment appointment =
                    appointmentService.cancelAppointment(
                            id,
                            reason
                    );

            return ResponseEntity.ok(
                    appointmentMapper.toDTO(
                            appointment
                    )
            );

        } catch (AccessDeniedException ade) {
            throw ade;
        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // CONFIRM
    // =========================================================

    @PutMapping("/{id}/confirm")
    @PreAuthorize("hasRole('ADMIN') or hasRole('RECEPTIONIST') or (hasAnyRole('DENTIST', 'DOCTOR') and @accessControl.canAccessDentistRecords(@appointmentService.getAppointmentById(#id)?.dentist?.id))")
    public ResponseEntity<?> confirmAppointment(
            @PathVariable Long id) {

        if (accessControlService != null) {
            if (accessControlService.getCurrentUserId() == null && !accessControlService.isAdmin()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Authentication required");
            }

            if (!accessControlService.isAdmin()
                    && !accessControlService.hasRole("RECEPTIONIST")
                    && !accessControlService.hasRole("DENTIST")
                    && !accessControlService.hasRole("DOCTOR")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("Access denied: Unauthorized role");
            }
        }

        try {

            ResponseEntity<?> ownershipCheck = checkDentistOwnership(id, "confirm");
            if (ownershipCheck != null) {
                return ownershipCheck;
            }

            Appointment appointment =
                    appointmentService
                            .confirmAppointment(id);

            return ResponseEntity.ok(
                    appointmentMapper.toDTO(
                            appointment
                    )
            );

        } catch (AccessDeniedException ade) {
            throw ade;
        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // COMPLETE
    // =========================================================

    @PutMapping("/{id}/complete")
    @PreAuthorize("hasRole('ADMIN') or (hasAnyRole('DENTIST', 'DOCTOR') and @accessControl.canAccessDentistRecords(@appointmentService.getAppointmentById(#id)?.dentist?.id))")
    public ResponseEntity<?> completeAppointment(
            @PathVariable Long id) {

        if (accessControlService != null) {
            if (accessControlService.getCurrentUserId() == null && !accessControlService.isAdmin()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Authentication required");
            }

            if (!accessControlService.isAdmin()
                    && !accessControlService.hasRole("DENTIST")
                    && !accessControlService.hasRole("DOCTOR")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("Access denied: Unauthorized role");
            }
        }

        try {

            ResponseEntity<?> ownershipCheck = checkDentistOwnership(id, "complete");
            if (ownershipCheck != null) {
                return ownershipCheck;
            }

            Appointment appointment =
                    appointmentService
                            .completeAppointment(id);

            return ResponseEntity.ok(
                    appointmentMapper.toDTO(
                            appointment
                    )
            );

        } catch (AccessDeniedException ade) {
            throw ade;
        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // NO SHOW
    // =========================================================

    @PutMapping("/{id}/no-show")
    @PreAuthorize("hasRole('ADMIN') or hasRole('RECEPTIONIST') or (hasAnyRole('DENTIST', 'DOCTOR') and @accessControl.canAccessDentistRecords(@appointmentService.getAppointmentById(#id)?.dentist?.id))")
    public ResponseEntity<?> markAsNoShow(
            @PathVariable Long id) {

        if (accessControlService != null) {
            if (accessControlService.getCurrentUserId() == null && !accessControlService.isAdmin()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Authentication required");
            }

            if (!accessControlService.isAdmin()
                    && !accessControlService.hasRole("RECEPTIONIST")
                    && !accessControlService.hasRole("DENTIST")
                    && !accessControlService.hasRole("DOCTOR")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("Access denied: Unauthorized role");
            }
        }

        try {

            ResponseEntity<?> ownershipCheck = checkDentistOwnership(id, "mark as no-show");
            if (ownershipCheck != null) {
                return ownershipCheck;
            }

            Appointment appointment =
                    appointmentService
                            .markAsNoShow(id);

            return ResponseEntity.ok(
                    appointmentMapper.toDTO(
                            appointment
                    )
            );

        } catch (AccessDeniedException ade) {
            throw ade;
        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // STRATEGY PATTERN: GET REGISTERED STRATEGIES METADATA
    // =========================================================

    @GetMapping("/strategies")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getRegisteredStrategies() {
        try {
            return ResponseEntity.ok(appointmentService.getRegisteredStrategiesMetadata());
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    // =========================================================
    // STRATEGY PATTERN: GET AVAILABLE TRANSITIONS FOR APPOINTMENT
    // =========================================================

    @GetMapping("/{id}/available-transitions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getAvailableTransitions(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(appointmentService.getAvailableTransitions(id));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    // =========================================================
    // STRATEGY PATTERN: UNIFIED STATUS TRANSITION
    // =========================================================

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN') or hasRole('RECEPTIONIST') or hasRole('PATIENT') or (hasAnyRole('DENTIST', 'DOCTOR') and @accessControl.canAccessDentistRecords(@appointmentService.getAppointmentById(#id)?.dentist?.id))")
    public ResponseEntity<?> transitionAppointmentStatus(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body,
            @RequestParam(required = false) String targetStatus,
            Authentication authentication) {

        if (accessControlService != null) {
            if (accessControlService.getCurrentUserId() == null && !accessControlService.isAdmin()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Authentication required");
            }
        }

        try {
            Appointment existing = appointmentService.getAppointmentById(id);

            String status = null;
            if (body != null && body.containsKey("status") && body.get("status") != null) {
                status = String.valueOf(body.get("status")).trim();
            } else if (body != null && body.containsKey("targetStatus") && body.get("targetStatus") != null) {
                status = String.valueOf(body.get("targetStatus")).trim();
            } else if (targetStatus != null && !targetStatus.trim().isEmpty()) {
                status = targetStatus.trim();
            }

            if (status == null || status.isEmpty()) {
                return ResponseEntity.badRequest().body("target status is required");
            }

            // PATIENT role can ONLY transition to CANCELLED and only for their own appointment
            if (isPatientRole(authentication) || (accessControlService != null && accessControlService.hasRole("PATIENT") && !accessControlService.isAdmin())) {
                if (!"CANCELLED".equalsIgnoreCase(status)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body("Patients can only cancel appointments");
                }
                Long myPatientId = getLoggedInPatientId(authentication);
                if (myPatientId == null || existing.getPatient() == null || !existing.getPatient().getId().equals(myPatientId)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body("Patients can only cancel their own appointments");
                }
            }

            // Dentist ownership check
            ResponseEntity<?> ownershipCheck = checkDentistOwnership(existing, "change status of");
            if (ownershipCheck != null) {
                return ownershipCheck;
            }

            Map<String, Object> context = body != null ? body : Map.of();
            Appointment updated = appointmentService.transitionAppointmentStatus(id, status, context);

            return ResponseEntity.ok(appointmentMapper.toDTO(updated));

        } catch (AccessDeniedException ade) {
            throw ade;
        } catch (RuntimeException exception) {
            return ResponseEntity.badRequest().body(exception.getMessage());
        }
    }

    // =========================================================
    // UPDATE
    // =========================================================

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('RECEPTIONIST') or (hasAnyRole('DENTIST', 'DOCTOR') and @accessControl.canAccessDentistRecords(@appointmentService.getAppointmentById(#id)?.dentist?.id) and (#dto?.dentistId == null or @accessControl.canAccessDentistRecords(#dto?.dentistId)))")
    public ResponseEntity<?> updateAppointment(
            @PathVariable Long id,
            @RequestBody AppointmentDTO dto) {

        if (accessControlService != null) {
            if (accessControlService.getCurrentUserId() == null && !accessControlService.isAdmin()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Authentication required");
            }

            if (!accessControlService.isAdmin()
                    && !accessControlService.hasRole("RECEPTIONIST")
                    && !accessControlService.hasRole("DENTIST")
                    && !accessControlService.hasRole("DOCTOR")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("Access denied: Unauthorized role");
            }
        }

        try {

            if (dto == null) {
                return ResponseEntity.badRequest().body("Appointment data is required");
            }

            ResponseEntity<?> ownershipCheck = checkDentistOwnership(id, "modify");
            if (ownershipCheck != null) {
                return ownershipCheck;
            }

            if (accessControlService != null && !accessControlService.isAdmin()
                    && !accessControlService.hasRole("RECEPTIONIST")
                    && (accessControlService.hasRole("DENTIST") || accessControlService.hasRole("DOCTOR"))) {
                if (dto.getDentistId() != null && !accessControlService.canAccessDentistRecords(dto.getDentistId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body("Access denied: You cannot assign appointments to another dentist");
                }
            }

            if (dto.getAppointmentDate() != null) {

                if (!appointmentAvailabilityService
                        .isDateWithinBookingWindow(
                                dto.getAppointmentDate()
                        )) {

                    return ResponseEntity
                            .badRequest()
                            .body(
                                    "Appointment date must be from today up to 15 days in advance."
                            );
                }
            }

            Appointment updated =
                    appointmentMapper.toEntity(dto);

            Appointment appointment =
                    appointmentService.updateAppointment(
                            id,
                            updated
                    );

            return ResponseEntity.ok(
                    appointmentMapper.toDTO(
                            appointment
                    )
            );

        } catch (AccessDeniedException ade) {
            throw ade;
        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // CHECK OVERLAPPING APPOINTMENT
    // =========================================================

    @GetMapping("/check-overlap")
    @PreAuthorize("hasAnyRole('ADMIN', 'DENTIST', 'DOCTOR', 'RECEPTIONIST', 'STAFF')")
    public ResponseEntity<Boolean> checkOverlap(
            @RequestParam Long dentistId,
            @RequestParam LocalDate date,
            @RequestParam LocalTime startTime,
            @RequestParam LocalTime endTime) {

        boolean overlapping =
                appointmentService
                        .hasOverlappingAppointment(
                                dentistId,
                                date,
                                startTime,
                                endTime
                        );

        return ResponseEntity.ok(
                overlapping
        );
    }

    // =========================================================
    // DELETE APPOINTMENT
    // =========================================================

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<?> deleteAppointment(
            @PathVariable Long id) {

        try {
            appointmentService.deleteAppointment(id);
            return ResponseEntity.ok(
                    Map.of("message", "Appointment deleted successfully")
            );

        } catch (AccessDeniedException ade) {
            throw ade;
        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // BOOKING WINDOW RESPONSE
    // =========================================================

    public static class BookingWindowResponse {

        private final LocalDate today;
        private final LocalDate maximumBookingDate;

        public BookingWindowResponse(
                LocalDate today,
                LocalDate maximumBookingDate) {

            this.today = today;
            this.maximumBookingDate =
                    maximumBookingDate;
        }

        public LocalDate getToday() {
            return today;
        }

        public LocalDate getMaximumBookingDate() {
            return maximumBookingDate;
        }
    }
}