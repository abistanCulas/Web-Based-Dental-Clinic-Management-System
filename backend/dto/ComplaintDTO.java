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
public class ComplaintDTO {

    private Long id;

    private String complaintCode;

    private Long userId;

    private Long patientId;

    private String subject;

    private String description;

    private String priority;

    private String status;

    private String resolution;

    private String handledBy;
}