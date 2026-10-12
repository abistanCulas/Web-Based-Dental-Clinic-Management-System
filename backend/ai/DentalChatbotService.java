package com.dentaflow.backend.ai;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
public class DentalChatbotService {

    // =========================================================
    // CHATBOT RESPONSE
    // =========================================================

    public ChatbotResponse chat(String message) {

        if (message == null ||
                message.trim().isEmpty()) {

            return new ChatbotResponse(
                    "Please describe your question or symptoms.",
                    "GENERAL",
                    null,
                    false
            );
        }

        String text = normalize(message);

        // =====================================================
        // EMERGENCY SYMPTOMS
        // =====================================================

        if (containsAny(
                text,
                "severe bleeding",
                "heavy bleeding",
                "face swelling",
                "facial swelling",
                "difficulty breathing",
                "cannot breathe",
                "unconscious",
                "severe infection"
        )) {

            return new ChatbotResponse(
                    "Your symptoms may require urgent medical attention. "
                            + "Please seek emergency dental or medical care "
                            + "immediately.",
                    "EMERGENCY",
                    "URGENT DENTAL CARE",
                    true
            );
        }

        // =====================================================
        // TOOTHACHE / TOOTH PAIN
        // =====================================================

        if (containsAny(
                text,
                "toothache",
                "tooth pain",
                "tooth hurts",
                "pain in my tooth",
                "dental pain"
        )) {

            return new ChatbotResponse(
                    "Tooth pain can have several causes, including "
                            + "decay, infection, or gum problems. "
                            + "A dental examination is recommended.",
                    "SYMPTOM",
                    "GENERAL DENTAL CONSULTATION",
                    true
            );
        }

        // =====================================================
        // TOOTH SENSITIVITY
        // =====================================================

        if (containsAny(
                text,
                "sensitive teeth",
                "tooth sensitivity",
                "teeth sensitive",
                "sensitivity"
        )) {

            return new ChatbotResponse(
                    "Tooth sensitivity may be related to enamel wear, "
                            + "gum recession, decay, or other dental issues. "
                            + "A dentist should evaluate the cause.",
                    "SYMPTOM",
                    "GENERAL DENTAL CONSULTATION",
                    true
            );
        }

        // =====================================================
        // GUM PROBLEMS
        // =====================================================

        if (containsAny(
                text,
                "gum pain",
                "bleeding gums",
                "gum bleeding",
                "swollen gums",
                "gum swelling",
                "gum problem"
        )) {

            return new ChatbotResponse(
                    "Gum bleeding or swelling can be associated with "
                            + "gum disease or other dental problems. "
                            + "A dental examination is recommended.",
                    "SYMPTOM",
                    "PERIODONTAL CONSULTATION",
                    true
            );
        }

        // =====================================================
        // TOOTH DECAY / CAVITY
        // =====================================================

        if (containsAny(
                text,
                "cavity",
                "cavities",
                "tooth decay",
                "decayed tooth",
                "hole in tooth"
        )) {

            return new ChatbotResponse(
                    "A cavity or tooth decay should be assessed by a dentist. "
                            + "Treatment may depend on how advanced the decay is.",
                    "SYMPTOM",
                    "RESTORATIVE DENTAL CONSULTATION",
                    true
            );
        }

        // =====================================================
        // BROKEN / CHIPPED TOOTH
        // =====================================================

        if (containsAny(
                text,
                "broken tooth",
                "chipped tooth",
                "cracked tooth",
                "fractured tooth"
        )) {

            return new ChatbotResponse(
                    "A broken, chipped, or cracked tooth should be examined "
                            + "by a dentist to determine the appropriate treatment.",
                    "SYMPTOM",
                    "RESTORATIVE DENTAL CONSULTATION",
                    true
            );
        }

        // =====================================================
        // WISDOM TOOTH
        // =====================================================

        if (containsAny(
                text,
                "wisdom tooth",
                "wisdom teeth",
                "third molar"
        )) {

            return new ChatbotResponse(
                    "Wisdom tooth problems can cause pain, swelling, "
                            + "or difficulty opening the mouth. "
                            + "A dentist can assess whether treatment is needed.",
                    "SYMPTOM",
                    "ORAL SURGERY / DENTAL CONSULTATION",
                    true
            );
        }

        // =====================================================
        // CLEANING
        // =====================================================

        if (containsAny(
                text,
                "teeth cleaning",
                "dental cleaning",
                "clean my teeth",
                "scaling",
                "tartar"
        )) {

            return new ChatbotResponse(
                    "Professional dental cleaning can help remove "
                            + "plaque and tartar buildup. "
                            + "You can book a dental cleaning appointment.",
                    "SERVICE",
                    "DENTAL CLEANING",
                    true
            );
        }

        // =====================================================
        // COMMON QUESTION - BRUSHING
        // =====================================================

        if (containsAny(
                text,
                "how often should i brush",
                "how often brush",
                "brush my teeth",
                "brushing teeth"
        )) {

            return new ChatbotResponse(
                    "Generally, teeth should be brushed twice a day "
                            + "using fluoride toothpaste. "
                            + "Your dentist can provide advice based on your "
                            + "individual dental needs.",
                    "GENERAL",
                    null,
                    false
            );
        }

        // =====================================================
        // COMMON QUESTION - FLOSSING
        // =====================================================

        if (containsAny(
                text,
                "how to floss",
                "floss my teeth",
                "flossing",
                "dental floss"
        )) {

            return new ChatbotResponse(
                    "Flossing helps clean between teeth where a toothbrush "
                            + "may not reach. Your dentist or dental hygienist "
                            + "can demonstrate the correct technique.",
                    "GENERAL",
                    null,
                    false
            );
        }

        // =====================================================
        // COMMON QUESTION - APPOINTMENT
        // =====================================================

        if (containsAny(
                text,
                "book appointment",
                "make appointment",
                "schedule appointment",
                "want an appointment",
                "need appointment"
        )) {

            return new ChatbotResponse(
                    "I can help you with an appointment. "
                            + "Please provide the type of dental problem "
                            + "or service you need.",
                    "APPOINTMENT",
                    "APPOINTMENT BOOKING",
                    true
            );
        }

        // =====================================================
        // DENTIST / DOCTOR QUESTION
        // =====================================================

        if (containsAny(
                text,
                "which dentist",
                "what dentist",
                "which doctor",
                "what doctor",
                "need a dentist"
        )) {

            return new ChatbotResponse(
                    "Please describe your dental symptoms or the service "
                            + "you need. I can suggest a suitable type of "
                            + "dental consultation.",
                    "APPOINTMENT",
                    "DENTAL CONSULTATION",
                    true
            );
        }

        // =====================================================
        // GREETING
        // =====================================================

        if (containsAny(
                text,
                "hello",
                "hi",
                "hey",
                "good morning",
                "good afternoon",
                "good evening"
        )) {

            return new ChatbotResponse(
                    "Hello! I am the DentaFlow dental assistant. "
                            + "You can ask me common dental questions or "
                            + "describe your symptoms, and I can guide you "
                            + "towards an appropriate dental service.",
                    "GENERAL",
                    null,
                    false
            );
        }

        // =====================================================
        // DEFAULT RESPONSE
        // =====================================================

        return new ChatbotResponse(
                "I can provide general dental information and help "
                        + "identify an appropriate type of dental service. "
                        + "Please describe your symptoms or question in "
                        + "more detail.",
                "GENERAL",
                null,
                false
        );
    }

    // =========================================================
    // NORMALIZE MESSAGE
    // =========================================================

    private String normalize(String text) {

        return text
                .toLowerCase()
                .trim()
                .replaceAll("[^a-z0-9\\s]", " ")
                .replaceAll("\\s+", " ");
    }

    // =========================================================
    // CHECK KEYWORDS
    // =========================================================

    private boolean containsAny(
            String text,
            String... keywords) {

        return Arrays.stream(keywords)
                .anyMatch(text::contains);
    }

    // =========================================================
    // CHATBOT RESPONSE MODEL
    // =========================================================

    public static class ChatbotResponse {

        private final String message;
        private final String category;
        private final String recommendedService;
        private final boolean appointmentRecommended;

        public ChatbotResponse(
                String message,
                String category,
                String recommendedService,
                boolean appointmentRecommended) {

            this.message = message;
            this.category = category;
            this.recommendedService = recommendedService;
            this.appointmentRecommended =
                    appointmentRecommended;
        }

        public String getMessage() {
            return message;
        }

        public String getCategory() {
            return category;
        }

        public String getRecommendedService() {
            return recommendedService;
        }

        public boolean isAppointmentRecommended() {
            return appointmentRecommended;
        }
    }
}