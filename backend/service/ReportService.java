package com.dentaflow.backend.service;

import com.dentaflow.backend.entity.Report;
import com.dentaflow.backend.repository.ReportRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class ReportService {

    private final ReportRepository reportRepository;

    public ReportService(
            ReportRepository reportRepository) {

        this.reportRepository = reportRepository;
    }

    // Create report
    public Report createReport(Report report) {

        if (report == null) {
            throw new RuntimeException(
                    "Report data is required"
            );
        }

        if (report.getReportType() == null ||
                report.getReportType().trim().isEmpty()) {

            throw new RuntimeException(
                    "Report type is required"
            );
        }

        if (report.getTitle() == null ||
                report.getTitle().trim().isEmpty()) {

            throw new RuntimeException(
                    "Report title is required"
            );
        }

        report.setReportCode(
                generateReportCode()
        );

        report.setReportType(
                report.getReportType()
                        .trim()
                        .toUpperCase()
        );

        report.setTitle(
                report.getTitle().trim()
        );

        if (report.getDescription() != null) {
            report.setDescription(
                    report.getDescription().trim()
            );
        }

        if (report.getGeneratedBy() != null) {
            report.setGeneratedBy(
                    report.getGeneratedBy().trim()
            );
        }

        if (report.getStatus() == null ||
                report.getStatus().trim().isEmpty()) {

            report.setStatus("GENERATED");

        } else {

            report.setStatus(
                    report.getStatus()
                            .trim()
                            .toUpperCase()
            );
        }

        if (report.getGeneratedAt() == null) {
            report.setGeneratedAt(
                    LocalDateTime.now()
            );
        }

        return reportRepository.save(report);
    }

    // Generate unique report code
    private String generateReportCode() {

        long nextNumber =
                reportRepository.count() + 1;

        String code;

        do {

            code = String.format(
                    "REP%05d",
                    nextNumber
            );

            nextNumber++;

        } while (
                reportRepository
                        .existsByReportCode(code)
        );

        return code;
    }

    // Get all reports
    @Transactional(readOnly = true)
    public List<Report> getAllReports() {

        return reportRepository.findAll();
    }

    // Get report by ID
    @Transactional(readOnly = true)
    public Report getReportById(Long id) {

        return reportRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Report not found with id: "
                                        + id
                        ));
    }

    // Get report by code
    @Transactional(readOnly = true)
    public Report getReportByCode(
            String reportCode) {

        if (reportCode == null ||
                reportCode.trim().isEmpty()) {

            throw new RuntimeException(
                    "Report code is required"
            );
        }

        return reportRepository
                .findByReportCode(
                        reportCode.trim().toUpperCase()
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "Report not found: "
                                        + reportCode
                        ));
    }

    // Get reports by type
    @Transactional(readOnly = true)
    public List<Report> getReportsByType(
            String reportType) {

        if (reportType == null ||
                reportType.trim().isEmpty()) {

            throw new RuntimeException(
                    "Report type is required"
            );
        }

        return reportRepository
                .findByReportTypeIgnoreCaseOrderByGeneratedAtDesc(
                        reportType.trim()
                );
    }

    // Get reports by status
    @Transactional(readOnly = true)
    public List<Report> getReportsByStatus(
            String status) {

        if (status == null ||
                status.trim().isEmpty()) {

            throw new RuntimeException(
                    "Status is required"
            );
        }

        return reportRepository
                .findByStatusIgnoreCaseOrderByGeneratedAtDesc(
                        status.trim()
                );
    }

    // Get reports by generated person
    @Transactional(readOnly = true)
    public List<Report> getReportsByGeneratedBy(
            String generatedBy) {

        if (generatedBy == null ||
                generatedBy.trim().isEmpty()) {

            throw new RuntimeException(
                    "Generated by is required"
            );
        }

        return reportRepository
                .findByGeneratedByContainingIgnoreCaseOrderByGeneratedAtDesc(
                        generatedBy.trim()
                );
    }

    // Get reports between dates
    @Transactional(readOnly = true)
    public List<Report> getReportsBetweenDates(
            LocalDateTime startDate,
            LocalDateTime endDate) {

        if (startDate == null ||
                endDate == null) {

            throw new RuntimeException(
                    "Start date and end date are required"
            );
        }

        if (startDate.isAfter(endDate)) {

            throw new RuntimeException(
                    "Start date cannot be after end date"
            );
        }

        return reportRepository
                .findByGeneratedAtBetweenOrderByGeneratedAtDesc(
                        startDate,
                        endDate
                );
    }

    // Search reports by title
    @Transactional(readOnly = true)
    public List<Report> searchReportsByTitle(
            String title) {

        if (title == null ||
                title.trim().isEmpty()) {

            return reportRepository.findAll();
        }

        return reportRepository
                .findByTitleContainingIgnoreCaseOrderByGeneratedAtDesc(
                        title.trim()
                );
    }

    // Get reports by type and status
    @Transactional(readOnly = true)
    public List<Report> getReportsByTypeAndStatus(
            String reportType,
            String status) {

        if (reportType == null ||
                reportType.trim().isEmpty()) {

            throw new RuntimeException(
                    "Report type is required"
            );
        }

        if (status == null ||
                status.trim().isEmpty()) {

            throw new RuntimeException(
                    "Status is required"
            );
        }

        return reportRepository
                .findByReportTypeIgnoreCaseAndStatusIgnoreCaseOrderByGeneratedAtDesc(
                        reportType.trim(),
                        status.trim()
                );
    }

    // Update report
    public Report updateReport(
            Long id,
            Report updatedReport) {

        Report existing =
                getReportById(id);

        if (updatedReport == null) {
            throw new RuntimeException(
                    "Report data is required"
            );
        }

        if (updatedReport.getReportType() != null &&
                !updatedReport.getReportType()
                        .trim()
                        .isEmpty()) {

            existing.setReportType(
                    updatedReport.getReportType()
                            .trim()
                            .toUpperCase()
            );
        }

        if (updatedReport.getTitle() != null &&
                !updatedReport.getTitle()
                        .trim()
                        .isEmpty()) {

            existing.setTitle(
                    updatedReport.getTitle()
                            .trim()
            );
        }

        if (updatedReport.getDescription() != null) {
            existing.setDescription(
                    updatedReport.getDescription()
                            .trim()
            );
        }

        if (updatedReport.getGeneratedBy() != null) {
            existing.setGeneratedBy(
                    updatedReport.getGeneratedBy()
                            .trim()
            );
        }

        if (updatedReport.getStatus() != null &&
                !updatedReport.getStatus()
                        .trim()
                        .isEmpty()) {

            existing.setStatus(
                    updatedReport.getStatus()
                            .trim()
                            .toUpperCase()
            );
        }

        if (updatedReport.getReportData() != null) {
            existing.setReportData(
                    updatedReport.getReportData()
            );
        }

        if (updatedReport.getGeneratedAt() != null) {
            existing.setGeneratedAt(
                    updatedReport.getGeneratedAt()
            );
        }

        return reportRepository.save(existing);
    }

    // Mark report as completed
    public Report markAsCompleted(Long id) {

        Report report =
                getReportById(id);

        report.setStatus("COMPLETED");

        return reportRepository.save(report);
    }

    // Mark report as failed
    public Report markAsFailed(Long id) {

        Report report =
                getReportById(id);

        report.setStatus("FAILED");

        return reportRepository.save(report);
    }

    // Delete report
    public void deleteReport(Long id) {

        Report report =
                getReportById(id);

        reportRepository.delete(report);
    }
}