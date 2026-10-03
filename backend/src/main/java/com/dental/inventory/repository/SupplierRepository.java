package com.dental.inventory.repository;

import com.dental.inventory.entity.Supplier;
import com.dental.inventory.enums.SupplierStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Long> {
    boolean existsByEmail(String email);
    boolean existsByEmailAndIdNot(String email, Long id);
    List<Supplier> findByStatus(SupplierStatus status);
    List<Supplier> findBySupplierNameContainingIgnoreCaseOrContactPersonContainingIgnoreCase(String name, String contact);
}
