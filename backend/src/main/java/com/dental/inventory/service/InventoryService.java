package com.dental.inventory.service;

import com.dental.inventory.dto.request.DispenseRequest;
import com.dental.inventory.dto.request.InventoryItemRequest;
import com.dental.inventory.dto.request.StockUpdateRequest;
import com.dental.inventory.dto.response.InventoryItemResponse;
import com.dental.inventory.entity.InventoryItem;
import com.dental.inventory.entity.Supplier;
import com.dental.inventory.entity.User;
import com.dental.inventory.enums.ItemCategory;
import com.dental.inventory.enums.ItemStatus;
import com.dental.inventory.enums.UserRole;
import com.dental.inventory.exception.ResourceNotFoundException;
import com.dental.inventory.exception.ValidationException;
import com.dental.inventory.repository.InventoryItemRepository;
import com.dental.inventory.repository.SupplierRepository;
import com.dental.inventory.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InventoryService {

    private final InventoryItemRepository inventoryItemRepository;
    private final SupplierRepository supplierRepository;
    private final UserRepository userRepository;

    @Value("${app.supplier.security-key:DENTAL-SUPPLIER-KEY-2026}")
    private String configuredSupplierKey;

    public List<InventoryItemResponse> getAllItems(String search, ItemCategory category, ItemStatus status) {
        List<InventoryItem> items;
        if (search != null && !search.trim().isEmpty()) {
            items = inventoryItemRepository.findByItemNameContainingIgnoreCase(search.trim());
        } else if (category != null) {
            items = inventoryItemRepository.findByCategory(category);
        } else if (status != null) {
            items = inventoryItemRepository.findByStatus(status);
        } else {
            items = inventoryItemRepository.findAll();
        }
        return items.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public InventoryItemResponse getItemById(Long id) {
        InventoryItem item = inventoryItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory item not found with id: " + id));
        return mapToResponse(item);
    }

    /**
     * Create Item with validations:
     * - If user is SUPPLIER: requires valid security key and quantity > 0
     * - Manufacture date cannot be in the future
     * - Expiry date must be after manufacture date and not in the past
     */
    @Transactional
    public InventoryItemResponse createItem(InventoryItemRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isSupplierRole = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_SUPPLIER"));

        // SUPPLIER VALIDATION: Check Security Key and non-zero quantity
        if (isSupplierRole || (request.getSupplierSecurityKey() != null && !request.getSupplierSecurityKey().isEmpty())) {
            if (request.getSupplierSecurityKey() == null || !request.getSupplierSecurityKey().trim().equals(configuredSupplierKey)) {
                throw new ValidationException("Security key was wrong! Please try again.");
            }
            if (request.getQuantity() <= 0) {
                throw new ValidationException("Supplier cannot add item with 0 or less than zero quantity. Quantity must be greater than 0.");
            }
        }

        // Quantity & Price validation
        if (request.getQuantity() < 0) {
            throw new ValidationException("Quantity cannot be negative.");
        }
        if (request.getMinimumStockLevel() < 1) {
            throw new ValidationException("Minimum stock level must be at least 1.");
        }
        if (request.getUnitPrice().doubleValue() <= 0) {
            throw new ValidationException("Unit price must be greater than zero.");
        }

        // Date Validations
        LocalDate today = LocalDate.now();
        if (request.getManufactureDate() != null && request.getManufactureDate().isAfter(today)) {
            throw new ValidationException("Manufacture date cannot be in the future.");
        }
        if (request.getExpiryDate() != null && request.getExpiryDate().isBefore(today)) {
            throw new ValidationException("Expiry date cannot be in the past. Must be today or a future date.");
        }
        if (request.getManufactureDate() != null && request.getExpiryDate() != null 
                && request.getExpiryDate().isBefore(request.getManufactureDate())) {
            throw new ValidationException("Expiry date must be after the manufacture date.");
        }

        // Supplier check
        Supplier supplier = null;
        if (request.getSupplierId() != null) {
            supplier = supplierRepository.findById(request.getSupplierId())
                    .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with ID: " + request.getSupplierId()));
        }

        ItemStatus initialStatus = ItemStatus.ACTIVE;
        if (request.getExpiryDate() != null && request.getExpiryDate().isBefore(today)) {
            initialStatus = ItemStatus.EXPIRED;
        } else if (request.getQuantity() <= request.getMinimumStockLevel()) {
            initialStatus = ItemStatus.LOW_STOCK;
        }

        InventoryItem item = InventoryItem.builder()
                .itemName(request.getItemName().trim())
                .category(request.getCategory())
                .description(request.getDescription())
                .unit(request.getUnit().trim())
                .quantity(request.getQuantity())
                .minimumStockLevel(request.getMinimumStockLevel())
                .unitPrice(request.getUnitPrice())
                .manufactureDate(request.getManufactureDate())
                .expiryDate(request.getExpiryDate())
                .status(initialStatus)
                .supplier(supplier)
                .build();

        InventoryItem saved = inventoryItemRepository.save(item);
        return mapToResponse(saved);
    }

    @Transactional
    public InventoryItemResponse updateItem(Long id, InventoryItemRequest request) {
        InventoryItem item = inventoryItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory item not found with id: " + id));

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isSupplierRole = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_SUPPLIER"));

        if (isSupplierRole) {
            if (request.getSupplierSecurityKey() == null || !request.getSupplierSecurityKey().trim().equals(configuredSupplierKey)) {
                throw new ValidationException("Security key was wrong! Please try again.");
            }
        }

        if (request.getQuantity() < 0) {
            throw new ValidationException("Quantity cannot be negative.");
        }
        if (request.getMinimumStockLevel() < 1) {
            throw new ValidationException("Minimum stock level must be at least 1.");
        }
        if (request.getUnitPrice().doubleValue() <= 0) {
            throw new ValidationException("Unit price must be greater than zero.");
        }

        LocalDate today = LocalDate.now();
        if (request.getManufactureDate() != null && request.getManufactureDate().isAfter(today)) {
            throw new ValidationException("Manufacture date cannot be in the future.");
        }
        if (request.getManufactureDate() != null && request.getExpiryDate() != null 
                && request.getExpiryDate().isBefore(request.getManufactureDate())) {
            throw new ValidationException("Expiry date must be after manufacture date.");
        }

        Supplier supplier = null;
        if (request.getSupplierId() != null) {
            supplier = supplierRepository.findById(request.getSupplierId())
                    .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with ID: " + request.getSupplierId()));
        }

        item.setItemName(request.getItemName().trim());
        item.setCategory(request.getCategory());
        item.setDescription(request.getDescription());
        item.setUnit(request.getUnit().trim());
        item.setQuantity(request.getQuantity());
        item.setMinimumStockLevel(request.getMinimumStockLevel());
        item.setUnitPrice(request.getUnitPrice());
        item.setManufactureDate(request.getManufactureDate());
        item.setExpiryDate(request.getExpiryDate());
        item.setSupplier(supplier);

        if (item.getStatus() != ItemStatus.INACTIVE) {
            if (item.getExpiryDate() != null && item.getExpiryDate().isBefore(today)) {
                item.setStatus(ItemStatus.EXPIRED);
            } else if (item.getQuantity() <= item.getMinimumStockLevel()) {
                item.setStatus(ItemStatus.LOW_STOCK);
            } else {
                item.setStatus(ItemStatus.ACTIVE);
            }
        }

        InventoryItem updated = inventoryItemRepository.save(item);
        return mapToResponse(updated);
    }

    /**
     * Nurse taking / dispensing items:
     * VALIDATION: If item is EXPIRED, Nurse CANNOT take this item!
     */
    @Transactional
    public InventoryItemResponse dispenseItem(Long id, DispenseRequest request) {
        InventoryItem item = inventoryItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory item not found with id: " + id));

        LocalDate today = LocalDate.now();
        boolean isExpired = (item.getExpiryDate() != null && item.getExpiryDate().isBefore(today))
                || item.getStatus() == ItemStatus.EXPIRED;

        // CRITICAL NURSE VALIDATION
        if (isExpired) {
            throw new ValidationException("This item has EXPIRED! You cannot take or dispense this item.");
        }

        if (request.getQuantity() > item.getQuantity()) {
            throw new ValidationException("Cannot dispense " + request.getQuantity() + " " + item.getUnit() 
                    + ". Only " + item.getQuantity() + " available in stock.");
        }

        item.setQuantity(item.getQuantity() - request.getQuantity());

        if (item.getQuantity() <= item.getMinimumStockLevel()) {
            item.setStatus(ItemStatus.LOW_STOCK);
        } else {
            item.setStatus(ItemStatus.ACTIVE);
        }

        InventoryItem updated = inventoryItemRepository.save(item);
        return mapToResponse(updated);
    }

    /**
     * Nurse or Inventory Manager can remove an item when it expires.
     */
    @Transactional
    public void removeExpiredItem(Long id) {
        InventoryItem item = inventoryItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory item not found with id: " + id));

        LocalDate today = LocalDate.now();
        boolean isExpired = (item.getExpiryDate() != null && item.getExpiryDate().isBefore(today))
                || item.getStatus() == ItemStatus.EXPIRED;

        if (!isExpired) {
            throw new ValidationException("This item has not expired yet. Only expired items can be disposed through this action.");
        }

        item.setStatus(ItemStatus.INACTIVE);
        item.setQuantity(0);
        inventoryItemRepository.save(item);
    }

    @Transactional
    public InventoryItemResponse updateStock(Long id, StockUpdateRequest request) {
        InventoryItem item = inventoryItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory item not found with id: " + id));

        item.setQuantity(request.getQuantity());

        LocalDate today = LocalDate.now();
        if (item.getStatus() != ItemStatus.INACTIVE) {
            if (item.getExpiryDate() != null && item.getExpiryDate().isBefore(today)) {
                item.setStatus(ItemStatus.EXPIRED);
            } else if (item.getQuantity() <= item.getMinimumStockLevel()) {
                item.setStatus(ItemStatus.LOW_STOCK);
            } else {
                item.setStatus(ItemStatus.ACTIVE);
            }
        }

        InventoryItem updated = inventoryItemRepository.save(item);
        return mapToResponse(updated);
    }

    @Transactional
    public void deleteItem(Long id) {
        InventoryItem item = inventoryItemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory item not found with id: " + id));
        item.setStatus(ItemStatus.INACTIVE);
        inventoryItemRepository.save(item);
    }

    public List<InventoryItemResponse> getLowStockItems() {
        return inventoryItemRepository.findLowStockItems().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<InventoryItemResponse> getExpiredItems() {
        return inventoryItemRepository.findExpiredItems(LocalDate.now()).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<InventoryItemResponse> getExpiringSoonItems() {
        LocalDate today = LocalDate.now();
        LocalDate inThirtyDays = today.plusDays(30);
        return inventoryItemRepository.findExpiringSoonItems(today, inThirtyDays).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<InventoryItemResponse> getItemsBySupplier(Long supplierId) {
        return inventoryItemRepository.findBySupplierId(supplierId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public InventoryItemResponse mapToResponse(InventoryItem item) {
        LocalDate today = LocalDate.now();
        boolean isExpired = item.getExpiryDate() != null && item.getExpiryDate().isBefore(today);
        boolean isExpiringSoon = item.getExpiryDate() != null
                && !isExpired
                && item.getExpiryDate().isBefore(today.plusDays(30));
        boolean isLowStock = item.getQuantity() <= item.getMinimumStockLevel();

        return InventoryItemResponse.builder()
                .id(item.getId())
                .itemName(item.getItemName())
                .category(item.getCategory())
                .description(item.getDescription())
                .unit(item.getUnit())
                .quantity(item.getQuantity())
                .minimumStockLevel(item.getMinimumStockLevel())
                .unitPrice(item.getUnitPrice())
                .manufactureDate(item.getManufactureDate())
                .expiryDate(item.getExpiryDate())
                .status(item.getStatus())
                .supplierId(item.getSupplier() != null ? item.getSupplier().getId() : null)
                .supplierName(item.getSupplier() != null ? item.getSupplier().getSupplierName() : "Unassigned")
                .isLowStock(isLowStock)
                .isExpired(isExpired)
                .isExpiringSoon(isExpiringSoon)
                .createdAt(item.getCreatedAt())
                .updatedAt(item.getUpdatedAt())
                .build();
    }
}
