package com.dentaflow.backend.ai;

import com.dentaflow.backend.entity.Feedback;
import org.springframework.stereotype.Service;

@Service
public class FeedbackAutoResponseService {

    private final SentimentAnalysisService sentimentAnalysisService;

    public FeedbackAutoResponseService(
            SentimentAnalysisService sentimentAnalysisService) {

        this.sentimentAnalysisService =
                sentimentAnalysisService;
    }

    // =========================================================
    // GENERATE AUTOMATIC RESPONSE
    // =========================================================

    public String generateAutoResponse(
            Feedback feedback) {

        if (feedback == null) {
            throw new RuntimeException(
                    "Feedback data is required"
            );
        }

        String sentiment =
                sentimentAnalysisService
                        .analyzeSentiment(feedback);

        switch (sentiment) {

            case "POSITIVE":

                return generatePositiveResponse(
                        feedback
                );

            case "NEGATIVE":

                return generateNegativeResponse(
                        feedback
                );

            case "NEUTRAL":

                return generateNeutralResponse(
                        feedback
                );

            default:

                return generateNeutralResponse(
                        feedback
                );
        }
    }

    // =========================================================
    // POSITIVE RESPONSE
    // =========================================================

    private String generatePositiveResponse(
            Feedback feedback) {

        return "Thank you for your valuable feedback! "
                + "We are happy to know that you had a "
                + "positive experience with DentaFlow. "
                + "We truly appreciate your support.";
    }

    // =========================================================
    // NEGATIVE RESPONSE
    // =========================================================

    private String generateNegativeResponse(
            Feedback feedback) {

        return "We are sorry to hear about your experience "
                + "and sincerely apologize for any inconvenience "
                + "caused. Your feedback is important to us, "
                + "and we will review your concerns carefully "
                + "to improve our service.";
    }

    // =========================================================
    // NEUTRAL RESPONSE
    // =========================================================

    private String generateNeutralResponse(
            Feedback feedback) {

        return "Thank you for taking the time to share "
                + "your feedback with us. We appreciate your "
                + "input and will use it to improve our services.";
    }

    // =========================================================
    // CHECK WHETHER ADMIN ATTENTION IS REQUIRED
    // =========================================================

    public boolean requiresAdminAttention(
            Feedback feedback) {

        if (feedback == null) {
            return false;
        }

        return sentimentAnalysisService.isNegative(
                feedback
        );
    }

    // =========================================================
    // GET SENTIMENT
    // =========================================================

    public String getSentiment(
            Feedback feedback) {

        if (feedback == null) {
            throw new RuntimeException(
                    "Feedback data is required"
            );
        }

        return sentimentAnalysisService
                .analyzeSentiment(feedback);
    }

    // =========================================================
    // GET RESPONSE + ADMIN ALERT INFORMATION
    // =========================================================

    public AutoResponseResult processFeedback(
            Feedback feedback) {

        if (feedback == null) {
            throw new RuntimeException(
                    "Feedback data is required"
            );
        }

        String sentiment =
                sentimentAnalysisService
                        .analyzeSentiment(feedback);

        String response =
                generateAutoResponse(feedback);

        boolean adminAttentionRequired =
                "NEGATIVE".equalsIgnoreCase(
                        sentiment
                );

        return new AutoResponseResult(
                sentiment,
                response,
                adminAttentionRequired
        );
    }

    // =========================================================
    // AUTO RESPONSE RESULT
    // =========================================================

    public static class AutoResponseResult {

        private final String sentiment;

        private final String response;

        private final boolean adminAttentionRequired;

        public AutoResponseResult(
                String sentiment,
                String response,
                boolean adminAttentionRequired) {

            this.sentiment = sentiment;
            this.response = response;
            this.adminAttentionRequired =
                    adminAttentionRequired;
        }

        public String getSentiment() {
            return sentiment;
        }

        public String getResponse() {
            return response;
        }

        public boolean isAdminAttentionRequired() {
            return adminAttentionRequired;
        }
    }
}