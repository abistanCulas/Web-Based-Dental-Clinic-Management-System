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
public class PatientDTO {

    private Long id;

    private String patientCode;

    private Long userId;

    private String firstName;

    private String lastName;

    private String nic;

    private LocalDate dateOfBirth;

    private String gender;

    private String bloodGroup;

    private String phone;

    private String email;

    private String address;

    private String city;

    private String emergencyContactName;

    private String emergencyContactPhone;

    private String allergies;

    private String medicalConditions;

    private String currentMedications;

    private String status;
}