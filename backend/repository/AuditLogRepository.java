package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    // Get all audit logs of a user
    List<AuditLog> findByUserIdOrderByActionTimeDesc(Long userId);

    // Find logs by action
    List<AuditLog> findByActionIgnoreCaseOrderByActionTimeDesc(
            String action
    );

    // Find logs by entity type
    List<AuditLog> findByEntityTypeIgnoreCaseOrderByActionTimeDesc(
            String entityType
    );

    // Find logs for a specific entity
    List<AuditLog> findByEntityTypeIgnoreCaseAndEntityIdOrderByActionTimeDesc(
            String entityType,
            Long entityId
    );

    // Get logs between two dates
    List<AuditLog> findByActionTimeBetweenOrderByActionTimeDesc(
            LocalDateTime startDate,
            LocalDateTime endDate
    );

    // Get logs of a user between two dates
    List<AuditLog> findByUserIdAndActionTimeBetweenOrderByActionTimeDesc(
            Long userId,
            LocalDateTime startDate,
            LocalDateTime endDate
    );

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE AuditLog a SET a.user = null WHERE a.user.id = :userId")
    void unlinkUser(@org.springframework.data.repository.query.Param("userId") Long userId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM AuditLog a WHERE a.user.id = :userId")
    void deleteByUserId(@org.springframework.data.repository.query.Param("userId") Long userId);
}