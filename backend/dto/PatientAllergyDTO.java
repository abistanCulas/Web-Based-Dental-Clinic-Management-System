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
public class PatientAllergyDTO {

    private String name;

    private String category; // e.g. "DRUG", "MATERIAL", "ENVIRONMENTAL", "FOOD", "OTHER"

    private String severity; // e.g. "HIGH", "MODERATE", "MILD", "UNKNOWN"

    private String reaction; // e.g. "Anaphylaxis", "Urticaria / Hives", "Contact dermatitis"

    private String notes;
}
