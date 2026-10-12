package com.dentaflow.backend.strategy.payment;

import com.dentaflow.backend.entity.Bill;
import com.dentaflow.backend.entity.Notification;
import com.dentaflow.backend.entity.Patient;
import com.dentaflow.backend.entity.Payment;
import com.dentaflow.backend.repository.BillRepository;
import com.dentaflow.backend.service.EmailService;
import com.dentaflow.backend.service.NotificationService;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Concrete Strategy for SUCCESS payments.
 * Encapsulates validation against bill balance, updates bill settlement amounts,
 * and dispatches customer receipts and accounting alerts.
 */
@Component
public class SuccessPaymentStrategy extends AbstractPaymentStrategy {

    private final BillRepository billRepository;
    private final EmailService emailService;
    private final NotificationService notificationService;

    public SuccessPaymentStrategy(
            BillRepository billRepository,
            EmailService emailService,
            NotificationService notificationService) {
        this.billRepository = billRepository;
        this.emailService = emailService;
        this.notificationService = notificationService;
    }

    @Override
    public String getTargetStatus() {
        return "SUCCESS";
    }

    @Override
    public List<String> getAllowedSourceStatuses() {
        return Arrays.asList("PENDING", "FAILED", "SUCCESS");
    }

    @Override
    public String getDescription() {
        return "Validates payment against bill balance, updates bill settlement amounts, and dispatches customer receipts.";
    }

    @Override
    public void validateTransition(Payment payment) {
        if (payment == null) {
            throw new IllegalArgumentException("Payment cannot be null");
        }
        String current = payment.getStatus() != null ? payment.getStatus().toUpperCase() : "PENDING";
        if ("CANCELLED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Cancelled payment cannot be verified");
        }
        if ("REFUNDED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Refunded payment cannot be verified");
        }

        Bill bill = payment.getBill();
        if (bill == null) {
            throw new RuntimeException("Payment is not linked to a bill");
        }

        BigDecimal paymentAmount = payment.getAmount() != null ? payment.getAmount() : BigDecimal.ZERO;
        if (paymentAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Payment amount must be greater than zero");
        }

        // Prevent overpayment if transitioning from PENDING/FAILED to SUCCESS
        if (!"SUCCESS".equalsIgnoreCase(current)) {
            BigDecimal currentPaid = bill.getPaidAmount() != null ? bill.getPaidAmount() : BigDecimal.ZERO;
            BigDecimal totalAmount = bill.getTotalAmount() != null ? bill.getTotalAmount() : BigDecimal.ZERO;
            BigDecimal newPaid = currentPaid.add(paymentAmount);

            if (newPaid.compareTo(totalAmount) > 0) {
                throw new RuntimeException("Payment would exceed the bill total");
            }
        }

        super.validateTransition(payment);
    }

    @Override
    protected void applyStateEffects(Payment payment, Map<String, Object> context) {
        if (payment.getPaymentDate() == null) {
            payment.setPaymentDate(LocalDateTime.now());
        }

        Bill bill = payment.getBill();
        if (bill != null) {
            BigDecimal paymentAmount = payment.getAmount() != null ? payment.getAmount() : BigDecimal.ZERO;
            BigDecimal currentPaid = bill.getPaidAmount() != null ? bill.getPaidAmount() : BigDecimal.ZERO;
            BigDecimal totalAmount = bill.getTotalAmount() != null ? bill.getTotalAmount() : BigDecimal.ZERO;

            BigDecimal newPaid = currentPaid.add(paymentAmount);
            bill.setPaidAmount(newPaid);

            BigDecimal newBalance = totalAmount.subtract(newPaid);
            if (newBalance.compareTo(BigDecimal.ZERO) < 0) {
                newBalance = BigDecimal.ZERO;
            }
            bill.setBalanceAmount(newBalance);

            if (newBalance.compareTo(BigDecimal.ZERO) == 0) {
                bill.setStatus("PAID");
            } else if (newPaid.compareTo(BigDecimal.ZERO) > 0) {
                bill.setStatus("PARTIALLY_PAID");
            } else {
                bill.setStatus("UNPAID");
            }

            if (billRepository != null) {
                billRepository.save(bill);
            }

            // Post-payment receipt notifications & email
            try {
                if (bill.getPatient() != null) {
                    Patient patient = bill.getPatient();
                    String pEmail = (patient.getUser() != null && patient.getUser().getEmail() != null)
                            ? patient.getUser().getEmail() : patient.getEmail();
                    String pName = (patient.getFirstName() + " " + (patient.getLastName() != null ? patient.getLastName() : "")).trim();
                    Double amt = payment.getAmount() != null ? payment.getAmount().doubleValue() : 0.0;

                    if (pEmail != null && !pEmail.isEmpty() && emailService != null) {
                        emailService.sendPaymentReceipt(
                                pEmail,
                                pName,
                                payment.getPaymentReference(),
                                amt,
                                payment.getPaymentMethod(),
                                payment.getPaymentDate() != null ? payment.getPaymentDate().toString() : "Today"
                        );
                    }

                    if (patient.getUser() != null && notificationService != null) {
                        Notification notif = new Notification();
                        notif.setTitle("Payment Received");
                        notif.setMessage("Payment of $" + String.format("%.2f", amt) + " for invoice "
                                + bill.getBillNumber() + " was processed successfully (" + payment.getPaymentReference() + ").");
                        notif.setType("BILLING");
                        notif.setReferenceType("BILL");
                        notif.setReferenceId(bill.getId());
                        notificationService.createNotification(notif, patient.getUser().getId());
                    }
                }
            } catch (Exception ex) {
                System.err.println("Notice: SuccessPaymentStrategy notification warning: " + ex.getMessage());
            }
        }
    }
}
