package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.ReportDTO;
import com.dentaflow.backend.entity.Report;
import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.mapper.ReportMapper;
import com.dentaflow.backend.security.AccessControlService;
import com.dentaflow.backend.service.ReportService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService reportService;
    private final ReportMapper reportMapper;
    private final AccessControlService accessControlService;

    @Autowired
    public ReportController(
            ReportService reportService,
            ReportMapper reportMapper,
            AccessControlService accessControlService) {

        this.reportService = reportService;
        this.reportMapper = reportMapper;
        this.accessControlService = accessControlService;
    }

    public ReportController(
            ReportService reportService,
            ReportMapper reportMapper) {

        this(reportService, reportMapper, null);
    }

    private boolean isUnauthenticated() {
        return accessControlService != null && accessControlService.getCurrentUserId() == null && !accessControlService.isAdmin();
    }

    private boolean canReadReports() {
        if (accessControlService == null) return true;
        return accessControlService.isAdmin()
                || accessControlService.hasRole("STAFF")
                || accessControlService.hasRole("DOCTOR")
                || accessControlService.hasRole("DENTIST");
    }

    private boolean canManageReports() {
        if (accessControlService == null) return true;
        return accessControlService.isAdmin()
                || accessControlService.hasRole("STAFF")
                || accessControlService.hasRole("DOCTOR")
                || accessControlService.hasRole("DENTIST");
    }

    private boolean canDeleteReports() {
        if (accessControlService == null) return true;
        return accessControlService.isAdmin();
    }

    // =========================================================
    // CREATE REPORT
    // =========================================================

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'DOCTOR', 'DENTIST')")
    public ResponseEntity<?> createReport(
            @RequestBody ReportDTO dto) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canManageReports()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            if (dto == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Report data is required"));
            }

            Report report =
                    reportMapper.toEntity(dto);

            Report saved =
                    reportService.createReport(report);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(reportMapper.toDTO(saved));

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET ALL REPORTS
    // =========================================================

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'DOCTOR', 'DENTIST')")
    public ResponseEntity<?> getAllReports() {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canReadReports()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        List<ReportDTO> result =
                reportService
                        .getAllReports()
                        .stream()
                        .map(reportMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // GET REPORT BY ID
    // =========================================================

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'DOCTOR', 'DENTIST')")
    public ResponseEntity<?> getReportById(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canReadReports()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            Report report =
                    reportService.getReportById(id);

            return ResponseEntity.ok(
                    reportMapper.toDTO(report)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET REPORT BY CODE
    // =========================================================

    @GetMapping("/code/{reportCode}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'DOCTOR', 'DENTIST')")
    public ResponseEntity<?> getReportByCode(
            @PathVariable String reportCode) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canReadReports()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            Report report =
                    reportService.getReportByCode(
                            reportCode
                    );

            return ResponseEntity.ok(
                    reportMapper.toDTO(report)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET REPORTS BY TYPE
    // =========================================================

    @GetMapping("/type/{reportType}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'DOCTOR', 'DENTIST')")
    public ResponseEntity<?> getReportsByType(
            @PathVariable String reportType) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canReadReports()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            List<ReportDTO> result =
                    reportService
                            .getReportsByType(reportType)
                            .stream()
                            .map(reportMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET REPORTS BY STATUS
    // =========================================================

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'DOCTOR', 'DENTIST')")
    public ResponseEntity<?> getReportsByStatus(
            @PathVariable String status) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canReadReports()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            List<ReportDTO> result =
                    reportService
                            .getReportsByStatus(status)
                            .stream()
                            .map(reportMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET REPORTS BY GENERATED BY
    // =========================================================

    @GetMapping("/generated-by/{generatedBy}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'DOCTOR', 'DENTIST')")
    public ResponseEntity<?> getReportsByGeneratedBy(
            @PathVariable String generatedBy) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canReadReports()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        if (accessControlService != null && !accessControlService.isAdmin()
                && (accessControlService.hasRole("DOCTOR") || accessControlService.hasRole("DENTIST"))) {
            User currentUser = accessControlService.getCurrentUser();
            if (currentUser != null && generatedBy != null) {
                String email = currentUser.getEmail() != null ? currentUser.getEmail().trim().toLowerCase() : "";
                String name = (currentUser.getFirstName() != null ? currentUser.getFirstName() : "") +
                        (currentUser.getLastName() != null ? " " + currentUser.getLastName() : "");
                name = name.trim().toLowerCase();
                String target = generatedBy.trim().toLowerCase();
                if (!target.equals(email) && !target.equals(name) && !target.equals(String.valueOf(currentUser.getId()))) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: You can only view reports generated by yourself"));
                }
            }
        }

        try {

            List<ReportDTO> result =
                    reportService
                            .getReportsByGeneratedBy(
                                    generatedBy
                            )
                            .stream()
                            .map(reportMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET REPORTS BETWEEN DATES
    // =========================================================

    @GetMapping("/date-range")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'DOCTOR', 'DENTIST')")
    public ResponseEntity<?> getReportsBetweenDates(
            @RequestParam
            @DateTimeFormat(
                    iso = DateTimeFormat.ISO.DATE_TIME
            )
            LocalDateTime startDate,

            @RequestParam
            @DateTimeFormat(
                    iso = DateTimeFormat.ISO.DATE_TIME
            )
            LocalDateTime endDate) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canReadReports()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
                return ResponseEntity
                        .badRequest()
                        .body(Map.of("error", "Start date cannot be after end date"));
            }

            List<ReportDTO> result =
                    reportService
                            .getReportsBetweenDates(
                                    startDate,
                                    endDate
                            )
                            .stream()
                            .map(reportMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // SEARCH REPORTS BY TITLE
    // =========================================================

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'DOCTOR', 'DENTIST')")
    public ResponseEntity<?> searchReportsByTitle(
            @RequestParam(required = false)
            String title) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canReadReports()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            List<ReportDTO> result =
                    reportService
                            .searchReportsByTitle(title)
                            .stream()
                            .map(reportMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET REPORTS BY TYPE AND STATUS
    // =========================================================

    @GetMapping("/type/{reportType}/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'DOCTOR', 'DENTIST')")
    public ResponseEntity<?> getReportsByTypeAndStatus(
            @PathVariable String reportType,
            @PathVariable String status) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canReadReports()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            List<ReportDTO> result =
                    reportService
                            .getReportsByTypeAndStatus(
                                    reportType,
                                    status
                            )
                            .stream()
                            .map(reportMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // UPDATE REPORT
    // =========================================================

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'DOCTOR', 'DENTIST')")
    public ResponseEntity<?> updateReport(
            @PathVariable Long id,
            @RequestBody ReportDTO dto) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canManageReports()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            if (dto == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Report data is required"));
            }

            Report report =
                    reportMapper.toEntity(dto);

            Report updated =
                    reportService.updateReport(
                            id,
                            report
                    );

            return ResponseEntity.ok(
                    reportMapper.toDTO(updated)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // MARK AS COMPLETED
    // =========================================================

    @PutMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'DOCTOR', 'DENTIST')")
    public ResponseEntity<?> markAsCompleted(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canManageReports()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            Report report =
                    reportService.markAsCompleted(id);

            return ResponseEntity.ok(
                    reportMapper.toDTO(report)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // MARK AS FAILED
    // =========================================================

    @PutMapping("/{id}/failed")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'DOCTOR', 'DENTIST')")
    public ResponseEntity<?> markAsFailed(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canManageReports()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            Report report =
                    reportService.markAsFailed(id);

            return ResponseEntity.ok(
                    reportMapper.toDTO(report)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // DELETE REPORT
    // =========================================================

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteReport(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canDeleteReports()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Only administrators can delete reports"));
        }

        try {

            reportService.deleteReport(id);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Report deleted successfully"
            ));

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
}