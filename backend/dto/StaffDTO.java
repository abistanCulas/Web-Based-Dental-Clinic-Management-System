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
public class StaffDTO {

    private Long id;

    private String staffCode;

    private Long userId;

    private String firstName;

    private String lastName;

    private String email;

    private String phone;

    private String role;

    private String status;
}