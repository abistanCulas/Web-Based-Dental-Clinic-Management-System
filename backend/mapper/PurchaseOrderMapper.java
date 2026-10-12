package com.dentaflow.backend.mapper;

import com.dentaflow.backend.dto.PurchaseOrderDTO;
import com.dentaflow.backend.entity.PurchaseOrder;
import org.springframework.stereotype.Component;

@Component
public class PurchaseOrderMapper {

    // =========================================================
    // ENTITY → DTO
    // =========================================================

    public PurchaseOrderDTO toDTO(
            PurchaseOrder purchaseOrder) {

        if (purchaseOrder == null) {
            return null;
        }

        return PurchaseOrderDTO.builder()
                .id(purchaseOrder.getId())
                .purchaseOrderNumber(
                        purchaseOrder.getPurchaseOrderNumber()
                )
                .supplierId(
                        purchaseOrder.getSupplier() != null
                                ? purchaseOrder.getSupplier().getId()
                                : null
                )
                .orderDate(
                        purchaseOrder.getOrderDate()
                )
                .expectedDeliveryDate(
                        purchaseOrder.getExpectedDeliveryDate()
                )
                .totalAmount(
                        purchaseOrder.getTotalAmount()
                )
                .status(
                        purchaseOrder.getStatus()
                )
                .itemsDescription(
                        purchaseOrder.getItemsDescription()
                )
                .notes(
                        purchaseOrder.getNotes()
                )
                .build();
    }

    // =========================================================
    // DTO → ENTITY
    // =========================================================

    public PurchaseOrder toEntity(
            PurchaseOrderDTO dto) {

        if (dto == null) {
            return null;
        }

        PurchaseOrder purchaseOrder =
                new PurchaseOrder();

        purchaseOrder.setId(dto.getId());

        purchaseOrder.setPurchaseOrderNumber(
                dto.getPurchaseOrderNumber()
        );

        purchaseOrder.setOrderDate(
                dto.getOrderDate()
        );

        purchaseOrder.setExpectedDeliveryDate(
                dto.getExpectedDeliveryDate()
        );

        purchaseOrder.setTotalAmount(
                dto.getTotalAmount()
        );

        purchaseOrder.setStatus(
                dto.getStatus()
        );

        purchaseOrder.setItemsDescription(
                dto.getItemsDescription()
        );

        purchaseOrder.setNotes(
                dto.getNotes()
        );

        return purchaseOrder;
    }
}