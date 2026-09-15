package com.dentaflow.reports.service;

import com.dentaflow.reports.dto.request.ReportGenerationRequest;
import com.dentaflow.reports.entity.Feedback;
import com.dentaflow.reports.entity.Inquiry;
import com.dentaflow.reports.entity.Report;
import com.dentaflow.reports.enums.InquiryStatus;
import com.dentaflow.reports.enums.ReportType;
import com.dentaflow.reports.exception.InvalidReportCriteriaException;
import com.dentaflow.reports.exception.RecordSaveException;
import com.dentaflow.reports.exception.ResourceNotFoundException;
import com.dentaflow.reports.repository.FeedbackRepository;
import com.dentaflow.reports.repository.InquiryRepository;
import com.dentaflow.reports.repository.ReportRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {

    private static final long MAX_RANGE_DAYS = 366;

    private final ReportRepository reportRepository;
    private final FeedbackRepository feedbackRepository;
    private final InquiryRepository inquiryRepository;
    private final ObjectMapper objectMapper;

    public List<Report> getAll() {
        return reportRepository.findAll();
    }

    public Report getById(Long id) {
        return reportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report not found with id " + id));
    }

    @Transactional
    public void delete(Long id) {
        reportRepository.delete(getById(id));
    }

    @Transactional
    public Report generate(ReportGenerationRequest request) {
        validateCriteria(request);

        LocalDateTime start = request.getStartDate().atStartOfDay();
        LocalDateTime end = request.getEndDate().atTime(23, 59, 59);

        Map<String, Object> metrics;
        int totalRecords;
        String summary;

        switch (request.getReportType()) {
            case FEEDBACK_SUMMARY -> {
                List<Feedback> records = feedbackRepository.findBySubmittedDateBetween(start, end);
                metrics = buildFeedbackMetrics(records);
                totalRecords = records.size();
                summary = totalRecords + " feedback entries, average rating "
                        + metrics.get("averageRating");
            }
            case INQUIRY_SUMMARY -> {
                List<Inquiry> records = inquiryRepository.findBySubmittedDateBetween(start, end);
                metrics = buildInquiryMetrics(records);
                totalRecords = records.size();
                summary = totalRecords + " inquiries received, "
                        + metrics.get("resolved") + " resolved";
            }
            case REVENUE_REPORT, APPOINTMENT_REPORT -> {
                // Billing and Appointment modules are owned by other team members.
                // This module exposes the report slot and persists the request;
                // wire this up to their repositories once those modules are merged.
                metrics = Map.of(
                        "status", "pending_integration",
                        "note", "Requires data from the Billing/Appointment module"
                );
                totalRecords = 0;
                summary = "Awaiting integration with the "
                        + (request.getReportType() == ReportType.REVENUE_REPORT ? "billing" : "appointment")
                        + " module";
            }
            default -> throw new InvalidReportCriteriaException("Unsupported report type");
        }

        Report report = Report.builder()
                .reportType(request.getReportType())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .generatedBy(request.getGeneratedBy())
                .totalRecords(totalRecords)
                .summary(summary)
                .dataJson(toJson(metrics))
                .build();

        try {
            return reportRepository.save(report);
        } catch (Exception ex) {
            throw new RecordSaveException("Failed to save report", ex);
        }
    }

    // Extension 5a: invalid date range or missing report criteria.
    private void validateCriteria(ReportGenerationRequest request) {
        LocalDate start = request.getStartDate();
        LocalDate end = request.getEndDate();

        if (start == null || end == null) {
            throw new InvalidReportCriteriaException("Start date and end date are required.");
        }
        if (end.isBefore(start)) {
            throw new InvalidReportCriteriaException("End date cannot be before start date.");
        }
        if (start.isAfter(LocalDate.now())) {
            throw new InvalidReportCriteriaException("Start date cannot be in the future.");
        }
        if (ChronoUnit.DAYS.between(start, end) > MAX_RANGE_DAYS) {
            throw new InvalidReportCriteriaException("Date range cannot exceed " + MAX_RANGE_DAYS + " days.");
        }
    }

    private Map<String, Object> buildFeedbackMetrics(List<Feedback> records) {
        Map<String, Object> metrics = new LinkedHashMap<>();
        double average = records.stream()
                .mapToInt(Feedback::getRating)
                .average()
                .orElse(0.0);

        Map<Integer, Long> byRating = records.stream()
                .collect(Collectors.groupingBy(Feedback::getRating, Collectors.counting()));

        metrics.put("totalFeedback", records.size());
        metrics.put("averageRating", Math.round(average * 100.0) / 100.0);
        metrics.put("ratingBreakdown", byRating);
        metrics.put("resolvedCount", records.stream()
                .filter(f -> f.getResolvedDate() != null)
                .count());
        return metrics;
    }

    private Map<String, Object> buildInquiryMetrics(List<Inquiry> records) {
        Map<String, Object> metrics = new LinkedHashMap<>();
        Map<InquiryStatus, Long> byStatus = records.stream()
                .collect(Collectors.groupingBy(Inquiry::getStatus, Collectors.counting()));

        metrics.put("totalInquiries", records.size());
        metrics.put("statusBreakdown", byStatus);
        metrics.put("pending", byStatus.getOrDefault(InquiryStatus.PENDING, 0L));
        metrics.put("inProgress", byStatus.getOrDefault(InquiryStatus.IN_PROGRESS, 0L));
        metrics.put("resolved", byStatus.getOrDefault(InquiryStatus.RESOLVED, 0L));
        return metrics;
    }

    private String toJson(Map<String, Object> metrics) {
        try {
            return objectMapper.writeValueAsString(metrics);
        } catch (Exception ex) {
            throw new RecordSaveException("Failed to serialize report data", ex);
        }
    }
}
