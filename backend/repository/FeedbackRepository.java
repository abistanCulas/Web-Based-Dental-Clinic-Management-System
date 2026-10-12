package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    // Find feedback by unique feedback code
    Optional<Feedback> findByFeedbackCode(String feedbackCode);

    // Check feedback code
    boolean existsByFeedbackCode(String feedbackCode);

    // Find feedback submitted by a user
    List<Feedback> findByUserIdOrderByCreatedAtDesc(Long userId);

    // Find feedback submitted by a patient
    List<Feedback> findByPatientIdOrderByCreatedAtDesc(Long patientId);

    // Find feedback related to an appointment
    List<Feedback> findByAppointmentIdOrderByCreatedAtDesc(
            Long appointmentId
    );

    // Find feedback by rating
    List<Feedback> findByRatingOrderByCreatedAtDesc(
            Integer rating
    );

    // Find feedback by category
    List<Feedback> findByCategoryIgnoreCaseOrderByCreatedAtDesc(
            String category
    );

    // Find feedback by status
    List<Feedback> findByStatusIgnoreCaseOrderByCreatedAtDesc(
            String status
    );

    // Find feedback by AI sentiment
    List<Feedback> findBySentimentIgnoreCaseOrderByCreatedAtDesc(
            String sentiment
    );

    // Find feedback that requires admin review
    List<Feedback> findByStatusInOrderByCreatedAtDesc(
            List<String> statuses
    );

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Feedback f SET f.user = null WHERE f.user.id = :userId")
    void unlinkUser(@org.springframework.data.repository.query.Param("userId") Long userId);
}