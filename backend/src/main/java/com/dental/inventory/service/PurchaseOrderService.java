package com.dental.inventory.service;

import com.dental.inventory.dto.request.PurchaseOrderItemRequest;
import com.dental.inventory.dto.request.PurchaseOrderRequest;
import com.dental.inventory.dto.response.PurchaseOrderItemResponse;
import com.dental.inventory.dto.response.PurchaseOrderResponse;
import com.dental.inventory.entity.InventoryItem;
import com.dental.inventory.entity.PurchaseOrder;
import com.dental.inventory.entity.PurchaseOrderItem;
import com.dental.inventory.entity.Supplier;
import com.dental.inventory.enums.ItemStatus;
import com.dental.inventory.enums.OrderStatus;
import com.dental.inventory.exception.ResourceNotFoundException;
import com.dental.inventory.exception.ValidationException;
import com.dental.inventory.repository.InventoryItemRepository;
import com.dental.inventory.repository.PurchaseOrderRepository;
import com.dental.inventory.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PurchaseOrderService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final SupplierRepository supplierRepository;
    private final InventoryItemRepository inventoryItemRepository;

    public List<PurchaseOrderResponse> getAllOrders(OrderStatus status, Long supplierId) {
        List<PurchaseOrder> orders;
        if (status != null) {
            orders = purchaseOrderRepository.findByStatus(status);
        } else if (supplierId != null) {
            orders = purchaseOrderRepository.findBySupplierId(supplierId);
        } else {
            orders = purchaseOrderRepository.findAll();
        }
        return orders.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public PurchaseOrderResponse getOrderById(Long id) {
        PurchaseOrder order = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase order not found with ID: " + id));
        return mapToResponse(order);
    }

    @Transactional
    public PurchaseOrderResponse createOrder(PurchaseOrderRequest request) {
        Supplier supplier = supplierRepository.findById(request.getSupplierId())
                .orElseThrow(() -> new ResourceNotFoundException("Supplier not found with ID: " + request.getSupplierId()));

        if (request.getExpectedDeliveryDate() != null && request.getExpectedDeliveryDate().isBefore(request.getOrderDate())) {
            throw new ValidationException("Expected delivery date cannot be before the order date.");
        }

        PurchaseOrder order = PurchaseOrder.builder()
                .supplier(supplier)
                .orderDate(request.getOrderDate())
                .expectedDeliveryDate(request.getExpectedDeliveryDate())
                .notes(request.getNotes())
                .status(OrderStatus.PENDING)
                .totalAmount(BigDecimal.ZERO)
                .items(new ArrayList<>())
                .build();

        BigDecimal total = BigDecimal.ZERO;

        for (PurchaseOrderItemRequest itemReq : request.getItems()) {
            InventoryItem inventoryItem = inventoryItemRepository.findById(itemReq.getInventoryItemId())
                    .orElseThrow(() -> new ResourceNotFoundException("Inventory item not found with ID: " + itemReq.getInventoryItemId()));

            BigDecimal subtotal = itemReq.getUnitPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity()));
            total = total.add(subtotal);

            PurchaseOrderItem orderItem = PurchaseOrderItem.builder()
                    .purchaseOrder(order)
                    .inventoryItem(inventoryItem)
                    .quantity(itemReq.getQuantity())
                    .unitPrice(itemReq.getUnitPrice())
                    .subtotal(subtotal)
                    .build();

            order.getItems().add(orderItem);
        }

        order.setTotalAmount(total);
        PurchaseOrder saved = purchaseOrderRepository.save(order);
        return mapToResponse(saved);
    }

    @Transactional
    public PurchaseOrderResponse updateOrderStatus(Long id, OrderStatus newStatus) {
        PurchaseOrder order = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase order not found with ID: " + id));

        if (order.getStatus() == OrderStatus.DELIVERED) {
            throw new ValidationException("Cannot modify an already DELIVERED order.");
        }
        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new ValidationException("Cannot modify a CANCELLED order.");
        }

        if (newStatus == OrderStatus.DELIVERED) {
            for (PurchaseOrderItem orderItem : order.getItems()) {
                InventoryItem item = orderItem.getInventoryItem();
                item.setQuantity(item.getQuantity() + orderItem.getQuantity());
                if (item.getStatus() == ItemStatus.LOW_STOCK && item.getQuantity() > item.getMinimumStockLevel()) {
                    item.setStatus(ItemStatus.ACTIVE);
                }
                inventoryItemRepository.save(item);
            }
        }

        order.setStatus(newStatus);
        PurchaseOrder updated = purchaseOrderRepository.save(order);
        return mapToResponse(updated);
    }

    @Transactional
    public void deleteOrder(Long id) {
        PurchaseOrder order = purchaseOrderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Purchase order not found with ID: " + id));

        if (order.getStatus() == OrderStatus.DELIVERED) {
            throw new ValidationException("Delivered purchase orders cannot be deleted as inventory was already received.");
        }
        purchaseOrderRepository.delete(order);
    }

    public PurchaseOrderResponse mapToResponse(PurchaseOrder order) {
        List<PurchaseOrderItemResponse> itemResponses = order.getItems().stream()
                .map(item -> PurchaseOrderItemResponse.builder()
                        .id(item.getId())
                        .inventoryItemId(item.getInventoryItem().getId())
                        .itemName(item.getInventoryItem().getItemName())
                        .unit(item.getInventoryItem().getUnit())
                        .quantity(item.getQuantity())
                        .unitPrice(item.getUnitPrice())
                        .subtotal(item.getSubtotal())
                        .build())
                .collect(Collectors.toList());

        return PurchaseOrderResponse.builder()
                .id(order.getId())
                .supplierId(order.getSupplier().getId())
                .supplierName(order.getSupplier().getSupplierName())
                .orderDate(order.getOrderDate())
                .expectedDeliveryDate(order.getExpectedDeliveryDate())
                .status(order.getStatus())
                .totalAmount(order.getTotalAmount())
                .notes(order.getNotes())
                .items(itemResponses)
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .build();
    }
}
