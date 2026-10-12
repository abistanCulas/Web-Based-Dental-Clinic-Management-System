package com.dentaflow.backend.mapper;

import com.dentaflow.backend.dto.FeedbackDTO;
import com.dentaflow.backend.entity.Feedback;
import org.springframework.stereotype.Component;

@Component
public class FeedbackMapper {

    // =========================================================
    // ENTITY → DTO
    // =========================================================

    public FeedbackDTO toDTO(Feedback feedback) {

        if (feedback == null) {
            return null;
        }

        Long patientId = null;
        String patientName = null;
        String patientEmail = null;
        if (feedback.getPatient() != null) {
            patientId = feedback.getPatient().getId();
            patientName = (feedback.getPatient().getFirstName() + " "
                    + (feedback.getPatient().getLastName() != null ? feedback.getPatient().getLastName() : "")).trim();
            patientEmail = feedback.getPatient().getEmail();
        } else if (feedback.getUser() != null) {
            patientName = (feedback.getUser().getFirstName() + " "
                    + (feedback.getUser().getLastName() != null ? feedback.getUser().getLastName() : "")).trim();
            patientEmail = feedback.getUser().getEmail();
        }

        Long dentistId = null;
        String dentistName = null;
        if (feedback.getDentist() != null) {
            dentistId = feedback.getDentist().getId();
            dentistName = ("Dr. " + feedback.getDentist().getFirstName() + " "
                    + (feedback.getDentist().getLastName() != null ? feedback.getDentist().getLastName() : "")).trim();
        } else if (feedback.getAppointment() != null && feedback.getAppointment().getDentist() != null) {
            dentistId = feedback.getAppointment().getDentist().getId();
            dentistName = ("Dr. " + feedback.getAppointment().getDentist().getFirstName() + " "
                    + (feedback.getAppointment().getDentist().getLastName() != null ? feedback.getAppointment().getDentist().getLastName() : "")).trim();
        }

        return FeedbackDTO.builder()
                .id(feedback.getId())
                .feedbackCode(feedback.getFeedbackCode())

                .userId(
                        feedback.getUser() != null
                                ? feedback.getUser().getId()
                                : null
                )

                .patientId(patientId)
                .patientName(patientName)
                .patientEmail(patientEmail)

                .dentistId(dentistId)
                .dentistName(dentistName)

                .appointmentId(
                        feedback.getAppointment() != null
                                ? feedback.getAppointment().getId()
                                : null
                )

                .rating(feedback.getRating())
                .comment(feedback.getComment())
                .reviewText(feedback.getComment())
                .category(feedback.getCategory())
                .status(feedback.getStatus())
                .sentiment(feedback.getSentiment())
                .adminResponse(feedback.getAdminResponse())
                .respondedBy(feedback.getRespondedBy())
                .createdAt(feedback.getCreatedAt())
                .updatedAt(feedback.getUpdatedAt())
                .build();
    }

    // =========================================================
    // DTO → ENTITY
    // =========================================================

    public Feedback toEntity(FeedbackDTO dto) {

        if (dto == null) {
            return null;
        }

        Feedback feedback = new Feedback();

        feedback.setId(dto.getId());
        feedback.setFeedbackCode(dto.getFeedbackCode());
        feedback.setRating(dto.getRating());
        feedback.setComment(dto.getComment() != null ? dto.getComment() : dto.getReviewText());
        feedback.setCategory(dto.getCategory());
        feedback.setStatus(dto.getStatus());
        feedback.setSentiment(dto.getSentiment());
        feedback.setAdminResponse(dto.getAdminResponse());
        feedback.setRespondedBy(dto.getRespondedBy());

        return feedback;
    }
}