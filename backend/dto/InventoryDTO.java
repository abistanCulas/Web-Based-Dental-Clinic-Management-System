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
public class InventoryDTO {

    private Long id;

    private String inventoryCode;

    private String itemName;

    private String category;

    private String itemType;

    private String brand;

    private String unit;

    private Integer quantity;

    private Integer reorderLevel;

    private BigDecimal unitPrice;

    private String batchNumber;

    private LocalDate expiryDate;

    private String supplierName;

    private String status;

    private String description;
}