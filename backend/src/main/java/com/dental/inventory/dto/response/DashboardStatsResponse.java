package com.dental.inventory.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardStatsResponse {
    private long totalItems;
    private long lowStockItems;
    private long expiredItems;
    private long expiringSoonItems;
    private long totalSuppliers;
    private long activeSuppliers;
    private long pendingOrders;
}
