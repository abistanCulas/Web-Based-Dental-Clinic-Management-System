package com.dentaflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicationAllergyCheckResult {

    private boolean hasWarning;

    private String riskLevel; // "HIGH", "MODERATE", "LOW", "NONE"

    private String allergen; // The patient's allergen that matched

    private String medicineName; // The prescribed medicine

    private String warningMessage; // Friendly warning text for Doctor

    private String clinicalAdvice; // Educational / clinical safety note

    private String category; // "DRUG", "MATERIAL", etc.
}
