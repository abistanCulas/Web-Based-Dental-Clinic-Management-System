package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SupplierRepository extends JpaRepository<Supplier, Long> {

    // Find supplier by unique supplier code
    Optional<Supplier> findBySupplierCode(String supplierCode);

    // Check supplier code
    boolean existsBySupplierCode(String supplierCode);

    // Find supplier by email
    Optional<Supplier> findByEmail(String email);

    // Check supplier email
    boolean existsByEmail(String email);

    // Search suppliers by name
    List<Supplier> findBySupplierNameContainingIgnoreCase(
            String supplierName
    );

    // Search by contact person
    List<Supplier> findByContactPersonContainingIgnoreCase(
            String contactPerson
    );

    // Find suppliers by status
    List<Supplier> findByStatusIgnoreCase(
            String status
    );

    // Search suppliers by city
    List<Supplier> findByCityContainingIgnoreCase(
            String city
    );

    // Search by supplier name or contact person
    List<Supplier>
    findBySupplierNameContainingIgnoreCaseOrContactPersonContainingIgnoreCase(
            String supplierName,
            String contactPerson
    );
}