package com.dentaflow.backend.strategy.prescription;

import com.dentaflow.backend.entity.Prescription;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Concrete Strategy for ACTIVE prescriptions.
 * Encapsulates validation and state effects for newly authored dental prescriptions.
 */
@Component
public class ActivePrescriptionStrategy extends AbstractPrescriptionStrategy {

    @Override
    public String getTargetStatus() {
        return "ACTIVE";
    }

    @Override
    public List<String> getAllowedSourceStatuses() {
        return Arrays.asList("ACTIVE", "PENDING");
    }

    @Override
    public String getDescription() {
        return "Marks prescription as active, awaiting pharmacy review and dispensing.";
    }

    @Override
    public void validateTransition(Prescription prescription) {
        if (prescription == null) {
            throw new IllegalArgumentException("Prescription cannot be null");
        }
        String current = prescription.getStatus() != null ? prescription.getStatus().toUpperCase() : "ACTIVE";
        if ("DISPENSED".equalsIgnoreCase(current) || "COMPLETED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Dispensed prescription cannot be reverted to active");
        }
        if ("CANCELLED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Cancelled prescription cannot be reverted to active");
        }
        super.validateTransition(prescription);
    }

    @Override
    protected void applyStateEffects(Prescription prescription, Map<String, Object> context) {
        if (context != null && context.get("instructions") != null) {
            prescription.setInstructions(String.valueOf(context.get("instructions")).trim());
        }
    }
}
