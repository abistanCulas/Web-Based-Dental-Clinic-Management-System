package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.TreatmentDTO;
import com.dentaflow.backend.entity.Treatment;
import com.dentaflow.backend.mapper.TreatmentMapper;
import com.dentaflow.backend.service.TreatmentService;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/treatments")
@CrossOrigin
public class TreatmentController {

    private final TreatmentService treatmentService;
    private final TreatmentMapper treatmentMapper;

    public TreatmentController(
            TreatmentService treatmentService,
            TreatmentMapper treatmentMapper) {

        this.treatmentService = treatmentService;
        this.treatmentMapper = treatmentMapper;
    }

    // =========================================================
    // CREATE TREATMENT
    // =========================================================

    @PostMapping
    public ResponseEntity<?> createTreatment(
            @RequestBody TreatmentDTO dto) {

        try {

            if (dto == null) {
                return ResponseEntity.badRequest()
                        .body("Treatment data is required");
            }

            if (dto.getPatientId() == null) {
                return ResponseEntity.badRequest()
                        .body("Patient ID is required");
            }

            if (dto.getDentistId() == null) {
                return ResponseEntity.badRequest()
                        .body("Dentist ID is required");
            }

            Treatment treatment =
                    treatmentMapper.toEntity(dto);

            Treatment saved =
                    treatmentService.createTreatment(
                            dto.getPatientId(),
                            dto.getDentistId(),
                            dto.getAppointmentId(),
                            treatment
                    );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(
                            treatmentMapper.toDTO(saved)
                    );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET ALL TREATMENTS
    // =========================================================

    @GetMapping
    public ResponseEntity<List<TreatmentDTO>>
    getAllTreatments() {

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
    public ResponseEntity<?> getTreatmentById(
            @PathVariable Long id) {

        try {

            Treatment treatment =
                    treatmentService
                            .getTreatmentById(id);

            return ResponseEntity.ok(
                    treatmentMapper.toDTO(treatment)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET TREATMENT BY CODE
    // =========================================================

    @GetMapping("/code/{treatmentCode}")
    public ResponseEntity<?> getTreatmentByCode(
            @PathVariable String treatmentCode) {

        try {

            Treatment treatment =
                    treatmentService
                            .getTreatmentByCode(
                                    treatmentCode
                            );

            return ResponseEntity.ok(
                    treatmentMapper.toDTO(treatment)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET PATIENT TREATMENTS
    // =========================================================

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<?> getPatientTreatments(
            @PathVariable Long patientId) {

        try {

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
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET DENTIST TREATMENTS
    // =========================================================

    @GetMapping("/dentist/{dentistId}")
    public ResponseEntity<?> getDentistTreatments(
            @PathVariable Long dentistId) {

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
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET TREATMENTS BY DATE
    // =========================================================

    @GetMapping("/date")
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
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET TREATMENTS BY TYPE
    // =========================================================

    @GetMapping("/type/{treatmentType}")
    public ResponseEntity<List<TreatmentDTO>>
    getTreatmentsByType(
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
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // UPDATE TREATMENT
    // =========================================================

    @PutMapping("/{id}")
    public ResponseEntity<?> updateTreatment(
            @PathVariable Long id,
            @RequestBody TreatmentDTO dto) {

        try {

            if (dto == null) {
                return ResponseEntity.badRequest()
                        .body("Treatment data is required");
            }

            Treatment treatment =
                    treatmentMapper.toEntity(dto);

            Treatment updated =
                    treatmentService.updateTreatment(
                            id,
                            treatment
                    );

            return ResponseEntity.ok(
                    treatmentMapper.toDTO(updated)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // START TREATMENT
    // =========================================================

    @PutMapping("/{id}/start")
    public ResponseEntity<?> startTreatment(
            @PathVariable Long id) {

        try {

            Treatment treatment =
                    treatmentService.startTreatment(id);

            return ResponseEntity.ok(
                    treatmentMapper.toDTO(treatment)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // COMPLETE TREATMENT
    // =========================================================

    @PutMapping("/{id}/complete")
    public ResponseEntity<?> completeTreatment(
            @PathVariable Long id) {

        try {

            Treatment treatment =
                    treatmentService.completeTreatment(id);

            return ResponseEntity.ok(
                    treatmentMapper.toDTO(treatment)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // CANCEL TREATMENT
    // =========================================================

    @PutMapping("/{id}/cancel")
    public ResponseEntity<?> cancelTreatment(
            @PathVariable Long id) {

        try {

            Treatment treatment =
                    treatmentService.cancelTreatment(id);

            return ResponseEntity.ok(
                    treatmentMapper.toDTO(treatment)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // DELETE TREATMENT
    // =========================================================

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTreatment(
            @PathVariable Long id) {

        try {

            treatmentService.deleteTreatment(id);

            return ResponseEntity.ok(
                    "Treatment deleted successfully"
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }
}