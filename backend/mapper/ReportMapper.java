package com.dentaflow.backend.mapper;

import com.dentaflow.backend.dto.ReportDTO;
import com.dentaflow.backend.entity.Report;
import org.springframework.stereotype.Component;

@Component
public class ReportMapper {

    // =========================================================
    // ENTITY → DTO
    // =========================================================

    public ReportDTO toDTO(Report report) {

        if (report == null) {
            return null;
        }

        return ReportDTO.builder()
                .id(report.getId())
                .reportCode(report.getReportCode())
                .reportType(report.getReportType())
                .title(report.getTitle())
                .description(report.getDescription())
                .generatedBy(report.getGeneratedBy())
                .generatedAt(report.getGeneratedAt())
                .status(report.getStatus())
                .reportData(report.getReportData())
                .build();
    }

    // =========================================================
    // DTO → ENTITY
    // =========================================================

    public Report toEntity(ReportDTO dto) {

        if (dto == null) {
            return null;
        }

        Report report = new Report();

        report.setId(dto.getId());
        report.setReportCode(dto.getReportCode());
        report.setReportType(dto.getReportType());
        report.setTitle(dto.getTitle());
        report.setDescription(dto.getDescription());
        report.setGeneratedBy(dto.getGeneratedBy());
        report.setGeneratedAt(dto.getGeneratedAt());
        report.setStatus(dto.getStatus());
        report.setReportData(dto.getReportData());

        return report;
    }
}