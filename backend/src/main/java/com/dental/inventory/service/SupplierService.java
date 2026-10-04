package com.dental.inventory.service;

import com.dental.inventory.dto.request.SupplierRequest;
import com.dental.inventory.dto.response.SupplierResponse;
import com.dental.inventory.entity.Supplier;
import com.dental.inventory.enums.SupplierStatus;
import com.dental.inventory.exception.DuplicateResourceException;
import com.dental.inventory.exception.ResourceNotFoundException;
import com.dental.inventory.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SupplierService {

    private final SupplierRepository supplierRepository;

    public List<SupplierResponse> getAllSuppliers(String search) {
        List<Supplier> suppliers;
        if (search != null && !search.trim().isEmpty()) {
            suppliers = supplierRepository.findBySupplierNameContainingIgnoreCaseOrContactPersonContainingIgnoreCase(search.trim(), search.trim());
        } else {
            suppliers = supplierRepository.findAll();
        }
        return suppliers.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public List<SupplierResponse> getActiveSuppliers() {
        return supplierRepository.findByStatus(SupplierStatus.ACTIVE).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public SupplierResponse getSupplierById(Long id) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with id: " + id));
        return mapToResponse(supplier);
    }

    @Transactional
    public SupplierResponse createSupplier(SupplierRequest request) {
        if (supplierRepository.existsByEmail(request.getEmail().trim().toLowerCase())) {
            throw new DuplicateResourceException("Supplier with email '" + request.getEmail() + "' already exists.");
        }

        Supplier supplier = Supplier.builder()
                .supplierName(request.getSupplierName().trim())
                .contactPerson(request.getContactPerson().trim())
                .email(request.getEmail().trim().toLowerCase())
                .phone(request.getPhone().trim())
                .address(request.getAddress())
                .registrationNumber(request.getRegistrationNumber())
                .status(request.getStatus() != null ? request.getStatus() : SupplierStatus.ACTIVE)
                .build();

        Supplier saved = supplierRepository.save(supplier);
        return mapToResponse(saved);
    }

    @Transactional
    public SupplierResponse updateSupplier(Long id, SupplierRequest request) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with id: " + id));

        if (supplierRepository.existsByEmailAndIdNot(request.getEmail().trim().toLowerCase(), id)) {
            throw new DuplicateResourceException("Email '" + request.getEmail() + "' is already registered to another supplier.");
        }

        supplier.setSupplierName(request.getSupplierName().trim());
        supplier.setContactPerson(request.getContactPerson().trim());
        supplier.setEmail(request.getEmail().trim().toLowerCase());
        supplier.setPhone(request.getPhone().trim());
        supplier.setAddress(request.getAddress());
        supplier.setRegistrationNumber(request.getRegistrationNumber());
        if (request.getStatus() != null) {
            supplier.setStatus(request.getStatus());
        }

        Supplier updated = supplierRepository.save(supplier);
        return mapToResponse(updated);
    }

    @Transactional
    public void deleteSupplier(Long id) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with id: " + id));
        supplier.setStatus(SupplierStatus.INACTIVE);
        supplierRepository.save(supplier);
    }

    public SupplierResponse mapToResponse(Supplier supplier) {
        int itemCount = supplier.getInventoryItems() != null ? supplier.getInventoryItems().size() : 0;
        return SupplierResponse.builder()
                .id(supplier.getId())
                .supplierName(supplier.getSupplierName())
                .contactPerson(supplier.getContactPerson())
                .email(supplier.getEmail())
                .phone(supplier.getPhone())
                .address(supplier.getAddress())
                .registrationNumber(supplier.getRegistrationNumber())
                .status(supplier.getStatus())
                .inventoryItemCount(itemCount)
                .createdAt(supplier.getCreatedAt())
                .updatedAt(supplier.getUpdatedAt())
                .build();
    }
}
