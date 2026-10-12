package com.dentaflow.backend.mapper;

import com.dentaflow.backend.dto.TreatmentDTO;
import com.dentaflow.backend.entity.Treatment;
import org.springframework.stereotype.Component;

@Component
public class TreatmentMapper {

    // =========================================================
    // ENTITY → DTO
    // =========================================================

    public TreatmentDTO toDTO(Treatment treatment) {

        if (treatment == null) {
            return null;
        }

        return TreatmentDTO.builder()
                .id(treatment.getId())
                .treatmentCode(
                        treatment.getTreatmentCode()
                )
                .patientId(
                        treatment.getPatient() != null
                                ? treatment.getPatient().getId()
                                : null
                )
                .dentistId(
                        treatment.getDentist() != null
                                ? treatment.getDentist().getId()
                                : null
                )
                .appointmentId(
                        treatment.getAppointment() != null
                                ? treatment.getAppointment().getId()
                                : null
                )
                .treatmentPlanId(
                        treatment.getTreatmentPlan() != null
                                ? treatment.getTreatmentPlan().getId()
                                : null
                )
                .treatmentPlanName(
                        treatment.getTreatmentPlan() != null
                                ? treatment.getTreatmentPlan().getPlanName()
                                : null
                )
                .treatmentDate(
                        treatment.getTreatmentDate()
                )
                .followUpDate(
                        treatment.getFollowUpDate()
                )
                .treatmentType(
                        treatment.getTreatmentType()
                )
                .diagnosis(
                        treatment.getDiagnosis()
                )
                .description(
                        treatment.getDescription()
                )
                .toothDetails(
                        treatment.getToothDetails()
                )
                .estimatedCost(
                        treatment.getEstimatedCost()
                )
                .actualCost(
                        treatment.getActualCost()
                )
                .status(
                        treatment.getStatus()
                )
                .dentistNotes(
                        treatment.getDentistNotes()
                )
                .build();
    }

    // =========================================================
    // DTO → ENTITY
    // =========================================================

    public Treatment toEntity(TreatmentDTO dto) {

        if (dto == null) {
            return null;
        }

        Treatment treatment = new Treatment();

        treatment.setId(dto.getId());

        treatment.setTreatmentCode(
                dto.getTreatmentCode()
        );

        treatment.setTreatmentDate(
                dto.getTreatmentDate()
        );

        treatment.setFollowUpDate(
                dto.getFollowUpDate()
        );

        treatment.setTreatmentType(
                dto.getTreatmentType()
        );

        treatment.setDiagnosis(
                dto.getDiagnosis()
        );

        treatment.setDescription(
                dto.getDescription()
        );

        treatment.setToothDetails(
                dto.getToothDetails()
        );

        treatment.setEstimatedCost(
                dto.getEstimatedCost()
        );

        treatment.setActualCost(
                dto.getActualCost()
        );

        treatment.setStatus(
                dto.getStatus()
        );

        treatment.setDentistNotes(
                dto.getDentistNotes()
        );

        return treatment;
    }
}