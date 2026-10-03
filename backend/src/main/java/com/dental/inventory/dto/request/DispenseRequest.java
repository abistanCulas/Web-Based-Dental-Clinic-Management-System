package com.dental.inventory.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class DispenseRequest {

    @NotNull(message = "Dispense quantity is required")
    @Min(value = 1, message = "Must take at least 1 item")
    private Integer quantity;

    @NotBlank(message = "Reason / Patient Procedure is required")
    private String purpose;

    private String dispensedBy;
}
