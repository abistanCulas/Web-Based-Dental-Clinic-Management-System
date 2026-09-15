package com.dentaflow.reports.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class FeedbackRequest {

    @NotNull(message = "patientId is required")
    private Long patientId;

    @Size(max = 150, message = "patientName must be at most 150 characters")
    private String patientName;

    @NotBlank(message = "subject is required")
    @Size(max = 150, message = "subject must be at most 150 characters")
    private String subject;

    @NotBlank(message = "comments is required")
    @Size(max = 2000, message = "comments must be at most 2000 characters")
    private String comments;

    @NotNull(message = "rating is required")
    @Min(value = 1, message = "rating must be between 1 and 5")
    @Max(value = 5, message = "rating must be between 1 and 5")
    private Integer rating;
}
