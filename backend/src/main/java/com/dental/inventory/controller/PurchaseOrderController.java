package com.dental.inventory.controller;

import com.dental.inventory.dto.request.PurchaseOrderRequest;
import com.dental.inventory.dto.response.PurchaseOrderResponse;
import com.dental.inventory.enums.OrderStatus;
import com.dental.inventory.service.PurchaseOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/purchase-orders")
@RequiredArgsConstructor
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;

    @GetMapping
    public ResponseEntity<List<PurchaseOrderResponse>> getAllOrders(
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) Long supplierId) {
        return ResponseEntity.ok(purchaseOrderService.getAllOrders(status, supplierId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PurchaseOrderResponse> getOrderById(@PathVariable Long id) {
        return ResponseEntity.ok(purchaseOrderService.getOrderById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('INVENTORY_MANAGER', 'ADMIN')")
    public ResponseEntity<PurchaseOrderResponse> createOrder(@Valid @RequestBody PurchaseOrderRequest request) {
        return new ResponseEntity<>(purchaseOrderService.createOrder(request), HttpStatus.CREATED);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('INVENTORY_MANAGER', 'ADMIN')")
    public ResponseEntity<PurchaseOrderResponse> updateOrderStatus(
            @PathVariable Long id,
            @RequestParam OrderStatus status) {
        return ResponseEntity.ok(purchaseOrderService.updateOrderStatus(id, status));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('INVENTORY_MANAGER', 'ADMIN')")
    public ResponseEntity<Void> deleteOrder(@PathVariable Long id) {
        purchaseOrderService.deleteOrder(id);
        return ResponseEntity.noContent().build();
    }
}
