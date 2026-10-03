package com.dental.inventory.repository;

import com.dental.inventory.entity.InventoryItem;
import com.dental.inventory.enums.ItemCategory;
import com.dental.inventory.enums.ItemStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface InventoryItemRepository extends JpaRepository<InventoryItem, Long> {
    List<InventoryItem> findByStatus(ItemStatus status);
    List<InventoryItem> findByCategory(ItemCategory category);
    List<InventoryItem> findBySupplierId(Long supplierId);
    List<InventoryItem> findByItemNameContainingIgnoreCase(String itemName);

    @Query("SELECT i FROM InventoryItem i WHERE i.quantity <= i.minimumStockLevel AND i.status != 'INACTIVE'")
    List<InventoryItem> findLowStockItems();

    @Query("SELECT i FROM InventoryItem i WHERE i.expiryDate <= :date AND i.status != 'INACTIVE'")
    List<InventoryItem> findExpiredItems(@Param("date") LocalDate date);

    @Query("SELECT i FROM InventoryItem i WHERE i.expiryDate > :today AND i.expiryDate <= :futureDate AND i.status != 'INACTIVE'")
    List<InventoryItem> findExpiringSoonItems(@Param("today") LocalDate today, @Param("futureDate") LocalDate futureDate);
}
