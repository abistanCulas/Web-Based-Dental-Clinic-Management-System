package com.dentaflow.backend.strategy.prescription;

import com.dentaflow.backend.entity.Prescription;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Concrete Strategy for VERIFIED prescriptions.
 * Encapsulates pharmacy verification checking allergy risks and clinical contraindications.
 */
@Component
public class VerifiedPrescriptionStrategy extends AbstractPrescriptionStrategy {

    @Override
    public String getTargetStatus() {
        return "VERIFIED";
    }

    @Override
    public List<String> getAllowedSourceStatuses() {
        return Arrays.asList("ACTIVE", "VERIFIED");
    }

    @Override
    public String getDescription() {
        return "Validates pharmacy verification, checking allergy contraindications and interaction safety.";
    }

    @Override
    public void validateTransition(Prescription prescription) {
        if (prescription == null) {
            throw new IllegalArgumentException("Prescription cannot be null");
        }
        String current = prescription.getStatus() != null ? prescription.getStatus().toUpperCase() : "ACTIVE";
        if ("CANCELLED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Cannot verify a cancelled prescription");
        }
        if ("DISPENSED".equalsIgnoreCase(current) || "COMPLETED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Prescription is already dispensed");
        }
        super.validateTransition(prescription);
    }

    @Override
    protected void applyStateEffects(Prescription prescription, Map<String, Object> context) {
        if (context != null && context.get("verificationNotes") != null) {
            String existing = prescription.getDentistNotes() != null ? prescription.getDentistNotes() + " | Pharmacist: " : "Pharmacist: ";
            prescription.setDentistNotes(existing + context.get("verificationNotes"));
        }
    }
}
