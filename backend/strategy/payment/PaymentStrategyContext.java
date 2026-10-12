package com.dentaflow.backend.strategy.payment;

import com.dentaflow.backend.entity.Payment;
import com.dentaflow.backend.repository.PaymentRepository;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Context class for the Payment Strategy Design Pattern.
 * <p>
 * Manages the registry of concrete {@link PaymentStrategy} implementations
 * and delegates state transition validation, execution, and persistence.
 */
@Component
public class PaymentStrategyContext {

    private final Map<String, PaymentStrategy> strategyRegistry = new ConcurrentHashMap<>();
    private final PaymentRepository paymentRepository;

    public PaymentStrategyContext(
            List<PaymentStrategy> strategies,
            PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
        for (PaymentStrategy strategy : strategies) {
            this.strategyRegistry.put(strategy.getTargetStatus().toUpperCase(), strategy);
            if ("REFUNDED".equalsIgnoreCase(strategy.getTargetStatus())) {
                this.strategyRegistry.put("REFUND_PENDING", strategy);
            }
        }
    }

    /**
     * Resolves the concrete strategy responsible for the target payment status.
     *
     * @param targetStatus the desired status
     * @return matching PaymentStrategy
     * @throws IllegalArgumentException if no strategy is registered for the status
     */
    public PaymentStrategy getStrategy(String targetStatus) {
        if (targetStatus == null || targetStatus.trim().isEmpty()) {
            throw new IllegalArgumentException("Target payment status cannot be null or empty");
        }
        String key = targetStatus.trim().toUpperCase().replace("-", "_");
        PaymentStrategy strategy = strategyRegistry.get(key);
        if (strategy == null) {
            throw new IllegalArgumentException(
                    "No PaymentStrategy registered for status: '" + targetStatus + "'. "
                            + "Available strategies: " + strategyRegistry.keySet()
            );
        }
        return strategy;
    }

    /**
     * Executes a payment lifecycle transition using the Strategy Pattern.
     *
     * @param payment      the payment entity
     * @param targetStatus the new target status
     * @param context      additional transition parameters
     * @return the saved and updated Payment entity
     */
    public Payment executeTransition(Payment payment, String targetStatus, Map<String, Object> context) {
        if (payment == null) {
            throw new IllegalArgumentException("Payment cannot be null for status transition");
        }

        PaymentStrategy strategy = getStrategy(targetStatus);

        Map<String, Object> ctx = context != null ? context : Collections.emptyMap();

        // 1. Delegate transition validation to the concrete strategy
        strategy.validateTransition(payment, ctx);

        // 2. Delegate state-specific execution and side-effects to the concrete strategy
        strategy.execute(payment, ctx);

        // 3. Persist and return the updated entity
        return paymentRepository.save(payment);
    }

    /**
     * Returns a list of valid next status transitions for a payment based on active strategies.
     *
     * @param payment target payment
     * @return list of permitted target statuses
     */
    public List<String> getAvailableTransitions(Payment payment) {
        if (payment == null) {
            return Collections.emptyList();
        }
        String currentStatus = payment.getStatus() != null
                ? payment.getStatus().trim().toUpperCase().replace("-", "_")
                : "PENDING";

        return strategyRegistry.values().stream()
                .filter(s -> !s.getTargetStatus().equalsIgnoreCase(currentStatus))
                .filter(s -> s.getAllowedSourceStatuses() != null && s.getAllowedSourceStatuses().contains(currentStatus))
                .map(PaymentStrategy::getTargetStatus)
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }

    /**
     * Returns metadata about all registered payment strategies in the runtime application.
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
