package com.dentaflow.backend.strategy.prescription;

import com.dentaflow.backend.entity.Prescription;
import com.dentaflow.backend.repository.PrescriptionRepository;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Context class for the Prescription Strategy Design Pattern.
 * <p>
 * Manages the registry of concrete {@link PrescriptionStrategy} implementations
 * and delegates state transition validation, execution, and persistence.
 */
@Component
public class PrescriptionStrategyContext {

    private final Map<String, PrescriptionStrategy> strategyRegistry = new ConcurrentHashMap<>();
    private final PrescriptionRepository prescriptionRepository;

    public PrescriptionStrategyContext(
            List<PrescriptionStrategy> strategies,
            PrescriptionRepository prescriptionRepository) {
        this.prescriptionRepository = prescriptionRepository;
        for (PrescriptionStrategy strategy : strategies) {
            this.strategyRegistry.put(strategy.getTargetStatus().toUpperCase(), strategy);
            // Also map alias COMPLETED to DISPENSED strategy
            if ("DISPENSED".equalsIgnoreCase(strategy.getTargetStatus())) {
                this.strategyRegistry.put("COMPLETED", strategy);
            }
        }
    }

    /**
     * Resolves the concrete strategy responsible for the target prescription status.
     *
     * @param targetStatus the desired status
     * @return matching PrescriptionStrategy
     * @throws IllegalArgumentException if no strategy is registered for the status
     */
    public PrescriptionStrategy getStrategy(String targetStatus) {
        if (targetStatus == null || targetStatus.trim().isEmpty()) {
            throw new IllegalArgumentException("Target prescription status cannot be null or empty");
        }
        String key = targetStatus.trim().toUpperCase().replace("-", "_");
        PrescriptionStrategy strategy = strategyRegistry.get(key);
        if (strategy == null) {
            throw new IllegalArgumentException(
                    "No PrescriptionStrategy registered for status: '" + targetStatus + "'. "
                            + "Available strategies: " + strategyRegistry.keySet()
            );
        }
        return strategy;
    }

    /**
     * Executes a prescription lifecycle transition using the Strategy Pattern.
     *
     * @param prescription the prescription entity
     * @param targetStatus the new target status
     * @param context      additional transition parameters
     * @return the saved and updated Prescription entity
     */
    public Prescription executeTransition(Prescription prescription, String targetStatus, Map<String, Object> context) {
        if (prescription == null) {
            throw new IllegalArgumentException("Prescription cannot be null for status transition");
        }

        PrescriptionStrategy strategy = getStrategy(targetStatus);

        // 1. Delegate transition validation to the concrete strategy
        strategy.validateTransition(prescription);

        // 2. Delegate state-specific execution and side-effects to the concrete strategy
        Map<String, Object> ctx = context != null ? context : Collections.emptyMap();
        strategy.execute(prescription, ctx);

        // 3. Persist and return the updated entity
        return prescriptionRepository.save(prescription);
    }

    /**
     * Returns a list of valid next status transitions for a prescription based on active strategies.
     *
     * @param prescription target prescription
     * @return list of permitted target statuses
     */
    public List<String> getAvailableTransitions(Prescription prescription) {
        if (prescription == null) {
            return Collections.emptyList();
        }
        String currentStatus = prescription.getStatus() != null
                ? prescription.getStatus().trim().toUpperCase().replace("-", "_")
                : "ACTIVE";

        return strategyRegistry.values().stream()
                .filter(s -> !s.getTargetStatus().equalsIgnoreCase(currentStatus))
                .filter(s -> s.getAllowedSourceStatuses() != null && s.getAllowedSourceStatuses().contains(currentStatus))
                .map(PrescriptionStrategy::getTargetStatus)
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }

    /**
     * Returns metadata about all registered prescription strategies in the runtime application.
     *
     * @return list of strategy metadata maps
     */
    public List<Map<String, Object>> getRegisteredStrategiesMetadata() {
        return strategyRegistry.values().stream()
                .map(s -> {
                    Map<String, Object> meta = new LinkedHashMap<>();
                    meta.put("targetStatus", s.getTargetStatus());
                    meta.put("description", s.getDescription());
                    meta.put("allowedSourceStatuses", s.getAllowedSourceStatuses());
                    meta.put("strategyClass", s.getClass().getSimpleName());
                    return meta;
                })
                .sorted(Comparator.comparing(m -> String.valueOf(m.get("targetStatus"))))
                .distinct()
                .collect(Collectors.toList());
    }
}
