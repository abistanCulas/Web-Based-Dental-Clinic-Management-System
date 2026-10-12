package com.dentaflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TreatmentDTO {

    private Long id;

    private String treatmentCode;

    private Long patientId;

    private Long dentistId;

    private Long appointmentId;

    private Long treatmentPlanId;

    private String treatmentPlanName;

    private LocalDate treatmentDate;

    private LocalDate followUpDate;

    private String treatmentType;

    private String diagnosis;

    private String description;

    private String toothDetails;

    private BigDecimal estimatedCost;

    private BigDecimal actualCost;

    private String status;

    private String dentistNotes;
}