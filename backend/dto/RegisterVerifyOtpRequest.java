package com.dentaflow.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterVerifyOtpRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Verification code is required")
    private String otp;

    // Optional fields to complete registration immediately upon verification
    private String firstName;
    private String lastName;
    private String phone;
    private String password;
    private String role;
}
