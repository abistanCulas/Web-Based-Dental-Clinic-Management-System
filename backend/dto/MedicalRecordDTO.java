package com.dentaflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicalRecordDTO {

    private Long id;

    private Long patientId;

    private Long dentistId;

    private LocalDate recordDate;

    private String recordType;

    private String diagnosis;

    private String symptoms;

    private String clinicalNotes;

    private String allergies;

    private String medicalConditions;

    private String attachments;

    private String status;
}