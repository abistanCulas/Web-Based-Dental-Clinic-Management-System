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
public class NotificationDTO {

    private Long id;

    private String notificationCode;

    private Long userId;

    private String title;

    private String message;

    private String type;

    private String status;

    private Boolean emailSent;

    private Boolean pushSent;

    private LocalDateTime readAt;

    private String referenceType;

    private Long referenceId;
}