package com.dentaflow.backend.strategy.payment;

import com.dentaflow.backend.entity.Payment;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Concrete Strategy for FAILED payments.
 * Encapsulates validation and captures gateway failure diagnostics.
 */
@Component
public class FailedPaymentStrategy extends AbstractPaymentStrategy {

    @Override
    public String getTargetStatus() {
        return "FAILED";
    }

    @Override
    public List<String> getAllowedSourceStatuses() {
        return Arrays.asList("PENDING", "FAILED");
    }

    @Override
    public String getDescription() {
        return "Records failed payment transaction and captures gateway error diagnostics.";
    }

    @Override
    public void validateTransition(Payment payment) {
        if (payment == null) {
            throw new IllegalArgumentException("Payment cannot be null");
        }
        String current = payment.getStatus() != null ? payment.getStatus().toUpperCase() : "PENDING";
        if ("SUCCESS".equalsIgnoreCase(current)) {
            throw new RuntimeException("Successful payment cannot be marked as failed");
        }
        super.validateTransition(payment);
    }

    @Override
    protected void applyStateEffects(Payment payment, Map<String, Object> context) {
        if (context != null && context.get("gatewayResponse") != null) {
            payment.setGatewayResponse(String.valueOf(context.get("gatewayResponse")).trim());
        }
    }
}
