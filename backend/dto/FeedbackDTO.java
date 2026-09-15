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
public class FeedbackDTO {

    private Long id;

    private String feedbackCode;

    private Long userId;

    private Long patientId;

    private Long appointmentId;

    private Integer rating;

    private String comment;

    private String category;

    private String status;

    private String sentiment;

    private String adminResponse;

    private String respondedBy;
}