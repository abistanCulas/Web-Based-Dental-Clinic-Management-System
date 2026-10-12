package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.InventoryItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InventoryItemRepository
        extends JpaRepository<InventoryItem, Long> {

    // Find inventory item by unique code
    Optional<InventoryItem> findByInventoryCode(String inventoryCode);

    // Check inventory code
    boolean existsByInventoryCode(String inventoryCode);

    // Search items by name
    List<InventoryItem> findByItemNameContainingIgnoreCase(
            String itemName
    );

    // Search items by category
    List<InventoryItem> findByCategoryContainingIgnoreCase(
            String category
    );

    // Find items by type
    List<InventoryItem> findByItemTypeContainingIgnoreCase(
            String itemType
    );

    // Find items by status
    List<InventoryItem> findByStatusIgnoreCase(
            String status
    );

    // Find low-stock items
    List<InventoryItem> findByQuantityLessThanEqual(
            Integer quantity
    );

    // Find expired items
    List<InventoryItem> findByExpiryDateBefore(
            java.time.LocalDate date
    );

    // Find items expiring within a date range
    List<InventoryItem> findByExpiryDateBetween(
            java.time.LocalDate startDate,
            java.time.LocalDate endDate
    );

    // Search by name or category
    List<InventoryItem>
    findByItemNameContainingIgnoreCaseOrCategoryContainingIgnoreCase(
            String itemName,
            String category
    );
}