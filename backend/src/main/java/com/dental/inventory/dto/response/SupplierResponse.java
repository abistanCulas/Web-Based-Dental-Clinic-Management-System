package com.dental.inventory.dto.response;

import com.dental.inventory.enums.SupplierStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SupplierResponse {
    private Long id;
    private String supplierName;
    private String contactPerson;
    private String email;
    private String phone;
    private String address;
    private String registrationNumber;
    private SupplierStatus status;
    private int inventoryItemCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
