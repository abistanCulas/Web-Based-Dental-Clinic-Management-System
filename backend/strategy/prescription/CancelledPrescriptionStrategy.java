package com.dentaflow.backend.strategy.prescription;

import com.dentaflow.backend.entity.Prescription;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Concrete Strategy for CANCELLED prescriptions.
 * Encapsulates validation and state effects for cancelling authoring or verified prescriptions.
 */
@Component
public class CancelledPrescriptionStrategy extends AbstractPrescriptionStrategy {

    @Override
    public String getTargetStatus() {
        return "CANCELLED";
    }

    @Override
    public List<String> getAllowedSourceStatuses() {
        return Arrays.asList("ACTIVE", "VERIFIED");
    }

    @Override
    public String getDescription() {
        return "Cancels an active or verified prescription before medicine dispensing.";
    }

    @Override
    public void validateTransition(Prescription prescription) {
        if (prescription == null) {
            throw new IllegalArgumentException("Prescription cannot be null");
        }
        String current = prescription.getStatus() != null ? prescription.getStatus().toUpperCase() : "ACTIVE";
        if ("DISPENSED".equalsIgnoreCase(current) || "COMPLETED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Completed prescription cannot be cancelled");
        }
        if ("CANCELLED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Prescription is already cancelled");
        }
        super.validateTransition(prescription);
    }

    @Override
    protected void applyStateEffects(Prescription prescription, Map<String, Object> context) {
        if (context != null && context.get("reason") != null) {
            String reason = String.valueOf(context.get("reason")).trim();
            String existing = prescription.getDentistNotes() != null ? prescription.getDentistNotes() + " | Cancellation Reason: " : "Cancellation Reason: ";
            prescription.setDentistNotes(existing + reason);
        }
    }
}
