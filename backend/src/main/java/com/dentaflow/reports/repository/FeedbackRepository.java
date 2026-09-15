package com.dentaflow.reports.repository;

import com.dentaflow.reports.entity.Feedback;
import com.dentaflow.reports.enums.FeedbackStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    List<Feedback> findByStatus(FeedbackStatus status);

    List<Feedback> findBySubmittedDateBetween(LocalDateTime start, LocalDateTime end);

    List<Feedback> findByPatientId(Long patientId);
}
