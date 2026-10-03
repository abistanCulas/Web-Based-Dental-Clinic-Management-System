package com.dental.inventory.dto.request;

import com.dental.inventory.enums.ItemCategory;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class InventoryItemRequest {

    @NotBlank(message = "Item name is required")
    @Size(min = 2, max = 100, message = "Item name must be between 2 and 100 characters")
    private String itemName;

    @NotNull(message = "Category is required (MATERIAL or EQUIPMENT)")
    private ItemCategory category;

    @Size(max = 255, message = "Description cannot exceed 255 characters")
    private String description;

    @NotBlank(message = "Unit of measurement is required (e.g., Box, Syringe, Piece)")
    @Size(max = 30, message = "Unit cannot exceed 30 characters")
    private String unit;

    @NotNull(message = "Quantity is required")
    @Min(value = 0, message = "Quantity cannot be negative")
    private Integer quantity;

    @NotNull(message = "Minimum stock level is required")
    @Min(value = 1, message = "Minimum stock level must be at least 1")
    private Integer minimumStockLevel;

    @NotNull(message = "Unit price is required")
    @DecimalMin(value = "0.01", message = "Unit price must be greater than 0")
    @Digits(integer = 10, fraction = 2, message = "Unit price must have at most 2 decimal places")
    private BigDecimal unitPrice;

    private LocalDate manufactureDate;

    private LocalDate expiryDate;

    private Long supplierId;

    // Supplier Security Key (required when a Supplier adds new stock/item)
    private String supplierSecurityKey;
}
