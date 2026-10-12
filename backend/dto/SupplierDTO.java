package com.dentaflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupplierDTO {

    private Long id;

    private String supplierCode;

    private String supplierName;

    private String contactPerson;

    private String email;

    private String phone;

    private String address;

    private String city;

    private String country;

    private String suppliedItems;

    private String status;

    private String notes;
}