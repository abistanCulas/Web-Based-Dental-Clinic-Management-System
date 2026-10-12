package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.BillItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BillItemRepository extends JpaRepository<BillItem, Long> {

    // Get all items belonging to a bill
    List<BillItem> findByBillId(Long billId);

    // Get bill items ordered by ID
    List<BillItem> findByBillIdOrderByIdAsc(Long billId);

    // Find items by type
    List<BillItem> findByItemTypeIgnoreCase(String itemType);

    // Check whether an item already exists in a bill
    boolean existsByBillIdAndItemNameIgnoreCase(
            Long billId,
            String itemName
    );

    // Delete all items belonging to a bill
    void deleteByBillId(Long billId);
}