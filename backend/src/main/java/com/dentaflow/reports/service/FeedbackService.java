package com.dentaflow.reports.service;

import com.dentaflow.reports.dto.request.FeedbackRequest;
import com.dentaflow.reports.dto.request.FeedbackResponseRequest;
import com.dentaflow.reports.entity.Feedback;
import com.dentaflow.reports.enums.FeedbackStatus;
import com.dentaflow.reports.exception.RecordSaveException;
import com.dentaflow.reports.exception.ResourceNotFoundException;
import com.dentaflow.reports.repository.FeedbackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;

    public List<Feedback> getAll(FeedbackStatus status) {
        return status == null ? feedbackRepository.findAll() : feedbackRepository.findByStatus(status);
    }

    public Feedback getById(Long id) {
        return feedbackRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback not found with id " + id));
    }

    @Transactional
    public Feedback submit(FeedbackRequest request) {
        Feedback feedback = Feedback.builder()
                .patientId(request.getPatientId())
                .patientName(request.getPatientName())
                .subject(request.getSubject())
                .comments(request.getComments())
                .rating(request.getRating())
                .status(FeedbackStatus.SUBMITTED)
                .build();
        return save(feedback);
    }

    // Staff reviews the feedback and records a response/status update.
    @Transactional
    public Feedback respond(Long id, FeedbackResponseRequest request) {
        Feedback feedback = getById(id);
        feedback.setStatus(request.getStatus());
        feedback.setStaffResponse(request.getStaffResponse());
        feedback.setRespondedBy(request.getRespondedBy());
        if (request.getStatus() == FeedbackStatus.RESOLVED) {
            feedback.setResolvedDate(LocalDateTime.now());
        }
        return save(feedback);
    }

    @Transactional
    public void delete(Long id) {
        Feedback feedback = getById(id);
        feedbackRepository.delete(feedback);
    }

    private Feedback save(Feedback feedback) {
        try {
            return feedbackRepository.save(feedback);
        } catch (Exception ex) {
            throw new RecordSaveException("Failed to save feedback record", ex);
        }
    }
}
