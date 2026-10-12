package com.dentaflow.backend.service;

import com.dentaflow.backend.entity.Dentist;
import com.dentaflow.backend.entity.Patient;
import com.dentaflow.backend.entity.TreatmentPlan;
import com.dentaflow.backend.repository.DentistRepository;
import com.dentaflow.backend.repository.PatientRepository;
import com.dentaflow.backend.repository.TreatmentPlanRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@Transactional
public class TreatmentPlanService {

    private final TreatmentPlanRepository treatmentPlanRepository;
    private final PatientRepository patientRepository;
    private final DentistRepository dentistRepository;

    public TreatmentPlanService(
            TreatmentPlanRepository treatmentPlanRepository,
            PatientRepository patientRepository,
            DentistRepository dentistRepository) {

        this.treatmentPlanRepository = treatmentPlanRepository;
        this.patientRepository = patientRepository;
        this.dentistRepository = dentistRepository;
    }

    // ---------------------------------------------------------
    // CREATE TREATMENT PLAN
    // ---------------------------------------------------------

    public TreatmentPlan createTreatmentPlan(
            Long patientId,
            Long dentistId,
            TreatmentPlan treatmentPlan) {

        if (treatmentPlan == null) {
            throw new RuntimeException(
                    "Treatment plan data is required"
            );
        }

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Patient not found with id: " + patientId
                        ));

        Dentist dentist = dentistRepository.findById(dentistId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Dentist not found with id: " + dentistId
                        ));

        if ("INACTIVE".equalsIgnoreCase(patient.getStatus()) || "DEACTIVATED".equalsIgnoreCase(patient.getStatus())) {
            throw new RuntimeException(
                    "Selected patient is not active"
            );
        }

        if (!"ACTIVE".equalsIgnoreCase(
                dentist.getStatus())) {

            throw new RuntimeException(
                    "Selected dentist is not active"
            );
        }

        if (treatmentPlan.getPlanName() == null ||
                treatmentPlan.getPlanName()
                        .trim()
                        .isEmpty()) {

            throw new RuntimeException(
                    "Treatment plan name is required"
            );
        }

        // Validate start date and expected end date
        if (treatmentPlan.getStartDate() != null &&
                treatmentPlan.getExpectedEndDate() != null &&
                treatmentPlan.getExpectedEndDate()
                        .isBefore(
                                treatmentPlan.getStartDate()
                        )) {

            throw new RuntimeException(
                    "Expected end date cannot be before start date"
            );
        }

        if (treatmentPlan.getEstimatedTotalCost() != null &&
                treatmentPlan.getEstimatedTotalCost()
                        .compareTo(BigDecimal.ZERO) < 0) {

            throw new RuntimeException(
                    "Estimated cost cannot be negative"
            );
        }

        treatmentPlan.setPatient(patient);
        treatmentPlan.setDentist(dentist);

        treatmentPlan.setPlanCode(
                generatePlanCode()
        );

        treatmentPlan.setPlanName(
                treatmentPlan.getPlanName().trim()
        );

        if (treatmentPlan.getStatus() == null ||
                treatmentPlan.getStatus()
                        .trim()
                        .isEmpty()) {

            treatmentPlan.setStatus("PROPOSED");
        }

        if (treatmentPlan.getEstimatedTotalCost() == null) {
            treatmentPlan.setEstimatedTotalCost(
                    BigDecimal.ZERO
            );
        }

        if (treatmentPlan.getStartDate() == null) {
            treatmentPlan.setStartDate(
                    LocalDate.now()
            );
        }

        return treatmentPlanRepository.save(
                treatmentPlan
        );
    }

    // ---------------------------------------------------------
    // GENERATE PLAN CODE
    // ---------------------------------------------------------

    private String generatePlanCode() {

        long nextNumber =
                treatmentPlanRepository.count() + 1;

        String code;

        do {
            code = String.format(
                    "PLAN%05d",
                    nextNumber
            );

            nextNumber++;

        } while (
                treatmentPlanRepository
                        .existsByPlanCode(code)
        );

        return code;
    }

    // ---------------------------------------------------------
    // GET ALL PLANS
    // ---------------------------------------------------------

    @Transactional(readOnly = true)
    public List<TreatmentPlan> getAllTreatmentPlans() {

        return treatmentPlanRepository.findAll();
    }

    // ---------------------------------------------------------
    // GET PLAN BY ID
    // ---------------------------------------------------------

    @Transactional(readOnly = true)
    public TreatmentPlan getTreatmentPlanById(Long id) {

        return treatmentPlanRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Treatment plan not found with id: "
                                        + id
                        ));
    }

    // ---------------------------------------------------------
    // GET PLAN BY CODE
    // ---------------------------------------------------------

    @Transactional(readOnly = true)
    public TreatmentPlan getTreatmentPlanByCode(
            String planCode) {

        if (planCode == null ||
                planCode.trim().isEmpty()) {

            throw new RuntimeException(
                    "Plan code is required"
            );
        }

        return treatmentPlanRepository
                .findByPlanCode(
                        planCode.trim().toUpperCase()
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "Treatment plan not found: "
                                        + planCode
                        ));
    }

    // ---------------------------------------------------------
    // GET PATIENT PLANS
    // ---------------------------------------------------------

    @Transactional(readOnly = true)
    public List<TreatmentPlan> getPatientTreatmentPlans(
            Long patientId) {

        patientRepository.findById(patientId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Patient not found with id: "
                                        + patientId
                        ));

        return treatmentPlanRepository
                .findByPatientIdOrderByStartDateDesc(
                        patientId
                );
    }

    // ---------------------------------------------------------
    // GET DENTIST PLANS
    // ---------------------------------------------------------

    @Transactional(readOnly = true)
    public List<TreatmentPlan> getDentistTreatmentPlans(
            Long dentistId) {

        dentistRepository.findById(dentistId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Dentist not found with id: "
                                        + dentistId
                        ));

        return treatmentPlanRepository
                .findByDentistIdOrderByStartDateDesc(
                        dentistId
                );
    }

    // ---------------------------------------------------------
    // GET PLANS BY STATUS
    // ---------------------------------------------------------

    @Transactional(readOnly = true)
    public List<TreatmentPlan> getPlansByStatus(
            String status) {

        if (status == null ||
                status.trim().isEmpty()) {

            throw new RuntimeException(
                    "Status is required"
            );
        }

        return treatmentPlanRepository
                .findByStatusIgnoreCaseOrderByStartDateDesc(
                        status.trim()
                );
    }

    // ---------------------------------------------------------
    // UPDATE PLAN
    // ---------------------------------------------------------

    public TreatmentPlan updateTreatmentPlan(
            Long id,
            TreatmentPlan updatedPlan) {

        TreatmentPlan existing =
                getTreatmentPlanById(id);

        if (updatedPlan == null) {
            throw new RuntimeException(
                    "Treatment plan data is required"
            );
        }

        if (updatedPlan.getPlanName() != null &&
                !updatedPlan.getPlanName()
                        .trim()
                        .isEmpty()) {

            existing.setPlanName(
                    updatedPlan.getPlanName().trim()
            );
        }

        if (updatedPlan.getDescription() != null) {

            existing.setDescription(
                    updatedPlan.getDescription().trim()
            );
        }

        if (updatedPlan.getStartDate() != null) {

            existing.setStartDate(
                    updatedPlan.getStartDate()
            );
        }

        if (updatedPlan.getDentistNotes() != null) {
            existing.setDentistNotes(
                    updatedPlan.getDentistNotes().trim()
            );
        }

        // IMPORTANT:
        // Entity uses expectedEndDate, not endDate
        if (updatedPlan.getExpectedEndDate() != null) {

            existing.setExpectedEndDate(
                    updatedPlan.getExpectedEndDate()
            );
        }

        // Validate dates
        if (existing.getStartDate() != null &&
                existing.getExpectedEndDate() != null &&
                existing.getExpectedEndDate()
                        .isBefore(
                                existing.getStartDate()
                        )) {

            throw new RuntimeException(
                    "Expected end date cannot be before start date"
            );
        }

        if (updatedPlan.getEstimatedTotalCost() != null) {

            if (updatedPlan
                    .getEstimatedTotalCost()
                    .compareTo(BigDecimal.ZERO) < 0) {

                throw new RuntimeException(
                        "Estimated cost cannot be negative"
                );
            }

            existing.setEstimatedTotalCost(
                    updatedPlan
                            .getEstimatedTotalCost()
            );
        }

        if (updatedPlan.getStatus() != null) {

            existing.setStatus(
                    updatedPlan.getStatus()
                            .trim()
                            .toUpperCase()
            );
        }

        return treatmentPlanRepository.save(
                existing
        );
    }

    // ---------------------------------------------------------
    // APPROVE PLAN
    // ---------------------------------------------------------

    public TreatmentPlan approvePlan(Long id) {

        TreatmentPlan plan =
                getTreatmentPlanById(id);

        if ("CANCELLED".equalsIgnoreCase(
                plan.getStatus())) {

            throw new RuntimeException(
                    "Cancelled treatment plan cannot be approved"
            );
        }

        plan.setStatus("APPROVED");

        return treatmentPlanRepository.save(plan);
    }

    // ---------------------------------------------------------
    // START PLAN
    // ---------------------------------------------------------

    public TreatmentPlan startPlan(Long id) {

        TreatmentPlan plan =
                getTreatmentPlanById(id);

        if ("CANCELLED".equalsIgnoreCase(
                plan.getStatus())) {

            throw new RuntimeException(
                    "Cancelled treatment plan cannot be started"
            );
        }

        plan.setStatus("IN_PROGRESS");

        if (plan.getStartDate() == null) {
            plan.setStartDate(
                    LocalDate.now()
            );
        }

        return treatmentPlanRepository.save(plan);
    }

    // ---------------------------------------------------------
    // COMPLETE PLAN
    // ---------------------------------------------------------

    public TreatmentPlan completePlan(Long id) {

        TreatmentPlan plan =
                getTreatmentPlanById(id);

        if ("CANCELLED".equalsIgnoreCase(
                plan.getStatus())) {

            throw new RuntimeException(
                    "Cancelled treatment plan cannot be completed"
            );
        }

        plan.setStatus("COMPLETED");

        if (plan.getExpectedEndDate() == null) {
            plan.setExpectedEndDate(
                    LocalDate.now()
            );
        }

        return treatmentPlanRepository.save(plan);
    }

    // ---------------------------------------------------------
    // CANCEL PLAN
    // ---------------------------------------------------------

    public TreatmentPlan cancelPlan(Long id) {

        TreatmentPlan plan =
                getTreatmentPlanById(id);

        if ("COMPLETED".equalsIgnoreCase(
                plan.getStatus())) {

            throw new RuntimeException(
                    "Completed treatment plan cannot be cancelled"
            );
        }

        plan.setStatus("CANCELLED");

        return treatmentPlanRepository.save(plan);
    }

    // ---------------------------------------------------------
    // DELETE PLAN
    // ---------------------------------------------------------

    public void deleteTreatmentPlan(Long id) {

        TreatmentPlan plan =
                getTreatmentPlanById(id);

        if ("IN_PROGRESS".equalsIgnoreCase(plan.getStatus()) ||
                "COMPLETED".equalsIgnoreCase(plan.getStatus())) {

            throw new RuntimeException(
                    "Cannot delete an in-progress or completed treatment plan. Cancel it instead."
            );
        }

        treatmentPlanRepository.delete(plan);
    }
}