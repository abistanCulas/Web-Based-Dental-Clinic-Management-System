package com.dental.inventory.dto.request;

import com.dental.inventory.enums.SupplierStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SupplierRequest {

    @NotBlank(message = "Supplier name is required")
    @Size(min = 2, max = 100, message = "Supplier name must be between 2 and 100 characters")
    private String supplierName;

    @NotBlank(message = "Contact person name is required")
    @Size(min = 2, max = 100, message = "Contact person must be between 2 and 100 characters")
    private String contactPerson;

    @NotBlank(message = "Email is required")
    @Email(message = "Please provide a valid email address")
    private String email;

    @NotBlank(message = "Phone number is required")
    @Pattern(regexp = "^[0-9]{10}$", message = "Phone number must be exactly 10 digits")
    private String phone;

    @Size(max = 255, message = "Address cannot exceed 255 characters")
    private String address;

    @Size(max = 50, message = "Registration number cannot exceed 50 characters")
    private String registrationNumber;

    private SupplierStatus status = SupplierStatus.ACTIVE;
}
