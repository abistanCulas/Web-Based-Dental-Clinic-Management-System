package com.dentaflow.backend.ai;

import com.dentaflow.backend.entity.Medicine;
import com.dentaflow.backend.entity.Patient;
import com.dentaflow.backend.repository.MedicineRepository;
import com.dentaflow.backend.repository.PatientRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class MedicationAllergyWarningService {

    private final PatientRepository patientRepository;
    private final MedicineRepository medicineRepository;

    public MedicationAllergyWarningService(
            PatientRepository patientRepository,
            MedicineRepository medicineRepository) {

        this.patientRepository = patientRepository;
        this.medicineRepository = medicineRepository;
    }

    // =========================================================
    // CHECK PATIENT MEDICATION ALLERGY
    // =========================================================

    public String checkAllergyWarning(
            Long patientId,
            Long medicineId) {

        if (patientId == null) {
            throw new RuntimeException(
                    "Patient ID is required"
            );
        }

        if (medicineId == null) {
            throw new RuntimeException(
                    "Medicine ID is required"
            );
        }

        Patient patient =
                patientRepository.findById(patientId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Patient not found with id: "
                                                + patientId
                                ));

        Medicine medicine =
                medicineRepository.findById(medicineId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Medicine not found with id: "
                                                + medicineId
                                ));

        String allergies = patient.getAllergies();

        // No allergy information recorded
        if (allergies == null ||
                allergies.trim().isEmpty()) {

            return "NO_WARNING";
        }

        String medicineName =
                medicine.getName();

        String genericName =
                medicine.getGenericName();

        String brandName =
                medicine.getBrandName();

        String allergyWarning =
                medicine.getAllergyWarning();

        String patientAllergies =
                allergies.toLowerCase();

        // =====================================================
        // CHECK MEDICINE NAME
        // =====================================================

        if (containsIgnoreCase(
                patientAllergies,
                medicineName)) {

            return buildWarning(
                    patient,
                    medicine,
                    medicineName
            );
        }

        // =====================================================
        // CHECK GENERIC NAME
        // =====================================================

        if (genericName != null &&
                containsIgnoreCase(
                        patientAllergies,
                        genericName)) {

            return buildWarning(
                    patient,
                    medicine,
                    genericName
            );
        }

        // =====================================================
        // CHECK BRAND NAME
        // =====================================================

        if (brandName != null &&
                containsIgnoreCase(
                        patientAllergies,
                        brandName)) {

            return buildWarning(
                    patient,
                    medicine,
                    brandName
            );
        }

        // =====================================================
        // CHECK MEDICINE ALLERGY WARNING
        // =====================================================

        if (allergyWarning != null &&
                containsAnyAllergy(
                        patientAllergies,
                        allergyWarning)) {

            return buildWarning(
                    patient,
                    medicine,
                    allergyWarning
            );
        }

        return "NO_WARNING";
    }

    // =========================================================
    // CHECK WHETHER WARNING EXISTS
    // =========================================================

    public boolean hasAllergyWarning(
            Long patientId,
            Long medicineId) {

        return !"NO_WARNING".equals(
                checkAllergyWarning(
                        patientId,
                        medicineId
                )
        );
    }

    // =========================================================
    // BUILD WARNING
    // =========================================================

    private String buildWarning(
            Patient patient,
            Medicine medicine,
            String matchedValue) {

        return "⚠️ ALLERGY WARNING: Patient "
                + patient.getFirstName()
                + " "
                + patient.getLastName()
                + " has a recorded allergy related to "
                + matchedValue
                + ". Please review before prescribing "
                + medicine.getName()
                + ". Final prescribing decision must be made by the dentist.";
    }

    // =========================================================
    // CASE-INSENSITIVE MATCH
    // =========================================================

    private boolean containsIgnoreCase(
            String source,
            String value) {

        if (value == null ||
                value.trim().isEmpty()) {

            return false;
        }

        return source.contains(
                value.trim().toLowerCase()
        );
    }

    // =========================================================
    // CHECK ALLERGY WARNING TEXT
    // =========================================================

    private boolean containsAnyAllergy(
            String patientAllergies,
            String warningText) {

        String[] allergyWords =
                patientAllergies
                        .split("[,;]");

        for (String allergy : allergyWords) {

            String trimmed =
                    allergy.trim();

            if (!trimmed.isEmpty() &&
                    warningText
                            .toLowerCase()
                            .contains(trimmed)) {

                return true;
            }
        }

        return false;
    }
}