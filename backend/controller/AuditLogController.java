package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.AuditLogDTO;
import com.dentaflow.backend.entity.AuditLog;
import com.dentaflow.backend.mapper.AuditLogMapper;
import com.dentaflow.backend.security.AccessControlService;
import com.dentaflow.backend.service.AuditLogService;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/audit-logs")
@PreAuthorize("hasRole('ADMIN')")
public class AuditLogController {

    private final AuditLogService auditLogService;
    private final AuditLogMapper auditLogMapper;
    private final AccessControlService accessControlService;

    public AuditLogController(
            AuditLogService auditLogService,
            AuditLogMapper auditLogMapper,
            AccessControlService accessControlService) {

        this.auditLogService = auditLogService;
        this.auditLogMapper = auditLogMapper;
        this.accessControlService = accessControlService;
    }

    // =========================================================
    // HELPER METHODS
    // =========================================================

    private ResponseEntity<?> checkAdminAccess() {
        if (accessControlService != null) {
            if (accessControlService.getCurrentUserId() == null && !accessControlService.isAdmin()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Authentication required");
            }
            if (!accessControlService.isAdmin()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("Access denied: Administrator role required");
            }
        }
        return null;
    }

    // =========================================================
    // CREATE AUDIT LOG
    // =========================================================

    @PostMapping
    public ResponseEntity<?> createAuditLog(
            @RequestBody AuditLogDTO dto) {

        try {
            ResponseEntity<?> authCheck = checkAdminAccess();
            if (authCheck != null) {
                return authCheck;
            }

            if (dto == null) {
                return ResponseEntity.badRequest()
                        .body("Audit log data is required");
            }

            AuditLog auditLog =
                    auditLogMapper.toEntity(dto);

            AuditLog saved =
                    auditLogService.createAuditLog(
                            auditLog
                    );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(
                            auditLogMapper.toDTO(saved)
                    );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET ALL AUDIT LOGS
    // =========================================================

    @GetMapping
    public ResponseEntity<?> getAllAuditLogs() {

        try {
            ResponseEntity<?> authCheck = checkAdminAccess();
            if (authCheck != null) {
                return authCheck;
            }

            List<AuditLogDTO> result =
                    auditLogService
                            .getAllAuditLogs()
                            .stream()
                            .map(auditLogMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET AUDIT LOG BY ID
    // =========================================================

    @GetMapping("/{id}")
    public ResponseEntity<?> getAuditLogById(
            @PathVariable Long id) {

        try {
            ResponseEntity<?> authCheck = checkAdminAccess();
            if (authCheck != null) {
                return authCheck;
            }

            AuditLog auditLog =
                    auditLogService
                            .getAuditLogById(id);

            return ResponseEntity.ok(
                    auditLogMapper.toDTO(auditLog)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET LOGS BY USER
    // =========================================================

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getLogsByUser(
            @PathVariable Long userId) {

        try {
            ResponseEntity<?> authCheck = checkAdminAccess();
            if (authCheck != null) {
                return authCheck;
            }

            List<AuditLogDTO> result =
                    auditLogService
                            .getLogsByUser(userId)
                            .stream()
                            .map(auditLogMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET LOGS BY ACTION
    // =========================================================

    @GetMapping("/action/{action}")
    public ResponseEntity<?> getLogsByAction(
            @PathVariable String action) {

        try {
            ResponseEntity<?> authCheck = checkAdminAccess();
            if (authCheck != null) {
                return authCheck;
            }

            List<AuditLogDTO> result =
                    auditLogService
                            .getLogsByAction(action)
                            .stream()
                            .map(auditLogMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET LOGS BY ENTITY TYPE
    // =========================================================

    @GetMapping("/entity-type/{entityType}")
    public ResponseEntity<?> getLogsByEntityType(
            @PathVariable String entityType) {

        try {
            ResponseEntity<?> authCheck = checkAdminAccess();
            if (authCheck != null) {
                return authCheck;
            }

            List<AuditLogDTO> result =
                    auditLogService
                            .getLogsByEntityType(entityType)
                            .stream()
                            .map(auditLogMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET LOGS FOR SPECIFIC ENTITY
    // =========================================================

    @GetMapping("/entity/{entityType}/{entityId}")
    public ResponseEntity<?> getLogsForEntity(
            @PathVariable String entityType,
            @PathVariable Long entityId) {

        try {
            ResponseEntity<?> authCheck = checkAdminAccess();
            if (authCheck != null) {
                return authCheck;
            }

            List<AuditLogDTO> result =
                    auditLogService
                            .getLogsForEntity(
                                    entityType,
                                    entityId
                            )
                            .stream()
                            .map(auditLogMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET LOGS BETWEEN DATES
    // =========================================================

    @GetMapping("/date-range")
    public ResponseEntity<?> getLogsBetweenDates(
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

        try {
            ResponseEntity<?> authCheck = checkAdminAccess();
            if (authCheck != null) {
                return authCheck;
            }

            List<AuditLogDTO> result =
                    auditLogService
                            .getLogsBetweenDates(
                                    startDate,
                                    endDate
                            )
                            .stream()
                            .map(auditLogMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET USER LOGS BETWEEN DATES
    // =========================================================

    @GetMapping("/user/{userId}/date-range")
    public ResponseEntity<?> getUserLogsBetweenDates(
            @PathVariable Long userId,

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

        try {
            ResponseEntity<?> authCheck = checkAdminAccess();
            if (authCheck != null) {
                return authCheck;
            }

            List<AuditLogDTO> result =
                    auditLogService
                            .getUserLogsBetweenDates(
                                    userId,
                                    startDate,
                                    endDate
                            )
                            .stream()
                            .map(auditLogMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // DELETE AUDIT LOG
    // =========================================================

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAuditLog(
            @PathVariable Long id) {

        try {
            ResponseEntity<?> authCheck = checkAdminAccess();
            if (authCheck != null) {
                return authCheck;
            }

            auditLogService.deleteAuditLog(id);

            return ResponseEntity.ok(
                    "Audit log deleted successfully"
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }
}