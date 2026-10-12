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
public class MessageDTO {

    private Long id;

    private Long senderId;
    private String senderName;
    private String senderRole;
    private String senderEmail;

    private Long receiverId;
    private String receiverName;
    private String receiverRole;
    private String receiverEmail;

    private Long patientId;
    private String patientName;
    private String patientCode;

    private Long appointmentId;
    private String appointmentCode;

    private String subject;
    private String content;
    private String priority;
    private String status;

    private LocalDateTime sentAt;
    private LocalDateTime readAt;
    private LocalDateTime createdAt;
}
