package com.dentaflow.reports.dto.request;

import com.dentaflow.reports.enums.FeedbackStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class FeedbackResponseRequest {

    @NotNull(message = "status is required")
    private FeedbackStatus status;

    @NotBlank(message = "staffResponse is required")
    @Size(max = 2000, message = "staffResponse must be at most 2000 characters")
    private String staffResponse;

    @NotBlank(message = "respondedBy is required")
    private String respondedBy;
}
