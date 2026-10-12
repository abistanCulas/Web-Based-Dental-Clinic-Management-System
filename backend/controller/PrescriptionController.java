package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.PrescriptionDTO;
import com.dentaflow.backend.entity.Patient;
import com.dentaflow.backend.entity.Prescription;
import com.dentaflow.backend.entity.PrescriptionItem;
import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.mapper.PrescriptionMapper;
import com.dentaflow.backend.security.CustomUserDetails;
import com.dentaflow.backend.service.PatientService;
import com.dentaflow.backend.service.PrescriptionService;

import com.dentaflow.backend.repository.MedicineRepository;
import com.dentaflow.backend.security.AccessControlService;
import org.springframework.beans.factory.annotation.Autowired;
import org.hibernate.proxy.HibernateProxy;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/prescriptions")
public class PrescriptionController {

    private final PrescriptionService prescriptionService;
    private final PrescriptionMapper prescriptionMapper;
    private final PatientService patientService;
    private final MedicineRepository medicineRepository;
    private final AccessControlService accessControlService;

    public PrescriptionController(
            PrescriptionService prescriptionService,
            PrescriptionMapper prescriptionMapper,
            PatientService patientService,
            MedicineRepository medicineRepository) {

        this(prescriptionService, prescriptionMapper, patientService, medicineRepository, null);
    }

    @Autowired
    public PrescriptionController(
            PrescriptionService prescriptionService,
            PrescriptionMapper prescriptionMapper,
            PatientService patientService,
            MedicineRepository medicineRepository,
            AccessControlService accessControlService) {

        this.prescriptionService = prescriptionService;
        this.prescriptionMapper = prescriptionMapper;
        this.patientService = patientService;
        this.medicineRepository = medicineRepository;
        this.accessControlService = accessControlService;
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

    private ResponseEntity<?> checkPrescriptionOwnership(Long prescriptionId) {
        if (accessControlService != null && !accessControlService.isAdmin()) {
            Prescription prescription = prescriptionService.getPrescriptionById(prescriptionId);
            Long dentistId = (prescription != null && prescription.getDentist() != null)
                    ? prescription.getDentist().getId()
                    : null;
            if (!accessControlService.canAccessDentistRecords(dentistId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: You cannot access or modify another dentist's prescription"));
            }
        }
        return null;
    }

    private ResponseEntity<?> checkItemOwnership(Long itemId) {
        if (accessControlService != null && !accessControlService.isAdmin()) {
            PrescriptionItem item = prescriptionService.getPrescriptionItemById(itemId);
            Prescription prescription = (item != null) ? item.getPrescription() : null;
            Long dentistId = (prescription != null && prescription.getDentist() != null)
                    ? prescription.getDentist().getId()
                    : null;
            if (!accessControlService.canAccessDentistRecords(dentistId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: You cannot remove medicine from another dentist's prescription"));
            }
        }
        return null;
    }

    // =========================================================
    // CREATE PRESCRIPTION
    // =========================================================

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or (hasAnyRole('DENTIST', 'DOCTOR') and @accessControl.canAccessDentistRecords(#dto?.dentistId))")
    public ResponseEntity<?> createPrescription(
            @RequestBody PrescriptionDTO dto) {

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

        try {

            if (dto == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Prescription data is required"));
            }

            if (dto.getPatientId() == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Patient ID is required"));
            }

            if (dto.getDentistId() == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Dentist ID is required"));
            }

            if (accessControlService != null && !accessControlService.canAccessDentistRecords(dto.getDentistId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: You cannot create prescriptions for another dentist"));
            }

            Prescription prescription =
                    prescriptionMapper.toEntity(dto);

            Prescription saved =
                    prescriptionService.createPrescription(
                            dto.getPatientId(),
                            dto.getDentistId(),
                            dto.getTreatmentId(),
                            prescription
                    );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(prescriptionMapper.toDTO(saved));

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET ALL PRESCRIPTIONS
    // =========================================================

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'DENTIST', 'DOCTOR', 'PHARMACIST', 'STAFF')")
    public ResponseEntity<List<PrescriptionDTO>> getAllPrescriptions() {

        List<PrescriptionDTO> result =
                prescriptionService
                        .getAllPrescriptions()
                        .stream()
                        .map(prescriptionMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // GET PRESCRIPTION BY ID
    // =========================================================

    @GetMapping("/{id}")
    @PreAuthorize("(hasAnyRole('ADMIN', 'DENTIST', 'DOCTOR', 'PHARMACIST', 'STAFF') and !hasAnyRole('CASHIER', 'RECEPTIONIST')) or hasRole('PATIENT')")
    public ResponseEntity<?> getPrescriptionById(
            @PathVariable Long id,
            Authentication authentication) {

        try {

            Prescription prescription =
                    prescriptionService.getPrescriptionById(id);

            if (isPatientRole(authentication)) {
                if (prescription.getPatient() == null ||
                        !isPatientAuthorizedForPatientId(authentication, prescription.getPatient().getId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: Patients may only view their own prescriptions"));
                }
            }

            return ResponseEntity.ok(prescriptionMapper.toDTO(prescription));

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET PRESCRIPTION BY CODE
    // =========================================================

    @GetMapping("/code/{prescriptionCode}")
    @PreAuthorize("(hasAnyRole('ADMIN', 'DENTIST', 'DOCTOR', 'PHARMACIST', 'STAFF') and !hasAnyRole('CASHIER', 'RECEPTIONIST')) or hasRole('PATIENT')")
    public ResponseEntity<?> getPrescriptionByCode(
            @PathVariable String prescriptionCode,
            Authentication authentication) {

        try {

            Prescription prescription =
                    prescriptionService.getPrescriptionByCode(prescriptionCode);

            if (isPatientRole(authentication)) {
                if (prescription.getPatient() == null ||
                        !isPatientAuthorizedForPatientId(authentication, prescription.getPatient().getId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: Patients may only view their own prescriptions"));
                }
            }

            return ResponseEntity.ok(prescriptionMapper.toDTO(prescription));

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET PATIENT PRESCRIPTIONS
    // =========================================================

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("(hasAnyRole('ADMIN', 'DENTIST', 'DOCTOR', 'PHARMACIST', 'STAFF') and !hasAnyRole('CASHIER', 'RECEPTIONIST')) or hasRole('PATIENT')")
    public ResponseEntity<?> getPatientPrescriptions(
            @PathVariable Long patientId,
            Authentication authentication) {

        try {

            if (isPatientRole(authentication) && !isPatientAuthorizedForPatientId(authentication, patientId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: Patients may only view their own prescriptions"));
            }

            List<PrescriptionDTO> result =
                    prescriptionService
                            .getPatientPrescriptions(patientId)
                            .stream()
                            .map(prescriptionMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET DENTIST PRESCRIPTIONS
    // =========================================================

    @GetMapping("/dentist/{dentistId}")
    @PreAuthorize("hasRole('ADMIN') or (hasAnyRole('DENTIST', 'DOCTOR') and @accessControl.canAccessDentistRecords(#dentistId))")
    public ResponseEntity<?> getDentistPrescriptions(
            @PathVariable Long dentistId) {

        ResponseEntity<?> roleCheck = checkUnauthenticatedAndRoleAccess();
        if (roleCheck != null) {
            return roleCheck;
        }

        if (accessControlService != null && !accessControlService.canAccessDentistRecords(dentistId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: You cannot access another dentist's prescriptions"));
        }

        try {

            List<PrescriptionDTO> result =
                    prescriptionService
                            .getDentistPrescriptions(dentistId)
                            .stream()
                            .map(prescriptionMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET PRESCRIPTION ITEMS
    // =========================================================

    @GetMapping(value = {"/{id}/items", "/{id}/medicines"})
    @PreAuthorize("(hasAnyRole('ADMIN', 'DENTIST', 'DOCTOR', 'PHARMACIST', 'STAFF') and !hasAnyRole('CASHIER', 'RECEPTIONIST')) or hasRole('PATIENT')")
    public ResponseEntity<?> getPrescriptionItems(
            @PathVariable Long id,
            Authentication authentication) {

        try {

            Prescription prescription =
                    prescriptionService.getPrescriptionById(id);

            if (isPatientRole(authentication)) {
                if (prescription.getPatient() == null ||
                        !isPatientAuthorizedForPatientId(authentication, prescription.getPatient().getId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: Patients may only view their own prescriptions"));
                }
            }

            List<PrescriptionItem> items =
                    prescriptionService.getPrescriptionItems(id);

            if (items != null) {
                for (PrescriptionItem it : items) {
                    it.setPrescription(null);
                    Long medId = null;
                    if (it.getMedicine() != null) {
                        if (it.getMedicine() instanceof HibernateProxy proxy) {
                            Object identifier = proxy.getHibernateLazyInitializer().getIdentifier();
                            if (identifier instanceof Long) {
                                medId = (Long) identifier;
                            } else if (identifier instanceof Number) {
                                medId = ((Number) identifier).longValue();
                            }
                        } else {
                            medId = it.getMedicine().getId();
                        }
                    }
                    if (medId != null) {
                        medicineRepository.findById(medId).ifPresent(it::setMedicine);
                    } else {
                        it.setMedicine(null);
                    }
                }
            }

            return ResponseEntity.ok(items);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // ADD MEDICINE
    // =========================================================

    public ResponseEntity<?> addMedicine(
            Long id,
            Long medicineId,
            PrescriptionItem item) {
        return addMedicine(id, medicineId, false, false, item);
    }

    public ResponseEntity<?> addMedicine(
            Long id,
            Long medicineId,
            boolean acknowledgeAllergy,
            PrescriptionItem item) {
        return addMedicine(id, medicineId, acknowledgeAllergy, false, item);
    }

    @PostMapping("/{id}/medicines/{medicineId}")
    @PreAuthorize("hasRole('ADMIN') or hasAnyRole('DENTIST', 'DOCTOR')")
    public ResponseEntity<?> addMedicine(
            @PathVariable Long id,
            @PathVariable Long medicineId,
            @RequestParam(required = false, defaultValue = "false") boolean acknowledgeAllergy,
            @RequestParam(required = false, defaultValue = "false") boolean acknowledgeInteraction,
            @RequestBody PrescriptionItem item) {

        ResponseEntity<?> roleCheck = checkUnauthenticatedAndRoleAccess();
        if (roleCheck != null) {
            return roleCheck;
        }

        try {

            ResponseEntity<?> authCheck = checkPrescriptionOwnership(id);
            if (authCheck != null) {
                return authCheck;
            }

            PrescriptionItem saved = prescriptionService.addMedicine(
                    id,
                    medicineId,
                    item,
                    acknowledgeAllergy,
                    acknowledgeInteraction
            );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(saved);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // REMOVE MEDICINE
    // =========================================================

    @DeleteMapping("/items/{itemId}")
    @PreAuthorize("hasRole('ADMIN') or hasAnyRole('DENTIST', 'DOCTOR')")
    public ResponseEntity<?> removeMedicine(
            @PathVariable Long itemId) {

        ResponseEntity<?> roleCheck = checkUnauthenticatedAndRoleAccess();
        if (roleCheck != null) {
            return roleCheck;
        }

        try {

            ResponseEntity<?> authCheck = checkItemOwnership(itemId);
            if (authCheck != null) {
                return authCheck;
            }

            prescriptionService.removeMedicine(itemId);

            return ResponseEntity.ok(
                    Map.of("message", "Prescription item removed successfully", "success", true)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // UPDATE PRESCRIPTION
    // =========================================================

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAnyRole('DENTIST', 'DOCTOR')")
    public ResponseEntity<?> updatePrescription(
            @PathVariable Long id,
            @RequestBody PrescriptionDTO dto) {

        ResponseEntity<?> roleCheck = checkUnauthenticatedAndRoleAccess();
        if (roleCheck != null) {
            return roleCheck;
        }

        try {

            if (dto == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Prescription data is required"));
            }

            ResponseEntity<?> authCheck = checkPrescriptionOwnership(id);
            if (authCheck != null) {
                return authCheck;
            }

            if (dto.getDentistId() != null && accessControlService != null && !accessControlService.isAdmin()) {
                if (!accessControlService.canAccessDentistRecords(dto.getDentistId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: You cannot assign a prescription to another dentist"));
                }
            }

            Prescription prescription =
                    prescriptionMapper.toEntity(dto);

            Prescription updated =
                    prescriptionService.updatePrescription(
                            id,
                            prescription
                    );

            return ResponseEntity.ok(prescriptionMapper.toDTO(updated));

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // CANCEL PRESCRIPTION
    // =========================================================

    @PutMapping("/{id}/cancel")
    @PreAuthorize("hasRole('ADMIN') or hasAnyRole('DENTIST', 'DOCTOR')")
    public ResponseEntity<?> cancelPrescription(
            @PathVariable Long id) {

        ResponseEntity<?> roleCheck = checkUnauthenticatedAndRoleAccess();
        if (roleCheck != null) {
            return roleCheck;
        }

        try {

            ResponseEntity<?> authCheck = checkPrescriptionOwnership(id);
            if (authCheck != null) {
                return authCheck;
            }

            Prescription prescription =
                    prescriptionService
                            .cancelPrescription(id);

            return ResponseEntity.ok(prescriptionMapper.toDTO(prescription));

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // COMPLETE PRESCRIPTION
    // =========================================================

    @PutMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'DENTIST', 'DOCTOR')")
    public ResponseEntity<?> completePrescription(
            @PathVariable Long id) {

        try {

            Prescription prescription =
                    prescriptionService
                            .completePrescription(id);

            return ResponseEntity.ok(prescriptionMapper.toDTO(prescription));

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // DISPENSE PRESCRIPTION (PHARMACY INTEGRATION)
    // =========================================================

    @RequestMapping(value = "/{id}/dispense", method = {RequestMethod.PUT, RequestMethod.POST})
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> dispensePrescription(
            @PathVariable Long id) {

        try {

            Prescription prescription =
                    prescriptionService
                            .dispensePrescription(id);

            return ResponseEntity.ok(prescriptionMapper.toDTO(prescription));

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // VERIFY PRESCRIPTION (PHARMACY INTEGRATION)
    // =========================================================

    @PutMapping("/{id}/verify")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> verifyPrescription(
            @PathVariable Long id) {

        try {

            Prescription prescription =
                    prescriptionService
                            .verifyPrescription(id);

            return ResponseEntity.ok(prescriptionMapper.toDTO(prescription));

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
            return ResponseEntity.ok(prescriptionService.getRegisteredStrategiesMetadata());
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    // =========================================================
    // STRATEGY PATTERN: GET AVAILABLE TRANSITIONS FOR PRESCRIPTION
    // =========================================================

    @GetMapping("/{id}/available-transitions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getAvailableTransitions(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(prescriptionService.getAvailableTransitions(id));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    // =========================================================
    // STRATEGY PATTERN: UNIFIED STATUS TRANSITION
    // =========================================================

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'DENTIST', 'DOCTOR')")
    public ResponseEntity<?> transitionPrescriptionStatus(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body,
            @RequestParam(required = false) String targetStatus) {

        ResponseEntity<?> roleCheck = checkUnauthenticatedAndRoleAccess();
        if (roleCheck != null) {
            return roleCheck;
        }

        try {
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
            Prescription updated = prescriptionService.transitionPrescriptionStatus(id, status, context);
            return ResponseEntity.ok(prescriptionMapper.toDTO(updated));

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // DELETE PRESCRIPTION
    // =========================================================

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAnyRole('DENTIST', 'DOCTOR')")
    public ResponseEntity<?> deletePrescription(
            @PathVariable Long id) {

        ResponseEntity<?> roleCheck = checkUnauthenticatedAndRoleAccess();
        if (roleCheck != null) {
            return roleCheck;
        }

        try {

            ResponseEntity<?> authCheck = checkPrescriptionOwnership(id);
            if (authCheck != null) {
                return authCheck;
            }

            prescriptionService
                    .deletePrescription(id);

            return ResponseEntity.ok(
                    Map.of("message", "Prescription deleted successfully", "success", true)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
}