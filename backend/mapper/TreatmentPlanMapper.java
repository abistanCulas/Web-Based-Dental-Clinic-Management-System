package com.dentaflow.backend.mapper;

import com.dentaflow.backend.dto.TreatmentPlanDTO;
import com.dentaflow.backend.entity.TreatmentPlan;
import org.springframework.stereotype.Component;

@Component
public class TreatmentPlanMapper {

    // =========================================================
    // ENTITY → DTO
    // =========================================================

    public TreatmentPlanDTO toDTO(
            TreatmentPlan treatmentPlan) {

        if (treatmentPlan == null) {
            return null;
        }

        return TreatmentPlanDTO.builder()
                .id(treatmentPlan.getId())

                .planCode(
                        treatmentPlan.getPlanCode()
                )

                .patientId(
                        treatmentPlan.getPatient() != null
                                ? treatmentPlan.getPatient().getId()
                                : null
                )

                .dentistId(
                        treatmentPlan.getDentist() != null
                                ? treatmentPlan.getDentist().getId()
                                : null
                )

                .planName(
                        treatmentPlan.getPlanName()
                )

                .description(
                        treatmentPlan.getDescription()
                )

                .startDate(
                        treatmentPlan.getStartDate()
                )

                .expectedEndDate(
                        treatmentPlan.getExpectedEndDate()
                )

                .estimatedTotalCost(
                        treatmentPlan.getEstimatedTotalCost()
                )

                .status(
                        treatmentPlan.getStatus()
                )

                .dentistNotes(
                        treatmentPlan.getDentistNotes()
                )

                .build();
    }

    // =========================================================
    // DTO → ENTITY
    //
    // Patient and Dentist are resolved by
    // TreatmentPlanService.
    // =========================================================

    public TreatmentPlan toEntity(
            TreatmentPlanDTO dto) {

        if (dto == null) {
            return null;
        }

        TreatmentPlan treatmentPlan =
                new TreatmentPlan();

        treatmentPlan.setId(
                dto.getId()
        );

        treatmentPlan.setPlanCode(
                dto.getPlanCode()
        );

        treatmentPlan.setPlanName(
                dto.getPlanName()
        );

        treatmentPlan.setDescription(
                dto.getDescription()
        );

        treatmentPlan.setStartDate(
                dto.getStartDate()
        );

        treatmentPlan.setExpectedEndDate(
                dto.getExpectedEndDate()
        );

        treatmentPlan.setEstimatedTotalCost(
                dto.getEstimatedTotalCost()
        );

        treatmentPlan.setStatus(
                dto.getStatus()
        );

        treatmentPlan.setDentistNotes(
                dto.getDentistNotes()
        );

        return treatmentPlan;
    }
}