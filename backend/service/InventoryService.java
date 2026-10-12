package com.dentaflow.backend.service;

import com.dentaflow.backend.entity.InventoryItem;
import com.dentaflow.backend.repository.InventoryItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@Transactional
public class InventoryService {

    private final InventoryItemRepository inventoryItemRepository;

    public InventoryService(
            InventoryItemRepository inventoryItemRepository) {

        this.inventoryItemRepository = inventoryItemRepository;
    }

    // Create inventory item
    public InventoryItem createInventoryItem(
            InventoryItem item) {

        if (item == null) {
            throw new RuntimeException(
                    "Inventory item data is required"
            );
        }

        if (item.getItemName() == null ||
                item.getItemName().trim().isEmpty()) {

            throw new RuntimeException(
                    "Item name is required"
            );
        }

        item.setInventoryCode(
                generateInventoryCode()
        );

        item.setItemName(
                item.getItemName().trim()
        );

        if (item.getCategory() != null) {
            item.setCategory(
                    item.getCategory().trim()
            );
        }

        if (item.getItemType() != null) {
            item.setItemType(
                    item.getItemType().trim()
            );
        }

        if (item.getBrand() != null) {
            item.setBrand(
                    item.getBrand().trim()
            );
        }

        if (item.getUnit() != null) {
            item.setUnit(
                    item.getUnit().trim()
            );
        }

        if (item.getQuantity() == null) {
            item.setQuantity(0);
        }

        if (item.getQuantity() < 0) {
            throw new RuntimeException(
                    "Quantity cannot be negative"
            );
        }

        if (item.getReorderLevel() == null) {
            item.setReorderLevel(10);
        }

        if (item.getReorderLevel() < 0) {
            throw new RuntimeException(
                    "Reorder level cannot be negative"
            );
        }

        if (item.getUnitPrice() == null) {
            item.setUnitPrice(BigDecimal.ZERO);
        }

        if (item.getUnitPrice()
                .compareTo(BigDecimal.ZERO) < 0) {

            throw new RuntimeException(
                    "Unit price cannot be negative"
            );
        }

        if (item.getBatchNumber() != null) {
            item.setBatchNumber(
                    item.getBatchNumber().trim()
            );
        }

        if (item.getSupplierName() != null) {
            item.setSupplierName(
                    item.getSupplierName().trim()
            );
        }

        if (item.getStatus() == null ||
                item.getStatus().trim().isEmpty()) {

            item.setStatus("AVAILABLE");

        } else {

            item.setStatus(
                    item.getStatus()
                            .trim()
                            .toUpperCase()
            );
        }

        if (item.getDescription() != null) {
            item.setDescription(
                    item.getDescription().trim()
            );
        }

        return inventoryItemRepository.save(item);
    }

    // Generate inventory code
    private String generateInventoryCode() {

        long nextNumber =
                inventoryItemRepository.count() + 1;

        String code;

        do {
            code = String.format(
                    "INV%05d",
                    nextNumber
            );

            nextNumber++;

        } while (
                inventoryItemRepository
                        .existsByInventoryCode(code)
        );

        return code;
    }

    // Get all inventory items
    @Transactional(readOnly = true)
    public List<InventoryItem> getAllInventoryItems() {

        return inventoryItemRepository.findAll();
    }

    // Get inventory item by ID
    @Transactional(readOnly = true)
    public InventoryItem getInventoryItemById(
            Long id) {

        return inventoryItemRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Inventory item not found with id: "
                                        + id
                        ));
    }

    // Get inventory item by code
    @Transactional(readOnly = true)
    public InventoryItem getInventoryItemByCode(
            String inventoryCode) {

        if (inventoryCode == null ||
                inventoryCode.trim().isEmpty()) {

            throw new RuntimeException(
                    "Inventory code is required"
            );
        }

        return inventoryItemRepository
                .findByInventoryCode(
                        inventoryCode.trim().toUpperCase()
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "Inventory item not found: "
                                        + inventoryCode
                        ));
    }

    // Search by item name
    @Transactional(readOnly = true)
    public List<InventoryItem> searchByItemName(
            String itemName) {

        if (itemName == null ||
                itemName.trim().isEmpty()) {

            return inventoryItemRepository.findAll();
        }

        return inventoryItemRepository
                .findByItemNameContainingIgnoreCase(
                        itemName.trim()
                );
    }

    // Search by category
    @Transactional(readOnly = true)
    public List<InventoryItem> getItemsByCategory(
            String category) {

        if (category == null ||
                category.trim().isEmpty()) {

            return inventoryItemRepository.findAll();
        }

        return inventoryItemRepository
                .findByCategoryContainingIgnoreCase(
                        category.trim()
                );
    }

    // Get items by type
    @Transactional(readOnly = true)
    public List<InventoryItem> getItemsByType(
            String itemType) {

        if (itemType == null ||
                itemType.trim().isEmpty()) {

            return inventoryItemRepository.findAll();
        }

        return inventoryItemRepository
                .findByItemTypeContainingIgnoreCase(
                        itemType.trim()
                );
    }

    // Get items by status
    @Transactional(readOnly = true)
    public List<InventoryItem> getItemsByStatus(
            String status) {

        if (status == null ||
                status.trim().isEmpty()) {

            throw new RuntimeException(
                    "Status is required"
            );
        }

        return inventoryItemRepository
                .findByStatusIgnoreCase(
                        status.trim()
                );
    }

    // Get low stock items
    @Transactional(readOnly = true)
    public List<InventoryItem> getLowStockItems() {

        return inventoryItemRepository
                .findByQuantityLessThanEqual(10);
    }

    // Get low stock items by custom quantity
    @Transactional(readOnly = true)
    public List<InventoryItem> getLowStockItems(
            Integer quantity) {

        if (quantity == null || quantity < 0) {
            throw new RuntimeException(
                    "Quantity must be zero or greater"
            );
        }

        return inventoryItemRepository
                .findByQuantityLessThanEqual(
                        quantity
                );
    }

    // Get expired items
    @Transactional(readOnly = true)
    public List<InventoryItem> getExpiredItems() {

        return inventoryItemRepository
                .findByExpiryDateBefore(
                        LocalDate.now()
                );
    }

    // Get items expiring between dates
    @Transactional(readOnly = true)
    public List<InventoryItem> getItemsExpiringBetween(
            LocalDate startDate,
            LocalDate endDate) {

        if (startDate == null ||
                endDate == null) {

            throw new RuntimeException(
                    "Start date and end date are required"
            );
        }

        if (startDate.isAfter(endDate)) {

            throw new RuntimeException(
                    "Start date cannot be after end date"
            );
        }

        return inventoryItemRepository
                .findByExpiryDateBetween(
                        startDate,
                        endDate
                );
    }

    // Search by name or category
    @Transactional(readOnly = true)
    public List<InventoryItem> searchInventory(
            String keyword) {

        if (keyword == null ||
                keyword.trim().isEmpty()) {

            return inventoryItemRepository.findAll();
        }

        String search = keyword.trim();

        return inventoryItemRepository
                .findByItemNameContainingIgnoreCaseOrCategoryContainingIgnoreCase(
                        search,
                        search
                );
    }

    // Update inventory item
    public InventoryItem updateInventoryItem(
            Long id,
            InventoryItem updatedItem) {

        InventoryItem existing =
                getInventoryItemById(id);

        if (updatedItem == null) {
            throw new RuntimeException(
                    "Inventory item data is required"
            );
        }

        if (updatedItem.getItemName() != null &&
                !updatedItem.getItemName()
                        .trim()
                        .isEmpty()) {

            existing.setItemName(
                    updatedItem.getItemName().trim()
            );
        }

        if (updatedItem.getCategory() != null) {
            existing.setCategory(
                    updatedItem.getCategory().trim()
            );
        }

        if (updatedItem.getItemType() != null) {
            existing.setItemType(
                    updatedItem.getItemType().trim()
            );
        }

        if (updatedItem.getBrand() != null) {
            existing.setBrand(
                    updatedItem.getBrand().trim()
            );
        }

        if (updatedItem.getUnit() != null) {
            existing.setUnit(
                    updatedItem.getUnit().trim()
            );
        }

        if (updatedItem.getQuantity() != null) {

            if (updatedItem.getQuantity() < 0) {
                throw new RuntimeException(
                        "Quantity cannot be negative"
                );
            }

            existing.setQuantity(
                    updatedItem.getQuantity()
            );
        }

        if (updatedItem.getReorderLevel() != null) {

            if (updatedItem.getReorderLevel() < 0) {
                throw new RuntimeException(
                        "Reorder level cannot be negative"
                );
            }

            existing.setReorderLevel(
                    updatedItem.getReorderLevel()
            );
        }

        if (updatedItem.getUnitPrice() != null) {

            if (updatedItem.getUnitPrice()
                    .compareTo(BigDecimal.ZERO) < 0) {

                throw new RuntimeException(
                        "Unit price cannot be negative"
                );
            }

            existing.setUnitPrice(
                    updatedItem.getUnitPrice()
            );
        }

        if (updatedItem.getBatchNumber() != null) {
            existing.setBatchNumber(
                    updatedItem.getBatchNumber().trim()
            );
        }

        if (updatedItem.getExpiryDate() != null) {
            existing.setExpiryDate(
                    updatedItem.getExpiryDate()
            );
        }

        if (updatedItem.getSupplierName() != null) {
            existing.setSupplierName(
                    updatedItem.getSupplierName().trim()
            );
        }

        if (updatedItem.getStatus() != null &&
                !updatedItem.getStatus()
                        .trim()
                        .isEmpty()) {

            existing.setStatus(
                    updatedItem.getStatus()
                            .trim()
                            .toUpperCase()
            );
        }

        if (updatedItem.getDescription() != null) {
            existing.setDescription(
                    updatedItem.getDescription().trim()
            );
        }

        return inventoryItemRepository.save(existing);
    }

    // Add stock
    public InventoryItem addStock(
            Long id,
            Integer quantity) {

        if (quantity == null || quantity <= 0) {
            throw new RuntimeException(
                    "Stock quantity must be greater than zero"
            );
        }

        InventoryItem item =
                getInventoryItemById(id);

        item.setQuantity(
                item.getQuantity() + quantity
        );

        return inventoryItemRepository.save(item);
    }

    // Remove stock
    public InventoryItem removeStock(
            Long id,
            Integer quantity) {

        if (quantity == null || quantity <= 0) {
            throw new RuntimeException(
                    "Stock quantity must be greater than zero"
            );
        }

        InventoryItem item =
                getInventoryItemById(id);

        if (item.getQuantity() < quantity) {
            throw new RuntimeException(
                    "Insufficient stock"
            );
        }

        item.setQuantity(
                item.getQuantity() - quantity
        );

        return inventoryItemRepository.save(item);
    }

    // Mark available
    public InventoryItem markAvailable(Long id) {

        InventoryItem item =
                getInventoryItemById(id);

        item.setStatus("AVAILABLE");

        return inventoryItemRepository.save(item);
    }

    // Mark unavailable
    public InventoryItem markUnavailable(Long id) {

        InventoryItem item =
                getInventoryItemById(id);

        item.setStatus("UNAVAILABLE");

        return inventoryItemRepository.save(item);
    }

    // Delete inventory item
    public void deleteInventoryItem(Long id) {

        InventoryItem item =
                getInventoryItemById(id);

        inventoryItemRepository.delete(item);
    }
}