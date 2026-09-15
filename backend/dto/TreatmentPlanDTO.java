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
public class TreatmentPlanDTO {

    private Long id;

    private String planCode;

    private Long patientId;

    private Long dentistId;

    private String planName;

    private String description;

    private LocalDate startDate;

    private LocalDate expectedEndDate;

    private BigDecimal estimatedTotalCost;

    private String status;

    private String dentistNotes;
}