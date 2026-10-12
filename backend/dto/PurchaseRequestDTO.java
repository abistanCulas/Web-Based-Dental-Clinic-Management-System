package com.dentaflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseRequestDTO {

    private Long id;

    private String requestCode;

    private Long pharmacistId;

    private String pharmacistName;

    private String pharmacistEmail;

    private Long medicineId;

    private String medicineCode;

    private String medicineName;

    private Integer requestedQuantity;

    private String reason;

    private String status;

    private String adminNote;

    private LocalDate requestDate;

    private LocalDateTime processedAt;

    private Long processedById;

    private String processedByName;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
