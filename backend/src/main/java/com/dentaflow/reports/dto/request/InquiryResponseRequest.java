package com.dentaflow.reports.dto.request;

import com.dentaflow.reports.enums.InquiryStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class InquiryResponseRequest {

    @NotNull(message = "status is required")
    private InquiryStatus status;

    @NotBlank(message = "response is required")
    @Size(max = 2000, message = "response must be at most 2000 characters")
    private String response;

    @NotBlank(message = "respondedBy is required")
    private String respondedBy;
}
