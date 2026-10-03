package com.dental.inventory.dto.response;

import com.dental.inventory.enums.OrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseOrderResponse {
    private Long id;
    private Long supplierId;
    private String supplierName;
    private LocalDate orderDate;
    private LocalDate expectedDeliveryDate;
    private OrderStatus status;
    private BigDecimal totalAmount;
    private String notes;
    private List<PurchaseOrderItemResponse> items;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
