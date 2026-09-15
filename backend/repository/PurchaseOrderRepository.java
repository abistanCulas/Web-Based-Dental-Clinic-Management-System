package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.PurchaseOrder;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PurchaseOrderRepository
        extends JpaRepository<PurchaseOrder, Long> {

    // Find purchase order by unique order number
    Optional<PurchaseOrder> findByPurchaseOrderNumber(
            String purchaseOrderNumber
    );

    // Check whether order number already exists
    boolean existsByPurchaseOrderNumber(
            String purchaseOrderNumber
    );

    // Get all purchase orders of a supplier
    List<PurchaseOrder> findBySupplierIdOrderByOrderDateDesc(
            Long supplierId
    );

    // Find orders by status
    List<PurchaseOrder> findByStatusIgnoreCaseOrderByOrderDateDesc(
            String status
    );

    // Find orders between two dates
    List<PurchaseOrder> findByOrderDateBetweenOrderByOrderDateDesc(
            LocalDate startDate,
            LocalDate endDate
    );

    // Find orders expected on a specific date
    List<PurchaseOrder> findByExpectedDeliveryDate(
            LocalDate expectedDeliveryDate
    );

    // Find pending orders of a supplier
    List<PurchaseOrder> findBySupplierIdAndStatusIgnoreCaseOrderByOrderDateDesc(
            Long supplierId,
            String status
    );
}