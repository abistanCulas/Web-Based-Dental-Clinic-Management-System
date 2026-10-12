package com.dentaflow.backend.service;

import com.dentaflow.backend.entity.AuditLog;
import com.dentaflow.backend.repository.AuditLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(
            AuditLogRepository auditLogRepository) {

        this.auditLogRepository = auditLogRepository;
    }

    // =========================================================
    // CREATE AUDIT LOG
    // =========================================================

    public AuditLog createAuditLog(
            AuditLog auditLog) {

        if (auditLog == null) {
            throw new RuntimeException(
                    "Audit log data is required"
            );
        }

        if (auditLog.getAction() == null ||
                auditLog.getAction()
                        .trim()
                        .isEmpty()) {

            throw new RuntimeException(
                    "Action is required"
            );
        }

        if (auditLog.getEntityType() == null ||
                auditLog.getEntityType()
                        .trim()
                        .isEmpty()) {

            throw new RuntimeException(
                    "Entity type is required"
            );
        }

        auditLog.setAction(
                auditLog.getAction()
                        .trim()
        );

        auditLog.setEntityType(
                auditLog.getEntityType()
                        .trim()
        );

        if (auditLog.getDescription() != null) {
            auditLog.setDescription(
                    auditLog.getDescription()
                            .trim()
            );
        }

        if (auditLog.getIpAddress() != null) {
            auditLog.setIpAddress(
                    auditLog.getIpAddress()
                            .trim()
            );
        }

        if (auditLog.getUserAgent() != null) {
            auditLog.setUserAgent(
                    auditLog.getUserAgent()
                            .trim()
            );
        }

        if (auditLog.getActionTime() == null) {
            auditLog.setActionTime(
                    LocalDateTime.now()
            );
        }

        return auditLogRepository.save(
                auditLog
        );
    }

    // =========================================================
    // GET ALL AUDIT LOGS
    // =========================================================

    @Transactional(readOnly = true)
    public List<AuditLog> getAllAuditLogs() {

        return auditLogRepository.findAll();
    }

    // =========================================================
    // GET AUDIT LOG BY ID
    // =========================================================

    @Transactional(readOnly = true)
    public AuditLog getAuditLogById(Long id) {

        return auditLogRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Audit log not found with id: "
                                        + id
                        ));
    }

    // =========================================================
    // GET LOGS BY USER
    // =========================================================

    @Transactional(readOnly = true)
    public List<AuditLog> getLogsByUser(
            Long userId) {

        return auditLogRepository
                .findByUserIdOrderByActionTimeDesc(
                        userId
                );
    }

    // =========================================================
    // GET LOGS BY ACTION
    // =========================================================

    @Transactional(readOnly = true)
    public List<AuditLog> getLogsByAction(
            String action) {

        if (action == null ||
                action.trim().isEmpty()) {

            throw new RuntimeException(
                    "Action is required"
            );
        }

        return auditLogRepository
                .findByActionIgnoreCaseOrderByActionTimeDesc(
                        action.trim()
                );
    }

    // =========================================================
    // GET LOGS BY ENTITY TYPE
    // =========================================================

    @Transactional(readOnly = true)
    public List<AuditLog> getLogsByEntityType(
            String entityType) {

        if (entityType == null ||
                entityType.trim().isEmpty()) {

            throw new RuntimeException(
                    "Entity type is required"
            );
        }

        return auditLogRepository
                .findByEntityTypeIgnoreCaseOrderByActionTimeDesc(
                        entityType.trim()
                );
    }

    // =========================================================
    // GET LOGS FOR SPECIFIC ENTITY
    // =========================================================

    @Transactional(readOnly = true)
    public List<AuditLog> getLogsForEntity(
            String entityType,
            Long entityId) {

        if (entityType == null ||
                entityType.trim().isEmpty()) {

            throw new RuntimeException(
                    "Entity type is required"
            );
        }

        if (entityId == null) {
            throw new RuntimeException(
                    "Entity ID is required"
            );
        }

        return auditLogRepository
                .findByEntityTypeIgnoreCaseAndEntityIdOrderByActionTimeDesc(
                        entityType.trim(),
                        entityId
                );
    }

    // =========================================================
    // GET LOGS BETWEEN DATES
    // =========================================================

    @Transactional(readOnly = true)
    public List<AuditLog> getLogsBetweenDates(
            LocalDateTime startDate,
            LocalDateTime endDate) {

        validateDateRange(
                startDate,
                endDate
        );

        return auditLogRepository
                .findByActionTimeBetweenOrderByActionTimeDesc(
                        startDate,
                        endDate
                );
    }

    // =========================================================
    // GET USER LOGS BETWEEN DATES
    // =========================================================

    @Transactional(readOnly = true)
    public List<AuditLog> getUserLogsBetweenDates(
            Long userId,
            LocalDateTime startDate,
            LocalDateTime endDate) {

        if (userId == null) {
            throw new RuntimeException(
                    "User ID is required"
            );
        }

        validateDateRange(
                startDate,
                endDate
        );

        return auditLogRepository
                .findByUserIdAndActionTimeBetweenOrderByActionTimeDesc(
                        userId,
                        startDate,
                        endDate
                );
    }

    // =========================================================
    // DELETE AUDIT LOG
    // =========================================================

    public void deleteAuditLog(Long id) {

        AuditLog auditLog =
                getAuditLogById(id);

        auditLogRepository.delete(
                auditLog
        );
    }

    // =========================================================
    // VALIDATE DATE RANGE
    // =========================================================

    private void validateDateRange(
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
    }
}