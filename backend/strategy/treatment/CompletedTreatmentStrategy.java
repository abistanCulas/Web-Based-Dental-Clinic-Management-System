package com.dentaflow.backend.strategy.treatment;

import com.dentaflow.backend.entity.Treatment;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Concrete Strategy for COMPLETED treatments.
 * Encapsulates validation and state effects for finalizing clinical treatments and calculating costs.
 */
@Component
public class CompletedTreatmentStrategy extends AbstractTreatmentStrategy {

    @Override
    public String getTargetStatus() {
        return "COMPLETED";
    }

    @Override
    public List<String> getAllowedSourceStatuses() {
        return Arrays.asList("IN_PROGRESS", "PLANNED", "COMPLETED");
    }

    @Override
    public String getDescription() {
        return "Finalizes dental procedure, asserts actual clinical cost, and records procedure completion.";
    }

    @Override
    public void validateTransition(Treatment treatment) {
        if (treatment == null) {
            throw new IllegalArgumentException("Treatment cannot be null");
        }
        String current = treatment.getStatus() != null ? treatment.getStatus().toUpperCase() : "PLANNED";
        if ("CANCELLED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Cancelled treatment cannot be completed");
        }
        super.validateTransition(treatment);
    }

    @Override
    protected void applyStateEffects(Treatment treatment, Map<String, Object> context) {
        if (context != null && context.get("actualCost") instanceof BigDecimal) {
            treatment.setActualCost((BigDecimal) context.get("actualCost"));
        } else if (treatment.getActualCost() == null) {
            treatment.setActualCost(
                    treatment.getEstimatedCost() != null
                            ? treatment.getEstimatedCost()
                            : BigDecimal.ZERO
            );
        }

        if (context != null && context.get("dentistNotes") != null) {
            String existing = treatment.getDentistNotes() != null ? treatment.getDentistNotes() + " | " : "";
            treatment.setDentistNotes(existing + context.get("dentistNotes"));
        }
    }
}
