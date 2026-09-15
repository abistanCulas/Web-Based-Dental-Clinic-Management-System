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
public class DentistDTO {

    private Long id;

    private String dentistCode;

    private Long userId;

    private String firstName;

    private String lastName;

    private String email;

    private String phone;

    private String specialization;

    private String qualification;

    private Integer experienceYears;

    private String status;

    private String bio;
}