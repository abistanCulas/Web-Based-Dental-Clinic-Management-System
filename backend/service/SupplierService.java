package com.dentaflow.backend.service;

import com.dentaflow.backend.entity.Supplier;
import com.dentaflow.backend.repository.SupplierRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class SupplierService {

    private final SupplierRepository supplierRepository;
    private final com.dentaflow.backend.repository.PurchaseOrderRepository purchaseOrderRepository;

    public SupplierService(
            SupplierRepository supplierRepository,
            com.dentaflow.backend.repository.PurchaseOrderRepository purchaseOrderRepository) {

        this.supplierRepository = supplierRepository;
        this.purchaseOrderRepository = purchaseOrderRepository;
    }

    // =========================================================
    // CREATE SUPPLIER
    // =========================================================
//Validation: Supplier data is required
    public Supplier createSupplier(Supplier supplier) {

        if (supplier == null) {
            throw new RuntimeException(
                    "Supplier data is required"
            );
        }

        if (supplier.getSupplierName() == null ||
                supplier.getSupplierName()
                        .trim()
                        .isEmpty()) {

            throw new RuntimeException(
                    "Supplier name is required"
            );
        }

        if (supplier.getEmail() == null ||
                supplier.getEmail()
                        .trim()
                        .isEmpty()) {

            throw new RuntimeException(
                    "Email is required"
            );
        }

        String email = supplier.getEmail()
                .trim()
                .toLowerCase();

        String emailRegex = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$";
        if (!email.matches(emailRegex)) {
            throw new RuntimeException(
                    "Invalid email format"
            );
        }

        if (supplierRepository.existsByEmail(email)) {

            throw new RuntimeException(
                    "Supplier with this email already exists"
            );
        }

        supplier.setEmail(email);

        supplier.setSupplierCode(
                generateSupplierCode()
        );

        supplier.setSupplierName(
                supplier.getSupplierName()
                        .trim()
        );

        if (supplier.getContactPerson() != null) {
            supplier.setContactPerson(
                    supplier.getContactPerson()
                            .trim()
            );
        }

        if (supplier.getPhone() != null && !supplier.getPhone().trim().isEmpty()) {
            String phone = supplier.getPhone().trim();
            if (!phone.matches("^[+]?[0-9\\s()-]{7,20}$")) {
                throw new RuntimeException(
                        "Invalid phone number format"
                );
            }
            supplier.setPhone(phone);
        }

        if (supplier.getAddress() != null) {
            supplier.setAddress(
                    supplier.getAddress()
                            .trim()
            );
        }

        if (supplier.getCity() != null) {
            supplier.setCity(
                    supplier.getCity()
                            .trim()
            );
        }

        if (supplier.getCountry() == null ||
                supplier.getCountry()
                        .trim()
                        .isEmpty()) {

            supplier.setCountry("Sri Lanka");

        } else {

            supplier.setCountry(
                    supplier.getCountry()
                            .trim()
            );
        }

        if (supplier.getSuppliedItems() != null) {
            supplier.setSuppliedItems(
                    supplier.getSuppliedItems()
                            .trim()
            );
        }

        if (supplier.getStatus() == null ||
                supplier.getStatus()
                        .trim()
                        .isEmpty()) {

            supplier.setStatus("ACTIVE");

        } else {

            supplier.setStatus(
                    supplier.getStatus()
                            .trim()
                            .toUpperCase()
            );
        }

        if (supplier.getNotes() != null) {
            supplier.setNotes(
                    supplier.getNotes()
                            .trim()
            );
        }

        return supplierRepository.save(supplier);
    }

    // =========================================================
    // GENERATE SUPPLIER CODE
    // =========================================================

    private String generateSupplierCode() {

        long nextNumber =
                supplierRepository.count() + 1;

        String code;

        do {

            code = String.format(
                    "SUP%04d",
                    nextNumber
            );

            nextNumber++;

        } while (
                supplierRepository
                        .existsBySupplierCode(code)
        );

        return code;
    }

    // =========================================================
    // GET ALL SUPPLIERS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Supplier> getAllSuppliers() {

        return supplierRepository.findAll();
    }

    // =========================================================
    // GET SUPPLIER BY ID
    // =========================================================

    @Transactional(readOnly = true)
    public Supplier getSupplierById(Long id) {

        return supplierRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Supplier not found with id: "
                                        + id
                        ));
    }

    // =========================================================
    // GET SUPPLIER BY CODE
    // =========================================================

    @Transactional(readOnly = true)
    public Supplier getSupplierByCode(
            String supplierCode) {

        if (supplierCode == null ||
                supplierCode.trim().isEmpty()) {

            throw new RuntimeException(
                    "Supplier code is required"
            );
        }

        return supplierRepository
                .findBySupplierCode(
                        supplierCode
                                .trim()
                                .toUpperCase()
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "Supplier not found: "
                                        + supplierCode
                        ));
    }

    // =========================================================
    // GET SUPPLIER BY EMAIL
    // =========================================================

    @Transactional(readOnly = true)
    public Supplier getSupplierByEmail(
            String email) {

        if (email == null ||
                email.trim().isEmpty()) {

            throw new RuntimeException(
                    "Email is required"
            );
        }

        return supplierRepository
                .findByEmail(
                        email.trim().toLowerCase()
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "Supplier not found with email: "
                                        + email
                        ));
    }

    // =========================================================
    // SEARCH BY SUPPLIER NAME
    // =========================================================

    @Transactional(readOnly = true)
    public List<Supplier> searchBySupplierName(
            String supplierName) {

        if (supplierName == null ||
                supplierName.trim().isEmpty()) {

            return supplierRepository.findAll();
        }

        return supplierRepository
                .findBySupplierNameContainingIgnoreCase(
                        supplierName.trim()
                );
    }

    // =========================================================
    // SEARCH BY CONTACT PERSON
    // =========================================================

    @Transactional(readOnly = true)
    public List<Supplier> searchByContactPerson(
            String contactPerson) {

        if (contactPerson == null ||
                contactPerson.trim().isEmpty()) {

            return supplierRepository.findAll();
        }

        return supplierRepository
                .findByContactPersonContainingIgnoreCase(
                        contactPerson.trim()
                );
    }

    // =========================================================
    // SEARCH BY NAME OR CONTACT PERSON
    // =========================================================

    @Transactional(readOnly = true)
    public List<Supplier> searchSuppliers(
            String keyword) {

        if (keyword == null ||
                keyword.trim().isEmpty()) {

            return supplierRepository.findAll();
        }

        String search = keyword.trim();

        return supplierRepository
                .findBySupplierNameContainingIgnoreCaseOrContactPersonContainingIgnoreCase(
                        search,
                        search
                );
    }

    // =========================================================
    // GET BY STATUS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Supplier> getSuppliersByStatus(
            String status) {

        if (status == null ||
                status.trim().isEmpty()) {

            throw new RuntimeException(
                    "Status is required"
            );
        }

        return supplierRepository
                .findByStatusIgnoreCase(
                        status.trim()
                );
    }

    // =========================================================
    // GET BY CITY
    // =========================================================

    @Transactional(readOnly = true)
    public List<Supplier> getSuppliersByCity(
            String city) {

        if (city == null ||
                city.trim().isEmpty()) {

            return supplierRepository.findAll();
        }

        return supplierRepository
                .findByCityContainingIgnoreCase(
                        city.trim()
                );
    }

    // =========================================================
    // UPDATE SUPPLIER
    // =========================================================

    public Supplier updateSupplier(
            Long id,
            Supplier updatedSupplier) {

        Supplier existingSupplier =
                getSupplierById(id);

        if (updatedSupplier == null) {
            throw new RuntimeException(
                    "Supplier data is required"
            );
        }

        if (updatedSupplier.getSupplierName() != null) {
            if (updatedSupplier.getSupplierName().trim().isEmpty()) {
                throw new RuntimeException(
                        "Supplier name cannot be empty"
                );
            }
            existingSupplier.setSupplierName(
                    updatedSupplier
                            .getSupplierName()
                            .trim()
            );
        }

        if (updatedSupplier.getContactPerson() != null) {

            existingSupplier.setContactPerson(
                    updatedSupplier
                            .getContactPerson()
                            .trim()
            );
        }

        if (updatedSupplier.getEmail() != null) {
            String newEmail =
                    updatedSupplier
                            .getEmail()
                            .trim()
                            .toLowerCase();

            if (newEmail.isEmpty()) {
                throw new RuntimeException(
                        "Email cannot be empty"
                );
            }

            String emailRegex = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$";
            if (!newEmail.matches(emailRegex)) {
                throw new RuntimeException(
                        "Invalid email format"
                );
            }

            if (!newEmail.equalsIgnoreCase(
                    existingSupplier.getEmail())) {

                if (supplierRepository
                        .existsByEmail(newEmail)) {

                    throw new RuntimeException(
                            "Another supplier already uses this email"
                    );
                }
            }

            existingSupplier.setEmail(
                    newEmail
            );
        }

        if (updatedSupplier.getPhone() != null) {
            String phone = updatedSupplier.getPhone().trim();
            if (!phone.isEmpty() && !phone.matches("^[+]?[0-9\\s()-]{7,20}$")) {
                throw new RuntimeException(
                        "Invalid phone number format"
                );
            }
            existingSupplier.setPhone(
                    phone
            );
        }

        if (updatedSupplier.getAddress() != null) {

            existingSupplier.setAddress(
                    updatedSupplier
                            .getAddress()
                            .trim()
            );
        }

        if (updatedSupplier.getCity() != null) {

            existingSupplier.setCity(
                    updatedSupplier
                            .getCity()
                            .trim()
            );
        }

        if (updatedSupplier.getCountry() != null) {

            existingSupplier.setCountry(
                    updatedSupplier
                            .getCountry()
                            .trim()
            );
        }

        if (updatedSupplier.getSuppliedItems() != null) {

            existingSupplier.setSuppliedItems(
                    updatedSupplier
                            .getSuppliedItems()
                            .trim()
            );
        }

        if (updatedSupplier.getStatus() != null) {

            existingSupplier.setStatus(
                    updatedSupplier
                            .getStatus()
                            .trim()
                            .toUpperCase()
            );
        }

        if (updatedSupplier.getNotes() != null) {

            existingSupplier.setNotes(
                    updatedSupplier
                            .getNotes()
                            .trim()
            );
        }

        return supplierRepository.save(
                existingSupplier
        );
    }

    // =========================================================
    // ACTIVATE SUPPLIER
    // =========================================================

    public Supplier activateSupplier(Long id) {

        Supplier supplier =
                getSupplierById(id);

        supplier.setStatus("ACTIVE");

        return supplierRepository.save(
                supplier
        );
    }

    // =========================================================
    // DEACTIVATE SUPPLIER
    // =========================================================

    public Supplier deactivateSupplier(Long id) {

        Supplier supplier =
                getSupplierById(id);

        supplier.setStatus("INACTIVE");

        return supplierRepository.save(
                supplier
        );
    }

    // =========================================================
    // DELETE SUPPLIER
    // =========================================================

    public void deleteSupplier(Long id) {

        Supplier supplier =
                getSupplierById(id);

        if (!purchaseOrderRepository.findBySupplierIdOrderByOrderDateDesc(id).isEmpty()) {
            throw new RuntimeException(
                    "Cannot delete supplier with existing purchase orders"
            );
        }

        supplierRepository.delete(supplier);
    }

}
