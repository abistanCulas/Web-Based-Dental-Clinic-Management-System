package com.dentaflow.backend.service;

import com.dentaflow.backend.entity.Bill;
import com.dentaflow.backend.entity.Payment;
import com.dentaflow.backend.repository.BillRepository;
import com.dentaflow.backend.repository.PaymentRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final BillRepository billRepository;

    public PaymentService(
            PaymentRepository paymentRepository,
            BillRepository billRepository) {

        this.paymentRepository = paymentRepository;
        this.billRepository = billRepository;
    }

    // =========================================================
    // CREATE PAYMENT
    // =========================================================

    public Payment createPayment(
            Long billId,
            Payment payment) {

        if (billId == null) {
            throw new RuntimeException(
                    "Bill ID is required"
            );
        }

        if (payment == null) {
            throw new RuntimeException(
                    "Payment data is required"
            );
        }

        Bill bill = billRepository.findById(billId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Bill not found with id: "
                                        + billId
                        ));

        // -----------------------------------------------------
        // Validate payment amount
        // -----------------------------------------------------

        if (payment.getAmount() == null ||
                payment.getAmount()
                        .compareTo(BigDecimal.ZERO) <= 0) {

            throw new RuntimeException(
                    "Payment amount must be greater than zero"
            );
        }

        // -----------------------------------------------------
        // Validate payment method
        // -----------------------------------------------------

        if (payment.getPaymentMethod() == null ||
                payment.getPaymentMethod()
                        .trim()
                        .isEmpty()) {

            throw new RuntimeException(
                    "Payment method is required"
            );
        }

        // -----------------------------------------------------
        // Check bill balance
        // -----------------------------------------------------

        BigDecimal balance =
                bill.getBalanceAmount() != null
                        ? bill.getBalanceAmount()
                        : BigDecimal.ZERO;

        if (payment.getAmount()
                .compareTo(balance) > 0) {

            throw new RuntimeException(
                    "Payment amount cannot be greater than "
                            + "the remaining bill balance"
            );
        }

        // -----------------------------------------------------
        // Generate payment reference
        // -----------------------------------------------------

        if (payment.getPaymentReference() == null ||
                payment.getPaymentReference()
                        .trim()
                        .isEmpty()) {

            payment.setPaymentReference(
                    generatePaymentReference()
            );

        } else {

            String reference =
                    payment.getPaymentReference()
                            .trim()
                            .toUpperCase();

            if (paymentRepository
                    .existsByPaymentReference(reference)) {

                throw new RuntimeException(
                        "Payment reference already exists: "
                                + reference
                );
            }

            payment.setPaymentReference(reference);
        }

        // -----------------------------------------------------
        // Transaction ID validation
        // -----------------------------------------------------

        if (payment.getTransactionId() != null &&
                !payment.getTransactionId()
                        .trim()
                        .isEmpty()) {

            String transactionId =
                    payment.getTransactionId()
                            .trim();

            if (paymentRepository
                    .existsByTransactionId(
                            transactionId
                    )) {

                throw new RuntimeException(
                        "Transaction ID already exists: "
                                + transactionId
                );
            }

            payment.setTransactionId(
                    transactionId
            );
        }

        // -----------------------------------------------------
        // Set bill
        // -----------------------------------------------------

        payment.setBill(bill);

        // -----------------------------------------------------
        // Default values
        // -----------------------------------------------------

        if (payment.getStatus() == null ||
                payment.getStatus()
                        .trim()
                        .isEmpty()) {

            payment.setStatus("PENDING");

        } else {

            payment.setStatus(
                    payment.getStatus()
                            .trim()
                            .toUpperCase()
            );
        }

        // New payments should start as PENDING
        payment.setStatus("PENDING");

        if (payment.getPaymentDate() == null) {

            payment.setPaymentDate(
                    LocalDateTime.now()
            );
        }

        if (payment.getRefundAmount() == null) {

            payment.setRefundAmount(
                    BigDecimal.ZERO
            );
        }

        return paymentRepository.save(payment);
    }

    // =========================================================
    // GENERATE PAYMENT REFERENCE
    // =========================================================

    private String generatePaymentReference() {

        long nextNumber =
                paymentRepository.count() + 1;

        String reference;

        do {

            reference = String.format(
                    "PAY%06d",
                    nextNumber
            );

            nextNumber++;

        } while (
                paymentRepository
                        .existsByPaymentReference(
                                reference
                        )
        );

        return reference;
    }

    // =========================================================
    // GET ALL PAYMENTS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Payment> getAllPayments() {

        return paymentRepository.findAll();
    }

    // =========================================================
    // GET PAYMENT BY ID
    // =========================================================

    @Transactional(readOnly = true)
    public Payment getPaymentById(Long id) {

        if (id == null) {
            throw new RuntimeException(
                    "Payment ID is required"
            );
        }

        return paymentRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Payment not found with id: "
                                        + id
                        ));
    }

    // =========================================================
    // GET PAYMENT BY REFERENCE
    // =========================================================

    @Transactional(readOnly = true)
    public Payment getPaymentByReference(
            String paymentReference) {

        if (paymentReference == null ||
                paymentReference.trim().isEmpty()) {

            throw new RuntimeException(
                    "Payment reference is required"
            );
        }

        return paymentRepository
                .findByPaymentReference(
                        paymentReference
                                .trim()
                                .toUpperCase()
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "Payment not found: "
                                        + paymentReference
                        ));
    }

    // =========================================================
    // GET PAYMENTS FOR BILL
    // =========================================================

    @Transactional(readOnly = true)
    public List<Payment> getPaymentsForBill(
            Long billId) {

        if (billId == null) {
            throw new RuntimeException(
                    "Bill ID is required"
            );
        }

        if (!billRepository.existsById(billId)) {
            throw new RuntimeException(
                    "Bill not found with id: "
                            + billId
            );
        }

        return paymentRepository
                .findByBillIdOrderByPaymentDateDesc(
                        billId
                );
    }

    // =========================================================
    // GET PAYMENTS BY STATUS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Payment> getPaymentsByStatus(
            String status) {

        if (status == null ||
                status.trim().isEmpty()) {

            throw new RuntimeException(
                    "Payment status is required"
            );
        }

        return paymentRepository
                .findByStatusIgnoreCaseOrderByPaymentDateDesc(
                        status.trim()
                );
    }

    // =========================================================
    // GET PAYMENTS BY METHOD
    // =========================================================

    @Transactional(readOnly = true)
    public List<Payment> getPaymentsByMethod(
            String paymentMethod) {

        if (paymentMethod == null ||
                paymentMethod.trim().isEmpty()) {

            throw new RuntimeException(
                    "Payment method is required"
            );
        }

        return paymentRepository
                .findByPaymentMethodIgnoreCaseOrderByPaymentDateDesc(
                        paymentMethod.trim()
                );
    }

    // =========================================================
    // GET SUCCESSFUL PAYMENTS FOR BILL
    // =========================================================

    @Transactional(readOnly = true)
    public List<Payment> getSuccessfulPaymentsForBill(
            Long billId) {

        if (billId == null) {
            throw new RuntimeException(
                    "Bill ID is required"
            );
        }

        return paymentRepository
                .findByBillIdAndStatusIgnoreCaseOrderByPaymentDateDesc(
                        billId,
                        "SUCCESS"
                );
    }

    // =========================================================
    // GET PAYMENT BY TRANSACTION ID
    // =========================================================

    @Transactional(readOnly = true)
    public Payment getPaymentByTransactionId(
            String transactionId) {

        if (transactionId == null ||
                transactionId.trim().isEmpty()) {

            throw new RuntimeException(
                    "Transaction ID is required"
            );
        }

        return paymentRepository
                .findByTransactionId(
                        transactionId.trim()
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "Payment not found for transaction ID: "
                                        + transactionId
                        ));
    }

    // =========================================================
    // UPDATE PAYMENT
    // =========================================================

    public Payment updatePayment(
            Long id,
            Payment updatedPayment) {

        Payment existing =
                getPaymentById(id);

        if (updatedPayment == null) {
            throw new RuntimeException(
                    "Payment data is required"
            );
        }

        // -----------------------------------------------------
        // Do not allow changing amount after SUCCESS
        // -----------------------------------------------------

        if ("SUCCESS".equalsIgnoreCase(
                existing.getStatus())) {

            throw new RuntimeException(
                    "Successful payment cannot be edited"
            );
        }

        // -----------------------------------------------------
        // Update payment method
        // -----------------------------------------------------

        if (updatedPayment.getPaymentMethod() != null &&
                !updatedPayment.getPaymentMethod()
                        .trim()
                        .isEmpty()) {

            existing.setPaymentMethod(
                    updatedPayment
                            .getPaymentMethod()
                            .trim()
                            .toUpperCase()
            );
        }

        // -----------------------------------------------------
        // Update amount
        // -----------------------------------------------------

        if (updatedPayment.getAmount() != null) {

            if (updatedPayment.getAmount()
                    .compareTo(BigDecimal.ZERO) <= 0) {

                throw new RuntimeException(
                        "Payment amount must be greater than zero"
                );
            }

            Bill bill = existing.getBill();

            if (bill != null) {

                BigDecimal balance =
                        bill.getBalanceAmount() != null
                                ? bill.getBalanceAmount()
                                : BigDecimal.ZERO;

                if (updatedPayment.getAmount()
                        .compareTo(balance) > 0) {

                    throw new RuntimeException(
                            "Payment amount cannot be greater "
                                    + "than the remaining bill balance"
                    );
                }
            }

            existing.setAmount(
                    updatedPayment.getAmount()
            );
        }

        // -----------------------------------------------------
        // Transaction ID
        // -----------------------------------------------------

        if (updatedPayment.getTransactionId() != null &&
                !updatedPayment.getTransactionId()
                        .trim()
                        .isEmpty()) {

            String transactionId =
                    updatedPayment.getTransactionId()
                            .trim();

            if (!transactionId.equals(
                    existing.getTransactionId()
            ) &&
                    paymentRepository
                            .existsByTransactionId(
                                    transactionId
                            )) {

                throw new RuntimeException(
                        "Transaction ID already exists"
                );
            }

            existing.setTransactionId(
                    transactionId
            );
        }

        // -----------------------------------------------------
        // Gateway response
        // -----------------------------------------------------

        if (updatedPayment.getGatewayResponse() != null) {

            existing.setGatewayResponse(
                    updatedPayment
                            .getGatewayResponse()
            );
        }

        // -----------------------------------------------------
        // Notes
        // -----------------------------------------------------

        if (updatedPayment.getNotes() != null) {

            existing.setNotes(
                    updatedPayment.getNotes()
            );
        }

        return paymentRepository.save(existing);
    }

    // =========================================================
    // MARK PAYMENT SUCCESSFUL / VERIFY PAYMENT
    // =========================================================

    public Payment markPaymentSuccessful(
            Long paymentId) {

        Payment payment =
                getPaymentById(paymentId);

        if ("SUCCESS".equalsIgnoreCase(
                payment.getStatus())) {

            return payment;
        }

        if ("CANCELLED".equalsIgnoreCase(
                payment.getStatus())) {

            throw new RuntimeException(
                    "Cancelled payment cannot be verified"
            );
        }

        if ("REFUNDED".equalsIgnoreCase(
                payment.getStatus())) {

            throw new RuntimeException(
                    "Refunded payment cannot be verified"
            );
        }

        Bill bill = payment.getBill();

        if (bill == null) {

            throw new RuntimeException(
                    "Payment is not linked to a bill"
            );
        }

        BigDecimal paymentAmount =
                payment.getAmount() != null
                        ? payment.getAmount()
                        : BigDecimal.ZERO;

        if (paymentAmount
                .compareTo(BigDecimal.ZERO) <= 0) {

            throw new RuntimeException(
                    "Payment amount must be greater than zero"
            );
        }

        BigDecimal currentPaid =
                bill.getPaidAmount() != null
                        ? bill.getPaidAmount()
                        : BigDecimal.ZERO;

        BigDecimal totalAmount =
                bill.getTotalAmount() != null
                        ? bill.getTotalAmount()
                        : BigDecimal.ZERO;

        // -----------------------------------------------------
        // Prevent overpayment
        // -----------------------------------------------------

        BigDecimal newPaid =
                currentPaid.add(paymentAmount);

        if (newPaid.compareTo(totalAmount) > 0) {

            throw new RuntimeException(
                    "Payment would exceed the bill total"
            );
        }

        // -----------------------------------------------------
        // Mark payment as SUCCESS
        // -----------------------------------------------------

        payment.setStatus("SUCCESS");

        if (payment.getPaymentDate() == null) {

            payment.setPaymentDate(
                    LocalDateTime.now()
            );
        }

        // -----------------------------------------------------
        // Update bill paid amount
        // -----------------------------------------------------

        bill.setPaidAmount(newPaid);

        // -----------------------------------------------------
        // Calculate remaining balance
        // -----------------------------------------------------

        BigDecimal newBalance =
                totalAmount.subtract(newPaid);

        if (newBalance
                .compareTo(BigDecimal.ZERO) < 0) {

            newBalance = BigDecimal.ZERO;
        }

        bill.setBalanceAmount(newBalance);

        // -----------------------------------------------------
        // Update bill status
        // -----------------------------------------------------

        if (newBalance.compareTo(
                BigDecimal.ZERO
        ) == 0) {

            bill.setStatus("PAID");

        } else if (newPaid.compareTo(
                BigDecimal.ZERO
        ) > 0) {

            bill.setStatus("PARTIALLY_PAID");

        } else {

            bill.setStatus("UNPAID");
        }

        billRepository.save(bill);

        return paymentRepository.save(payment);
    }

    // =========================================================
    // MARK PAYMENT FAILED
    // =========================================================

    public Payment markPaymentFailed(
            Long paymentId,
            String gatewayResponse) {

        Payment payment =
                getPaymentById(paymentId);

        if ("SUCCESS".equalsIgnoreCase(
                payment.getStatus())) {

            throw new RuntimeException(
                    "Successful payment cannot be marked as failed"
            );
        }

        payment.setStatus("FAILED");

        if (gatewayResponse != null) {

            payment.setGatewayResponse(
                    gatewayResponse
            );
        }

        return paymentRepository.save(payment);
    }

    // =========================================================
    // CANCEL PAYMENT
    // =========================================================

    public Payment cancelPayment(
            Long paymentId) {

        Payment payment =
                getPaymentById(paymentId);

        if ("SUCCESS".equalsIgnoreCase(
                payment.getStatus())) {

            throw new RuntimeException(
                    "Successful payment cannot be cancelled"
            );
        }

        if ("REFUNDED".equalsIgnoreCase(
                payment.getStatus())) {

            throw new RuntimeException(
                    "Refunded payment cannot be cancelled"
            );
        }

        payment.setStatus("CANCELLED");

        return paymentRepository.save(payment);
    }

    // =========================================================
    // REFUND PAYMENT
    // =========================================================

    public Payment refundPayment(
            Long paymentId,
            BigDecimal refundAmount,
            String refundReason) {

        Payment payment =
                getPaymentById(paymentId);

        if (!"SUCCESS".equalsIgnoreCase(
                payment.getStatus())) {

            throw new RuntimeException(
                    "Only successful payments can be refunded"
            );
        }

        if (refundAmount == null ||
                refundAmount
                        .compareTo(BigDecimal.ZERO) <= 0) {

            throw new RuntimeException(
                    "Refund amount must be greater than zero"
            );
        }

        BigDecimal paymentAmount =
                payment.getAmount() != null
                        ? payment.getAmount()
                        : BigDecimal.ZERO;

        BigDecimal existingRefund =
                payment.getRefundAmount() != null
                        ? payment.getRefundAmount()
                        : BigDecimal.ZERO;

        BigDecimal availableRefund =
                paymentAmount.subtract(
                        existingRefund
                );

        if (refundAmount.compareTo(
                availableRefund
        ) > 0) {

            throw new RuntimeException(
                    "Refund amount cannot exceed "
                            + "the refundable payment amount"
            );
        }

        // -----------------------------------------------------
        // Generate refund reference
        // -----------------------------------------------------

        String refundReference =
                generateRefundReference();

        BigDecimal newRefundAmount =
                existingRefund.add(refundAmount);

        payment.setRefundAmount(
                newRefundAmount
        );

        payment.setRefundReference(
                refundReference
        );

        payment.setRefundedAt(
                LocalDateTime.now()
        );

        payment.setRefundReason(
                refundReason
        );

        if (newRefundAmount.compareTo(
                paymentAmount
        ) == 0) {

            payment.setStatus("REFUNDED");

        } else {

            payment.setStatus(
                    "REFUND_PENDING"
            );
        }

        // -----------------------------------------------------
        // Update bill
        // -----------------------------------------------------

        Bill bill = payment.getBill();

        if (bill != null) {

            BigDecimal currentPaid =
                    bill.getPaidAmount() != null
                            ? bill.getPaidAmount()
                            : BigDecimal.ZERO;

            BigDecimal updatedPaid =
                    currentPaid.subtract(
                            refundAmount
                    );

            if (updatedPaid
                    .compareTo(BigDecimal.ZERO) < 0) {

                updatedPaid = BigDecimal.ZERO;
            }

            bill.setPaidAmount(
                    updatedPaid
            );

            BigDecimal totalAmount =
                    bill.getTotalAmount() != null
                            ? bill.getTotalAmount()
                            : BigDecimal.ZERO;

            BigDecimal balance =
                    totalAmount.subtract(
                            updatedPaid
                    );

            if (balance
                    .compareTo(BigDecimal.ZERO) < 0) {

                balance = BigDecimal.ZERO;
            }

            bill.setBalanceAmount(
                    balance
            );

            if (balance.compareTo(
                    BigDecimal.ZERO
            ) == 0) {

                bill.setStatus("PAID");

            } else if (updatedPaid.compareTo(
                    BigDecimal.ZERO
            ) > 0) {

                bill.setStatus(
                        "PARTIALLY_PAID"
                );

            } else {

                bill.setStatus("UNPAID");
            }

            billRepository.save(bill);
        }

        return paymentRepository.save(payment);
    }

    // =========================================================
    // GENERATE REFUND REFERENCE
    // =========================================================

    private String generateRefundReference() {

        long nextNumber =
                paymentRepository.count() + 1;

        return String.format(
                "REF%06d",
                nextNumber
        );
    }

    // =========================================================
    // DELETE PAYMENT
    // =========================================================

    public void deletePayment(Long paymentId) {

        Payment payment =
                getPaymentById(paymentId);

        if ("SUCCESS".equalsIgnoreCase(
                payment.getStatus())) {

            throw new RuntimeException(
                    "Successful payment cannot be deleted"
            );
        }

        paymentRepository.delete(payment);
    }
}