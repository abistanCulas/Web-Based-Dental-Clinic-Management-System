package com.dentaflow.backend.ai;

import com.dentaflow.backend.entity.Medicine;
import com.dentaflow.backend.entity.Patient;
import org.springframework.stereotype.Service;

@Service
public class AllergyRiskAnalysisService {

    // =========================================================
    // ANALYZE ALLERGY RISK
    // =========================================================

    public AllergyRiskResult analyzeRisk(
            Patient patient,
            Medicine medicine) {

        if (patient == null) {
            throw new RuntimeException(
                    "Patient data is required"
            );
        }

        if (medicine == null) {
            throw new RuntimeException(
                    "Medicine data is required"
            );
        }

        String allergies = normalize(
                patient.getAllergies()
        );

        String medicineName = normalize(
                medicine.getName()
        );

        String genericName = normalize(
                medicine.getGenericName()
        );

        String allergyWarning = normalize(
                medicine.getAllergyWarning()
        );

        // -----------------------------------------------------
        // No allergy information
        // -----------------------------------------------------

        if (allergies.isEmpty()) {

            return new AllergyRiskResult(
                    false,
                    "LOW",
                    "No patient allergy information available",
                    medicine.getName()
            );
        }

        // -----------------------------------------------------
        // Direct medicine name match
        // -----------------------------------------------------

        if (!medicineName.isEmpty()
                && containsTerm(allergies, medicineName)) {

            return new AllergyRiskResult(
                    true,
                    "HIGH",
                    "Patient allergy matches the prescribed medicine",
                    medicine.getName()
            );
        }

        // -----------------------------------------------------
        // Generic medicine name match
        // -----------------------------------------------------

        if (!genericName.isEmpty()
                && containsTerm(allergies, genericName)) {

            return new AllergyRiskResult(
                    true,
                    "HIGH",
                    "Patient allergy matches the generic medicine name",
                    medicine.getName()
            );
        }

        // -----------------------------------------------------
        // Medicine allergy warning match
        // -----------------------------------------------------

        if (!allergyWarning.isEmpty()
                && containsAnyTerm(
                allergies,
                allergyWarning)) {

            return new AllergyRiskResult(
                    true,
                    "HIGH",
                    "Medicine contains a warning related to the patient's allergy",
                    medicine.getName()
            );
        }

        // -----------------------------------------------------
        // No detected match
        // -----------------------------------------------------

        return new AllergyRiskResult(
                false,
                "LOW",
                "No known allergy conflict detected",
                medicine.getName()
        );
    }

    // =========================================================
    // CHECK WHETHER MEDICINE IS SAFE
    // =========================================================

    public boolean isSafe(
            Patient patient,
            Medicine medicine) {

        AllergyRiskResult result =
                analyzeRisk(patient, medicine);

        return !result.isRiskDetected();
    }

    // =========================================================
    // CHECK WHETHER HIGH RISK
    // =========================================================

    public boolean isHighRisk(
            Patient patient,
            Medicine medicine) {

        AllergyRiskResult result =
                analyzeRisk(patient, medicine);

        return result.isRiskDetected()
                && "HIGH".equalsIgnoreCase(
                result.getRiskLevel()
        );
    }

    // =========================================================
    // NORMALIZE TEXT
    // =========================================================

    private String normalize(String value) {

        if (value == null) {
            return "";
        }

        return value
                .toLowerCase()
                .trim()
                .replaceAll("[^a-z0-9\\s]", " ")
                .replaceAll("\\s+", " ");
    }

    // =========================================================
    // CHECK TERM
    // =========================================================

    private boolean containsTerm(
            String source,
            String term) {

        if (source.isEmpty()
                || term.isEmpty()) {

            return false;
        }

        return source.contains(term);
    }

    // =========================================================
    // CHECK ANY TERM
    // =========================================================

    private boolean containsAnyTerm(
            String source,
            String warning) {

        String[] terms =
                warning.split("\\s+");

        for (String term : terms) {

            if (term.length() < 4) {
                continue;
            }

            if (source.contains(term)) {
                return true;
            }
        }

        return false;
    }

    // =========================================================
    // RESULT CLASS
    // =========================================================

    public static class AllergyRiskResult {

        private final boolean riskDetected;
        private final String riskLevel;
        private final String message;
        private final String medicineName;

        public AllergyRiskResult(
                boolean riskDetected,
                String riskLevel,
                String message,
                String medicineName) {

            this.riskDetected = riskDetected;
            this.riskLevel = riskLevel;
            this.message = message;
            this.medicineName = medicineName;
        }

        public boolean isRiskDetected() {
            return riskDetected;
        }

        public String getRiskLevel() {
            return riskLevel;
        }

        public String getMessage() {
            return message;
        }

        public String getMedicineName() {
            return medicineName;
        }
    }
}