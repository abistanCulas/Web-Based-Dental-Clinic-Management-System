package com.dentaflow.backend.mapper;

import com.dentaflow.backend.dto.SupplierDTO;
import com.dentaflow.backend.entity.Supplier;
import org.springframework.stereotype.Component;

@Component
public class SupplierMapper {

    // =========================================================
    // ENTITY → DTO
    // =========================================================

    public SupplierDTO toDTO(Supplier supplier) {

        if (supplier == null) {
            return null;
        }

        return SupplierDTO.builder()
                .id(supplier.getId())
                .supplierCode(supplier.getSupplierCode())
                .supplierName(supplier.getSupplierName())
                .contactPerson(supplier.getContactPerson())
                .email(supplier.getEmail())
                .phone(supplier.getPhone())
                .address(supplier.getAddress())
                .city(supplier.getCity())
                .country(supplier.getCountry())
                .suppliedItems(supplier.getSuppliedItems())
                .status(supplier.getStatus())
                .notes(supplier.getNotes())
                .build();
    }

    // =========================================================
    // DTO → ENTITY
    // =========================================================

    public Supplier toEntity(SupplierDTO dto) {

        if (dto == null) {
            return null;
        }

        Supplier supplier = new Supplier();

        supplier.setId(dto.getId());

        supplier.setSupplierCode(
                dto.getSupplierCode()
        );

        supplier.setSupplierName(
                dto.getSupplierName()
        );

        supplier.setContactPerson(
                dto.getContactPerson()
        );

        supplier.setEmail(
                dto.getEmail()
        );

        supplier.setPhone(
                dto.getPhone()
        );

        supplier.setAddress(
                dto.getAddress()
        );

        supplier.setCity(
                dto.getCity()
        );

        supplier.setCountry(
                dto.getCountry()
        );

        supplier.setSuppliedItems(
                dto.getSuppliedItems()
        );

        supplier.setStatus(
                dto.getStatus()
        );

        supplier.setNotes(
                dto.getNotes()
        );

        return supplier;
    }
}