package com.dental.inventory.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class PurchaseOrderRequest {

    @NotNull(message = "Supplier is required")
    private Long supplierId;

    @NotNull(message = "Order date is required")
    private LocalDate orderDate;

    private LocalDate expectedDeliveryDate;

    @Size(max = 500, message = "Notes cannot exceed 500 characters")
    private String notes;

    @NotEmpty(message = "Order must contain at least one item")
    @Valid
    private List<PurchaseOrderItemRequest> items;
}
