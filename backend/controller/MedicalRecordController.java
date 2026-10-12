package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.MedicalRecordDTO;
import com.dentaflow.backend.entity.MedicalRecord;
import com.dentaflow.backend.mapper.MedicalRecordMapper;
import com.dentaflow.backend.security.AccessControlService;
import com.dentaflow.backend.service.MedicalRecordService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static java.util.Map.of;

@RestController
@RequestMapping("/api/medical-records")
public class MedicalRecordController {

    private final MedicalRecordService medicalRecordService;
    private final MedicalRecordMapper medicalRecordMapper;
    private final AccessControlService accessControl;

    public MedicalRecordController(
            MedicalRecordService medicalRecordService,
            MedicalRecordMapper medicalRecordMapper,
            AccessControlService accessControl) {

        this.medicalRecordService = medicalRecordService;
        this.medicalRecordMapper = medicalRecordMapper;
        this.accessControl = accessControl;
    }

    // =========================================================
    // CREATE MEDICAL RECORD
    //
    // POST
    // /api/medical-records/patient/{patientId}/dentist/{dentistId}
    //
    // Dentist creates a medical record for a patient.
    // dentistId can be omitted only if your service allows it.
    // =========================================================

    @PostMapping("/patient/{patientId}/dentist/{dentistId}")
    @PreAuthorize("hasRole('ADMIN') or (hasAnyRole('DENTIST', 'DOCTOR') and @accessControl.canAccessDentistRecords(#dentistId))")
    public ResponseEntity<?> createMedicalRecord(
            @PathVariable Long patientId,
            @PathVariable Long dentistId,
            @RequestBody MedicalRecordDTO dto) {

        if (accessControl != null) {
            if (accessControl.getCurrentUserId() == null && !accessControl.isAdmin()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }

            if (!accessControl.isAdmin() && !accessControl.hasRole("DENTIST") && !accessControl.hasRole("DOCTOR")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: Unauthorized role"));
            }

            if (!accessControl.canAccessDentistRecords(dentistId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: You cannot create medical records for another dentist"));
            }
        }

        try {

            if (dto == null) {
                return ResponseEntity
                        .badRequest()
                        .body("Medical record data is required");
            }

            MedicalRecord medicalRecord =
                    medicalRecordMapper.toEntity(dto);

            MedicalRecord saved =
                    medicalRecordService.createMedicalRecord(
                            patientId,
                            dentistId,
                            medicalRecord
                    );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(
                            medicalRecordMapper.toDTO(saved)
                    );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET ALL MEDICAL RECORDS
    //
    // GET /api/medical-records
    //
    // Mainly useful for Admin.
    // =========================================================

    @GetMapping
    public ResponseEntity<?>
    getAllMedicalRecords() {

        Long currentUserId = accessControl.getCurrentUserId();
        boolean isAdmin = accessControl.isAdmin();

        if (currentUserId == null || (!isAdmin && !accessControl.hasRole("DENTIST") && !accessControl.hasRole("DOCTOR"))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Authentication required"));
        }

        List<MedicalRecord> records =
                medicalRecordService
                        .getAccessibleMedicalRecords(currentUserId, isAdmin);

        List<MedicalRecordDTO> dtos = records.stream()
                .map(medicalRecordMapper::toDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    // =========================================================
    // GET MEDICAL RECORD BY ID
    //
    // GET /api/medical-records/{id}
    // =========================================================

    @GetMapping("/{id}")
    @PreAuthorize("@accessControl.canAccessMedicalRecord(#id)")
    public ResponseEntity<?> getMedicalRecordById(
            @PathVariable Long id) {

        try {

            MedicalRecord record =
                    medicalRecordService
                            .getMedicalRecordById(id);

            return ResponseEntity.ok(
                    medicalRecordMapper.toDTO(record)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET PATIENT MEDICAL RECORDS
    //
    // GET /api/medical-records/patient/{patientId}
    //
    // Patient can view their medical history.
    // Dentist/Admin can also use this endpoint according
    // to the application's authorization rules.
    // =========================================================

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<?> getPatientMedicalRecords(
            @PathVariable Long patientId) {

        if (accessControl.getCurrentUserId() == null && !accessControl.isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Authentication required"));
        }
        if (!accessControl.canAccessPatientRecords(patientId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: You cannot access these records"));
        }

        try {

            List<MedicalRecordDTO> records =
                    medicalRecordService
                            .getPatientMedicalRecords(patientId)
                            .stream()
                            .map(medicalRecordMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(records);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET ACTIVE PATIENT MEDICAL RECORDS
    //
    // GET
    // /api/medical-records/patient/{patientId}/active
    // =========================================================

    @GetMapping("/patient/{patientId}/active")
    public ResponseEntity<?> getActivePatientRecords(
            @PathVariable Long patientId) {

        if (accessControl.getCurrentUserId() == null && !accessControl.isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Authentication required"));
        }
        if (!accessControl.canAccessPatientRecords(patientId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: You cannot access these records"));
        }

        try {

            List<MedicalRecordDTO> records =
                    medicalRecordService
                            .getActivePatientRecords(patientId)
                            .stream()
                            .map(medicalRecordMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(records);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET DENTIST MEDICAL RECORDS
    //
    // GET /api/medical-records/dentist/{dentistId}
    //
    // Used for dentist's patient records.
    // =========================================================

    @GetMapping("/dentist/{dentistId}")
    public ResponseEntity<?> getDentistMedicalRecords(
            @PathVariable Long dentistId) {

        if (accessControl.getCurrentUserId() == null && !accessControl.isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Authentication required"));
        }
        if (!accessControl.canAccessDentistRecords(dentistId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: You cannot access these records"));
        }

        try {

            List<MedicalRecordDTO> records =
                    medicalRecordService
                            .getDentistMedicalRecords(dentistId)
                            .stream()
                            .map(medicalRecordMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(records);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET RECORDS BY TYPE
    //
    // GET /api/medical-records/type/{recordType}
    // =========================================================

    @GetMapping("/type/{recordType}")
    public ResponseEntity<?> getRecordsByType(
            @PathVariable String recordType) {

        Long currentUserId = accessControl.getCurrentUserId();
        boolean isAdmin = accessControl.isAdmin();

        if (currentUserId == null || (!isAdmin && !accessControl.hasRole("DENTIST") && !accessControl.hasRole("DOCTOR"))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Authentication required"));
        }

        try {

            List<MedicalRecord> records =
                    medicalRecordService
                            .getAccessibleRecordsByType(
                                    currentUserId, isAdmin, recordType
                            );
            List<MedicalRecordDTO> dtos = records.stream()
                    .map(medicalRecordMapper::toDTO)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(dtos);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET RECORDS BY DATE
    //
    // GET /api/medical-records/date/{date}
    //
    // Example:
    // /api/medical-records/date/2026-08-25
    // =========================================================

    @GetMapping("/date/{date}")
    public ResponseEntity<?> getRecordsByDate(
            @PathVariable String date) {

        Long currentUserId = accessControl.getCurrentUserId();
        boolean isAdmin = accessControl.isAdmin();

        if (currentUserId == null || (!isAdmin && !accessControl.hasRole("DENTIST") && !accessControl.hasRole("DOCTOR"))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Authentication required"));
        }

        try {

            LocalDate recordDate = LocalDate.parse(date);

            List<MedicalRecord> records =
                    medicalRecordService
                            .getAccessibleRecordsByDate(
                                    currentUserId, isAdmin, recordDate
                            );
            List<MedicalRecordDTO> dtos = records.stream()
                    .map(medicalRecordMapper::toDTO)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(dtos);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());

        } catch (Exception exception) {

            return ResponseEntity
                    .badRequest()
                    .body("Invalid date format. Use yyyy-MM-dd");
        }
    }

    // =========================================================
    // GET RECORDS BY STATUS
    //
    // GET /api/medical-records/status/{status}
    // =========================================================

    @GetMapping("/status/{status}")
    public ResponseEntity<?> getRecordsByStatus(
            @PathVariable String status) {

        Long currentUserId = accessControl.getCurrentUserId();
        boolean isAdmin = accessControl.isAdmin();

        if (currentUserId == null || (!isAdmin && !accessControl.hasRole("DENTIST") && !accessControl.hasRole("DOCTOR"))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Authentication required"));
        }

        try {

            List<MedicalRecord> records =
                    medicalRecordService
                            .getAccessibleRecordsByStatus(
                                    currentUserId, isAdmin, status
                            );
            List<MedicalRecordDTO> dtos = records.stream()
                    .map(medicalRecordMapper::toDTO)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(dtos);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    private ResponseEntity<?> checkMedicalRecordAccess(Long id) {
        if (accessControl != null) {
            if (accessControl.getCurrentUserId() == null && !accessControl.isAdmin()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Authentication required"));
            }
            if (!accessControl.canAccessMedicalRecord(id)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: You cannot access this medical record"));
            }
        }
        return null;
    }

    // =========================================================
    // UPDATE MEDICAL RECORD
    //
    // PUT /api/medical-records/{id}
    // =========================================================

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or (hasAnyRole('DENTIST', 'DOCTOR') and @accessControl.canAccessMedicalRecord(#id))")
    public ResponseEntity<?> updateMedicalRecord(
            @PathVariable Long id,
            @RequestBody MedicalRecordDTO dto) {

        ResponseEntity<?> authCheck = checkMedicalRecordAccess(id);
        if (authCheck != null) {
            return authCheck;
        }

        try {

            if (dto == null) {
                return ResponseEntity
                        .badRequest()
                        .body("Medical record data is required");
            }

            MedicalRecord updatedRecord =
                    medicalRecordMapper.toEntity(dto);

            MedicalRecord updated =
                    medicalRecordService.updateMedicalRecord(
                            id,
                            updatedRecord
                    );

            return ResponseEntity.ok(
                    medicalRecordMapper.toDTO(updated)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // ACTIVATE MEDICAL RECORD
    //
    // PUT /api/medical-records/{id}/activate
    // =========================================================

    @PutMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN') or (hasAnyRole('DENTIST', 'DOCTOR') and @accessControl.canAccessMedicalRecord(#id))")
    public ResponseEntity<?> activateRecord(
            @PathVariable Long id) {

        ResponseEntity<?> authCheck = checkMedicalRecordAccess(id);
        if (authCheck != null) {
            return authCheck;
        }

        try {

            MedicalRecord record =
                    medicalRecordService
                            .activateRecord(id);

            return ResponseEntity.ok(
                    medicalRecordMapper.toDTO(record)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // ARCHIVE MEDICAL RECORD
    //
    // PUT /api/medical-records/{id}/archive
    // =========================================================

    @PutMapping("/{id}/archive")
    @PreAuthorize("hasRole('ADMIN') or (hasAnyRole('DENTIST', 'DOCTOR') and @accessControl.canAccessMedicalRecord(#id))")
    public ResponseEntity<?> archiveRecord(
            @PathVariable Long id) {

        ResponseEntity<?> authCheck = checkMedicalRecordAccess(id);
        if (authCheck != null) {
            return authCheck;
        }

        try {

            MedicalRecord record =
                    medicalRecordService
                            .archiveRecord(id);

            return ResponseEntity.ok(
                    medicalRecordMapper.toDTO(record)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // DELETE MEDICAL RECORD
    //
    // DELETE /api/medical-records/{id}
    // =========================================================

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or (hasAnyRole('DENTIST', 'DOCTOR') and @accessControl.canAccessMedicalRecord(#id))")
    public ResponseEntity<?> deleteMedicalRecord(
            @PathVariable Long id) {

        ResponseEntity<?> authCheck = checkMedicalRecordAccess(id);
        if (authCheck != null) {
            return authCheck;
        }

        try {

            medicalRecordService
                    .deleteMedicalRecord(id);

            return ResponseEntity.ok(
                    "Medical record deleted successfully"
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }
}