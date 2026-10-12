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
public class FeedbackDTO {

    private Long id;

    private String feedbackCode;

    private Long userId;

    private Long patientId;

    private String patientName;

    private String patientEmail;

    private Long dentistId;

    private String dentistName;

    private Long appointmentId;

    private Integer rating;

    private String comment;

    private String reviewText;

    private String category;

    private String status;

    private String sentiment;

    private String adminResponse;

    private String respondedBy;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    public String getReviewText() {
        return reviewText != null ? reviewText : comment;
    }

    public String getComment() {
        return comment != null ? comment : reviewText;
    }
}