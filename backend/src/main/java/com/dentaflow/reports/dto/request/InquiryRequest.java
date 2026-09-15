package com.dentaflow.reports.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class InquiryRequest {

    @NotNull(message = "patientId is required")
    private Long patientId;

    @Size(max = 150, message = "patientName must be at most 150 characters")
    private String patientName;

    @Email(message = "contactEmail must be a valid email address")
    private String contactEmail;

    @NotBlank(message = "subject is required")
    @Size(max = 150, message = "subject must be at most 150 characters")
    private String subject;

    @NotBlank(message = "message is required")
    @Size(max = 2000, message = "message must be at most 2000 characters")
    private String message;
}
