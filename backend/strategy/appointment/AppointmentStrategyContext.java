package com.dentaflow.backend.strategy.appointment;

import com.dentaflow.backend.entity.Appointment;
import com.dentaflow.backend.repository.AppointmentRepository;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Context class for the Strategy Design Pattern.
 * <p>
 * Manages the registry of concrete {@link AppointmentStrategy} implementations
 * and delegates state transition validation, execution, and persistence.
 */
@Component
public class AppointmentStrategyContext {

    private final Map<String, AppointmentStrategy> strategyRegistry = new ConcurrentHashMap<>();
    private final AppointmentRepository appointmentRepository;

    public AppointmentStrategyContext(
            List<AppointmentStrategy> strategies,
            AppointmentRepository appointmentRepository) {
        this.appointmentRepository = appointmentRepository;
        for (AppointmentStrategy strategy : strategies) {
            this.strategyRegistry.put(strategy.getTargetStatus().toUpperCase(), strategy);
        }
    }

    /**
     * Resolves the concrete strategy responsible for the target status.
     *
     * @param targetStatus the desired status
     * @return matching AppointmentStrategy
     * @throws IllegalArgumentException if no strategy is registered for the status
     */
    public AppointmentStrategy getStrategy(String targetStatus) {
        if (targetStatus == null || targetStatus.trim().isEmpty()) {
            throw new IllegalArgumentException("Target status cannot be null or empty");
        }
        String key = targetStatus.trim().toUpperCase().replace("-", "_");
        AppointmentStrategy strategy = strategyRegistry.get(key);
        if (strategy == null) {
            throw new IllegalArgumentException(
                    "No AppointmentStrategy registered for status: '" + targetStatus + "'. "
                            + "Available strategies: " + strategyRegistry.keySet()
            );
        }
        return strategy;
    }

    /**
     * Executes an appointment lifecycle transition using the Strategy Pattern.
     *
     * @param appointment  the appointment entity
     * @param targetStatus the new target status
     * @param context      additional transition parameters
     * @return the saved and updated Appointment entity
     */
    public Appointment executeTransition(Appointment appointment, String targetStatus, Map<String, Object> context) {
        if (appointment == null) {
            throw new IllegalArgumentException("Appointment cannot be null for status transition");
        }

        AppointmentStrategy strategy = getStrategy(targetStatus);

        // 1. Delegate transition validation to the concrete strategy
        strategy.validateTransition(appointment);

        // 2. Delegate state-specific execution and side-effects to the concrete strategy
        Map<String, Object> ctx = context != null ? context : Collections.emptyMap();
        strategy.execute(appointment, ctx);

        // 3. Persist and return the updated entity
        return appointmentRepository.save(appointment);
    }

    /**
     * Returns a list of valid next status transitions for an appointment based on active strategies.
     *
     * @param appointment target appointment
     * @return list of permitted target statuses
     */
    public List<String> getAvailableTransitions(Appointment appointment) {
        if (appointment == null) {
            return Collections.emptyList();
        }
        String currentStatus = appointment.getStatus() != null
                ? appointment.getStatus().trim().toUpperCase().replace("-", "_")
                : "PENDING";

        return strategyRegistry.values().stream()
                .filter(s -> !s.getTargetStatus().equalsIgnoreCase(currentStatus))
                .filter(s -> s.getAllowedSourceStatuses() != null && s.getAllowedSourceStatuses().contains(currentStatus))
                .map(AppointmentStrategy::getTargetStatus)
                .sorted()
                .collect(Collectors.toList());
    }

    /**
     * Returns metadata about all registered strategies in the runtime application.
     * Useful for diagnostics, viva evaluation, and client-side transition mapping.
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
