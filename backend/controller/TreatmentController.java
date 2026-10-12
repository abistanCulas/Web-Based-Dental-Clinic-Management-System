package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.TreatmentDTO;
import com.dentaflow.backend.entity.Patient;
import com.dentaflow.backend.entity.Treatment;
import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.mapper.TreatmentMapper;
import com.dentaflow.backend.security.AccessControlService;
import com.dentaflow.backend.security.CustomUserDetails;
import com.dentaflow.backend.service.PatientService;
import com.dentaflow.backend.service.TreatmentService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/treatments")
public class TreatmentController {

    private final TreatmentService treatmentService;
    private final TreatmentMapper treatmentMapper;
    private final PatientService patientService;
    private final AccessControlService accessControlService;

    @Autowired
    public TreatmentController(
            TreatmentService treatmentService,
            TreatmentMapper treatmentMapper,
            PatientService patientService,
            AccessControlService accessControlService) {

        this.treatmentService = treatmentService;
        this.treatmentMapper = treatmentMapper;
        this.patientService = patientService;
        this.accessControlService = accessControlService;
    }

    public TreatmentController(
            TreatmentService treatmentService,
            TreatmentMapper treatmentMapper,
            PatientService patientService) {

        this(treatmentService, treatmentMapper, patientService, null);
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

    private boolean isPatientAuthorizedForPatientId(Authentication authentication, Long patientId) {
        if (!isPatientRole(authentication)) return true;
        User currentUser = getCurrentUser(authentication);
        if (currentUser == null) return false;
        try {
            Patient p = patientService.getPatientByUserId(currentUser.getId());
            return p != null && p.getId().equals(patientId);
        } catch (Exception e) {
            return false;
        }
    }

    private ResponseEntity<?> checkUnauthenticatedAndRoleAccess() {
        if (accessControlService != null) {
            if (accessControlService.getCurrentUserId() == null && !accessControlService.isAdmin()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }

            if (!accessControlService.isAdmin() && !accessControlService.hasRole("DENTIST") && !accessControlService.hasRole("DOCTOR")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: Unauthorized role"));
            }
        }
        return null;
    }

    private ResponseEntity<?> checkTreatmentOwnership(Long treatmentId) {
        if (accessControlService != null && !accessControlService.isAdmin()) {
            Treatment treatment = treatmentService.getTreatmentById(treatmentId);
            Long dentistId = (treatment != null && treatment.getDentist() != null)
                    ? treatment.getDentist().getId()
                    : null;
            if (!accessControlService.canAccessDentistRecords(dentistId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: You cannot access or modify another dentist's treatment"));
            }
        }
        return null;
    }

    // =========================================================
    // CREATE TREATMENT
    // =========================================================

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or (hasAnyRole('DENTIST', 'DOCTOR') and @accessControl.canAccessDentistRecords(#dto?.dentistId))")
    public ResponseEntity<?> createTreatment(
            @RequestBody TreatmentDTO dto) {

        ResponseEntity<?> authCheck = checkUnauthenticatedAndRoleAccess();
        if (authCheck != null) {
            return authCheck;
        }

        try {

            if (dto == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Treatment data is required"));
            }

            if (dto.getPatientId() == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Patient ID is required"));
            }

            if (dto.getDentistId() == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Dentist ID is required"));
            }

            if (accessControlService != null && !accessControlService.isAdmin()) {
                if (!accessControlService.canAccessDentistRecords(dto.getDentistId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: You cannot create treatments for another dentist"));
                }
            }

            Treatment treatment =
                    treatmentMapper.toEntity(dto);

            Treatment saved =
                    treatmentService.createTreatment(
                            dto.getPatientId(),
                            dto.getDentistId(),
                            dto.getAppointmentId(),
                            dto.getTreatmentPlanId(),
                            treatment
                    );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(treatmentMapper.toDTO(saved));

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET ALL TREATMENTS
    // =========================================================

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'DENTIST', 'DOCTOR', 'RECEPTIONIST', 'CASHIER', 'STAFF')")
    public ResponseEntity<List<TreatmentDTO>> getAllTreatments() {

        List<TreatmentDTO> result =
                treatmentService
                        .getAllTreatments()
                        .stream()
                        .map(treatmentMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // GET TREATMENT BY ID
    // =========================================================

    @GetMapping("/{id}")
    @PreAuthorize("(hasAnyRole('ADMIN', 'DENTIST', 'DOCTOR', 'RECEPTIONIST', 'CASHIER', 'STAFF') and !hasRole('PHARMACIST')) or hasRole('PATIENT')")
    public ResponseEntity<?> getTreatmentById(
            @PathVariable Long id,
            Authentication authentication) {

        try {

            Treatment treatment =
                    treatmentService.getTreatmentById(id);

            if (isPatientRole(authentication)) {
                if (treatment.getPatient() == null ||
                        !isPatientAuthorizedForPatientId(authentication, treatment.getPatient().getId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: Patients may only view their own treatment records"));
                }
            }

            return ResponseEntity.ok(treatmentMapper.toDTO(treatment));

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET TREATMENT BY CODE
    // =========================================================

    @GetMapping("/code/{treatmentCode}")
    @PreAuthorize("(hasAnyRole('ADMIN', 'DENTIST', 'DOCTOR', 'RECEPTIONIST', 'CASHIER', 'STAFF') and !hasRole('PHARMACIST')) or hasRole('PATIENT')")
    public ResponseEntity<?> getTreatmentByCode(
            @PathVariable String treatmentCode,
            Authentication authentication) {

        try {

            Treatment treatment =
                    treatmentService.getTreatmentByCode(treatmentCode);

            if (isPatientRole(authentication)) {
                if (treatment.getPatient() == null ||
                        !isPatientAuthorizedForPatientId(authentication, treatment.getPatient().getId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: Patients may only view their own treatment records"));
                }
            }

            return ResponseEntity.ok(treatmentMapper.toDTO(treatment));

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET PATIENT TREATMENTS
    // =========================================================

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("(hasAnyRole('ADMIN', 'DENTIST', 'DOCTOR', 'RECEPTIONIST', 'CASHIER', 'STAFF') and !hasRole('PHARMACIST')) or (hasRole('PATIENT') and @accessControl.isSelfPatientOrAdmin(#patientId))")
    public ResponseEntity<?> getPatientTreatments(
            @PathVariable Long patientId,
            Authentication authentication) {

        if (accessControlService != null) {
            if (accessControlService.getCurrentUserId() == null && !accessControlService.isAdmin()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }

            if (accessControlService.hasRole("PHARMACIST") && !accessControlService.isAdmin()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: Unauthorized role"));
            }

            if (!accessControlService.isAdmin()
                    && !accessControlService.hasRole("DENTIST")
                    && !accessControlService.hasRole("DOCTOR")
                    && !accessControlService.hasRole("RECEPTIONIST")
                    && !accessControlService.hasRole("CASHIER")
                    && !accessControlService.hasRole("STAFF")
                    && !accessControlService.hasRole("PATIENT")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: Unauthorized role"));
            }
        }

        try {

            if (isPatientRole(authentication) && !isPatientAuthorizedForPatientId(authentication, patientId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: Patients may only view their own treatment records"));
            }

            if (accessControlService != null && accessControlService.hasRole("PATIENT")) {
                if (!accessControlService.isSelfPatientOrAdmin(patientId)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: Patients may only view their own treatment records"));
                }
            }

            List<TreatmentDTO> result =
                    treatmentService
                            .getPatientTreatments(patientId)
                            .stream()
                            .map(treatmentMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET DENTIST TREATMENTS
    // =========================================================

    @GetMapping("/dentist/{dentistId}")
    @PreAuthorize("hasRole('ADMIN') or hasAnyRole('RECEPTIONIST', 'STAFF') or (hasAnyRole('DENTIST', 'DOCTOR') and @accessControl.canAccessDentistRecords(#dentistId))")
    public ResponseEntity<?> getDentistTreatments(
            @PathVariable Long dentistId) {

        if (accessControlService != null) {
            if (accessControlService.getCurrentUserId() == null && !accessControlService.isAdmin()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }

            if (!accessControlService.isAdmin()
                    && !accessControlService.hasRole("RECEPTIONIST")
                    && !accessControlService.hasRole("STAFF")
                    && !accessControlService.hasRole("DENTIST")
                    && !accessControlService.hasRole("DOCTOR")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: Unauthorized role"));
            }

            if (!accessControlService.isAdmin()
                    && !accessControlService.hasRole("RECEPTIONIST")
                    && !accessControlService.hasRole("STAFF")) {
                if (!accessControlService.canAccessDentistRecords(dentistId)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: You cannot access another dentist's treatments"));
                }
            }
        }

        try {

            List<TreatmentDTO> result =
                    treatmentService
                            .getDentistTreatments(dentistId)
                            .stream()
                            .map(treatmentMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET TREATMENTS BY DATE
    // =========================================================

    @GetMapping("/date")
    @PreAuthorize("hasAnyRole('ADMIN', 'DENTIST', 'DOCTOR', 'RECEPTIONIST', 'STAFF')")
    public ResponseEntity<?> getTreatmentsByDate(
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date) {

        try {

            List<TreatmentDTO> result =
                    treatmentService
                            .getTreatmentsByDate(date)
                            .stream()
                            .map(treatmentMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET TREATMENTS BY TYPE
    // =========================================================

    @GetMapping("/type/{treatmentType}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DENTIST', 'DOCTOR', 'RECEPTIONIST', 'STAFF')")
    public ResponseEntity<List<TreatmentDTO>> getTreatmentsByType(
            @PathVariable String treatmentType) {

        List<TreatmentDTO> result =
                treatmentService
                        .getTreatmentsByType(treatmentType)
                        .stream()
                        .map(treatmentMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // GET TREATMENTS BY STATUS
    // =========================================================

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DENTIST', 'DOCTOR', 'RECEPTIONIST', 'STAFF')")
    public ResponseEntity<?> getTreatmentsByStatus(
            @PathVariable String status) {

        try {

            List<TreatmentDTO> result =
                    treatmentService
                            .getTreatmentsByStatus(status)
                            .stream()
                            .map(treatmentMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // UPDATE TREATMENT
    // =========================================================

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAnyRole('DENTIST', 'DOCTOR')")
    public ResponseEntity<?> updateTreatment(
            @PathVariable Long id,
            @RequestBody TreatmentDTO dto) {

        ResponseEntity<?> authCheck = checkUnauthenticatedAndRoleAccess();
        if (authCheck != null) {
            return authCheck;
        }

        try {

            if (dto == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Treatment data is required"));
            }

            ResponseEntity<?> ownershipCheck = checkTreatmentOwnership(id);
            if (ownershipCheck != null) {
                return ownershipCheck;
            }

            if (accessControlService != null && !accessControlService.isAdmin()) {
                if (dto.getDentistId() != null && !accessControlService.canAccessDentistRecords(dto.getDentistId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: You cannot assign treatment to another dentist"));
                }
            }

            Treatment treatment =
                    treatmentMapper.toEntity(dto);

            Treatment updated =
                    treatmentService.updateTreatment(
                            id,
                            dto.getTreatmentPlanId(),
                            treatment
                    );

            return ResponseEntity.ok(treatmentMapper.toDTO(updated));

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // START TREATMENT
    // =========================================================

    @PutMapping("/{id}/start")
    @PreAuthorize("hasRole('ADMIN') or hasAnyRole('DENTIST', 'DOCTOR')")
    public ResponseEntity<?> startTreatment(
            @PathVariable Long id) {

        ResponseEntity<?> authCheck = checkUnauthenticatedAndRoleAccess();
        if (authCheck != null) {
            return authCheck;
        }

        try {

            ResponseEntity<?> ownershipCheck = checkTreatmentOwnership(id);
            if (ownershipCheck != null) {
                return ownershipCheck;
            }

            Treatment treatment =
                    treatmentService.startTreatment(id);

            return ResponseEntity.ok(treatmentMapper.toDTO(treatment));

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // COMPLETE TREATMENT
    // =========================================================

    @PutMapping("/{id}/complete")
    @PreAuthorize("hasRole('ADMIN') or hasAnyRole('DENTIST', 'DOCTOR')")
    public ResponseEntity<?> completeTreatment(
            @PathVariable Long id) {

        ResponseEntity<?> authCheck = checkUnauthenticatedAndRoleAccess();
        if (authCheck != null) {
            return authCheck;
        }

        try {

            ResponseEntity<?> ownershipCheck = checkTreatmentOwnership(id);
            if (ownershipCheck != null) {
                return ownershipCheck;
            }

            Treatment treatment =
                    treatmentService.completeTreatment(id);

            return ResponseEntity.ok(treatmentMapper.toDTO(treatment));

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // CANCEL TREATMENT
    // =========================================================

    @PutMapping("/{id}/cancel")
    @PreAuthorize("hasRole('ADMIN') or hasAnyRole('DENTIST', 'DOCTOR')")
    public ResponseEntity<?> cancelTreatment(
            @PathVariable Long id) {

        ResponseEntity<?> authCheck = checkUnauthenticatedAndRoleAccess();
        if (authCheck != null) {
            return authCheck;
        }

        try {

            ResponseEntity<?> ownershipCheck = checkTreatmentOwnership(id);
            if (ownershipCheck != null) {
                return ownershipCheck;
            }

            Treatment treatment =
                    treatmentService.cancelTreatment(id);

            return ResponseEntity.ok(treatmentMapper.toDTO(treatment));

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // STRATEGY PATTERN: GET REGISTERED STRATEGIES METADATA
    // =========================================================

    @GetMapping("/strategies")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getRegisteredStrategies() {
        try {
            return ResponseEntity.ok(treatmentService.getRegisteredStrategiesMetadata());
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    // =========================================================
    // STRATEGY PATTERN: GET AVAILABLE TRANSITIONS FOR TREATMENT
    // =========================================================

    @GetMapping("/{id}/available-transitions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getAvailableTransitions(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(treatmentService.getAvailableTransitions(id));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    // =========================================================
    // STRATEGY PATTERN: UNIFIED STATUS TRANSITION
    // =========================================================

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN') or hasAnyRole('DENTIST', 'DOCTOR')")
    public ResponseEntity<?> transitionTreatmentStatus(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body,
            @RequestParam(required = false) String targetStatus) {

        ResponseEntity<?> authCheck = checkUnauthenticatedAndRoleAccess();
        if (authCheck != null) {
            return authCheck;
        }

        try {
            ResponseEntity<?> ownershipCheck = checkTreatmentOwnership(id);
            if (ownershipCheck != null) {
                return ownershipCheck;
            }

            String status = null;
            if (body != null && body.containsKey("status") && body.get("status") != null) {
                status = String.valueOf(body.get("status")).trim();
            } else if (body != null && body.containsKey("targetStatus") && body.get("targetStatus") != null) {
                status = String.valueOf(body.get("targetStatus")).trim();
            } else if (targetStatus != null && !targetStatus.trim().isEmpty()) {
                status = targetStatus.trim();
            }

            if (status == null || status.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Target status is required"));
            }

            Map<String, Object> context = body != null ? body : Map.of();
            Treatment updated = treatmentService.transitionTreatmentStatus(id, status, context);
            return ResponseEntity.ok(treatmentMapper.toDTO(updated));

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // DELETE TREATMENT
    // =========================================================

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAnyRole('DENTIST', 'DOCTOR')")
    public ResponseEntity<?> deleteTreatment(
            @PathVariable Long id) {

        ResponseEntity<?> authCheck = checkUnauthenticatedAndRoleAccess();
        if (authCheck != null) {
            return authCheck;
        }

        try {

            ResponseEntity<?> ownershipCheck = checkTreatmentOwnership(id);
            if (ownershipCheck != null) {
                return ownershipCheck;
            }

            treatmentService.deleteTreatment(id);

            return ResponseEntity.ok(
                    Map.of("message", "Treatment deleted successfully", "success", true)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
}