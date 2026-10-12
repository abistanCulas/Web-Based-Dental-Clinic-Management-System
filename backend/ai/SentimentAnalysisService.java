package com.dentaflow.backend.ai;

import com.dentaflow.backend.entity.Feedback;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

@Service
public class SentimentAnalysisService {

    private final Set<String> positiveWords = new HashSet<>(
            Arrays.asList(
                    "good",
                    "great",
                    "excellent",
                    "amazing",
                    "helpful",
                    "friendly",
                    "professional",
                    "clean",
                    "comfortable",
                    "satisfied",
                    "happy",
                    "best",
                    "wonderful",
                    "perfect",
                    "love",
                    "fast",
                    "nice",
                    "recommend",
                    "recommended"
            )
    );

    private final Set<String> negativeWords = new HashSet<>(
            Arrays.asList(
                    "bad",
                    "poor",
                    "worst",
                    "terrible",
                    "awful",
                    "unhappy",
                    "unsatisfied",
                    "rude",
                    "slow",
                    "dirty",
                    "painful",
                    "expensive",
                    "late",
                    "disappointed",
                    "problem",
                    "problems",
                    "complaint",
                    "complaints",
                    "uncomfortable",
                    "wait"
            )
    );

    // =========================================================
    // ANALYZE FEEDBACK
    // =========================================================

    public String analyzeSentiment(
            Feedback feedback) {

        if (feedback == null) {
            throw new RuntimeException(
                    "Feedback data is required"
            );
        }

        String comment = feedback.getComment();

        // If there is no comment, use rating
        if (comment == null ||
                comment.trim().isEmpty()) {

            return analyzeByRating(
                    feedback.getRating()
            );
        }

        String text =
                comment.toLowerCase()
                        .replaceAll(
                                "[^a-zA-Z0-9\\s]",
                                " "
                        );

        String[] words =
                text.split("\\s+");

        int positiveScore = 0;
        int negativeScore = 0;

        for (String word : words) {

            if (positiveWords.contains(word)) {
                positiveScore++;
            }

            if (negativeWords.contains(word)) {
                negativeScore++;
            }
        }

        // =====================================================
        // DETERMINE SENTIMENT
        // =====================================================

        if (positiveScore > negativeScore) {
            return "POSITIVE";
        }

        if (negativeScore > positiveScore) {
            return "NEGATIVE";
        }

        // If scores are equal, use rating
        return analyzeByRating(
                feedback.getRating()
        );
    }

    // =========================================================
    // ANALYZE AND SET SENTIMENT
    // =========================================================

    public Feedback analyzeAndSetSentiment(
            Feedback feedback) {

        if (feedback == null) {
            throw new RuntimeException(
                    "Feedback data is required"
            );
        }

        String sentiment =
                analyzeSentiment(feedback);

        feedback.setSentiment(sentiment);

        return feedback;
    }

    // =========================================================
    // ANALYZE BY RATING
    // =========================================================

    private String analyzeByRating(
            Integer rating) {

        if (rating == null) {
            return "NEUTRAL";
        }

        if (rating >= 4) {
            return "POSITIVE";
        }

        if (rating <= 2) {
            return "NEGATIVE";
        }

        return "NEUTRAL";
    }

    // =========================================================
    // CHECK POSITIVE
    // =========================================================

    public boolean isPositive(
            Feedback feedback) {

        return "POSITIVE".equals(
                analyzeSentiment(feedback)
        );
    }

    // =========================================================
    // CHECK NEGATIVE
    // =========================================================

    public boolean isNegative(
            Feedback feedback) {

        return "NEGATIVE".equals(
                analyzeSentiment(feedback)
        );
    }

    // =========================================================
    // CHECK NEUTRAL
    // =========================================================

    public boolean isNeutral(
            Feedback feedback) {

        return "NEUTRAL".equals(
                analyzeSentiment(feedback)
        );
    }
}