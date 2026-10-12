package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.InventoryDTO;
import com.dentaflow.backend.entity.InventoryItem;
import com.dentaflow.backend.mapper.InventoryMapper;
import com.dentaflow.backend.security.AccessControlService;
import com.dentaflow.backend.service.InventoryService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/inventory")
@PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'STAFF', 'DENTIST', 'DOCTOR')")
public class InventoryController {

    private final InventoryService inventoryService;
    private final InventoryMapper inventoryMapper;
    private final AccessControlService accessControlService;

    @Autowired
    public InventoryController(
            InventoryService inventoryService,
            InventoryMapper inventoryMapper,
            AccessControlService accessControlService) {

        this.inventoryService = inventoryService;
        this.inventoryMapper = inventoryMapper;
        this.accessControlService = accessControlService;
    }

    public InventoryController(
            InventoryService inventoryService,
            InventoryMapper inventoryMapper) {

        this(inventoryService, inventoryMapper, null);
    }

    private boolean isUnauthenticated() {
        return accessControlService != null && accessControlService.getCurrentUserId() == null && !accessControlService.isAdmin();
    }

    private boolean canReadInventory() {
        if (accessControlService == null) return true;
        return accessControlService.isAdmin()
                || accessControlService.hasRole("PHARMACIST")
                || accessControlService.hasRole("STAFF")
                || accessControlService.hasRole("DENTIST")
                || accessControlService.hasRole("DOCTOR");
    }

    private boolean canManageInventory() {
        if (accessControlService == null) return true;
        return accessControlService.isAdmin()
                || accessControlService.hasRole("PHARMACIST");
    }

    // =========================================================
    // CREATE INVENTORY ITEM
    // =========================================================

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> createInventoryItem(
            @RequestBody InventoryDTO dto) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canManageInventory()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            if (dto == null) {
                return ResponseEntity.badRequest()
                        .body("Inventory item data is required");
            }

            InventoryItem item =
                    inventoryMapper.toEntity(dto);

            InventoryItem saved =
                    inventoryService.createInventoryItem(item);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(inventoryMapper.toDTO(saved));

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET ALL INVENTORY ITEMS
    // =========================================================

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'STAFF', 'DENTIST', 'DOCTOR')")
    public ResponseEntity<?> getAllInventoryItems() {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadInventory()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        List<InventoryDTO> result =
                inventoryService
                        .getAllInventoryItems()
                        .stream()
                        .map(inventoryMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // GET INVENTORY ITEM BY ID
    // =========================================================

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'STAFF', 'DENTIST', 'DOCTOR')")
    public ResponseEntity<?> getInventoryItemById(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadInventory()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            InventoryItem item =
                    inventoryService
                            .getInventoryItemById(id);

            return ResponseEntity.ok(
                    inventoryMapper.toDTO(item)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET INVENTORY ITEM BY CODE
    // =========================================================

    @GetMapping("/code/{inventoryCode}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'STAFF', 'DENTIST', 'DOCTOR')")
    public ResponseEntity<?> getInventoryItemByCode(
            @PathVariable String inventoryCode) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadInventory()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            InventoryItem item =
                    inventoryService
                            .getInventoryItemByCode(
                                    inventoryCode
                            );

            return ResponseEntity.ok(
                    inventoryMapper.toDTO(item)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // SEARCH BY ITEM NAME
    // =========================================================

    @GetMapping("/search/name")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'STAFF', 'DENTIST', 'DOCTOR')")
    public ResponseEntity<?> searchByItemName(
            @RequestParam String itemName) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadInventory()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        List<InventoryDTO> result =
                inventoryService
                        .searchByItemName(itemName)
                        .stream()
                        .map(inventoryMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // GET ITEMS BY CATEGORY
    // =========================================================

    @GetMapping("/category/{category}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'STAFF', 'DENTIST', 'DOCTOR')")
    public ResponseEntity<?> getItemsByCategory(
            @PathVariable String category) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadInventory()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        List<InventoryDTO> result =
                inventoryService
                        .getItemsByCategory(category)
                        .stream()
                        .map(inventoryMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // GET ITEMS BY TYPE
    // =========================================================

    @GetMapping("/type/{itemType}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'STAFF', 'DENTIST', 'DOCTOR')")
    public ResponseEntity<?> getItemsByType(
            @PathVariable String itemType) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadInventory()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        List<InventoryDTO> result =
                inventoryService
                        .getItemsByType(itemType)
                        .stream()
                        .map(inventoryMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // GET ITEMS BY STATUS
    // =========================================================

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'STAFF', 'DENTIST', 'DOCTOR')")
    public ResponseEntity<?> getItemsByStatus(
            @PathVariable String status) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadInventory()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            List<InventoryDTO> result =
                    inventoryService
                            .getItemsByStatus(status)
                            .stream()
                            .map(inventoryMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET LOW STOCK ITEMS
    // =========================================================

    @GetMapping("/low-stock")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'STAFF', 'DENTIST', 'DOCTOR')")
    public ResponseEntity<?> getLowStockItems() {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadInventory()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        List<InventoryDTO> result =
                inventoryService
                        .getLowStockItems()
                        .stream()
                        .map(inventoryMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // GET LOW STOCK ITEMS BY QUANTITY
    // =========================================================

    @GetMapping("/low-stock/{quantity}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'STAFF', 'DENTIST', 'DOCTOR')")
    public ResponseEntity<?> getLowStockItems(
            @PathVariable Integer quantity) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadInventory()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            List<InventoryDTO> result =
                    inventoryService
                            .getLowStockItems(quantity)
                            .stream()
                            .map(inventoryMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET EXPIRED ITEMS
    // =========================================================

    @GetMapping("/expired")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'STAFF', 'DENTIST', 'DOCTOR')")
    public ResponseEntity<?> getExpiredItems() {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadInventory()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        List<InventoryDTO> result =
                inventoryService
                        .getExpiredItems()
                        .stream()
                        .map(inventoryMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // GET ITEMS EXPIRING BETWEEN DATES
    // =========================================================

    @GetMapping("/expiring")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'STAFF', 'DENTIST', 'DOCTOR')")
    public ResponseEntity<?> getItemsExpiringBetween(
            @RequestParam
            @DateTimeFormat(
                    iso = DateTimeFormat.ISO.DATE
            )
            LocalDate startDate,

            @RequestParam
            @DateTimeFormat(
                    iso = DateTimeFormat.ISO.DATE
            )
            LocalDate endDate) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadInventory()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            List<InventoryDTO> result =
                    inventoryService
                            .getItemsExpiringBetween(
                                    startDate,
                                    endDate
                            )
                            .stream()
                            .map(inventoryMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // SEARCH INVENTORY
    // =========================================================

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'STAFF', 'DENTIST', 'DOCTOR')")
    public ResponseEntity<?> searchInventory(
            @RequestParam(required = false)
            String keyword) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadInventory()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        List<InventoryDTO> result =
                inventoryService
                        .searchInventory(keyword)
                        .stream()
                        .map(inventoryMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // UPDATE INVENTORY ITEM
    // =========================================================

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> updateInventoryItem(
            @PathVariable Long id,
            @RequestBody InventoryDTO dto) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canManageInventory()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            if (dto == null) {
                return ResponseEntity.badRequest()
                        .body("Inventory item data is required");
            }

            dto.setId(id);
            InventoryItem item =
                    inventoryMapper.toEntity(dto);

            InventoryItem updated =
                    inventoryService.updateInventoryItem(
                            id,
                            item
                    );

            return ResponseEntity.ok(
                    inventoryMapper.toDTO(updated)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // ADD STOCK
    // =========================================================

    @PutMapping("/{id}/add-stock/{quantity}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> addStock(
            @PathVariable Long id,
            @PathVariable Integer quantity) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canManageInventory()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        if (quantity == null || quantity <= 0) {
            return ResponseEntity.badRequest()
                    .body("Stock quantity must be greater than zero");
        }

        try {

            InventoryItem item =
                    inventoryService.addStock(
                            id,
                            quantity
                    );

            return ResponseEntity.ok(
                    inventoryMapper.toDTO(item)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // REMOVE STOCK
    // =========================================================

    @PutMapping("/{id}/remove-stock/{quantity}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> removeStock(
            @PathVariable Long id,
            @PathVariable Integer quantity) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canManageInventory()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        if (quantity == null || quantity <= 0) {
            return ResponseEntity.badRequest()
                    .body("Stock quantity must be greater than zero");
        }

        try {

            InventoryItem item =
                    inventoryService.removeStock(
                            id,
                            quantity
                    );

            return ResponseEntity.ok(
                    inventoryMapper.toDTO(item)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // MARK AVAILABLE
    // =========================================================

    @PutMapping("/{id}/available")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> markAvailable(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canManageInventory()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            InventoryItem item =
                    inventoryService.markAvailable(id);

            return ResponseEntity.ok(
                    inventoryMapper.toDTO(item)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // MARK UNAVAILABLE
    // =========================================================

    @PutMapping("/{id}/unavailable")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> markUnavailable(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canManageInventory()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            InventoryItem item =
                    inventoryService.markUnavailable(id);

            return ResponseEntity.ok(
                    inventoryMapper.toDTO(item)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // DELETE INVENTORY ITEM
    // =========================================================

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> deleteInventoryItem(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canManageInventory()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            inventoryService.deleteInventoryItem(id);

            return ResponseEntity.ok(
                    "Inventory item deleted successfully"
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }
}