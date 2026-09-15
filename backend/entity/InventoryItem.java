package com.dentaflow.backend.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(
        name = "inventory_items",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = "inventoryCode")
        },
        indexes = {
                @Index(name = "idx_inventory_item_name", columnList = "item_name"),
                @Index(name = "idx_inventory_item_status", columnList = "status")
        }
)
public class InventoryItem extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(
            name = "inventory_code",
            nullable = false,
            unique = true,
            length = 30
    )
    private String inventoryCode;

    @Column(name = "item_name", nullable = false, length = 150)
    private String itemName;

    @Column(length = 100)
    private String category;

    @Column(length = 100)
    private String itemType;

    @Column(length = 100)
    private String brand;

    @Column(length = 100)
    private String unit;

    @Column(nullable = false)
    private Integer quantity = 0;

    @Column(nullable = false)
    private Integer reorderLevel = 10;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice = BigDecimal.ZERO;

    @Column(length = 100)
    private String batchNumber;

    @Column
    private LocalDate expiryDate;

    @Column(length = 100)
    private String supplierName;

    @Column(nullable = false, length = 20)
    private String status = "AVAILABLE";

    @Column(length = 500)
    private String description;

    public InventoryItem() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getInventoryCode() {
        return inventoryCode;
    }

    public void setInventoryCode(String inventoryCode) {
        this.inventoryCode = inventoryCode;
    }

    public String getItemName() {
        return itemName;
    }

    public void setItemName(String itemName) {
        this.itemName = itemName;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getItemType() {
        return itemType;
    }

    public void setItemType(String itemType) {
        this.itemType = itemType;
    }

    public String getBrand() {
        return brand;
    }

    public void setBrand(String brand) {
        this.brand = brand;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public Integer getReorderLevel() {
        return reorderLevel;
    }

    public void setReorderLevel(Integer reorderLevel) {
        this.reorderLevel = reorderLevel;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
    }

    public String getBatchNumber() {
        return batchNumber;
    }

    public void setBatchNumber(String batchNumber) {
        this.batchNumber = batchNumber;
    }

    public LocalDate getExpiryDate() {
        return expiryDate;
    }

    public void setExpiryDate(LocalDate expiryDate) {
        this.expiryDate = expiryDate;
    }

    public String getSupplierName() {
        return supplierName;
    }

    public void setSupplierName(String supplierName) {
        this.supplierName = supplierName;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}