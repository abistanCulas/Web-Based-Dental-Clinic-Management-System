package com.dentaflow.backend.enums;

import java.util.Set;

/**
 * Canonical record categories for DentaFlow patient clinical / medical records.
 */
public enum RecordCategory {
    TREATMENT("Treatment / Operative"),
    EXAMINATION("Clinical Examination"),
    DIAGNOSIS("Clinical Diagnosis"),
    RADIOGRAPH("Radiograph (X-Ray / 3D CT)"),
    CONSULTATION("General Consultation"),
    FOLLOW_UP("Follow-Up"),
    GENERAL("General"),
    OPERATIVE("Operative");

    private final String displayName;

    RecordCategory(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }

    public static final Set<String> ALLOWED_CATEGORIES = Set.of(
            "TREATMENT",
            "EXAMINATION",
            "DIAGNOSIS",
            "RADIOGRAPH",
            "CONSULTATION",
            "GENERAL",
            "OPERATIVE",
            "TREATMENT / OPERATIVE",
            "FOLLOW-UP"
    );

    /**
     * Checks if the given category string is a valid canonical or alias category.
     */
    public static boolean isValid(String category) {
        if (category == null || category.trim().isEmpty()) {
            return false;
        }
        String normalized = normalize(category);
        return ALLOWED_CATEGORIES.contains(normalized);
    }

    /**
     * Normalizes input strings, aliases, and display values to canonical backend categories.
     */
    public static String normalize(String category) {
        if (category == null) {
            return null;
        }
        String u = category.trim().toUpperCase();

        if (u.equals("X-RAY") || u.equals("RADIOLOGY") || u.equals("IMAGING") || u.contains("RADIOGRAPH")) {
            return "RADIOGRAPH";
        }
        if (u.equals("EXAM") || u.equals("EVALUATION") || u.equals("CLINICAL EXAMINATION")) {
            return "EXAMINATION";
        }
        if (u.equals("CONSULT") || u.equals("GENERAL CONSULTATION")) {
            return "CONSULTATION";
        }
        if (u.equals("FOLLOW UP") || u.equals("FOLLOW_UP") || u.equals("FOLLOWUP")) {
            return "FOLLOW-UP";
        }
        if (u.equals("TREATMENT / OPERATIVE") || u.equals("OPERATIVE") || u.equals("PROCEDURE")) {
            return "TREATMENT";
        }
        return u;
    }
}
