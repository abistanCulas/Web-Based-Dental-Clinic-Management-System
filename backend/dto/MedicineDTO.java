package com.dentaflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicineDTO {

    private Long id;

    private String medicineCode;

    private String name;

    private String genericName;

    private String brandName;

    private String category;

    private String dosageForm;

    private String strength;

    private String manufacturer;

    private Integer stockQuantity;

    private Integer reorderLevel;

    private BigDecimal unitPrice;

    private LocalDate expiryDate;

    private String allergyWarning;

    private String interactionInformation;

    private String status;
}