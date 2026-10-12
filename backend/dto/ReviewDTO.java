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
public class ReviewDTO {

    private Long id;

    private Long patientId;

    private String patientName;

    private String patientEmail;

    private Long dentistId;

    private String dentistName;

    private Integer rating;

    private String comment;

    private String status;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
