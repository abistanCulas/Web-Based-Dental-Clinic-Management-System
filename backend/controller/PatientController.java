package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.PatientDTO;
import com.dentaflow.backend.entity.Patient;
import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.mapper.PatientMapper;
import com.dentaflow.backend.security.CustomUserDetails;
import com.dentaflow.backend.service.PatientService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.dentaflow.backend.dto.MedicationAllergyCheckRequest;
import com.dentaflow.backend.dto.MedicationAllergyCheckResult;
import com.dentaflow.backend.dto.PatientAllergiesResponse;
import com.dentaflow.backend.service.PatientAllergyService;
import org.springframework.beans.factory.annotation.Autowired;

@RestController
@RequestMapping("/api/patients")
public class PatientController {

    private final PatientService patientService;
    private final PatientMapper patientMapper;
    private final PatientAllergyService patientAllergyService;

    public PatientController(
            PatientService patientService,
            PatientMapper patientMapper) {

        this(patientService, patientMapper, null);
    }

    @Autowired
    public PatientController(
            PatientService patientService,
            PatientMapper patientMapper,
            PatientAllergyService patientAllergyService) {

        this.patientService = patientService;
        this.patientMapper = patientMapper;
        this.patientAllergyService = patientAllergyService;
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

    private boolean hasRole(Authentication authentication, String role) {
        if (authentication == null || role == null) return false;
        String target = "ROLE_" + role.trim().toUpperCase();
        return authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals(target));
    }

    // =========================================================
    // CREATE PATIENT (ADMIN & RECEPTIONIST)
    // =========================================================

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<?> createPatient(
            @RequestBody PatientDTO dto) {

        try {
            Patient patient = patientMapper.toEntity(dto);
            Patient saved = patientService.createPatient(patient, dto.getUserId());
            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(patientMapper.toDTO(saved));
        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET ALL PATIENTS (CLINIC STAFF ONLY - PATIENTS GET 403)
    // =========================================================

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'DENTIST', 'DOCTOR', 'PHARMACIST', 'CASHIER', 'STAFF')")
    public ResponseEntity<List<PatientDTO>> getAllPatients() {

        List<PatientDTO> patients = patientService
                .getAllPatients()
                .stream()
                .map(patientMapper::toDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(patients);
    }

    // =========================================================
    // GET CURRENT USER PATIENT PROFILE (/api/patients/me)
    // =========================================================

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getMyPatientProfile(Authentication authentication) {
        User currentUser = getCurrentUser(authentication);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }

        try {
            Patient patient = patientService.getPatientByUserId(currentUser.getId());
            return ResponseEntity.ok(patientMapper.toDTO(patient));
        } catch (RuntimeException exception) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET PATIENT BY ID (STAFF OR PATIENT SELF)
    // =========================================================

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'DENTIST', 'DOCTOR', 'PHARMACIST', 'CASHIER', 'STAFF', 'PATIENT')")
    public ResponseEntity<?> getPatientById(
            @PathVariable Long id,
            Authentication authentication) {

        try {
            Patient patient = patientService.getPatientById(id);

            if (isPatientRole(authentication)) {
                User currentUser = getCurrentUser(authentication);
                if (currentUser == null || patient.getUser() == null || !patient.getUser().getId().equals(currentUser.getId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: Patients may only view their own profile"));
                }
            }

            return ResponseEntity.ok(patientMapper.toDTO(patient));
        } catch (RuntimeException exception) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET PATIENT BY CODE (STAFF OR PATIENT SELF)
    // =========================================================

    @GetMapping("/code/{patientCode}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'DENTIST', 'DOCTOR', 'PHARMACIST', 'CASHIER', 'STAFF', 'PATIENT')")
    public ResponseEntity<?> getPatientByCode(
            @PathVariable String patientCode,
            Authentication authentication) {

        try {
            Patient patient = patientService.getPatientByCode(patientCode);

            if (isPatientRole(authentication)) {
                User currentUser = getCurrentUser(authentication);
                if (currentUser == null || patient.getUser() == null || !patient.getUser().getId().equals(currentUser.getId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: Patients may only view their own profile"));
                }
            }

            return ResponseEntity.ok(patientMapper.toDTO(patient));
        } catch (RuntimeException exception) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET PATIENT BY NIC (STAFF ONLY)
    // =========================================================

    @GetMapping("/nic/{nic}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'DENTIST', 'DOCTOR', 'PHARMACIST', 'CASHIER', 'STAFF')")
    public ResponseEntity<?> getPatientByNic(
            @PathVariable String nic) {

        try {
            Patient patient = patientService.getPatientByNic(nic);
            return ResponseEntity.ok(patientMapper.toDTO(patient));
        } catch (RuntimeException exception) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET PATIENT BY USER ID (SELF / ADMIN / RECEPTIONIST)
    //
    // PATIENT       -> own /user/{userId} only; self auto-create preserved.
    // ADMIN/RECEP   -> may look up any user (existing workflow preserved).
    // Other roles   -> 403 BEFORE the service lookup, so an unauthorized
    //                  GET can never auto-create a patient record.
    // =========================================================

    @GetMapping("/user/{userId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getPatientByUserId(
            @PathVariable Long userId,
            Authentication authentication) {

        try {
            if (isPatientRole(authentication)) {
                User currentUser = getCurrentUser(authentication);
                if (currentUser == null || !userId.equals(currentUser.getId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: Patients may only access their own profile"));
                }
            } else if (!hasRole(authentication, "ADMIN")
                    && !hasRole(authentication, "RECEPTIONIST")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: You are not authorized to view another user's patient profile"));
            }

            Patient patient = patientService.getPatientByUserId(userId);
            return ResponseEntity.ok(patientMapper.toDTO(patient));
        } catch (RuntimeException exception) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET PATIENTS BY STATUS (STAFF ONLY)
    // =========================================================

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'DENTIST', 'DOCTOR', 'PHARMACIST', 'CASHIER', 'STAFF')")
    public ResponseEntity<?> getPatientsByStatus(
            @PathVariable String status) {

        try {
            List<PatientDTO> patients = patientService
                    .getPatientsByStatus(status)
                    .stream()
                    .map(patientMapper::toDTO)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(patients);
        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // SEARCH PATIENTS (STAFF ONLY)
    // =========================================================

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'DENTIST', 'DOCTOR', 'PHARMACIST', 'CASHIER', 'STAFF')")
    public ResponseEntity<?> searchPatients(
            @RequestParam(required = false) String keyword) {

        try {
            List<PatientDTO> patients = patientService
                    .searchPatients(keyword)
                    .stream()
                    .map(patientMapper::toDTO)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(patients);
        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // SEARCH BY PHONE (STAFF ONLY)
    // =========================================================

    @GetMapping("/search/phone")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'DENTIST', 'DOCTOR', 'PHARMACIST', 'CASHIER', 'STAFF')")
    public ResponseEntity<List<PatientDTO>> searchByPhone(
            @RequestParam String phone) {

        List<PatientDTO> patients = patientService
                .searchByPhone(phone)
                .stream()
                .map(patientMapper::toDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(patients);
    }

    // =========================================================
    // SEARCH BY EMAIL (STAFF ONLY)
    // =========================================================

    @GetMapping("/search/email")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'DENTIST', 'DOCTOR', 'PHARMACIST', 'CASHIER', 'STAFF')")
    public ResponseEntity<List<PatientDTO>> searchByEmail(
            @RequestParam String email) {

        List<PatientDTO> patients = patientService
                .searchByEmail(email)
                .stream()
                .map(patientMapper::toDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(patients);
    }

    // =========================================================
    // UPDATE PATIENT (ADMIN, RECEPTIONIST, OR PATIENT SELF)
    // =========================================================

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'DENTIST', 'DOCTOR', 'PATIENT')")
    public ResponseEntity<?> updatePatient(
            @PathVariable Long id,
            @RequestBody PatientDTO dto,
            Authentication authentication) {

        try {
            Patient existing = patientService.getPatientById(id);

            if (isPatientRole(authentication)) {
                User currentUser = getCurrentUser(authentication);
                if (currentUser == null || existing.getUser() == null || !existing.getUser().getId().equals(currentUser.getId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: Patients may only edit their own profile"));
                }
            }

            Patient updatedPatient = patientMapper.toEntity(dto);
            Patient updated = patientService.updatePatient(id, updatedPatient);

            return ResponseEntity.ok(patientMapper.toDTO(updated));
        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // ACTIVATE PATIENT (ADMIN & RECEPTIONIST ONLY)
    // =========================================================

    @PutMapping("/{id}/activate")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<?> activatePatient(
            @PathVariable Long id) {

        try {
            Patient patient = patientService.activatePatient(id);
            return ResponseEntity.ok(patientMapper.toDTO(patient));
        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // DEACTIVATE PATIENT (ADMIN & RECEPTIONIST ONLY)
    // =========================================================

    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<?> deactivatePatient(
            @PathVariable Long id) {

        try {
            Patient patient = patientService.deactivatePatient(id);
            return ResponseEntity.ok(patientMapper.toDTO(patient));
        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // DELETE PATIENT (ADMIN & RECEPTIONIST ONLY)
    // =========================================================

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<?> deletePatient(
            @PathVariable Long id) {

        try {
            patientService.deletePatient(id);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Patient deleted successfully"
            ));
        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET PATIENT ALLERGIES
    // =========================================================

    @GetMapping("/{id}/allergies")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'DENTIST', 'DOCTOR', 'PHARMACIST', 'CASHIER', 'STAFF', 'PATIENT')")
    public ResponseEntity<?> getPatientAllergies(
            @PathVariable Long id,
            Authentication authentication) {

        try {
            Patient patient = patientService.getPatientById(id);

            if (isPatientRole(authentication)) {
                User currentUser = getCurrentUser(authentication);
                if (currentUser == null || patient.getUser() == null || !patient.getUser().getId().equals(currentUser.getId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: Patients may only view their own allergy profile"));
                }
            }

            PatientAllergiesResponse response = patientAllergyService != null
                    ? patientAllergyService.getPatientAllergies(id)
                    : PatientAllergiesResponse.builder()
                            .patientId(patient.getId())
                            .patientName(patient.getFirstName() + " " + patient.getLastName())
                            .rawAllergies(patient.getAllergies())
                            .hasAllergies(patient.getAllergies() != null && !patient.getAllergies().isBlank())
                            .build();

            return ResponseEntity.ok(response);
        } catch (RuntimeException exception) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // UPDATE PATIENT ALLERGIES
    // =========================================================

    @PutMapping("/{id}/allergies")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'DENTIST', 'DOCTOR', 'PATIENT')")
    public ResponseEntity<?> updatePatientAllergies(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            Authentication authentication) {

        try {
            Patient patient = patientService.getPatientById(id);

            if (isPatientRole(authentication)) {
                User currentUser = getCurrentUser(authentication);
                if (currentUser == null || patient.getUser() == null || !patient.getUser().getId().equals(currentUser.getId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: Patients may only edit their own allergy profile"));
                }
            }

            String allergies = body != null && body.containsKey("allergies") ? String.valueOf(body.get("allergies")) : "";
            PatientAllergiesResponse res = patientAllergyService != null
                    ? patientAllergyService.updatePatientAllergies(id, allergies)
                    : PatientAllergiesResponse.builder().patientId(id).rawAllergies(allergies).build();

            return ResponseEntity.ok(res);
        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // CHECK MEDICATION ALLERGY FOR PATIENT
    // =========================================================

    @PostMapping("/{id}/allergies/check-medication")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'DENTIST', 'DOCTOR', 'PHARMACIST', 'STAFF')")
    public ResponseEntity<?> checkMedicationAllergy(
            @PathVariable Long id,
            @RequestBody MedicationAllergyCheckRequest req) {

        try {
            Long medicineId = req != null ? req.getMedicineId() : null;
            String medicineName = req != null ? req.getMedicineName() : null;

            MedicationAllergyCheckResult result = patientAllergyService != null
                    ? patientAllergyService.checkMedicationAllergy(id, medicineId, medicineName)
                    : MedicationAllergyCheckResult.builder().hasWarning(false).riskLevel("NONE").build();

            return ResponseEntity.ok(result);
        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    @GetMapping("/{id}/allergies/check-medication")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'DENTIST', 'DOCTOR', 'PHARMACIST', 'STAFF')")
    public ResponseEntity<?> checkMedicationAllergyQuery(
            @PathVariable Long id,
            @RequestParam(required = false) Long medicineId,
            @RequestParam(required = false) String medicineName) {

        try {
            MedicationAllergyCheckResult result = patientAllergyService != null
                    ? patientAllergyService.checkMedicationAllergy(id, medicineId, medicineName)
                    : MedicationAllergyCheckResult.builder().hasWarning(false).riskLevel("NONE").build();

            return ResponseEntity.ok(result);
        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }
}