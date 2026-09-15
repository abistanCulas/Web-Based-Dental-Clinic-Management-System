package com.dentaflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportDTO {

    private Long id;

    private String reportCode;

    private String reportType;

    private String title;

    private String description;

    private String generatedBy;

    private LocalDateTime generatedAt;

    private String status;

    private String reportData;
}