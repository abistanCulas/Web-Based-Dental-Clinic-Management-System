package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.TreatmentPlanDTO;
import com.dentaflow.backend.entity.TreatmentPlan;
import com.dentaflow.backend.mapper.TreatmentPlanMapper;
import com.dentaflow.backend.service.TreatmentPlanService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/treatment-plans")
@CrossOrigin
public class TreatmentPlanController {

    private final TreatmentPlanService treatmentPlanService;
    private final TreatmentPlanMapper treatmentPlanMapper;

    // =========================================================
    // CONSTRUCTOR
    // =========================================================

    public TreatmentPlanController(
            TreatmentPlanService treatmentPlanService,
            TreatmentPlanMapper treatmentPlanMapper) {

        this.treatmentPlanService = treatmentPlanService;
        this.treatmentPlanMapper = treatmentPlanMapper;
    }

    // =========================================================
    // CREATE TREATMENT PLAN
    //
    // POST
    // /api/treatment-plans/patient/{patientId}/dentist/{dentistId}
    // =========================================================

    @PostMapping(
            "/patient/{patientId}/dentist/{dentistId}"
    )
    public ResponseEntity<?> createTreatmentPlan(
            @PathVariable Long patientId,
            @PathVariable Long dentistId,
            @RequestBody TreatmentPlanDTO dto) {

        try {

            if (dto == null) {
                return ResponseEntity
                        .badRequest()
                        .body("Treatment plan data is required");
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
                    .body(
                            treatmentPlanMapper.toDTO(saved)
                    );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET ALL TREATMENT PLANS
    //
    // GET /api/treatment-plans
    // =========================================================

    @GetMapping
    public ResponseEntity<List<TreatmentPlanDTO>>
    getAllTreatmentPlans() {

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
    //
    // GET /api/treatment-plans/{id}
    // =========================================================

    @GetMapping("/{id}")
    public ResponseEntity<?> getTreatmentPlanById(
            @PathVariable Long id) {

        try {

            TreatmentPlan plan =
                    treatmentPlanService
                            .getTreatmentPlanById(id);

            return ResponseEntity.ok(
                    treatmentPlanMapper.toDTO(plan)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET TREATMENT PLAN BY CODE
    //
    // GET /api/treatment-plans/code/{planCode}
    // =========================================================

    @GetMapping("/code/{planCode}")
    public ResponseEntity<?> getTreatmentPlanByCode(
            @PathVariable String planCode) {

        try {

            TreatmentPlan plan =
                    treatmentPlanService
                            .getTreatmentPlanByCode(planCode);

            return ResponseEntity.ok(
                    treatmentPlanMapper.toDTO(plan)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET PATIENT TREATMENT PLANS
    //
    // GET /api/treatment-plans/patient/{patientId}
    // =========================================================

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<?> getPatientTreatmentPlans(
            @PathVariable Long patientId) {

        try {

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
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET DENTIST TREATMENT PLANS
    //
    // GET /api/treatment-plans/dentist/{dentistId}
    // =========================================================

    @GetMapping("/dentist/{dentistId}")
    public ResponseEntity<?> getDentistTreatmentPlans(
            @PathVariable Long dentistId) {

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
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET PLANS BY STATUS
    //
    // GET /api/treatment-plans/status/{status}
    // =========================================================

    @GetMapping("/status/{status}")
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
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // UPDATE TREATMENT PLAN
    //
    // PUT /api/treatment-plans/{id}
    // =========================================================

    @PutMapping("/{id}")
    public ResponseEntity<?> updateTreatmentPlan(
            @PathVariable Long id,
            @RequestBody TreatmentPlanDTO dto) {

        try {

            if (dto == null) {
                return ResponseEntity
                        .badRequest()
                        .body("Treatment plan data is required");
            }

            TreatmentPlan updatedPlan =
                    treatmentPlanMapper.toEntity(dto);

            TreatmentPlan updated =
                    treatmentPlanService.updateTreatmentPlan(
                            id,
                            updatedPlan
                    );

            return ResponseEntity.ok(
                    treatmentPlanMapper.toDTO(updated)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // APPROVE TREATMENT PLAN
    //
    // PUT /api/treatment-plans/{id}/approve
    // =========================================================

    @PutMapping("/{id}/approve")
    public ResponseEntity<?> approvePlan(
            @PathVariable Long id) {

        try {

            TreatmentPlan plan =
                    treatmentPlanService
                            .approvePlan(id);

            return ResponseEntity.ok(
                    treatmentPlanMapper.toDTO(plan)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // START TREATMENT PLAN
    //
    // PUT /api/treatment-plans/{id}/start
    // =========================================================

    @PutMapping("/{id}/start")
    public ResponseEntity<?> startPlan(
            @PathVariable Long id) {

        try {

            TreatmentPlan plan =
                    treatmentPlanService
                            .startPlan(id);

            return ResponseEntity.ok(
                    treatmentPlanMapper.toDTO(plan)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // COMPLETE TREATMENT PLAN
    //
    // PUT /api/treatment-plans/{id}/complete
    // =========================================================

    @PutMapping("/{id}/complete")
    public ResponseEntity<?> completePlan(
            @PathVariable Long id) {

        try {

            TreatmentPlan plan =
                    treatmentPlanService
                            .completePlan(id);

            return ResponseEntity.ok(
                    treatmentPlanMapper.toDTO(plan)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // CANCEL TREATMENT PLAN
    //
    // PUT /api/treatment-plans/{id}/cancel
    // =========================================================

    @PutMapping("/{id}/cancel")
    public ResponseEntity<?> cancelPlan(
            @PathVariable Long id) {

        try {

            TreatmentPlan plan =
                    treatmentPlanService
                            .cancelPlan(id);

            return ResponseEntity.ok(
                    treatmentPlanMapper.toDTO(plan)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // DELETE TREATMENT PLAN
    //
    // DELETE /api/treatment-plans/{id}
    // =========================================================

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTreatmentPlan(
            @PathVariable Long id) {

        try {

            treatmentPlanService
                    .deleteTreatmentPlan(id);

            return ResponseEntity.ok(
                    "Treatment plan deleted successfully"
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }
}