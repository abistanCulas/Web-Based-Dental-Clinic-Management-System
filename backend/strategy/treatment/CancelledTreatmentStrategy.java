package com.dentaflow.backend.strategy.treatment;

import com.dentaflow.backend.entity.Treatment;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Concrete Strategy for CANCELLED treatments.
 * Encapsulates validation and state effects for cancelling planned or in-progress clinical treatments.
 */
@Component
public class CancelledTreatmentStrategy extends AbstractTreatmentStrategy {

    @Override
    public String getTargetStatus() {
        return "CANCELLED";
    }

    @Override
    public List<String> getAllowedSourceStatuses() {
        return Arrays.asList("PLANNED", "IN_PROGRESS");
    }

    @Override
    public String getDescription() {
        return "Cancels planned or in-progress clinical dental treatment.";
    }

    @Override
    public void validateTransition(Treatment treatment) {
        if (treatment == null) {
            throw new IllegalArgumentException("Treatment cannot be null");
        }
        String current = treatment.getStatus() != null ? treatment.getStatus().toUpperCase() : "PLANNED";
        if ("COMPLETED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Completed treatment cannot be cancelled");
        }
        if ("CANCELLED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Treatment is already cancelled");
        }
        super.validateTransition(treatment);
    }

    @Override
    protected void applyStateEffects(Treatment treatment, Map<String, Object> context) {
        if (context != null && context.get("reason") != null) {
            String reason = String.valueOf(context.get("reason")).trim();
            String existing = treatment.getDentistNotes() != null ? treatment.getDentistNotes() + " | Cancellation Reason: " : "Cancellation Reason: ";
            treatment.setDentistNotes(existing + reason);
        }
    }
}
