package com.dentaflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InquiryDTO {

    private Long id;

    private String inquiryCode;

    private Long userId;

    private String name;

    private String email;

    private String phone;

    private String inquiryType;

    private String subject;

    private String message;

    private String status;

    private String response;

    private String respondedBy;

    private java.time.LocalDateTime createdAt;
}