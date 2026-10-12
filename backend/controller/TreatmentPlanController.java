package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.TreatmentPlanDTO;
import com.dentaflow.backend.entity.Patient;
import com.dentaflow.backend.entity.TreatmentPlan;
import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.mapper.TreatmentPlanMapper;
import com.dentaflow.backend.security.AccessControlService;
import com.dentaflow.backend.security.CustomUserDetails;
import com.dentaflow.backend.service.PatientService;
import com.dentaflow.backend.service.TreatmentPlanService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/treatment-plans")
public class TreatmentPlanController {

    private final TreatmentPlanService treatmentPlanService;
    private final TreatmentPlanMapper treatmentPlanMapper;
    private final PatientService patientService;
    private final AccessControlService accessControlService;

    @Autowired
    public TreatmentPlanController(
            TreatmentPlanService treatmentPlanService,
            TreatmentPlanMapper treatmentPlanMapper,
            PatientService patientService,
            AccessControlService accessControlService) {

        this.treatmentPlanService = treatmentPlanService;
        this.treatmentPlanMapper = treatmentPlanMapper;
        this.patientService = patientService;
        this.accessControlService = accessControlService;
    }

    public TreatmentPlanController(
            TreatmentPlanService treatmentPlanService,
            TreatmentPlanMapper treatmentPlanMapper,
            PatientService patientService) {

        this(treatmentPlanService, treatmentPlanMapper, patientService, null);
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

    private ResponseEntity<?> checkUnauthenticatedAndClinicalRoleAccess() {
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

    private ResponseEntity<?> checkTreatmentPlanOwnership(Long planId) {
        if (accessControlService != null && !accessControlService.isAdmin()) {
            TreatmentPlan plan = treatmentPlanService.getTreatmentPlanById(planId);
            Long dentistId = (plan != null && plan.getDentist() != null)
                    ? plan.getDentist().getId()
                    : null;
            if (!accessControlService.canAccessDentistRecords(dentistId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: You cannot access or modify another dentist's treatment plan"));
            }
        }
        return null;
    }

    // =========================================================
    // CREATE TREATMENT PLAN
    // =========================================================

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or (hasAnyRole('DENTIST', 'DOCTOR') and @accessControl.canAccessDentistRecords(#dto?.dentistId))")
    public ResponseEntity<?> createTreatmentPlanDirect(
            @RequestBody TreatmentPlanDTO dto) {

        ResponseEntity<?> authCheck = checkUnauthenticatedAndClinicalRoleAccess();
        if (authCheck != null) {
            return authCheck;
        }

        try {

            if (dto == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Treatment plan data is required"));
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
                            .body(Map.of("error", "Access denied: You cannot create treatment plans for another dentist"));
                }
            }

            TreatmentPlan treatmentPlan =
                    treatmentPlanMapper.toEntity(dto);

            TreatmentPlan saved =
                    treatmentPlanService.createTreatmentPlan(
                            dto.getPatientId(),
                            dto.getDentistId(),
                            treatmentPlan
                    );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(treatmentPlanMapper.toDTO(saved));

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    @PostMapping("/patient/{patientId}/dentist/{dentistId}")
    @PreAuthorize("hasRole('ADMIN') or (hasAnyRole('DENTIST', 'DOCTOR') and @accessControl.canAccessDentistRecords(#dentistId))")
    public ResponseEntity<?> createTreatmentPlan(
            @PathVariable Long patientId,
            @PathVariable Long dentistId,
            @RequestBody TreatmentPlanDTO dto) {

        ResponseEntity<?> authCheck = checkUnauthenticatedAndClinicalRoleAccess();
        if (authCheck != null) {
            return authCheck;
        }

        try {

            if (dto == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Treatment plan data is required"));
            }

            if (accessControlService != null && !accessControlService.isAdmin()) {
                if (!accessControlService.canAccessDentistRecords(dentistId)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: You cannot create treatment plans for another dentist"));
                }
                if (dto.getDentistId() != null && !accessControlService.canAccessDentistRecords(dto.getDentistId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: You cannot create treatment plans for another dentist"));
                }
            }

            TreatmentPlan treatmentPlan =
                    treatmentPlanMapper.toEntity(dto);

            TreatmentPlan saved =
                    treatmentPlanService.createTreatmentPlan(
                            patientId,
                            dentistId,
                            treatmentPlan
                    );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(treatmentPlanMapper.toDTO(saved));

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET ALL TREATMENT PLANS
    // =========================================================

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'DENTIST', 'DOCTOR', 'RECEPTIONIST', 'STAFF')")
    public ResponseEntity<List<TreatmentPlanDTO>> getAllTreatmentPlans() {

        List<TreatmentPlanDTO> plans =
                treatmentPlanService
                        .getAllTreatmentPlans()
                        .stream()
                        .map(treatmentPlanMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(plans);
    }

    // =========================================================
    // GET TREATMENT PLAN BY ID
    // =========================================================

    @GetMapping("/{id}")
    @PreAuthorize("(hasAnyRole('ADMIN', 'DENTIST', 'DOCTOR', 'RECEPTIONIST', 'STAFF') and !hasAnyRole('CASHIER', 'PHARMACIST')) or hasRole('PATIENT')")
    public ResponseEntity<?> getTreatmentPlanById(
            @PathVariable Long id,
            Authentication authentication) {

        try {

            TreatmentPlan plan =
                    treatmentPlanService.getTreatmentPlanById(id);

            if (isPatientRole(authentication)) {
                if (plan.getPatient() == null ||
                        !isPatientAuthorizedForPatientId(authentication, plan.getPatient().getId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: Patients may only view their own treatment plans"));
                }
            }

            return ResponseEntity.ok(treatmentPlanMapper.toDTO(plan));

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET TREATMENT PLAN BY CODE
    // =========================================================

    @GetMapping("/code/{planCode}")
    @PreAuthorize("(hasAnyRole('ADMIN', 'DENTIST', 'DOCTOR', 'RECEPTIONIST', 'STAFF') and !hasAnyRole('CASHIER', 'PHARMACIST')) or hasRole('PATIENT')")
    public ResponseEntity<?> getTreatmentPlanByCode(
            @PathVariable String planCode,
            Authentication authentication) {

        try {

            TreatmentPlan plan =
                    treatmentPlanService.getTreatmentPlanByCode(planCode);

            if (isPatientRole(authentication)) {
                if (plan.getPatient() == null ||
                        !isPatientAuthorizedForPatientId(authentication, plan.getPatient().getId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: Patients may only view their own treatment plans"));
                }
            }

            return ResponseEntity.ok(treatmentPlanMapper.toDTO(plan));

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET PATIENT TREATMENT PLANS
    // =========================================================

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("(hasAnyRole('ADMIN', 'DENTIST', 'DOCTOR', 'RECEPTIONIST', 'STAFF') and !hasAnyRole('CASHIER', 'PHARMACIST')) or (hasRole('PATIENT') and @accessControl.isSelfPatientOrAdmin(#patientId))")
    public ResponseEntity<?> getPatientTreatmentPlans(
            @PathVariable Long patientId,
            Authentication authentication) {

        if (accessControlService != null) {
            if (accessControlService.getCurrentUserId() == null && !accessControlService.isAdmin()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }

            if ((accessControlService.hasRole("CASHIER") || accessControlService.hasRole("PHARMACIST"))
                    && !accessControlService.isAdmin()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: Unauthorized role"));
            }

            if (!accessControlService.isAdmin()
                    && !accessControlService.hasRole("DENTIST")
                    && !accessControlService.hasRole("DOCTOR")
                    && !accessControlService.hasRole("RECEPTIONIST")
                    && !accessControlService.hasRole("STAFF")
                    && !accessControlService.hasRole("PATIENT")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: Unauthorized role"));
            }
        }

        try {

            if (isPatientRole(authentication) && !isPatientAuthorizedForPatientId(authentication, patientId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: Patients may only view their own treatment plans"));
            }

            if (accessControlService != null && accessControlService.hasRole("PATIENT")) {
                if (!accessControlService.isSelfPatientOrAdmin(patientId)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: Patients may only view their own treatment plans"));
                }
            }

            List<TreatmentPlanDTO> plans =
                    treatmentPlanService
                            .getPatientTreatmentPlans(patientId)
                            .stream()
                            .map(treatmentPlanMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(plans);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET DENTIST TREATMENT PLANS
    // =========================================================

    @GetMapping("/dentist/{dentistId}")
    @PreAuthorize("hasRole('ADMIN') or hasAnyRole('RECEPTIONIST', 'STAFF') or (hasAnyRole('DENTIST', 'DOCTOR') and @accessControl.canAccessDentistRecords(#dentistId))")
    public ResponseEntity<?> getDentistTreatmentPlans(
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
                            .body(Map.of("error", "Access denied: You cannot access another dentist's treatment plans"));
                }
            }
        }

        try {

            List<TreatmentPlanDTO> plans =
                    treatmentPlanService
                            .getDentistTreatmentPlans(dentistId)
                            .stream()
                            .map(treatmentPlanMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(plans);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET PLANS BY STATUS
    // =========================================================

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DENTIST', 'DOCTOR', 'RECEPTIONIST', 'STAFF')")
    public ResponseEntity<?> getPlansByStatus(
            @PathVariable String status) {

        try {

            List<TreatmentPlanDTO> plans =
                    treatmentPlanService
                            .getPlansByStatus(status)
                            .stream()
                            .map(treatmentPlanMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(plans);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // UPDATE TREATMENT PLAN
    // =========================================================

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAnyRole('DENTIST', 'DOCTOR')")
    public ResponseEntity<?> updateTreatmentPlan(
            @PathVariable Long id,
            @RequestBody TreatmentPlanDTO dto) {

        ResponseEntity<?> authCheck = checkUnauthenticatedAndClinicalRoleAccess();
        if (authCheck != null) {
            return authCheck;
        }

        try {

            if (dto == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Treatment plan data is required"));
            }

            ResponseEntity<?> ownershipCheck = checkTreatmentPlanOwnership(id);
            if (ownershipCheck != null) {
                return ownershipCheck;
            }

            if (accessControlService != null && !accessControlService.isAdmin()) {
                if (dto.getDentistId() != null && !accessControlService.canAccessDentistRecords(dto.getDentistId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: You cannot assign treatment plan to another dentist"));
                }
            }

            TreatmentPlan updatedPlan =
                    treatmentPlanMapper.toEntity(dto);

            TreatmentPlan updated =
                    treatmentPlanService.updateTreatmentPlan(
                            id,
                            updatedPlan
                    );

            return ResponseEntity.ok(treatmentPlanMapper.toDTO(updated));

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // APPROVE TREATMENT PLAN
    // =========================================================

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN') or hasRole('PATIENT') or hasAnyRole('DENTIST', 'DOCTOR')")
    public ResponseEntity<?> approvePlan(
            @PathVariable Long id,
            Authentication authentication) {

        if (accessControlService != null) {
            if (accessControlService.getCurrentUserId() == null && !accessControlService.isAdmin()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }

            if (!accessControlService.isAdmin()
                    && !accessControlService.hasRole("DENTIST")
                    && !accessControlService.hasRole("DOCTOR")
                    && !accessControlService.hasRole("PATIENT")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: Unauthorized role"));
            }
        }

        try {

            TreatmentPlan plan =
                    treatmentPlanService.getTreatmentPlanById(id);

            if (isPatientRole(authentication)) {
                if (plan.getPatient() == null ||
                        !isPatientAuthorizedForPatientId(authentication, plan.getPatient().getId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: Patients may only approve their own treatment plans"));
                }
            } else if (accessControlService != null && accessControlService.hasRole("PATIENT")) {
                Long patientId = (plan.getPatient() != null) ? plan.getPatient().getId() : null;
                if (!accessControlService.isSelfPatientOrAdmin(patientId)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: Patients may only approve their own treatment plans"));
                }
            }

            if (accessControlService != null && !accessControlService.isAdmin()
                    && (accessControlService.hasRole("DENTIST") || accessControlService.hasRole("DOCTOR"))) {
                Long dentistId = (plan.getDentist() != null) ? plan.getDentist().getId() : null;
                if (!accessControlService.canAccessDentistRecords(dentistId)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: You cannot access or modify another dentist's treatment plan"));
                }
            }

            TreatmentPlan approved =
                    treatmentPlanService.approvePlan(id);

            return ResponseEntity.ok(treatmentPlanMapper.toDTO(approved));

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // START TREATMENT PLAN
    // =========================================================

    @PutMapping("/{id}/start")
    @PreAuthorize("hasRole('ADMIN') or hasAnyRole('DENTIST', 'DOCTOR')")
    public ResponseEntity<?> startPlan(
            @PathVariable Long id) {

        ResponseEntity<?> authCheck = checkUnauthenticatedAndClinicalRoleAccess();
        if (authCheck != null) {
            return authCheck;
        }

        try {

            ResponseEntity<?> ownershipCheck = checkTreatmentPlanOwnership(id);
            if (ownershipCheck != null) {
                return ownershipCheck;
            }

            TreatmentPlan plan =
                    treatmentPlanService.startPlan(id);

            return ResponseEntity.ok(treatmentPlanMapper.toDTO(plan));

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // COMPLETE TREATMENT PLAN
    // =========================================================

    @PutMapping("/{id}/complete")
    @PreAuthorize("hasRole('ADMIN') or hasAnyRole('DENTIST', 'DOCTOR')")
    public ResponseEntity<?> completePlan(
            @PathVariable Long id) {

        ResponseEntity<?> authCheck = checkUnauthenticatedAndClinicalRoleAccess();
        if (authCheck != null) {
            return authCheck;
        }

        try {

            ResponseEntity<?> ownershipCheck = checkTreatmentPlanOwnership(id);
            if (ownershipCheck != null) {
                return ownershipCheck;
            }

            TreatmentPlan plan =
                    treatmentPlanService.completePlan(id);

            return ResponseEntity.ok(treatmentPlanMapper.toDTO(plan));

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // CANCEL TREATMENT PLAN
    // =========================================================

    @PutMapping("/{id}/cancel")
    @PreAuthorize("hasRole('ADMIN') or hasAnyRole('DENTIST', 'DOCTOR')")
    public ResponseEntity<?> cancelPlan(
            @PathVariable Long id) {

        ResponseEntity<?> authCheck = checkUnauthenticatedAndClinicalRoleAccess();
        if (authCheck != null) {
            return authCheck;
        }

        try {

            ResponseEntity<?> ownershipCheck = checkTreatmentPlanOwnership(id);
            if (ownershipCheck != null) {
                return ownershipCheck;
            }

            TreatmentPlan plan =
                    treatmentPlanService.cancelPlan(id);

            return ResponseEntity.ok(treatmentPlanMapper.toDTO(plan));

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // DELETE TREATMENT PLAN
    // =========================================================

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAnyRole('DENTIST', 'DOCTOR')")
    public ResponseEntity<?> deleteTreatmentPlan(
            @PathVariable Long id) {

        ResponseEntity<?> authCheck = checkUnauthenticatedAndClinicalRoleAccess();
        if (authCheck != null) {
            return authCheck;
        }

        try {

            ResponseEntity<?> ownershipCheck = checkTreatmentPlanOwnership(id);
            if (ownershipCheck != null) {
                return ownershipCheck;
            }

            treatmentPlanService.deleteTreatmentPlan(id);

            return ResponseEntity.ok(
                    Map.of("message", "Treatment plan deleted successfully", "success", true)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }
}