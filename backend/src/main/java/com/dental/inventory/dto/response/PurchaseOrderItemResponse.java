package com.dental.inventory.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseOrderItemResponse {
    private Long id;
    private Long inventoryItemId;
    private String itemName;
    private String unit;
    private Integer quantity;
    private BigDecimal unitPrice;
    private BigDecimal subtotal;
}
