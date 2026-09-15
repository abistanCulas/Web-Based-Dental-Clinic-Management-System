package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.PrescriptionDTO;
import com.dentaflow.backend.entity.Prescription;
import com.dentaflow.backend.entity.PrescriptionItem;
import com.dentaflow.backend.mapper.PrescriptionMapper;
import com.dentaflow.backend.service.PrescriptionService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/prescriptions")
@CrossOrigin
public class PrescriptionController {

    private final PrescriptionService prescriptionService;
    private final PrescriptionMapper prescriptionMapper;

    public PrescriptionController(
            PrescriptionService prescriptionService,
            PrescriptionMapper prescriptionMapper) {

        this.prescriptionService = prescriptionService;
        this.prescriptionMapper = prescriptionMapper;
    }

    // =========================================================
    // CREATE PRESCRIPTION
    // =========================================================

    @PostMapping
    public ResponseEntity<?> createPrescription(
            @RequestBody PrescriptionDTO dto) {

        try {

            if (dto == null) {
                return ResponseEntity.badRequest()
                        .body("Prescription data is required");
            }

            if (dto.getPatientId() == null) {
                return ResponseEntity.badRequest()
                        .body("Patient ID is required");
            }

            if (dto.getDentistId() == null) {
                return ResponseEntity.badRequest()
                        .body("Dentist ID is required");
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
                    .body(
                            prescriptionMapper.toDTO(saved)
                    );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET ALL PRESCRIPTIONS
    // =========================================================

    @GetMapping
    public ResponseEntity<List<PrescriptionDTO>>
    getAllPrescriptions() {

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
    public ResponseEntity<?> getPrescriptionById(
            @PathVariable Long id) {

        try {

            Prescription prescription =
                    prescriptionService
                            .getPrescriptionById(id);

            return ResponseEntity.ok(
                    prescriptionMapper.toDTO(prescription)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET PRESCRIPTION BY CODE
    // =========================================================

    @GetMapping("/code/{prescriptionCode}")
    public ResponseEntity<?> getPrescriptionByCode(
            @PathVariable String prescriptionCode) {

        try {

            Prescription prescription =
                    prescriptionService
                            .getPrescriptionByCode(
                                    prescriptionCode
                            );

            return ResponseEntity.ok(
                    prescriptionMapper.toDTO(prescription)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET PATIENT PRESCRIPTIONS
    // =========================================================

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<?> getPatientPrescriptions(
            @PathVariable Long patientId) {

        try {

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
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET DENTIST PRESCRIPTIONS
    // =========================================================

    @GetMapping("/dentist/{dentistId}")
    public ResponseEntity<?> getDentistPrescriptions(
            @PathVariable Long dentistId) {

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
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET PRESCRIPTION ITEMS
    // =========================================================

    @GetMapping("/{id}/items")
    public ResponseEntity<?> getPrescriptionItems(
            @PathVariable Long id) {

        try {

            List<PrescriptionItem> items =
                    prescriptionService
                            .getPrescriptionItems(id);

            return ResponseEntity.ok(items);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // ADD MEDICINE
    // =========================================================

    @PostMapping("/{id}/medicines/{medicineId}")
    public ResponseEntity<?> addMedicine(
            @PathVariable Long id,
            @PathVariable Long medicineId,
            @RequestBody PrescriptionItem item) {

        try {

            PrescriptionItem saved =
                    prescriptionService.addMedicine(
                            id,
                            medicineId,
                            item
                    );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(saved);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // REMOVE MEDICINE
    // =========================================================

    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<?> removeMedicine(
            @PathVariable Long itemId) {

        try {

            prescriptionService.removeMedicine(itemId);

            return ResponseEntity.ok(
                    "Prescription item removed successfully"
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // UPDATE PRESCRIPTION
    // =========================================================

    @PutMapping("/{id}")
    public ResponseEntity<?> updatePrescription(
            @PathVariable Long id,
            @RequestBody PrescriptionDTO dto) {

        try {

            if (dto == null) {
                return ResponseEntity.badRequest()
                        .body("Prescription data is required");
            }

            Prescription prescription =
                    prescriptionMapper.toEntity(dto);

            Prescription updated =
                    prescriptionService.updatePrescription(
                            id,
                            prescription
                    );

            return ResponseEntity.ok(
                    prescriptionMapper.toDTO(updated)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // CANCEL PRESCRIPTION
    // =========================================================

    @PutMapping("/{id}/cancel")
    public ResponseEntity<?> cancelPrescription(
            @PathVariable Long id) {

        try {

            Prescription prescription =
                    prescriptionService
                            .cancelPrescription(id);

            return ResponseEntity.ok(
                    prescriptionMapper.toDTO(prescription)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // COMPLETE PRESCRIPTION
    // =========================================================

    @PutMapping("/{id}/complete")
    public ResponseEntity<?> completePrescription(
            @PathVariable Long id) {

        try {

            Prescription prescription =
                    prescriptionService
                            .completePrescription(id);

            return ResponseEntity.ok(
                    prescriptionMapper.toDTO(prescription)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // DELETE PRESCRIPTION
    // =========================================================

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePrescription(
            @PathVariable Long id) {

        try {

            prescriptionService
                    .deletePrescription(id);

            return ResponseEntity.ok(
                    "Prescription deleted successfully"
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }
}