package com.dentaflow.backend.strategy.payment;

import com.dentaflow.backend.entity.Payment;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Concrete Strategy for CANCELLED payments.
 * Encapsulates validation and cancellation of pending or unverified payments.
 */
@Component
public class CancelledPaymentStrategy extends AbstractPaymentStrategy {

    @Override
    public String getTargetStatus() {
        return "CANCELLED";
    }

    @Override
    public List<String> getAllowedSourceStatuses() {
        return Arrays.asList("PENDING", "FAILED");
    }

    @Override
    public String getDescription() {
        return "Cancels an unverified or pending payment transaction.";
    }

    @Override
    public void validateTransition(Payment payment) {
        if (payment == null) {
            throw new IllegalArgumentException("Payment cannot be null");
        }
        String current = payment.getStatus() != null ? payment.getStatus().toUpperCase() : "PENDING";
        if ("SUCCESS".equalsIgnoreCase(current)) {
            throw new RuntimeException("Successful payment cannot be cancelled");
        }
        if ("REFUNDED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Refunded payment cannot be cancelled");
        }
        if ("CANCELLED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Payment is already cancelled");
        }
        super.validateTransition(payment);
    }

    @Override
    protected void applyStateEffects(Payment payment, Map<String, Object> context) {
        if (context != null && context.get("notes") != null) {
            payment.setNotes(String.valueOf(context.get("notes")).trim());
        }
    }
}
