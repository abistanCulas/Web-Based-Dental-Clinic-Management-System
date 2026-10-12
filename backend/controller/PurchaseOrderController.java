package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.PurchaseOrderDTO;
import com.dentaflow.backend.entity.PurchaseOrder;
import com.dentaflow.backend.mapper.PurchaseOrderMapper;
import com.dentaflow.backend.security.AccessControlService;
import com.dentaflow.backend.service.PurchaseOrderService;

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
@RequestMapping("/api/purchase-orders")
@PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;
    private final PurchaseOrderMapper purchaseOrderMapper;
    private final AccessControlService accessControlService;

    @Autowired
    public PurchaseOrderController(
            PurchaseOrderService purchaseOrderService,
            PurchaseOrderMapper purchaseOrderMapper,
            AccessControlService accessControlService) {

        this.purchaseOrderService = purchaseOrderService;
        this.purchaseOrderMapper = purchaseOrderMapper;
        this.accessControlService = accessControlService;
    }

    public PurchaseOrderController(
            PurchaseOrderService purchaseOrderService,
            PurchaseOrderMapper purchaseOrderMapper) {

        this(purchaseOrderService, purchaseOrderMapper, null);
    }

    private boolean isUnauthenticated() {
        return accessControlService != null && accessControlService.getCurrentUserId() == null && !accessControlService.isAdmin();
    }

    private boolean canReadPurchaseOrders() {
        if (accessControlService == null) return true;
        return accessControlService.isAdmin()
                || accessControlService.hasRole("PHARMACIST");
    }

    private boolean canManagePurchaseOrders() {
        if (accessControlService == null) return true;
        return accessControlService.isAdmin()
                || accessControlService.hasRole("PHARMACIST");
    }

    private boolean canApprovePurchaseOrders() {
        if (accessControlService == null) return true;
        return accessControlService.isAdmin();
    }

    private boolean canDeletePurchaseOrders() {
        if (accessControlService == null) return true;
        return accessControlService.isAdmin();
    }

    // =========================================================
    // CREATE PURCHASE ORDER
    // =========================================================

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> createPurchaseOrder(
            @RequestBody PurchaseOrderDTO dto) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canManagePurchaseOrders()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            if (dto == null) {
                return ResponseEntity.badRequest()
                        .body("Purchase order data is required");
            }

            if (dto.getSupplierId() == null) {
                return ResponseEntity.badRequest()
                        .body("Supplier ID is required");
            }

            PurchaseOrder purchaseOrder =
                    purchaseOrderMapper.toEntity(dto);

            PurchaseOrder saved =
                    purchaseOrderService.createPurchaseOrder(
                            purchaseOrder,
                            dto.getSupplierId()
                    );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(
                            purchaseOrderMapper.toDTO(saved)
                    );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET ALL PURCHASE ORDERS
    // =========================================================

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> getAllPurchaseOrders() {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadPurchaseOrders()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        List<PurchaseOrderDTO> result =
                purchaseOrderService
                        .getAllPurchaseOrders()
                        .stream()
                        .map(purchaseOrderMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // GET PURCHASE ORDER BY ID
    // =========================================================

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> getPurchaseOrderById(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadPurchaseOrders()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            PurchaseOrder order =
                    purchaseOrderService
                            .getPurchaseOrderById(id);

            return ResponseEntity.ok(
                    purchaseOrderMapper.toDTO(order)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET PURCHASE ORDER BY NUMBER
    // =========================================================

    @GetMapping("/number/{purchaseOrderNumber}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> getPurchaseOrderByNumber(
            @PathVariable String purchaseOrderNumber) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadPurchaseOrders()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            PurchaseOrder order =
                    purchaseOrderService
                            .getPurchaseOrderByNumber(
                                    purchaseOrderNumber
                            );

            return ResponseEntity.ok(
                    purchaseOrderMapper.toDTO(order)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET ORDERS BY SUPPLIER
    // =========================================================

    @GetMapping("/supplier/{supplierId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> getOrdersBySupplier(
            @PathVariable Long supplierId) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadPurchaseOrders()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            List<PurchaseOrderDTO> result =
                    purchaseOrderService
                            .getOrdersBySupplier(supplierId)
                            .stream()
                            .map(purchaseOrderMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET ORDERS BY STATUS
    // =========================================================

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> getOrdersByStatus(
            @PathVariable String status) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadPurchaseOrders()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            List<PurchaseOrderDTO> result =
                    purchaseOrderService
                            .getOrdersByStatus(status)
                            .stream()
                            .map(purchaseOrderMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET ORDERS BETWEEN DATES
    // =========================================================

    @GetMapping("/date-range")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> getOrdersBetweenDates(
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate startDate,

            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate endDate) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadPurchaseOrders()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            List<PurchaseOrderDTO> result =
                    purchaseOrderService
                            .getOrdersBetweenDates(
                                    startDate,
                                    endDate
                            )
                            .stream()
                            .map(purchaseOrderMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET ORDERS EXPECTED ON DATE
    // =========================================================

    @GetMapping("/expected-delivery")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> getOrdersExpectedOn(
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate expectedDeliveryDate) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadPurchaseOrders()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            List<PurchaseOrderDTO> result =
                    purchaseOrderService
                            .getOrdersExpectedOn(
                                    expectedDeliveryDate
                            )
                            .stream()
                            .map(purchaseOrderMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET SUPPLIER ORDERS BY STATUS
    // =========================================================

    @GetMapping("/supplier/{supplierId}/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> getSupplierOrdersByStatus(
            @PathVariable Long supplierId,
            @PathVariable String status) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadPurchaseOrders()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            List<PurchaseOrderDTO> result =
                    purchaseOrderService
                            .getSupplierOrdersByStatus(
                                    supplierId,
                                    status
                            )
                            .stream()
                            .map(purchaseOrderMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // UPDATE PURCHASE ORDER
    // =========================================================

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> updatePurchaseOrder(
            @PathVariable Long id,
            @RequestBody PurchaseOrderDTO dto) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canManagePurchaseOrders()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            if (dto == null) {
                return ResponseEntity.badRequest()
                        .body("Purchase order data is required");
            }

            dto.setId(id);
            PurchaseOrder updatedOrder =
                    purchaseOrderMapper.toEntity(dto);

            PurchaseOrder updated =
                    purchaseOrderService.updatePurchaseOrder(
                            id,
                            updatedOrder
                    );

            return ResponseEntity.ok(
                    purchaseOrderMapper.toDTO(updated)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // APPROVE PURCHASE ORDER (ADMIN ONLY)
    // =========================================================

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> approvePurchaseOrder(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canApprovePurchaseOrders()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Only administrators can approve purchase orders");
        }

        try {

            PurchaseOrder order =
                    purchaseOrderService
                            .approvePurchaseOrder(id);

            return ResponseEntity.ok(
                    purchaseOrderMapper.toDTO(order)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // SHIP PURCHASE ORDER
    // =========================================================

    @PutMapping("/{id}/ship")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> shipPurchaseOrder(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canManagePurchaseOrders()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            PurchaseOrder order =
                    purchaseOrderService
                            .shipPurchaseOrder(id);

            return ResponseEntity.ok(
                    purchaseOrderMapper.toDTO(order)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // RECEIVE PURCHASE ORDER
    // =========================================================

    @PutMapping("/{id}/receive")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> receivePurchaseOrder(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canManagePurchaseOrders()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            PurchaseOrder order =
                    purchaseOrderService
                            .receivePurchaseOrder(id);

            return ResponseEntity.ok(
                    purchaseOrderMapper.toDTO(order)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // CANCEL PURCHASE ORDER
    // =========================================================

    @PutMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> cancelPurchaseOrder(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canManagePurchaseOrders()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            PurchaseOrder order =
                    purchaseOrderService
                            .cancelPurchaseOrder(id);

            return ResponseEntity.ok(
                    purchaseOrderMapper.toDTO(order)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // DELETE PURCHASE ORDER (ADMIN ONLY)
    // =========================================================

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deletePurchaseOrder(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canDeletePurchaseOrders()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Only administrators can delete purchase orders");
        }

        try {

            purchaseOrderService
                    .deletePurchaseOrder(id);

            return ResponseEntity.ok(
                    "Purchase order deleted successfully"
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }
}