package com.dental.inventory.dto.response;

import com.dental.inventory.enums.ItemCategory;
import com.dental.inventory.enums.ItemStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryItemResponse {
    private Long id;
    private String itemName;
    private ItemCategory category;
    private String description;
    private String unit;
    private Integer quantity;
    private Integer minimumStockLevel;
    private BigDecimal unitPrice;
    private LocalDate manufactureDate;
    private LocalDate expiryDate;
    private ItemStatus status;
    private Long supplierId;
    private String supplierName;
    private boolean isLowStock;
    private boolean isExpired;
    private boolean isExpiringSoon;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
