package com.dentaflow.backend.mapper;

import com.dentaflow.backend.dto.PrescriptionDTO;
import com.dentaflow.backend.entity.Prescription;
import org.springframework.stereotype.Component;

@Component
public class PrescriptionMapper {

    // =========================================================
    // ENTITY → DTO
    // =========================================================

    public PrescriptionDTO toDTO(Prescription prescription) {

        if (prescription == null) {
            return null;
        }

        return PrescriptionDTO.builder()
                .id(prescription.getId())
                .prescriptionCode(
                        prescription.getPrescriptionCode()
                )
                .patientId(
                        prescription.getPatient() != null
                                ? prescription.getPatient().getId()
                                : null
                )
                .dentistId(
                        prescription.getDentist() != null
                                ? prescription.getDentist().getId()
                                : null
                )
                .treatmentId(
                        prescription.getTreatment() != null
                                ? prescription.getTreatment().getId()
                                : null
                )
                .prescriptionDate(
                        prescription.getPrescriptionDate()
                )
                .diagnosis(
                        prescription.getDiagnosis()
                )
                .instructions(
                        prescription.getInstructions()
                )
                .status(
                        prescription.getStatus()
                )
                .dentistNotes(
                        prescription.getDentistNotes()
                )
                .build();
    }

    // =========================================================
    // DTO → ENTITY
    // =========================================================

    public Prescription toEntity(PrescriptionDTO dto) {

        if (dto == null) {
            return null;
        }

        Prescription prescription =
                new Prescription();

        prescription.setId(dto.getId());

        prescription.setPrescriptionCode(
                dto.getPrescriptionCode()
        );

        prescription.setPrescriptionDate(
                dto.getPrescriptionDate()
        );

        prescription.setDiagnosis(
                dto.getDiagnosis()
        );

        prescription.setInstructions(
                dto.getInstructions()
        );

        prescription.setStatus(
                dto.getStatus()
        );

        prescription.setDentistNotes(
                dto.getDentistNotes()
        );

        return prescription;
    }
}