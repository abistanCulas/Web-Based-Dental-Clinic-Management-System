package com.dentaflow.backend.mapper;

import com.dentaflow.backend.dto.PaymentDTO;
import com.dentaflow.backend.entity.Payment;
import org.springframework.stereotype.Component;

@Component
public class PaymentMapper {

    // =========================================================
    // Entity → DTO
    // =========================================================

    public PaymentDTO toDTO(Payment payment) {

        if (payment == null) {
            return null;
        }

        return PaymentDTO.builder()
                .id(payment.getId())
                .paymentReference(
                        payment.getPaymentReference()
                )
                .billId(
                        payment.getBill() != null
                                ? payment.getBill().getId()
                                : null
                )
                .amount(payment.getAmount())
                .paymentMethod(
                        payment.getPaymentMethod()
                )
                .status(payment.getStatus())
                .paymentDate(
                        payment.getPaymentDate()
                )
                .transactionId(
                        payment.getTransactionId()
                )
                .gatewayResponse(
                        payment.getGatewayResponse()
                )
                .notes(payment.getNotes())
                .refundAmount(payment.getRefundAmount())
                .refundReference(payment.getRefundReference())
                .refundReason(payment.getRefundReason())
                .refundedAt(payment.getRefundedAt())
                .build();
    }

    // =========================================================
    // DTO → Entity
    // =========================================================

    public Payment toEntity(PaymentDTO dto) {

        if (dto == null) {
            return null;
        }

        Payment payment = new Payment();

        payment.setId(dto.getId());

        payment.setPaymentReference(
                dto.getPaymentReference()
        );

        payment.setAmount(
                dto.getAmount()
        );

        payment.setPaymentMethod(
                dto.getPaymentMethod()
        );

        payment.setStatus(
                dto.getStatus()
        );

        payment.setPaymentDate(
                dto.getPaymentDate()
        );

        payment.setTransactionId(
                dto.getTransactionId()
        );

        payment.setGatewayResponse(
                dto.getGatewayResponse()
        );

        payment.setNotes(
                dto.getNotes()
        );

        payment.setRefundAmount(
                dto.getRefundAmount()
        );

        payment.setRefundReference(
                dto.getRefundReference()
        );

        payment.setRefundReason(
                dto.getRefundReason()
        );

        payment.setRefundedAt(
                dto.getRefundedAt()
        );

        // Bill is intentionally not mapped here.
        // PaymentService sets the Bill using billId.

        return payment;
    }
}