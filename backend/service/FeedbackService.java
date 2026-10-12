package com.dentaflow.backend.service;

import com.dentaflow.backend.ai.FeedbackAutoResponseService;
import com.dentaflow.backend.ai.SentimentAnalysisService;
import com.dentaflow.backend.entity.Feedback;
import com.dentaflow.backend.repository.FeedbackRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;

@Service
@Transactional
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;

    private final SentimentAnalysisService
            sentimentAnalysisService;

    private final FeedbackAutoResponseService
            feedbackAutoResponseService;

    public FeedbackService(
            FeedbackRepository feedbackRepository,
            SentimentAnalysisService sentimentAnalysisService,
            FeedbackAutoResponseService feedbackAutoResponseService) {

        this.feedbackRepository =
                feedbackRepository;

        this.sentimentAnalysisService =
                sentimentAnalysisService;

        this.feedbackAutoResponseService =
                feedbackAutoResponseService;
    }

    // =========================================================
    // CREATE FEEDBACK
    // =========================================================

    public Feedback createFeedback(
            Feedback feedback) {

        if (feedback == null) {
            throw new RuntimeException(
                    "Feedback data is required"
            );
        }

        if (feedback.getRating() == null) {
            throw new RuntimeException(
                    "Rating is required"
            );
        }

        if (feedback.getRating() < 1 ||
                feedback.getRating() > 5) {

            throw new RuntimeException(
                    "Rating must be between 1 and 5"
            );
        }

        // =====================================================
        // GENERATE FEEDBACK CODE
        // =====================================================

        feedback.setFeedbackCode(
                generateFeedbackCode()
        );

        // =====================================================
        // CLEAN CATEGORY
        // =====================================================

        if (feedback.getCategory() != null) {

            feedback.setCategory(
                    feedback.getCategory()
                            .trim()
            );
        }

        // =====================================================
        // CLEAN COMMENT
        // =====================================================

        if (feedback.getComment() != null) {

            feedback.setComment(
                    feedback.getComment()
                            .trim()
            );
        }

        // =====================================================
        // AI SENTIMENT ANALYSIS
        // =====================================================

        String sentiment =
                sentimentAnalysisService
                        .analyzeSentiment(feedback);

        feedback.setSentiment(
                sentiment
        );

        // =====================================================
        // DEFAULT STATUS
        // =====================================================

        if (feedback.getStatus() == null ||
                feedback.getStatus()
                        .trim()
                        .isEmpty()) {

            feedback.setStatus(
                    "SUBMITTED"
            );

        } else {

            feedback.setStatus(
                    feedback.getStatus()
                            .trim()
                            .toUpperCase()
            );
        }

        // =====================================================
        // CLEAN EXISTING ADMIN RESPONSE
        // =====================================================

        if (feedback.getAdminResponse() != null) {

            feedback.setAdminResponse(
                    feedback.getAdminResponse()
                            .trim()
            );
        }

        if (feedback.getRespondedBy() != null) {

            feedback.setRespondedBy(
                    feedback.getRespondedBy()
                            .trim()
            );
        }

        // =====================================================
        // AI AUTOMATIC RESPONSE
        // =====================================================

        String autoResponse =
                feedbackAutoResponseService
                        .generateAutoResponse(
                                feedback
                        );

        feedback.setAdminResponse(
                autoResponse
        );

        // =====================================================
        // NEGATIVE FEEDBACK
        // =====================================================

        if ("NEGATIVE".equalsIgnoreCase(
                sentiment)) {

            /*
             * Negative feedback requires admin attention.
             *
             * We keep the status as SUBMITTED so the
             * admin can see it in the feedback review list.
             */

            feedback.setStatus(
                    "SUBMITTED"
            );

        } else {

            /*
             * Positive / neutral feedback has already
             * received an automatic response.
             */

            feedback.setStatus(
                    "RESPONDED"
            );
        }

        // =====================================================
        // SAVE FEEDBACK
        // =====================================================

        return feedbackRepository.save(
                feedback
        );
    }

    // =========================================================
    // GENERATE FEEDBACK CODE
    // =========================================================

    private String generateFeedbackCode() {

        long nextNumber =
                feedbackRepository.count() + 1;

        String code;

        do {

            code = String.format(
                    "FDB%05d",
                    nextNumber
            );

            nextNumber++;

        } while (
                feedbackRepository
                        .existsByFeedbackCode(code)
        );

        return code;
    }

    // =========================================================
    // GET ALL FEEDBACK
    // =========================================================

    @Transactional(readOnly = true)
    public List<Feedback> getAllFeedback() {

        return feedbackRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
    }

    // =========================================================
    // GET FEEDBACK BY ID
    // =========================================================

    @Transactional(readOnly = true)
    public Feedback getFeedbackById(Long id) {

        if (id == null) {
            throw new RuntimeException(
                    "Feedback ID is required"
            );
        }

        return feedbackRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Feedback not found with id: "
                                        + id
                        ));
    }

    // =========================================================
    // GET FEEDBACK BY CODE
    // =========================================================

    @Transactional(readOnly = true)
    public Feedback getFeedbackByCode(
            String feedbackCode) {

        if (feedbackCode == null ||
                feedbackCode.trim().isEmpty()) {

            throw new RuntimeException(
                    "Feedback code is required"
            );
        }

        return feedbackRepository
                .findByFeedbackCode(
                        feedbackCode
                                .trim()
                                .toUpperCase()
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "Feedback not found: "
                                        + feedbackCode
                        ));
    }

    // =========================================================
    // GET USER FEEDBACK
    // =========================================================

    @Transactional(readOnly = true)
    public List<Feedback> getUserFeedback(
            Long userId) {

        if (userId == null) {
            throw new RuntimeException(
                    "User ID is required"
            );
        }

        return feedbackRepository
                .findByUserIdOrderByCreatedAtDesc(
                        userId
                );
    }

    // =========================================================
    // GET PATIENT FEEDBACK
    // =========================================================

    @Transactional(readOnly = true)
    public List<Feedback> getPatientFeedback(
            Long patientId) {

        if (patientId == null) {
            throw new RuntimeException(
                    "Patient ID is required"
            );
        }

        return feedbackRepository
                .findByPatientIdOrderByCreatedAtDesc(
                        patientId
                );
    }

    // =========================================================
    // GET APPOINTMENT FEEDBACK
    // =========================================================

    @Transactional(readOnly = true)
    public List<Feedback> getAppointmentFeedback(
            Long appointmentId) {

        if (appointmentId == null) {
            throw new RuntimeException(
                    "Appointment ID is required"
            );
        }

        return feedbackRepository
                .findByAppointmentIdOrderByCreatedAtDesc(
                        appointmentId
                );
    }

    // =========================================================
    // GET FEEDBACK BY RATING
    // =========================================================

    @Transactional(readOnly = true)
    public List<Feedback> getFeedbackByRating(
            Integer rating) {

        if (rating == null) {
            throw new RuntimeException(
                    "Rating is required"
            );
        }

        if (rating < 1 || rating > 5) {
            throw new RuntimeException(
                    "Rating must be between 1 and 5"
            );
        }

        return feedbackRepository
                .findByRatingOrderByCreatedAtDesc(
                        rating
                );
    }

    // =========================================================
    // GET FEEDBACK BY CATEGORY
    // =========================================================

    @Transactional(readOnly = true)
    public List<Feedback> getFeedbackByCategory(
            String category) {

        if (category == null ||
                category.trim().isEmpty()) {

            throw new RuntimeException(
                    "Category is required"
            );
        }

        return feedbackRepository
                .findByCategoryIgnoreCaseOrderByCreatedAtDesc(
                        category.trim()
                );
    }

    // =========================================================
    // GET FEEDBACK BY STATUS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Feedback> getFeedbackByStatus(
            String status) {

        if (status == null ||
                status.trim().isEmpty()) {

            throw new RuntimeException(
                    "Status is required"
            );
        }

        return feedbackRepository
                .findByStatusIgnoreCaseOrderByCreatedAtDesc(
                        status.trim()
                );
    }

    // =========================================================
    // GET FEEDBACK BY SENTIMENT
    // =========================================================

    @Transactional(readOnly = true)
    public List<Feedback> getFeedbackBySentiment(
            String sentiment) {

        if (sentiment == null ||
                sentiment.trim().isEmpty()) {

            throw new RuntimeException(
                    "Sentiment is required"
            );
        }

        return feedbackRepository
                .findBySentimentIgnoreCaseOrderByCreatedAtDesc(
                        sentiment.trim()
                );
    }

    // =========================================================
    // GET FEEDBACK REQUIRING ADMIN REVIEW
    // =========================================================

    @Transactional(readOnly = true)
    public List<Feedback> getFeedbackRequiringReview() {

        return feedbackRepository
                .findByStatusInOrderByCreatedAtDesc(
                        Arrays.asList(
                                "SUBMITTED",
                                "PENDING",
                                "UNDER_REVIEW"
                        )
                );
    }

    // =========================================================
    // GET NEGATIVE FEEDBACK
    // =========================================================

    @Transactional(readOnly = true)
    public List<Feedback> getNegativeFeedback() {

        return feedbackRepository
                .findBySentimentIgnoreCaseOrderByCreatedAtDesc(
                        "NEGATIVE"
                );
    }

    // =========================================================
    // UPDATE FEEDBACK
    // =========================================================

    public Feedback updateFeedback(
            Long id,
            Feedback updatedFeedback) {

        Feedback existingFeedback =
                getFeedbackById(id);

        if (updatedFeedback == null) {
            throw new RuntimeException(
                    "Feedback data is required"
            );
        }

        if (updatedFeedback.getRating() != null) {

            if (updatedFeedback.getRating() < 1 ||
                    updatedFeedback.getRating() > 5) {

                throw new RuntimeException(
                        "Rating must be between 1 and 5"
                );
            }

            existingFeedback.setRating(
                    updatedFeedback.getRating()
            );
        }

        if (updatedFeedback.getComment() != null) {

            existingFeedback.setComment(
                    updatedFeedback
                            .getComment()
                            .trim()
            );

            // Re-analyze sentiment when comment changes
            String sentiment =
                    sentimentAnalysisService
                            .analyzeSentiment(
                                    existingFeedback
                            );

            existingFeedback.setSentiment(
                    sentiment
            );

            // Generate new automatic response
            existingFeedback.setAdminResponse(
                    feedbackAutoResponseService
                            .generateAutoResponse(
                                    existingFeedback
                            )
            );

            if ("NEGATIVE".equalsIgnoreCase(
                    sentiment)) {

                existingFeedback.setStatus(
                        "SUBMITTED"
                );

            } else {

                existingFeedback.setStatus(
                        "RESPONDED"
                );
            }
        }

        if (updatedFeedback.getCategory() != null) {

            existingFeedback.setCategory(
                    updatedFeedback
                            .getCategory()
                            .trim()
            );
        }

        /*
         * Do not allow a normal update request to
         * overwrite the AI-generated response accidentally.
         *
         * Admin should use respondToFeedback()
         * for a manual response.
         */

        return feedbackRepository.save(
                existingFeedback
        );
    }

    // =========================================================
    // RESPOND TO FEEDBACK - ADMIN
    // =========================================================

    public Feedback respondToFeedback(
            Long id,
            String adminResponse,
            String respondedBy) {

        if (adminResponse == null ||
                adminResponse.trim().isEmpty()) {

            throw new RuntimeException(
                    "Admin response is required"
            );
        }

        Feedback feedback =
                getFeedbackById(id);

        feedback.setAdminResponse(
                adminResponse.trim()
        );

        if (respondedBy != null &&
                !respondedBy.trim().isEmpty()) {

            feedback.setRespondedBy(
                    respondedBy.trim()
            );
        }

        feedback.setStatus(
                "RESPONDED"
        );

        return feedbackRepository.save(
                feedback
        );
    }

    // =========================================================
    // MARK AS UNDER REVIEW
    // =========================================================

    public Feedback markAsUnderReview(
            Long id) {

        Feedback feedback =
                getFeedbackById(id);

        feedback.setStatus(
                "UNDER_REVIEW"
        );

        return feedbackRepository.save(
                feedback
        );
    }

    // =========================================================
    // APPROVE FEEDBACK
    // =========================================================

    public Feedback approveFeedback(
            Long id) {

        Feedback feedback =
                getFeedbackById(id);

        feedback.setStatus(
                "APPROVED"
        );

        return feedbackRepository.save(
                feedback
        );
    }

    // =========================================================
    // REJECT FEEDBACK
    // =========================================================

    public Feedback rejectFeedback(
            Long id) {

        Feedback feedback =
                getFeedbackById(id);

        feedback.setStatus(
                "REJECTED"
        );

        return feedbackRepository.save(
                feedback
        );
    }

    // =========================================================
    // DELETE FEEDBACK
    // =========================================================

    public void deleteFeedback(Long id) {

        Feedback feedback =
                getFeedbackById(id);

        feedbackRepository.delete(
                feedback
        );
    }
}