package com.dentaflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentDTO {

    private Long id;

    private String paymentReference;

    private Long billId;

    private BigDecimal amount;

    private String paymentMethod;

    private String status;

    private LocalDateTime paymentDate;

    private String transactionId;

    private String gatewayResponse;

    private String notes;
}