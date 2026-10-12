package com.dentaflow.backend.ai;

import com.dentaflow.backend.entity.Appointment;
import com.dentaflow.backend.entity.Dentist;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AIAppointmentRecommendationService {

    // =========================================================
    // RECOMMEND DENTISTS
    // =========================================================

    public List<DentistRecommendation> recommendDentists(
            List<Dentist> dentists,
            String symptoms) {

        if (dentists == null || dentists.isEmpty()) {
            return List.of();
        }

        String text = normalize(symptoms);

        return dentists.stream()
                .filter(dentist ->
                        dentist.getStatus() != null &&
                                "ACTIVE".equalsIgnoreCase(
                                        dentist.getStatus()
                                ))
                .map(dentist ->
                        createRecommendation(
                                dentist,
                                text
                        ))
                .sorted(
                        Comparator.comparingInt(
                                DentistRecommendation::getScore
                        ).reversed()
                )
                .collect(Collectors.toList());
    }

    // =========================================================
    // CREATE RECOMMENDATION
    // =========================================================

    private DentistRecommendation createRecommendation(
            Dentist dentist,
            String symptoms) {

        int score = 0;

        String reason =
                "General dental consultation recommended";

        String specialization =
                dentist.getSpecialization() != null
                        ? normalize(
                        dentist.getSpecialization()
                )
                        : "";

        // -----------------------------------------------------
        // PAIN / GENERAL DENTAL PROBLEMS
        // -----------------------------------------------------

        if (containsAny(
                symptoms,
                "tooth pain",
                "toothache",
                "dental pain",
                "cavity",
                "tooth decay"
        )) {

            if (containsAny(
                    specialization,
                    "general",
                    "restorative",
                    "conservative"
            )) {

                score += 30;

                reason =
                        "Dentist specialization matches "
                                + "general/restorative dental problems";
            }
        }

        // -----------------------------------------------------
        // GUM PROBLEMS
        // -----------------------------------------------------

        if (containsAny(
                symptoms,
                "gum pain",
                "gum bleeding",
                "bleeding gums",
                "swollen gums",
                "gum swelling",
                "periodontal"
        )) {

            if (containsAny(
                    specialization,
                    "periodont",
                    "gum"
            )) {

                score += 40;

                reason =
                        "Periodontal specialization matches "
                                + "the reported gum symptoms";
            }
        }

        // -----------------------------------------------------
        // WISDOM TOOTH / SURGERY
        // -----------------------------------------------------

        if (containsAny(
                symptoms,
                "wisdom tooth",
                "wisdom teeth",
                "broken tooth",
                "fractured tooth",
                "oral surgery"
        )) {

            if (containsAny(
                    specialization,
                    "oral surgery",
                    "oral surgeon",
                    "surgery"
            )) {

                score += 40;

                reason =
                        "Oral surgery specialization matches "
                                + "the reported symptoms";
            }
        }

        // -----------------------------------------------------
        // ORTHODONTIC PROBLEMS
        // -----------------------------------------------------

        if (containsAny(
                symptoms,
                "braces",
                "crooked teeth",
                "misaligned teeth",
                "alignment",
                "orthodontic"
        )) {

            if (containsAny(
                    specialization,
                    "orthodont"
            )) {

                score += 40;

                reason =
                        "Orthodontic specialization matches "
                                + "the reported concern";
            }
        }

        // -----------------------------------------------------
        // CHILD DENTAL CARE
        // -----------------------------------------------------

        if (containsAny(
                symptoms,
                "child",
                "children",
                "kid",
                "pediatric"
        )) {

            if (containsAny(
                    specialization,
                    "pediatric",
                    "paediatric",
                    "children"
            )) {

                score += 40;

                reason =
                        "Pediatric dental specialization "
                                + "matches the patient's need";
            }
        }

        // -----------------------------------------------------
        // CLEANING
        // -----------------------------------------------------

        if (containsAny(
                symptoms,
                "cleaning",
                "teeth cleaning",
                "scaling",
                "tartar"
        )) {

            if (containsAny(
                    specialization,
                    "general",
                    "hygien"
            )) {

                score += 25;

                reason =
                        "Dentist/service specialization "
                                + "matches dental cleaning";
            }
        }

        // -----------------------------------------------------
        // DEFAULT
        // -----------------------------------------------------

        if (score == 0) {
            score = 10;
        }

        return new DentistRecommendation(
                dentist.getId(),
                getDentistName(dentist),
                dentist.getSpecialization(),
                score,
                reason
        );
    }

    // =========================================================
    // NORMALIZE
    // =========================================================

    private String normalize(String text) {

        if (text == null) {
            return "";
        }

        return text
                .toLowerCase()
                .trim()
                .replaceAll(
                        "[^a-z0-9\\s]",
                        " "
                )
                .replaceAll(
                        "\\s+",
                        " "
                );
    }

    // =========================================================
    // CHECK KEYWORDS
    // =========================================================

    private boolean containsAny(
            String text,
            String... keywords) {

        if (text == null || text.isEmpty()) {
            return false;
        }

        for (String keyword : keywords) {

            if (text.contains(
                    normalize(keyword)
            )) {

                return true;
            }
        }

        return false;
    }

    // =========================================================
    // GET DENTIST NAME
    // =========================================================

    private String getDentistName(Dentist dentist) {

        String firstName =
                dentist.getFirstName() != null
                        ? dentist.getFirstName()
                        : "";

        String lastName =
                dentist.getLastName() != null
                        ? dentist.getLastName()
                        : "";

        String fullName =
                (firstName + " " + lastName).trim();

        if (!fullName.isEmpty()) {
            return fullName;
        }

        return "Dentist #" + dentist.getId();
    }

    // =========================================================
    // RECOMMENDATION RESULT
    // =========================================================

    public static class DentistRecommendation {

        private final Long dentistId;
        private final String dentistName;
        private final String specialization;
        private final int score;
        private final String reason;

        public DentistRecommendation(
                Long dentistId,
                String dentistName,
                String specialization,
                int score,
                String reason) {

            this.dentistId = dentistId;
            this.dentistName = dentistName;
            this.specialization = specialization;
            this.score = score;
            this.reason = reason;
        }

        public Long getDentistId() {
            return dentistId;
        }

        public String getDentistName() {
            return dentistName;
        }

        public String getSpecialization() {
            return specialization;
        }

        public int getScore() {
            return score;
        }

        public String getReason() {
            return reason;
        }
    }
}