package com.dental.inventory.service;

import com.dental.inventory.dto.response.DashboardStatsResponse;
import com.dental.inventory.enums.OrderStatus;
import com.dental.inventory.enums.SupplierStatus;
import com.dental.inventory.repository.InventoryItemRepository;
import com.dental.inventory.repository.PurchaseOrderRepository;
import com.dental.inventory.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final InventoryItemRepository inventoryItemRepository;
    private final SupplierRepository supplierRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;

    public DashboardStatsResponse getStats() {
        LocalDate today = LocalDate.now();
        LocalDate in30Days = today.plusDays(30);

        long totalItems = inventoryItemRepository.count();
        long lowStockItems = inventoryItemRepository.findLowStockItems().size();
        long expiredItems = inventoryItemRepository.findExpiredItems(today).size();
        long expiringSoon = inventoryItemRepository.findExpiringSoonItems(today, in30Days).size();
        long totalSuppliers = supplierRepository.count();
        long activeSuppliers = supplierRepository.findByStatus(SupplierStatus.ACTIVE).size();
        long pendingOrders = purchaseOrderRepository.findByStatus(OrderStatus.PENDING).size();

        return DashboardStatsResponse.builder()
                .totalItems(totalItems)
                .lowStockItems(lowStockItems)
                .expiredItems(expiredItems)
                .expiringSoonItems(expiringSoon)
                .totalSuppliers(totalSuppliers)
                .activeSuppliers(activeSuppliers)
                .pendingOrders(pendingOrders)
                .build();
    }
}
