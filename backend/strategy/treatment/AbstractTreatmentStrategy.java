package com.dentaflow.backend.strategy.treatment;

import com.dentaflow.backend.entity.Treatment;

import java.util.List;
import java.util.Map;

/**
 * Base abstract class providing reusable transition validation logic
 * for concrete {@link TreatmentStrategy} implementations.
 */
public abstract class AbstractTreatmentStrategy implements TreatmentStrategy {

    @Override
    public void validateTransition(Treatment treatment) {
        if (treatment == null) {
            throw new IllegalArgumentException("Treatment cannot be null for status transition");
        }

        String currentStatus = treatment.getStatus() != null
                ? treatment.getStatus().trim().toUpperCase()
                : "PLANNED";

        // Idempotent transition to the same status is accepted
        if (currentStatus.equalsIgnoreCase(getTargetStatus())) {
            return;
        }

        List<String> allowedSources = getAllowedSourceStatuses();
        if (allowedSources != null && !allowedSources.isEmpty() && !allowedSources.contains(currentStatus)) {
            String identifier = treatment.getTreatmentCode() != null
                    ? treatment.getTreatmentCode()
                    : ("#" + treatment.getId());

            throw new IllegalStateException(
                    String.format(
                            "Invalid transition: Cannot transition treatment %s from %s to %s. Allowed previous states: %s",
                            identifier,
                            currentStatus,
                            getTargetStatus(),
                            allowedSources
                    )
            );
        }
    }

    @Override
    public void execute(Treatment treatment, Map<String, Object> context) {
        if (treatment == null) {
            throw new IllegalArgumentException("Treatment cannot be null");
        }
        treatment.setStatus(getTargetStatus());
        applyStateEffects(treatment, context);
    }

    /**
     * Hook method for concrete treatment strategies to implement state-specific side effects.
     *
     * @param treatment target treatment
     * @param context   contextual transition parameters
     */
    protected abstract void applyStateEffects(Treatment treatment, Map<String, Object> context);
}
