package com.dentaflow.backend.strategy.payment;

import com.dentaflow.backend.entity.Payment;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Concrete Strategy for PENDING payments.
 * Encapsulates validation and state effects for newly initiated payment transactions.
 */
@Component
public class PendingPaymentStrategy extends AbstractPaymentStrategy {

    @Override
    public String getTargetStatus() {
        return "PENDING";
    }

    @Override
    public List<String> getAllowedSourceStatuses() {
        return Arrays.asList("PENDING");
    }

    @Override
    public String getDescription() {
        return "Initializes pending payment transaction awaiting customer settlement or gateway clearance.";
    }

    @Override
    public void validateTransition(Payment payment) {
        if (payment == null) {
            throw new IllegalArgumentException("Payment cannot be null");
        }
        if (payment.getAmount() == null || payment.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Payment amount must be greater than zero");
        }
        if (payment.getBill() != null && "CANCELLED".equalsIgnoreCase(payment.getBill().getStatus())) {
            throw new RuntimeException("Cannot make payment on a cancelled bill");
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
