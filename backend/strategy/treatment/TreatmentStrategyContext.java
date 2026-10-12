package com.dentaflow.backend.strategy.treatment;

import com.dentaflow.backend.entity.Treatment;
import com.dentaflow.backend.repository.TreatmentRepository;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Context class for the Treatment Strategy Design Pattern.
 * <p>
 * Manages the registry of concrete {@link TreatmentStrategy} implementations
 * and delegates state transition validation, execution, and persistence.
 */
@Component
public class TreatmentStrategyContext {

    private final Map<String, TreatmentStrategy> strategyRegistry = new ConcurrentHashMap<>();
    private final TreatmentRepository treatmentRepository;

    public TreatmentStrategyContext(
            List<TreatmentStrategy> strategies,
            TreatmentRepository treatmentRepository) {
        this.treatmentRepository = treatmentRepository;
        for (TreatmentStrategy strategy : strategies) {
            this.strategyRegistry.put(strategy.getTargetStatus().toUpperCase(), strategy);
        }
    }

    /**
     * Resolves the concrete strategy responsible for the target treatment status.
     *
     * @param targetStatus the desired status
     * @return matching TreatmentStrategy
     * @throws IllegalArgumentException if no strategy is registered for the status
     */
    public TreatmentStrategy getStrategy(String targetStatus) {
        if (targetStatus == null || targetStatus.trim().isEmpty()) {
            throw new IllegalArgumentException("Target treatment status cannot be null or empty");
        }
        String key = targetStatus.trim().toUpperCase().replace("-", "_");
        TreatmentStrategy strategy = strategyRegistry.get(key);
        if (strategy == null) {
            throw new IllegalArgumentException(
                    "No TreatmentStrategy registered for status: '" + targetStatus + "'. "
                            + "Available strategies: " + strategyRegistry.keySet()
            );
        }
        return strategy;
    }

    /**
     * Executes a treatment lifecycle transition using the Strategy Pattern.
     *
     * @param treatment    the treatment entity
     * @param targetStatus the new target status
     * @param context      additional transition parameters
     * @return the saved and updated Treatment entity
     */
    public Treatment executeTransition(Treatment treatment, String targetStatus, Map<String, Object> context) {
        if (treatment == null) {
            throw new IllegalArgumentException("Treatment cannot be null for status transition");
        }

        TreatmentStrategy strategy = getStrategy(targetStatus);

        // 1. Delegate transition validation to the concrete strategy
        strategy.validateTransition(treatment);

        // 2. Delegate state-specific execution and side-effects to the concrete strategy
        Map<String, Object> ctx = context != null ? context : Collections.emptyMap();
        strategy.execute(treatment, ctx);

        // 3. Persist and return the updated entity
        return treatmentRepository.save(treatment);
    }

    /**
     * Returns a list of valid next status transitions for a treatment based on active strategies.
     *
     * @param treatment target treatment
     * @return list of permitted target statuses
     */
    public List<String> getAvailableTransitions(Treatment treatment) {
        if (treatment == null) {
            return Collections.emptyList();
        }
        String currentStatus = treatment.getStatus() != null
                ? treatment.getStatus().trim().toUpperCase().replace("-", "_")
                : "PLANNED";

        return strategyRegistry.values().stream()
                .filter(s -> !s.getTargetStatus().equalsIgnoreCase(currentStatus))
                .filter(s -> s.getAllowedSourceStatuses() != null && s.getAllowedSourceStatuses().contains(currentStatus))
                .map(TreatmentStrategy::getTargetStatus)
                .sorted()
                .collect(Collectors.toList());
    }

    /**
     * Returns metadata about all registered treatment strategies in the runtime application.
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
                .collect(Collectors.toList());
    }
}
