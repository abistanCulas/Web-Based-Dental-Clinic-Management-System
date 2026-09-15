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
public class AuditLogDTO {

    private Long id;

    private Long userId;

    private String action;

    private String entityType;

    private Long entityId;

    private String description;

    private String ipAddress;

    private String userAgent;

    private LocalDateTime actionTime;
}