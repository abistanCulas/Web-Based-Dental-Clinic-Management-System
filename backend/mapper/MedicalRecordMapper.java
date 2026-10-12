package com.dentaflow.backend.mapper;

import com.dentaflow.backend.dto.MedicalRecordDTO;
import com.dentaflow.backend.entity.MedicalRecord;
import org.springframework.stereotype.Component;

@Component
public class MedicalRecordMapper {

    // =========================================================
    // ENTITY → DTO
    // =========================================================

    public MedicalRecordDTO toDTO(
            MedicalRecord medicalRecord) {

        if (medicalRecord == null) {
            return null;
        }

        return MedicalRecordDTO.builder()
                .id(medicalRecord.getId())

                .patientId(
                        medicalRecord.getPatient() != null
                                ? medicalRecord.getPatient().getId()
                                : null
                )

                .dentistId(
                        medicalRecord.getDentist() != null
                                ? medicalRecord.getDentist().getId()
                                : null
                )

                .recordDate(
                        medicalRecord.getRecordDate()
                )

                .recordType(
                        medicalRecord.getRecordType()
                )

                .diagnosis(
                        medicalRecord.getDiagnosis()
                )

                .symptoms(
                        medicalRecord.getSymptoms()
                )

                .clinicalNotes(
                        medicalRecord.getClinicalNotes()
                )

                .allergies(
                        medicalRecord.getAllergies()
                )

                .medicalConditions(
                        medicalRecord.getMedicalConditions()
                )

                .attachments(
                        medicalRecord.getAttachments()
                )

                .status(
                        medicalRecord.getStatus()
                )

                .build();
    }

    // =========================================================
    // DTO → ENTITY
    //
    // Patient and Dentist are NOT set here.
    // They are resolved by MedicalRecordService using
    // patientId and dentistId.
    // =========================================================

    public MedicalRecord toEntity(
            MedicalRecordDTO dto) {

        if (dto == null) {
            return null;
        }

        MedicalRecord medicalRecord =
                new MedicalRecord();

        medicalRecord.setId(
                dto.getId()
        );

        medicalRecord.setRecordDate(
                dto.getRecordDate()
        );

        medicalRecord.setRecordType(
                dto.getRecordType()
        );

        medicalRecord.setDiagnosis(
                dto.getDiagnosis()
        );

        medicalRecord.setSymptoms(
                dto.getSymptoms()
        );

        medicalRecord.setClinicalNotes(
                dto.getClinicalNotes()
        );

        medicalRecord.setAllergies(
                dto.getAllergies()
        );

        medicalRecord.setMedicalConditions(
                dto.getMedicalConditions()
        );

        medicalRecord.setAttachments(
                dto.getAttachments()
        );

        medicalRecord.setStatus(
                dto.getStatus()
        );

        return medicalRecord;
    }
}