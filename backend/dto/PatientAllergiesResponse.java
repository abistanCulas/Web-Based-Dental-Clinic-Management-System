package com.dentaflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientAllergiesResponse {

    private Long patientId;

    private String patientName;

    private String patientCode;

    private boolean hasAllergies;

    private int allergyCount;

    @Builder.Default
    private List<PatientAllergyDTO> allergies = new ArrayList<>();

    private String rawAllergies;

    private String medicalConditions;

    private String currentMedications;
}
