package com.dental.inventory.controller;

import com.dental.inventory.dto.request.DispenseRequest;
import com.dental.inventory.dto.request.InventoryItemRequest;
import com.dental.inventory.dto.request.StockUpdateRequest;
import com.dental.inventory.dto.response.InventoryItemResponse;
import com.dental.inventory.enums.ItemCategory;
import com.dental.inventory.enums.ItemStatus;
import com.dental.inventory.service.InventoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;

    @GetMapping
    public ResponseEntity<List<InventoryItemResponse>> getAllItems(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) ItemCategory category,
            @RequestParam(required = false) ItemStatus status) {
        return ResponseEntity.ok(inventoryService.getAllItems(search, category, status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<InventoryItemResponse> getItemById(@PathVariable Long id) {
        return ResponseEntity.ok(inventoryService.getItemById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('INVENTORY_MANAGER', 'ADMIN', 'SUPPLIER')")
    public ResponseEntity<InventoryItemResponse> createItem(@Valid @RequestBody InventoryItemRequest request) {
        return new ResponseEntity<>(inventoryService.createItem(request), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('INVENTORY_MANAGER', 'ADMIN', 'SUPPLIER')")
    public ResponseEntity<InventoryItemResponse> updateItem(
            @PathVariable Long id,
            @Valid @RequestBody InventoryItemRequest request) {
        return ResponseEntity.ok(inventoryService.updateItem(id, request));
    }

    /**
     * Nurse taking/dispensing item from stock.
     * Blocked if item is expired!
     */
    @PostMapping("/{id}/dispense")
    @PreAuthorize("hasAnyRole('NURSE', 'INVENTORY_MANAGER', 'ADMIN', 'PHARMACIST')")
    public ResponseEntity<InventoryItemResponse> dispenseItem(
            @PathVariable Long id,
            @Valid @RequestBody DispenseRequest request) {
        return ResponseEntity.ok(inventoryService.dispenseItem(id, request));
    }

    /**
     * Nurse or Inventory Manager disposing an expired item.
     */
    @DeleteMapping("/{id}/dispose-expired")
    @PreAuthorize("hasAnyRole('NURSE', 'INVENTORY_MANAGER', 'ADMIN')")
    public ResponseEntity<Void> removeExpiredItem(@PathVariable Long id) {
        inventoryService.removeExpiredItem(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/stock")
    @PreAuthorize("hasAnyRole('INVENTORY_MANAGER', 'ADMIN', 'PHARMACIST', 'SUPPLIER')")
    public ResponseEntity<InventoryItemResponse> updateStock(
            @PathVariable Long id,
            @Valid @RequestBody StockUpdateRequest request) {
        return ResponseEntity.ok(inventoryService.updateStock(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('INVENTORY_MANAGER', 'ADMIN')")
    public ResponseEntity<Void> deleteItem(@PathVariable Long id) {
        inventoryService.deleteItem(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/low-stock")
    public ResponseEntity<List<InventoryItemResponse>> getLowStockItems() {
        return ResponseEntity.ok(inventoryService.getLowStockItems());
    }

    @GetMapping("/expired")
    public ResponseEntity<List<InventoryItemResponse>> getExpiredItems() {
        return ResponseEntity.ok(inventoryService.getExpiredItems());
    }

    @GetMapping("/expiring-soon")
    public ResponseEntity<List<InventoryItemResponse>> getExpiringSoonItems() {
        return ResponseEntity.ok(inventoryService.getExpiringSoonItems());
    }

    @GetMapping("/by-supplier/{supplierId}")
    public ResponseEntity<List<InventoryItemResponse>> getItemsBySupplier(@PathVariable Long supplierId) {
        return ResponseEntity.ok(inventoryService.getItemsBySupplier(supplierId));
    }
}
