package com.dentaflow.backend.strategy.treatment;

import com.dentaflow.backend.entity.Treatment;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Concrete Strategy for PLANNED treatments.
 * Encapsulates validation and state effects for newly planned clinical procedures.
 */
@Component
public class PlannedTreatmentStrategy extends AbstractTreatmentStrategy {

    @Override
    public String getTargetStatus() {
        return "PLANNED";
    }

    @Override
    public List<String> getAllowedSourceStatuses() {
        return Arrays.asList("PLANNED", "IN_PROGRESS");
    }

    @Override
    public String getDescription() {
        return "Marks dental treatment as planned / scheduled for future clinical intervention.";
    }

    @Override
    public void validateTransition(Treatment treatment) {
        if (treatment == null) {
            throw new IllegalArgumentException("Treatment cannot be null");
        }
        String current = treatment.getStatus() != null ? treatment.getStatus().toUpperCase() : "PLANNED";
        if ("COMPLETED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Completed treatment cannot be reverted to planned");
        }
        if ("CANCELLED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Cancelled treatment cannot be reverted to planned");
        }
        super.validateTransition(treatment);
    }

    @Override
    protected void applyStateEffects(Treatment treatment, Map<String, Object> context) {
        if (context != null && context.get("dentistNotes") != null) {
            treatment.setDentistNotes(String.valueOf(context.get("dentistNotes")).trim());
        }
    }
}
