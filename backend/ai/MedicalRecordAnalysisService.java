package com.dentaflow.backend.ai;

import com.dentaflow.backend.entity.MedicalRecord;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class MedicalRecordAnalysisService {

    // =========================================================
    // ANALYZE MEDICAL RECORDS
    // =========================================================

    public MedicalRecordAnalysisResult analyzeRecords(
            List<MedicalRecord> records) {

        if (records == null || records.isEmpty()) {

            return new MedicalRecordAnalysisResult(
                    0,
                    "No medical records available.",
                    new ArrayList<>(),
                    new ArrayList<>(),
                    new ArrayList<>(),
                    new ArrayList<>()
            );
        }

        List<String> diagnoses = new ArrayList<>();
        List<String> symptoms = new ArrayList<>();
        List<String> allergies = new ArrayList<>();
        List<String> medicalConditions = new ArrayList<>();

        for (MedicalRecord record : records) {

            if (record == null) {
                continue;
            }

            // -------------------------------------------------
            // DIAGNOSIS
            // -------------------------------------------------

            if (record.getDiagnosis() != null &&
                    !record.getDiagnosis().trim().isEmpty()) {

                addIfNotExists(
                        diagnoses,
                        record.getDiagnosis()
                );
            }

            // -------------------------------------------------
            // SYMPTOMS
            // -------------------------------------------------

            if (record.getSymptoms() != null &&
                    !record.getSymptoms().trim().isEmpty()) {

                addIfNotExists(
                        symptoms,
                        record.getSymptoms()
                );
            }

            // -------------------------------------------------
            // ALLERGIES
            // -------------------------------------------------

            if (record.getAllergies() != null &&
                    !record.getAllergies().trim().isEmpty()) {

                addIfNotExists(
                        allergies,
                        record.getAllergies()
                );
            }

            // -------------------------------------------------
            // MEDICAL CONDITIONS
            // -------------------------------------------------

            if (record.getMedicalConditions() != null &&
                    !record.getMedicalConditions()
                            .trim()
                            .isEmpty()) {

                addIfNotExists(
                        medicalConditions,
                        record.getMedicalConditions()
                );
            }
        }

        String summary =
                generateSummary(
                        records.size(),
                        diagnoses,
                        symptoms,
                        allergies,
                        medicalConditions
                );

        return new MedicalRecordAnalysisResult(
                records.size(),
                summary,
                diagnoses,
                symptoms,
                allergies,
                medicalConditions
        );
    }

    // =========================================================
    // GENERATE SUMMARY
    // =========================================================

    private String generateSummary(
            int recordCount,
            List<String> diagnoses,
            List<String> symptoms,
            List<String> allergies,
            List<String> medicalConditions) {

        StringBuilder summary =
                new StringBuilder();

        summary.append(
                "Patient has "
        );

        summary.append(recordCount);

        summary.append(
                " medical record(s). "
        );

        // -----------------------------------------------------
        // DIAGNOSIS SUMMARY
        // -----------------------------------------------------

        if (!diagnoses.isEmpty()) {

            summary.append(
                    "Previous diagnoses include: "
            );

            summary.append(
                    String.join(
                            ", ",
                            diagnoses
                    )
            );

            summary.append(". ");
        }

        // -----------------------------------------------------
        // SYMPTOM SUMMARY
        // -----------------------------------------------------

        if (!symptoms.isEmpty()) {

            summary.append(
                    "Previously reported symptoms include: "
            );

            summary.append(
                    String.join(
                            ", ",
                            symptoms
                    )
            );

            summary.append(". ");
        }

        // -----------------------------------------------------
        // ALLERGY SUMMARY
        // -----------------------------------------------------

        if (!allergies.isEmpty()) {

            summary.append(
                    "Important allergy information: "
            );

            summary.append(
                    String.join(
                            ", ",
                            allergies
                    )
            );

            summary.append(". ");
        }

        // -----------------------------------------------------
        // MEDICAL CONDITION SUMMARY
        // -----------------------------------------------------

        if (!medicalConditions.isEmpty()) {

            summary.append(
                    "Relevant medical conditions include: "
            );

            summary.append(
                    String.join(
                            ", ",
                            medicalConditions
                    )
            );

            summary.append(". ");
        }

        if (diagnoses.isEmpty()
                && symptoms.isEmpty()
                && allergies.isEmpty()
                && medicalConditions.isEmpty()) {

            summary.append(
                    "No significant clinical information "
                            + "was recorded."
            );
        }

        return summary.toString().trim();
    }

    // =========================================================
    // ADD UNIQUE VALUE
    // =========================================================

    private void addIfNotExists(
            List<String> list,
            String value) {

        String cleanedValue =
                value.trim();

        for (String existing : list) {

            if (existing.equalsIgnoreCase(
                    cleanedValue
            )) {

                return;
            }
        }

        list.add(cleanedValue);
    }

    // =========================================================
    // RESULT CLASS
    // =========================================================

    public static class MedicalRecordAnalysisResult {

        private final int recordCount;

        private final String summary;

        private final List<String> diagnoses;

        private final List<String> symptoms;

        private final List<String> allergies;

        private final List<String> medicalConditions;

        public MedicalRecordAnalysisResult(
                int recordCount,
                String summary,
                List<String> diagnoses,
                List<String> symptoms,
                List<String> allergies,
                List<String> medicalConditions) {

            this.recordCount = recordCount;
            this.summary = summary;
            this.diagnoses = diagnoses;
            this.symptoms = symptoms;
            this.allergies = allergies;
            this.medicalConditions =
                    medicalConditions;
        }

        public int getRecordCount() {
            return recordCount;
        }

        public String getSummary() {
            return summary;
        }

        public List<String> getDiagnoses() {
            return diagnoses;
        }

        public List<String> getSymptoms() {
            return symptoms;
        }

        public List<String> getAllergies() {
            return allergies;
        }

        public List<String> getMedicalConditions() {
            return medicalConditions;
        }
    }
}