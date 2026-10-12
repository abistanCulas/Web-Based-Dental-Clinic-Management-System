package com.dentaflow.backend.service;

import com.dentaflow.backend.entity.PurchaseOrder;
import com.dentaflow.backend.entity.Supplier;
import com.dentaflow.backend.repository.PurchaseOrderRepository;
import com.dentaflow.backend.repository.SupplierRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@Transactional
public class PurchaseOrderService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final SupplierRepository supplierRepository;

    public PurchaseOrderService(
            PurchaseOrderRepository purchaseOrderRepository,
            SupplierRepository supplierRepository) {

        this.purchaseOrderRepository = purchaseOrderRepository;
        this.supplierRepository = supplierRepository;
    }

    // Create purchase order
    public PurchaseOrder createPurchaseOrder(
            PurchaseOrder purchaseOrder,
            Long supplierId) {

        if (purchaseOrder == null) {
            throw new RuntimeException(
                    "Purchase order data is required"
            );
        }

        if (supplierId == null) {
            throw new RuntimeException(
                    "Supplier ID is required"
            );
        }

        Supplier supplier =
                supplierRepository.findById(supplierId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Supplier not found with id: "
                                                + supplierId
                                ));

        purchaseOrder.setSupplier(supplier);

        if (purchaseOrder.getPurchaseOrderNumber() == null ||
                purchaseOrder.getPurchaseOrderNumber()
                        .trim()
                        .isEmpty()) {

            purchaseOrder.setPurchaseOrderNumber(
                    generatePurchaseOrderNumber()
            );

        } else {

            String orderNumber =
                    purchaseOrder
                            .getPurchaseOrderNumber()
                            .trim()
                            .toUpperCase();

            if (purchaseOrderRepository
                    .existsByPurchaseOrderNumber(
                            orderNumber
                    )) {

                throw new RuntimeException(
                        "Purchase order number already exists"
                );
            }

            purchaseOrder.setPurchaseOrderNumber(
                    orderNumber
            );
        }

        if (purchaseOrder.getOrderDate() == null) {
            purchaseOrder.setOrderDate(
                    LocalDate.now()
            );
        }

        if (purchaseOrder.getExpectedDeliveryDate() != null &&
                purchaseOrder.getExpectedDeliveryDate()
                        .isBefore(
                                purchaseOrder.getOrderDate()
                        )) {

            throw new RuntimeException(
                    "Expected delivery date cannot be before order date"
            );
        }

        if (purchaseOrder.getTotalAmount() == null) {
            purchaseOrder.setTotalAmount(
                    BigDecimal.ZERO
            );
        }

        if (purchaseOrder.getTotalAmount()
                .compareTo(BigDecimal.ZERO) < 0) {

            throw new RuntimeException(
                    "Total amount cannot be negative"
            );
        }

        if (purchaseOrder.getStatus() == null ||
                purchaseOrder.getStatus()
                        .trim()
                        .isEmpty()) {

            purchaseOrder.setStatus("PENDING");

        } else {

            purchaseOrder.setStatus(
                    purchaseOrder.getStatus()
                            .trim()
                            .toUpperCase()
            );
        }

        if (purchaseOrder.getItemsDescription() != null) {
            purchaseOrder.setItemsDescription(
                    purchaseOrder.getItemsDescription()
                            .trim()
            );
        }

        if (purchaseOrder.getNotes() != null) {
            purchaseOrder.setNotes(
                    purchaseOrder.getNotes()
                            .trim()
            );
        }

        return purchaseOrderRepository.save(
                purchaseOrder
        );
    }

    // Generate purchase order number
    private String generatePurchaseOrderNumber() {

        long nextNumber =
                purchaseOrderRepository.count() + 1;

        String number;

        do {

            number = String.format(
                    "PO%05d",
                    nextNumber
            );

            nextNumber++;

        } while (
                purchaseOrderRepository
                        .existsByPurchaseOrderNumber(number)
        );

        return number;
    }

    // Get all purchase orders
    @Transactional(readOnly = true)
    public List<PurchaseOrder> getAllPurchaseOrders() {

        return purchaseOrderRepository.findAll();
    }

    // Get purchase order by ID
    @Transactional(readOnly = true)
    public PurchaseOrder getPurchaseOrderById(
            Long id) {

        return purchaseOrderRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Purchase order not found with id: "
                                        + id
                        ));
    }

    // Get purchase order by number
    @Transactional(readOnly = true)
    public PurchaseOrder getPurchaseOrderByNumber(
            String purchaseOrderNumber) {

        if (purchaseOrderNumber == null ||
                purchaseOrderNumber.trim().isEmpty()) {

            throw new RuntimeException(
                    "Purchase order number is required"
            );
        }

        return purchaseOrderRepository
                .findByPurchaseOrderNumber(
                        purchaseOrderNumber
                                .trim()
                                .toUpperCase()
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "Purchase order not found: "
                                        + purchaseOrderNumber
                        ));
    }

    // Get orders by supplier
    @Transactional(readOnly = true)
    public List<PurchaseOrder> getOrdersBySupplier(
            Long supplierId) {

        if (supplierId == null) {
            throw new RuntimeException(
                    "Supplier ID is required"
            );
        }

        return purchaseOrderRepository
                .findBySupplierIdOrderByOrderDateDesc(
                        supplierId
                );
    }

    // Get orders by status
    @Transactional(readOnly = true)
    public List<PurchaseOrder> getOrdersByStatus(
            String status) {

        if (status == null ||
                status.trim().isEmpty()) {

            throw new RuntimeException(
                    "Status is required"
            );
        }

        return purchaseOrderRepository
                .findByStatusIgnoreCaseOrderByOrderDateDesc(
                        status.trim()
                );
    }

    // Get orders between dates
    @Transactional(readOnly = true)
    public List<PurchaseOrder> getOrdersBetweenDates(
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

        return purchaseOrderRepository
                .findByOrderDateBetweenOrderByOrderDateDesc(
                        startDate,
                        endDate
                );
    }

    // Get orders expected on a specific date
    @Transactional(readOnly = true)
    public List<PurchaseOrder> getOrdersExpectedOn(
            LocalDate expectedDeliveryDate) {

        if (expectedDeliveryDate == null) {
            throw new RuntimeException(
                    "Expected delivery date is required"
            );
        }

        return purchaseOrderRepository
                .findByExpectedDeliveryDate(
                        expectedDeliveryDate
                );
    }

    // Get supplier orders by status
    @Transactional(readOnly = true)
    public List<PurchaseOrder> getSupplierOrdersByStatus(
            Long supplierId,
            String status) {

        if (supplierId == null) {
            throw new RuntimeException(
                    "Supplier ID is required"
            );
        }

        if (status == null ||
                status.trim().isEmpty()) {

            throw new RuntimeException(
                    "Status is required"
            );
        }

        return purchaseOrderRepository
                .findBySupplierIdAndStatusIgnoreCaseOrderByOrderDateDesc(
                        supplierId,
                        status.trim()
                );
    }

    // Update purchase order
    public PurchaseOrder updatePurchaseOrder(
            Long id,
            PurchaseOrder updatedOrder) {

        PurchaseOrder existing =
                getPurchaseOrderById(id);

        if ("RECEIVED".equalsIgnoreCase(existing.getStatus()) || "CANCELLED".equalsIgnoreCase(existing.getStatus())) {
            throw new RuntimeException(
                    "Cannot update a purchase order that is already " + existing.getStatus()
            );
        }

        if (updatedOrder == null) {
            throw new RuntimeException(
                    "Purchase order data is required"
            );
        }

        if (updatedOrder.getExpectedDeliveryDate() != null) {

            if (existing.getOrderDate() != null &&
                    updatedOrder
                            .getExpectedDeliveryDate()
                            .isBefore(
                                    existing.getOrderDate()
                            )) {

                throw new RuntimeException(
                        "Expected delivery date cannot be before order date"
                );
            }

            existing.setExpectedDeliveryDate(
                    updatedOrder
                            .getExpectedDeliveryDate()
            );
        }

        if (updatedOrder.getTotalAmount() != null) {

            if (updatedOrder.getTotalAmount()
                    .compareTo(BigDecimal.ZERO) < 0) {

                throw new RuntimeException(
                        "Total amount cannot be negative"
                );
            }

            existing.setTotalAmount(
                    updatedOrder.getTotalAmount()
            );
        }

        if (updatedOrder.getStatus() != null &&
                !updatedOrder.getStatus()
                        .trim()
                        .isEmpty()) {

            existing.setStatus(
                    updatedOrder.getStatus()
                            .trim()
                            .toUpperCase()
            );
        }

        if (updatedOrder.getItemsDescription() != null) {
            existing.setItemsDescription(
                    updatedOrder
                            .getItemsDescription()
                            .trim()
            );
        }

        if (updatedOrder.getNotes() != null) {
            existing.setNotes(
                    updatedOrder
                            .getNotes()
                            .trim()
            );
        }

        return purchaseOrderRepository.save(
                existing
        );
    }

    // Mark order as approved
    public PurchaseOrder approvePurchaseOrder(Long id) {

        PurchaseOrder order =
                getPurchaseOrderById(id);

        if ("CANCELLED".equalsIgnoreCase(order.getStatus()) || "RECEIVED".equalsIgnoreCase(order.getStatus())) {
            throw new RuntimeException(
                    "Cannot approve a purchase order with status: " + order.getStatus()
            );
        }

        order.setStatus("APPROVED");

        return purchaseOrderRepository.save(order);
    }

    // Mark order as shipped
    public PurchaseOrder shipPurchaseOrder(Long id) {

        PurchaseOrder order =
                getPurchaseOrderById(id);

        if (!"APPROVED".equalsIgnoreCase(order.getStatus())) {
            throw new RuntimeException(
                    "Cannot ship purchase order. Order must be in APPROVED status, but current status is: " + order.getStatus()
            );
        }

        order.setStatus("SHIPPED");

        return purchaseOrderRepository.save(order);
    }

    // Mark order as received
    public PurchaseOrder receivePurchaseOrder(Long id) {

        PurchaseOrder order =
                getPurchaseOrderById(id);

        if (!"SHIPPED".equalsIgnoreCase(order.getStatus()) && !"APPROVED".equalsIgnoreCase(order.getStatus())) {
            throw new RuntimeException(
                    "Cannot receive purchase order. Order must be APPROVED or SHIPPED, but current status is: " + order.getStatus()
            );
        }

        order.setStatus("RECEIVED");

        return purchaseOrderRepository.save(order);
    }

    // Cancel purchase order
    public PurchaseOrder cancelPurchaseOrder(Long id) {

        PurchaseOrder order =
                getPurchaseOrderById(id);

        if ("RECEIVED".equalsIgnoreCase(order.getStatus())) {
            throw new RuntimeException(
                    "Cannot cancel a purchase order that has already been received"
            );
        }

        order.setStatus("CANCELLED");

        return purchaseOrderRepository.save(order);
    }

    // Delete purchase order
    public void deletePurchaseOrder(Long id) {

        PurchaseOrder order =
                getPurchaseOrderById(id);

        purchaseOrderRepository.delete(order);
    }
}