package com.dentaflow.backend.mapper;

import com.dentaflow.backend.dto.AuditLogDTO;
import com.dentaflow.backend.entity.AuditLog;
import org.springframework.stereotype.Component;

@Component
public class AuditLogMapper {

    // =========================================================
    // ENTITY → DTO
    // =========================================================

    public AuditLogDTO toDTO(AuditLog auditLog) {

        if (auditLog == null) {
            return null;
        }

        return AuditLogDTO.builder()
                .id(auditLog.getId())
                .userId(
                        auditLog.getUser() != null
                                ? auditLog.getUser().getId()
                                : null
                )
                .action(auditLog.getAction())
                .entityType(auditLog.getEntityType())
                .entityId(auditLog.getEntityId())
                .description(auditLog.getDescription())
                .ipAddress(auditLog.getIpAddress())
                .userAgent(auditLog.getUserAgent())
                .actionTime(auditLog.getActionTime())
                .build();
    }

    // =========================================================
    // DTO → ENTITY
    // =========================================================

    public AuditLog toEntity(AuditLogDTO dto) {

        if (dto == null) {
            return null;
        }

        AuditLog auditLog = new AuditLog();

        auditLog.setId(dto.getId());
        auditLog.setAction(dto.getAction());
        auditLog.setEntityType(dto.getEntityType());
        auditLog.setEntityId(dto.getEntityId());
        auditLog.setDescription(dto.getDescription());
        auditLog.setIpAddress(dto.getIpAddress());
        auditLog.setUserAgent(dto.getUserAgent());
        auditLog.setActionTime(dto.getActionTime());

        return auditLog;
    }
}