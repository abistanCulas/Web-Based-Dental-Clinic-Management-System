package com.dentaflow.backend.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "payments",
        indexes = {
                @Index(name = "idx_payment_bill", columnList = "bill_id"),
                @Index(name = "idx_payment_status", columnList = "status"),
                @Index(name = "idx_payment_date", columnList = "payment_date"),
                @Index(name = "idx_payment_method", columnList = "payment_method"),
                @Index(name = "idx_payment_transaction", columnList = "transaction_id")
        }
)
public class Payment extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // =========================================================
    // PAYMENT REFERENCE
    // =========================================================

    @Column(
            name = "payment_reference",
            nullable = false,
            unique = true,
            length = 50
    )
    private String paymentReference;

    // =========================================================
    // BILL
    // =========================================================

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "bill_id",
            nullable = false
    )
    private Bill bill;

    // =========================================================
    // PAYMENT AMOUNT
    // =========================================================

    @Column(
            nullable = false,
            precision = 12,
            scale = 2
    )
    private BigDecimal amount = BigDecimal.ZERO;

    // =========================================================
    // PAYMENT METHOD
    //
    // ONLINE
    // CARD
    // CASH
    // =========================================================

    @Column(
            nullable = false,
            length = 30
    )
    private String paymentMethod;

    // =========================================================
    // PAYMENT STATUS
    //
    // PENDING
    // SUCCESS
    // FAILED
    // CANCELLED
    // REFUND_PENDING
    // REFUNDED
    // REFUND_FAILED
    // =========================================================

    @Column(
            nullable = false,
            length = 30
    )
    private String status = "PENDING";

    // =========================================================
    // PAYMENT DATE
    // =========================================================

    @Column(
            name = "payment_date",
            nullable = false
    )
    private LocalDateTime paymentDate;

    // =========================================================
    // TRANSACTION ID
    // =========================================================

    @Column(
            name = "transaction_id",
            length = 150
    )
    private String transactionId;

    // =========================================================
    // GATEWAY RESPONSE
    // =========================================================

    @Column(
            length = 1000
    )
    private String gatewayResponse;

    // =========================================================
    // REFUND AMOUNT
    // =========================================================

    @Column(
            name = "refund_amount",
            precision = 12,
            scale = 2
    )
    private BigDecimal refundAmount = BigDecimal.ZERO;

    // =========================================================
    // REFUND REFERENCE
    // =========================================================

    @Column(
            name = "refund_reference",
            unique = true,
            length = 50
    )
    private String refundReference;

    // =========================================================
    // REFUNDED DATE
    // =========================================================

    @Column(
            name = "refunded_at"
    )
    private LocalDateTime refundedAt;

    // =========================================================
    // REFUND REASON
    // =========================================================

    @Column(
            name = "refund_reason",
            length = 500
    )
    private String refundReason;

    // =========================================================
    // NOTES
    // =========================================================

    @Column(
            length = 1000
    )
    private String notes;

    // =========================================================
    // CONSTRUCTOR
    // =========================================================

    public Payment() {
    }

    // =========================================================
    // PRE-PERSIST
    // =========================================================

    @PrePersist
    protected void onPaymentCreate() {

        if (paymentDate == null) {
            paymentDate = LocalDateTime.now();
        }

        if (amount == null) {
            amount = BigDecimal.ZERO;
        }

        if (refundAmount == null) {
            refundAmount = BigDecimal.ZERO;
        }

        if (status == null ||
                status.trim().isEmpty()) {

            status = "PENDING";
        }
    }

    // =========================================================
    // ID
    // =========================================================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    // =========================================================
    // PAYMENT REFERENCE
    // =========================================================

    public String getPaymentReference() {
        return paymentReference;
    }

    public void setPaymentReference(
            String paymentReference) {

        this.paymentReference = paymentReference;
    }

    // =========================================================
    // BILL
    // =========================================================

    public Bill getBill() {
        return bill;
    }

    public void setBill(Bill bill) {
        this.bill = bill;
    }

    // =========================================================
    // AMOUNT
    // =========================================================

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    // =========================================================
    // PAYMENT METHOD
    // =========================================================

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(
            String paymentMethod) {

        this.paymentMethod = paymentMethod;
    }

    // =========================================================
    // STATUS
    // =========================================================

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    // =========================================================
    // PAYMENT DATE
    // =========================================================

    public LocalDateTime getPaymentDate() {
        return paymentDate;
    }

    public void setPaymentDate(
            LocalDateTime paymentDate) {

        this.paymentDate = paymentDate;
    }

    // =========================================================
    // TRANSACTION ID
    // =========================================================

    public String getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(
            String transactionId) {

        this.transactionId = transactionId;
    }

    // =========================================================
    // GATEWAY RESPONSE
    // =========================================================

    public String getGatewayResponse() {
        return gatewayResponse;
    }

    public void setGatewayResponse(
            String gatewayResponse) {

        this.gatewayResponse = gatewayResponse;
    }

    // =========================================================
    // REFUND AMOUNT
    // =========================================================

    public BigDecimal getRefundAmount() {
        return refundAmount;
    }

    public void setRefundAmount(
            BigDecimal refundAmount) {

        this.refundAmount = refundAmount;
    }

    // =========================================================
    // REFUND REFERENCE
    // =========================================================

    public String getRefundReference() {
        return refundReference;
    }

    public void setRefundReference(
            String refundReference) {

        this.refundReference = refundReference;
    }

    // =========================================================
    // REFUNDED AT
    // =========================================================

    public LocalDateTime getRefundedAt() {
        return refundedAt;
    }

    public void setRefundedAt(
            LocalDateTime refundedAt) {

        this.refundedAt = refundedAt;
    }

    // =========================================================
    // REFUND REASON
    // =========================================================

    public String getRefundReason() {
        return refundReason;
    }

    public void setRefundReason(
            String refundReason) {

        this.refundReason = refundReason;
    }

    // =========================================================
    // NOTES
    // =========================================================

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}