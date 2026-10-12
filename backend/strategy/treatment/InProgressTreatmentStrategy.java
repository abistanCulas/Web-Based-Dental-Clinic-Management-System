package com.dentaflow.backend.strategy.treatment;

import com.dentaflow.backend.entity.Treatment;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Concrete Strategy for IN_PROGRESS treatments.
 * Encapsulates validation and state effects for treatments actively underway in the operatory.
 */
@Component
public class InProgressTreatmentStrategy extends AbstractTreatmentStrategy {

    @Override
    public String getTargetStatus() {
        return "IN_PROGRESS";
    }

    @Override
    public List<String> getAllowedSourceStatuses() {
        return Arrays.asList("PLANNED", "IN_PROGRESS");
    }

    @Override
    public String getDescription() {
        return "Initiates active clinical dental procedure in the dental operatory chair.";
    }

    @Override
    public void validateTransition(Treatment treatment) {
        if (treatment == null) {
            throw new IllegalArgumentException("Treatment cannot be null");
        }
        String current = treatment.getStatus() != null ? treatment.getStatus().toUpperCase() : "PLANNED";
        if ("COMPLETED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Completed treatment cannot be started again");
        }
        if ("CANCELLED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Cancelled treatment cannot be started");
        }
        super.validateTransition(treatment);
    }

    @Override
    protected void applyStateEffects(Treatment treatment, Map<String, Object> context) {
        if (treatment.getTreatmentDate() == null) {
            treatment.setTreatmentDate(LocalDate.now());
        }
        if (context != null && context.get("dentistNotes") != null) {
            String existing = treatment.getDentistNotes() != null ? treatment.getDentistNotes() + " | " : "";
            treatment.setDentistNotes(existing + context.get("dentistNotes"));
        }
    }
}
