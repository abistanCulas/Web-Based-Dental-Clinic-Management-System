package com.dentaflow.backend.strategy.payment;

import com.dentaflow.backend.entity.Payment;

import java.util.List;
import java.util.Map;

/**
 * Base abstract class providing reusable transition validation logic
 * for concrete {@link PaymentStrategy} implementations.
 */
public abstract class AbstractPaymentStrategy implements PaymentStrategy {

    @Override
    public void validateTransition(Payment payment) {
        if (payment == null) {
            throw new IllegalArgumentException("Payment cannot be null for status transition");
        }

        String currentStatus = payment.getStatus() != null
                ? payment.getStatus().trim().toUpperCase()
                : "PENDING";

        // Idempotent transition to the same status is accepted
        if (currentStatus.equalsIgnoreCase(getTargetStatus())) {
            return;
        }

        List<String> allowedSources = getAllowedSourceStatuses();
        if (allowedSources != null && !allowedSources.isEmpty() && !allowedSources.contains(currentStatus)) {
            String identifier = payment.getPaymentReference() != null
                    ? payment.getPaymentReference()
                    : ("#" + payment.getId());

            throw new IllegalStateException(
                    String.format(
                            "Invalid transition: Cannot transition payment %s from %s to %s. Allowed previous states: %s",
                            identifier,
                            currentStatus,
                            getTargetStatus(),
                            allowedSources
                    )
            );
        }
    }

    @Override
    public void execute(Payment payment, Map<String, Object> context) {
        if (payment == null) {
            throw new IllegalArgumentException("Payment cannot be null");
        }
        payment.setStatus(getTargetStatus());
        applyStateEffects(payment, context);
    }

    /**
     * Hook method for concrete payment strategies to implement state-specific side effects.
     *
     * @param payment target payment
     * @param context contextual transition parameters
     */
    protected abstract void applyStateEffects(Payment payment, Map<String, Object> context);
}
