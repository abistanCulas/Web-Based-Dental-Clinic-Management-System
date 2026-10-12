package com.dentaflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BillingDTO {

    private Long id;

    private String billNumber;

    private Long patientId;

    private String patientName;

    private Long appointmentId;

    private String appointmentCode;

    private Long treatmentId;

    private String treatmentName;

    private String doctorName;

    private LocalDateTime billDate;

    private BigDecimal subtotal;

    private BigDecimal discount;

    private BigDecimal tax;

    private BigDecimal totalAmount;

    private BigDecimal paidAmount;

    private BigDecimal balanceAmount;

    private String status;

    private String notes;

    private List<BillItemDTO> items;
}