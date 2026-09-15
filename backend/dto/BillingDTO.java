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
public class BillingDTO {

    private Long id;

    private String billNumber;

    private Long patientId;

    private Long appointmentId;

    private Long treatmentId;

    private LocalDateTime billDate;

    private BigDecimal subtotal;

    private BigDecimal discount;

    private BigDecimal tax;

    private BigDecimal totalAmount;

    private BigDecimal paidAmount;

    private BigDecimal balanceAmount;

    private String status;

    private String notes;
}