package com.dentaflow.backend.strategy.prescription;

import com.dentaflow.backend.entity.Prescription;

import java.util.List;
import java.util.Map;

/**
 * Base abstract class providing reusable transition validation logic
 * for concrete {@link PrescriptionStrategy} implementations.
 */
public abstract class AbstractPrescriptionStrategy implements PrescriptionStrategy {

    @Override
    public void validateTransition(Prescription prescription) {
        if (prescription == null) {
            throw new IllegalArgumentException("Prescription cannot be null for status transition");
        }

        String currentStatus = prescription.getStatus() != null
                ? prescription.getStatus().trim().toUpperCase()
                : "ACTIVE";

        // Idempotent transition to the same status is accepted
        if (currentStatus.equalsIgnoreCase(getTargetStatus())) {
            return;
        }

        List<String> allowedSources = getAllowedSourceStatuses();
        if (allowedSources != null && !allowedSources.isEmpty() && !allowedSources.contains(currentStatus)) {
            String identifier = prescription.getPrescriptionCode() != null
                    ? prescription.getPrescriptionCode()
                    : ("#" + prescription.getId());

            throw new IllegalStateException(
                    String.format(
                            "Invalid transition: Cannot transition prescription %s from %s to %s. Allowed previous states: %s",
                            identifier,
                            currentStatus,
                            getTargetStatus(),
                            allowedSources
                    )
            );
        }
    }

    @Override
    public void execute(Prescription prescription, Map<String, Object> context) {
        if (prescription == null) {
            throw new IllegalArgumentException("Prescription cannot be null");
        }
        prescription.setStatus(getTargetStatus());
        applyStateEffects(prescription, context);
    }

    /**
     * Hook method for concrete prescription strategies to implement state-specific side effects.
     *
     * @param prescription target prescription
     * @param context      contextual transition parameters
     */
    protected abstract void applyStateEffects(Prescription prescription, Map<String, Object> context);
}
