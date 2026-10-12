package com.dentaflow.backend.mapper;

import com.dentaflow.backend.dto.InventoryDTO;
import com.dentaflow.backend.entity.InventoryItem;
import org.springframework.stereotype.Component;

@Component
public class InventoryMapper {

    // =========================================================
    // ENTITY → DTO
    // =========================================================

    public InventoryDTO toDTO(
            InventoryItem item) {

        if (item == null) {
            return null;
        }

        return InventoryDTO.builder()
                .id(item.getId())
                .inventoryCode(
                        item.getInventoryCode()
                )
                .itemName(
                        item.getItemName()
                )
                .category(
                        item.getCategory()
                )
                .itemType(
                        item.getItemType()
                )
                .brand(
                        item.getBrand()
                )
                .unit(
                        item.getUnit()
                )
                .quantity(
                        item.getQuantity()
                )
                .reorderLevel(
                item.getReorderLevel()
        )
                .unitPrice(
                        item.getUnitPrice()
                )
                .batchNumber(
                        item.getBatchNumber()
                )
                .expiryDate(
                        item.getExpiryDate()
                )
                .supplierName(
                        item.getSupplierName()
                )
                .status(
                        item.getStatus()
                )
                .description(
                        item.getDescription()
                )
                .build();
    }

    // =========================================================
    // DTO → ENTITY
    // =========================================================

    public InventoryItem toEntity(
            InventoryDTO dto) {

        if (dto == null) {
            return null;
        }

        InventoryItem item =
                new InventoryItem();

        item.setId(dto.getId());

        item.setInventoryCode(
                dto.getInventoryCode()
        );

        item.setItemName(
                dto.getItemName()
        );

        item.setCategory(
                dto.getCategory()
        );

        item.setItemType(
                dto.getItemType()
        );

        item.setBrand(
                dto.getBrand()
        );

        item.setUnit(
                dto.getUnit()
        );

        item.setQuantity(
                dto.getQuantity()
        );

        item.setReorderLevel(
                dto.getReorderLevel()
        );

        item.setUnitPrice(
                dto.getUnitPrice()
        );

        item.setBatchNumber(
                dto.getBatchNumber()
        );

        item.setExpiryDate(
                dto.getExpiryDate()
        );

        item.setSupplierName(
                dto.getSupplierName()
        );

        item.setStatus(
                dto.getStatus()
        );

        item.setDescription(
                dto.getDescription()
        );

        return item;
    }
}