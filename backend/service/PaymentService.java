package com.dentaflow.backend.service;

import com.dentaflow.backend.entity.Bill;
import com.dentaflow.backend.entity.Patient;
import com.dentaflow.backend.entity.Payment;
import com.dentaflow.backend.repository.BillRepository;
import com.dentaflow.backend.repository.PaymentRepository;

import com.dentaflow.backend.dto.PayHereCheckoutDTO;
import com.dentaflow.backend.strategy.payment.PaymentStrategyContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@Transactional
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final BillRepository billRepository;
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final PaymentStrategyContext paymentStrategyContext;

    @Value("${payhere.merchant.id:1211111}")
    private String payhereMerchantId;

    @Value("${payhere.merchant.secret:456789sandboxsecret}")
    private String payhereMerchantSecret;

    @Value("${payhere.mode:sandbox}")
    private String payhereMode;

    @Value("${payhere.checkout.url:https://sandbox.payhere.lk/pay/checkout}")
    private String payhereCheckoutUrl;

    @Value("${payhere.return.url:http://localhost:5173/cashier/payments?status=success}")
    private String payhereReturnUrl;

    @Value("${payhere.cancel.url:http://localhost:5173/cashier/payments?status=cancelled}")
    private String payhereCancelUrl;

    @Value("${payhere.notify.url:http://localhost:8080/api/payments/payhere/notify}")
    private String payhereNotifyUrl;

    @Autowired
    public PaymentService(
            PaymentRepository paymentRepository,
            BillRepository billRepository,
            EmailService emailService,
            NotificationService notificationService,
            PaymentStrategyContext paymentStrategyContext) {

        this.paymentRepository = paymentRepository;
        this.billRepository = billRepository;
        this.emailService = emailService;
        this.notificationService = notificationService;
        this.paymentStrategyContext = paymentStrategyContext;
    }

    public PaymentService(
            PaymentRepository paymentRepository,
            BillRepository billRepository,
            EmailService emailService,
            NotificationService notificationService) {

        this(paymentRepository, billRepository, emailService, notificationService, null);
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

        if ("CANCELLED".equalsIgnoreCase(bill.getStatus())) {
            throw new RuntimeException("Cannot make payment on a cancelled bill");
        }

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

        if (paymentStrategyContext != null) {
            return paymentStrategyContext.executeTransition(
                    payment,
                    "SUCCESS",
                    Collections.emptyMap()
            );
        }

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

        Payment saved = paymentRepository.save(payment);

        try {
            if (bill != null && bill.getPatient() != null) {
                Patient patient = bill.getPatient();
                String pEmail = (patient.getUser() != null && patient.getUser().getEmail() != null)
                        ? patient.getUser().getEmail() : patient.getEmail();
                String pName = (patient.getFirstName() + " " + (patient.getLastName() != null ? patient.getLastName() : "")).trim();
                Double amt = saved.getAmount() != null ? saved.getAmount().doubleValue() : 0.0;

                if (pEmail != null && !pEmail.isEmpty()) {
                    emailService.sendPaymentReceipt(
                            pEmail,
                            pName,
                            saved.getPaymentReference(),
                            amt,
                            saved.getPaymentMethod(),
                            saved.getPaymentDate() != null ? saved.getPaymentDate().toString() : "Today"
                    );
                }

                if (patient.getUser() != null) {
                    com.dentaflow.backend.entity.Notification notif = new com.dentaflow.backend.entity.Notification();
                    notif.setTitle("Payment Received");
                    notif.setMessage("Payment of $" + String.format("%.2f", amt) + " for invoice " + bill.getBillNumber() + " was processed successfully (" + saved.getPaymentReference() + ").");
                    notif.setType("BILLING");
                    notif.setReferenceType("BILL");
                    notif.setReferenceId(bill.getId());
                    notificationService.createNotification(notif, patient.getUser().getId());
                }
            }
        } catch (Exception ex) {
            System.err.println("Warning: Post-payment receipt notification/email error: " + ex.getMessage());
        }

        return saved;
    }

    // =========================================================
    // MARK PAYMENT FAILED
    // =========================================================

    public Payment markPaymentFailed(
            Long paymentId,
            String gatewayResponse) {

        Payment payment =
                getPaymentById(paymentId);

        if (paymentStrategyContext != null) {
            Map<String, Object> ctx = new HashMap<>();
            if (gatewayResponse != null) {
                ctx.put("gatewayResponse", gatewayResponse);
            }
            return paymentStrategyContext.executeTransition(
                    payment,
                    "FAILED",
                    ctx
            );
        }

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

        if (paymentStrategyContext != null) {
            return paymentStrategyContext.executeTransition(
                    payment,
                    "CANCELLED",
                    Collections.emptyMap()
            );
        }

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

        if (paymentStrategyContext != null) {
            Map<String, Object> ctx = new HashMap<>();
            ctx.put("refundAmount", refundAmount);
            if (refundReason != null) {
                ctx.put("refundReason", refundReason);
            }
            return paymentStrategyContext.executeTransition(
                    payment,
                    "REFUNDED",
                    ctx
            );
        }

        if (!"SUCCESS".equalsIgnoreCase(payment.getStatus()) &&
                !"REFUND_PENDING".equalsIgnoreCase(payment.getStatus()) &&
                !"PARTIALLY_REFUNDED".equalsIgnoreCase(payment.getStatus())) {

            throw new RuntimeException(
                    "Only successful or partially refunded payments can be refunded"
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
    // CREATE PENDING REFUND REQUEST
    // =========================================================

    public Payment requestRefund(
            Long paymentId,
            BigDecimal refundAmount,
            String refundReason) {

        Payment payment = getPaymentById(paymentId);

        if (!"SUCCESS".equalsIgnoreCase(payment.getStatus()) &&
                !"PARTIALLY_REFUNDED".equalsIgnoreCase(payment.getStatus())) {
            throw new RuntimeException("Only successful payments can be submitted for refund");
        }

        if (refundAmount == null || refundAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Refund amount must be greater than zero");
        }

        BigDecimal paymentAmount = payment.getAmount() != null ? payment.getAmount() : BigDecimal.ZERO;
        BigDecimal existingRefund = payment.getRefundAmount() != null ? payment.getRefundAmount() : BigDecimal.ZERO;
        BigDecimal availableRefund = paymentAmount.subtract(existingRefund);

        if (refundAmount.compareTo(availableRefund) > 0) {
            throw new RuntimeException("Refund amount cannot exceed the available refundable balance of " + availableRefund);
        }

        payment.setStatus("REFUND_PENDING");
        payment.setRefundAmount(refundAmount);
        payment.setRefundReason(refundReason != null && !refundReason.trim().isEmpty() ? refundReason.trim() : "Patient requested refund");
        payment.setRefundReference(generateRefundReference());
        payment.setRefundedAt(LocalDateTime.now());

        return paymentRepository.save(payment);
    }

    // =========================================================
    // APPROVE PENDING REFUND REQUEST
    // =========================================================

    public Payment approveRefund(Long paymentId) {
        Payment payment = getPaymentById(paymentId);

        if (!"REFUND_PENDING".equalsIgnoreCase(payment.getStatus())) {
            throw new RuntimeException("Only pending refund requests can be approved");
        }

        BigDecimal refundAmt = payment.getRefundAmount() != null ? payment.getRefundAmount() : BigDecimal.ZERO;
        if (refundAmt.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Pending refund amount must be greater than zero");
        }

        // Apply ledger changes to Bill
        Bill bill = payment.getBill();
        if (bill != null) {
            BigDecimal currentPaid = bill.getPaidAmount() != null ? bill.getPaidAmount() : BigDecimal.ZERO;
            BigDecimal updatedPaid = currentPaid.subtract(refundAmt);
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

        BigDecimal paymentAmount = payment.getAmount() != null ? payment.getAmount() : BigDecimal.ZERO;
        if (refundAmt.compareTo(paymentAmount) >= 0) {
            payment.setStatus("REFUNDED");
        } else {
            payment.setStatus("PARTIALLY_REFUNDED");
        }

        return paymentRepository.save(payment);
    }

    // =========================================================
    // CANCEL PENDING REFUND REQUEST
    // =========================================================

    public Payment cancelRefund(Long paymentId) {
        Payment payment = getPaymentById(paymentId);

        if (!"REFUND_PENDING".equalsIgnoreCase(payment.getStatus())) {
            throw new RuntimeException("Only pending refund requests can be cancelled");
        }

        String oldRef = payment.getRefundReference();
        payment.setStatus("SUCCESS");
        payment.setRefundAmount(BigDecimal.ZERO);
        payment.setRefundReference(null);
        payment.setRefundedAt(null);
        payment.setRefundReason(null);
        payment.setNotes((payment.getNotes() != null ? payment.getNotes() + " | " : "") + "Refund request " + oldRef + " was cancelled.");

        return paymentRepository.save(payment);
    }

    // =========================================================
    // DELETE PENDING REFUND REQUEST (DRAFT / UNPROCESSED)
    // =========================================================

    public Payment deleteRefund(Long paymentId) {
        Payment payment = getPaymentById(paymentId);

        if ("REFUNDED".equalsIgnoreCase(payment.getStatus())) {
            throw new RuntimeException("Processed/settled refunds cannot be deleted. History must be preserved.");
        }

        if (!"REFUND_PENDING".equalsIgnoreCase(payment.getStatus())) {
            throw new RuntimeException("Only pending refund requests can be deleted");
        }

        payment.setStatus("SUCCESS");
        payment.setRefundAmount(BigDecimal.ZERO);
        payment.setRefundReference(null);
        payment.setRefundedAt(null);
        payment.setRefundReason(null);

        return paymentRepository.save(payment);
    }

    // =========================================================
    // STRATEGY PATTERN LIFECYCLE DELEGATES
    // =========================================================

    public Payment transitionPaymentStatus(
            Long id,
            String targetStatus,
            Map<String, Object> context) {

        Payment payment = getPaymentById(id);
        if (paymentStrategyContext != null) {
            return paymentStrategyContext.executeTransition(
                    payment,
                    targetStatus,
                    context != null ? context : Collections.emptyMap()
            );
        }
        payment.setStatus(targetStatus != null ? targetStatus.toUpperCase() : "PENDING");
        return paymentRepository.save(payment);
    }

    @Transactional(readOnly = true)
    public List<String> getAvailableTransitions(Long id) {
        Payment payment = getPaymentById(id);
        if (paymentStrategyContext != null) {
            return paymentStrategyContext.getAvailableTransitions(payment);
        }
        return Collections.emptyList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getRegisteredStrategiesMetadata() {
        if (paymentStrategyContext != null) {
            return paymentStrategyContext.getRegisteredStrategiesMetadata();
        }
        return Collections.emptyList();
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

        if ("REFUNDED".equalsIgnoreCase(payment.getStatus()) || "PARTIALLY_REFUNDED".equalsIgnoreCase(payment.getStatus())) {
            throw new RuntimeException(
                    "Refunded payment cannot be deleted. History must be preserved."
            );
        }

        paymentRepository.delete(payment);
    }

    // =========================================================
    // MD5 UTILITY FOR PAYHERE HASH SIGNING
    // =========================================================

    public static String md5(String input) {
        if (input == null) return "";
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString().toUpperCase();
        } catch (Exception e) {
            throw new RuntimeException("PayHere MD5 calculation error", e);
        }
    }

    // =========================================================
    // INITIATE PAYHERE CHECKOUT (LKR)
    // =========================================================

    public PayHereCheckoutDTO initiatePayHereCheckout(Long billId, BigDecimal requestedAmount) {
        if (billId == null) {
            throw new RuntimeException("Bill ID is required to initiate PayHere checkout");
        }

        Bill bill = billRepository.findById(billId)
                .orElseThrow(() -> new RuntimeException("Bill not found with ID: " + billId));

        if ("PAID".equalsIgnoreCase(bill.getStatus())) {
            throw new RuntimeException("Bill " + bill.getBillNumber() + " is already fully paid");
        }

        if ("CANCELLED".equalsIgnoreCase(bill.getStatus())) {
            throw new RuntimeException("Cannot make payment on a cancelled bill");
        }

        BigDecimal balance = bill.getBalanceAmount() != null && bill.getBalanceAmount().compareTo(BigDecimal.ZERO) > 0
                ? bill.getBalanceAmount()
                : (bill.getTotalAmount() != null ? bill.getTotalAmount() : BigDecimal.ZERO);

        BigDecimal payAmount = (requestedAmount != null && requestedAmount.compareTo(BigDecimal.ZERO) > 0)
                ? requestedAmount
                : balance;

        if (payAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Payment amount must be greater than zero");
        }

        if (payAmount.compareTo(balance) > 0) {
            throw new RuntimeException("Payment amount exceeds remaining bill balance");
        }

        // Generate unique order ID
        String orderId = "DF-" + bill.getBillNumber() + "-" + System.currentTimeMillis();

        // Create PENDING online payment record
        Payment payment = new Payment();
        payment.setBill(bill);
        payment.setAmount(payAmount);
        payment.setPaymentMethod("ONLINE");
        payment.setStatus("PENDING");
        payment.setTransactionId(orderId);
        payment.setPaymentReference(generatePaymentReference());
        payment.setPaymentDate(LocalDateTime.now());
        payment.setNotes("PayHere Online Checkout (LKR)");
        Payment savedPayment = paymentRepository.save(payment);

        // Format amount for PayHere signature (2 decimals, e.g. "29700.00")
        String formattedAmount = String.format(Locale.US, "%.2f", payAmount);
        String currency = "LKR";

        // PayHere Hash generation (Never expose merchant secret to frontend)
        String merchantSecretHash = md5(payhereMerchantSecret);
        String rawHashString = payhereMerchantId + orderId + formattedAmount + currency + merchantSecretHash;
        String payhereHash = md5(rawHashString);

        Patient patient = bill.getPatient();
        String firstName = patient != null && patient.getFirstName() != null ? patient.getFirstName() : "Valued";
        String lastName = patient != null && patient.getLastName() != null ? patient.getLastName() : "Patient";
        String email = patient != null && patient.getEmail() != null ? patient.getEmail() : "patient@dentaflow.lk";
        String phone = patient != null && patient.getPhone() != null ? patient.getPhone() : "+94770000000";
        String address = patient != null && patient.getAddress() != null && !patient.getAddress().trim().isEmpty()
                ? patient.getAddress()
                : "DentaFlow Dental Clinic, Colombo";

        return PayHereCheckoutDTO.builder()
                .sandbox("sandbox".equalsIgnoreCase(payhereMode))
                .checkoutUrl(payhereCheckoutUrl)
                .merchantId(payhereMerchantId)
                .orderId(orderId)
                .items("DentaFlow Invoice " + bill.getBillNumber())
                .currency(currency)
                .amount(formattedAmount)
                .hash(payhereHash)
                .returnUrl(payhereReturnUrl)
                .cancelUrl(payhereCancelUrl)
                .notifyUrl(payhereNotifyUrl)
                .firstName(firstName)
                .lastName(lastName)
                .email(email)
                .phone(phone)
                .address(address)
                .city("Colombo")
                .country("Sri Lanka")
                .billId(bill.getId())
                .paymentId(savedPayment.getId())
                .paymentReference(savedPayment.getPaymentReference())
                .billNumber(bill.getBillNumber())
                .build();
    }

    // =========================================================
    // PROCESS PAYHERE WEBHOOK NOTIFICATION (IDEMPOTENT)
    // =========================================================

    public Payment processPayHereNotification(Map<String, String> params) {
        if (params == null || params.isEmpty()) {
            throw new RuntimeException("PayHere notification parameters are empty");
        }

        String merchantId = params.get("merchant_id");
        String orderId = params.get("order_id");
        String paymentId = params.get("payment_id");
        String payhereAmount = params.get("payhere_amount");
        String payhereCurrency = params.get("payhere_currency");
        String statusCode = params.get("status_code");
        String md5sig = params.get("md5sig");

        if (orderId == null || statusCode == null || md5sig == null) {
            throw new RuntimeException("Missing mandatory PayHere callback fields");
        }

        // Verify MD5 Signature
        String merchantSecretHash = md5(payhereMerchantSecret);
        String verifyString = merchantId + orderId + payhereAmount + payhereCurrency + statusCode + merchantSecretHash;
        String calculatedSig = md5(verifyString);

        if (!calculatedSig.equalsIgnoreCase(md5sig)) {
            throw new RuntimeException("PayHere signature verification failed. Possible tampering detected.");
        }

        // Find payment record by transactionId (orderId) or payment reference
        Payment payment = paymentRepository.findByTransactionId(orderId)
                .or(() -> paymentRepository.findByPaymentReference(orderId))
                .orElseThrow(() -> new RuntimeException("No payment record found for order ID: " + orderId));

        // Idempotency: If payment is already SUCCESS, return without duplicate actions
        if ("SUCCESS".equalsIgnoreCase(payment.getStatus())) {
            return payment;
        }

        // Status code "2" in PayHere represents SUCCESS
        if ("2".equals(statusCode)) {
            payment.setGatewayResponse("PayHere Verified Transaction ID: " + paymentId);
            paymentRepository.save(payment);
            return markPaymentSuccessful(payment.getId());
        } else if ("-1".equals(statusCode)) {
            return cancelPayment(payment.getId());
        } else {
            return markPaymentFailed(payment.getId(), "PayHere callback status code: " + statusCode);
        }
    }

    // =========================================================
    // SIMULATE PAYHERE SUCCESS (SANDBOX TESTING & DEMO)
    // =========================================================

    public Payment simulatePayHereSuccess(Long paymentId) {
        Payment payment = getPaymentById(paymentId);
        if ("SUCCESS".equalsIgnoreCase(payment.getStatus())) {
            return payment;
        }

        String orderId = payment.getTransactionId() != null && !payment.getTransactionId().isEmpty()
                ? payment.getTransactionId()
                : "DF-SIM-" + payment.getId() + "-" + System.currentTimeMillis();

        if (payment.getTransactionId() == null) {
            payment.setTransactionId(orderId);
            paymentRepository.save(payment);
        }

        String formattedAmount = String.format(Locale.US, "%.2f", payment.getAmount());
        String currency = "LKR";
        String statusCode = "2"; // Success

        String merchantSecretHash = md5(payhereMerchantSecret);
        String verifyString = payhereMerchantId + orderId + formattedAmount + currency + statusCode + merchantSecretHash;
        String validSig = md5(verifyString);

        Map<String, String> syntheticParams = Map.of(
                "merchant_id", payhereMerchantId,
                "order_id", orderId,
                "payment_id", "PAYHERE-SIM-" + System.currentTimeMillis(),
                "payhere_amount", formattedAmount,
                "payhere_currency", currency,
                "status_code", statusCode,
                "md5sig", validSig
        );

        return processPayHereNotification(syntheticParams);
    }
}