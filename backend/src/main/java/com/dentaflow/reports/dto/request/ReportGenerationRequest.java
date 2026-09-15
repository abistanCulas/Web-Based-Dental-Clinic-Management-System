package com.dentaflow.reports.dto.request;

import com.dentaflow.reports.enums.ReportType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class ReportGenerationRequest {

    @NotNull(message = "reportType is required")
    private ReportType reportType;

    @NotNull(message = "startDate is required")
    private LocalDate startDate;

    @NotNull(message = "endDate is required")
    private LocalDate endDate;

    @NotBlank(message = "generatedBy is required")
    private String generatedBy;
}
