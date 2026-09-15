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
public class PrescriptionDTO {

    private Long id;

    private String prescriptionCode;

    private Long patientId;

    private Long dentistId;

    private Long treatmentId;

    private LocalDate prescriptionDate;

    private String diagnosis;

    private String instructions;

    private String status;

    private String dentistNotes;
}