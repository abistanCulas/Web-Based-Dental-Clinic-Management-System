package com.dentaflow.backend.strategy.payment;

import com.dentaflow.backend.entity.Bill;
import com.dentaflow.backend.entity.Payment;
import com.dentaflow.backend.repository.BillRepository;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Concrete Strategy for REFUNDED payments.
 * Encapsulates patient payment refund rules, ledger balance restoration, and refund audit records.
 */
@Component
public class RefundedPaymentStrategy extends AbstractPaymentStrategy {

    private final BillRepository billRepository;

    public RefundedPaymentStrategy(BillRepository billRepository) {
        this.billRepository = billRepository;
    }

    @Override
    public String getTargetStatus() {
        return "REFUNDED";
    }

    @Override
    public List<String> getAllowedSourceStatuses() {
        return Arrays.asList("SUCCESS", "REFUND_PENDING", "PARTIALLY_REFUNDED", "REFUNDED");
    }

    @Override
    public String getDescription() {
        return "Processes patient payment refund, restores bill balance, and records audit trail.";
    }

    @Override
    public void validateTransition(Payment payment) {
        validateTransition(payment, null);
    }

    @Override
    public void validateTransition(Payment payment, Map<String, Object> context) {
        if (payment == null) {
            throw new IllegalArgumentException("Payment cannot be null");
        }
        String current = payment.getStatus() != null ? payment.getStatus().toUpperCase() : "PENDING";
        if (!"SUCCESS".equalsIgnoreCase(current) &&
                !"REFUND_PENDING".equalsIgnoreCase(current) &&
                !"PARTIALLY_REFUNDED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Only successful or partially refunded payments can be refunded");
        }

        BigDecimal refundAmount = context != null && context.get("refundAmount") instanceof BigDecimal
                ? (BigDecimal) context.get("refundAmount")
                : (context != null && context.get("refundAmount") instanceof Number
                ? BigDecimal.valueOf(((Number) context.get("refundAmount")).doubleValue())
                : payment.getAmount());

        if (refundAmount == null || refundAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Refund amount must be greater than zero");
        }

        BigDecimal paymentAmount = payment.getAmount() != null ? payment.getAmount() : BigDecimal.ZERO;
        BigDecimal existingRefund = payment.getRefundAmount() != null ? payment.getRefundAmount() : BigDecimal.ZERO;
        BigDecimal availableRefund = paymentAmount.subtract(existingRefund);

        if (refundAmount.compareTo(availableRefund) > 0) {
            throw new RuntimeException("Refund amount cannot exceed the refundable payment amount");
        }

        super.validateTransition(payment);
    }

    @Override
    protected void applyStateEffects(Payment payment, Map<String, Object> context) {
        BigDecimal paymentAmount = payment.getAmount() != null ? payment.getAmount() : BigDecimal.ZERO;
        BigDecimal existingRefund = payment.getRefundAmount() != null ? payment.getRefundAmount() : BigDecimal.ZERO;

        BigDecimal refundAmount = context != null && context.get("refundAmount") instanceof BigDecimal
                ? (BigDecimal) context.get("refundAmount")
                : (context != null && context.get("refundAmount") instanceof Number
                ? BigDecimal.valueOf(((Number) context.get("refundAmount")).doubleValue())
                : paymentAmount.subtract(existingRefund));

        BigDecimal newRefundAmount = existingRefund.add(refundAmount);
        payment.setRefundAmount(newRefundAmount);
        payment.setRefundedAt(LocalDateTime.now());

        if (payment.getRefundReference() == null || payment.getRefundReference().trim().isEmpty()) {
            payment.setRefundReference("REF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        }

        if (context != null && context.get("refundReason") != null) {
            payment.setRefundReason(String.valueOf(context.get("refundReason")).trim());
        }

        if (newRefundAmount.compareTo(paymentAmount) == 0) {
            payment.setStatus("REFUNDED");
        } else {
            payment.setStatus("REFUND_PENDING");
        }

        // Adjust bill amounts
        Bill bill = payment.getBill();
        if (bill != null && billRepository != null) {
            BigDecimal currentPaid = bill.getPaidAmount() != null ? bill.getPaidAmount() : BigDecimal.ZERO;
            BigDecimal updatedPaid = currentPaid.subtract(refundAmount);
            if (updatedPaid.compareTo(BigDecimal.ZERO) < 0) {
                updatedPaid = BigDecimal.ZERO;
            }
            bill.setPaidAmount(updatedPaid);

            BigDecimal totalAmount = bill.getTotalAmount() != null ? bill.getTotalAmount() : BigDecimal.ZERO;
            BigDecimal balance = totalAmount.subtract(updatedPaid);
            if (balance.compareTo(BigDecimal.ZERO) < 0) {
                balance = BigDecimal.ZERO;
            }
            bill.setBalanceAmount(balance);

            if (balance.compareTo(BigDecimal.ZERO) == 0) {
                bill.setStatus("PAID");
            } else if (updatedPaid.compareTo(BigDecimal.ZERO) > 0) {
                bill.setStatus("PARTIALLY_PAID");
            } else {
                bill.setStatus("UNPAID");
            }

            billRepository.save(bill);
        }
    }
}
