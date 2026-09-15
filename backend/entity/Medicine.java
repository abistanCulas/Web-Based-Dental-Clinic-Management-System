package com.dentaflow.backend.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(
        name = "medicines",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = "medicineCode")
        },
        indexes = {
                @Index(
                        name = "idx_medicine_name",
                        columnList = "name"
                ),
                @Index(
                        name = "idx_medicine_category",
                        columnList = "category"
                ),
                @Index(
                        name = "idx_medicine_expiry_date",
                        columnList = "expiry_date"
                ),
                @Index(
                        name = "idx_medicine_stock_quantity",
                        columnList = "stock_quantity"
                )
        }
)
public class Medicine extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // =========================================================
    // MEDICINE IDENTIFICATION
    // =========================================================

    @Column(
            nullable = false,
            unique = true,
            length = 30
    )
    private String medicineCode;

    @Column(
            nullable = false,
            length = 150
    )
    private String name;

    @Column(length = 100)
    private String genericName;

    @Column(length = 100)
    private String brandName;

    @Column(length = 100)
    private String category;

    @Column(length = 100)
    private String dosageForm;

    @Column(length = 100)
    private String strength;

    @Column(length = 100)
    private String manufacturer;

    // =========================================================
    // INVENTORY
    // =========================================================

    @Column(nullable = false)
    private Integer stockQuantity = 0;

    @Column(nullable = false)
    private Integer reorderLevel = 10;

    @Column(
            nullable = false,
            precision = 12,
            scale = 2
    )
    private BigDecimal unitPrice = BigDecimal.ZERO;

    // =========================================================
    // EXPIRY
    // =========================================================

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    // =========================================================
    // SAFETY INFORMATION
    // =========================================================

    @Column(length = 1000)
    private String allergyWarning;

    @Column(length = 1000)
    private String interactionInformation;

    // =========================================================
    // STATUS
    // =========================================================

    @Column(
            nullable = false,
            length = 20
    )
    private String status = "ACTIVE";

    // =========================================================
    // CONSTRUCTOR
    // =========================================================

    public Medicine() {
    }

    // =========================================================
    // GETTERS AND SETTERS
    // =========================================================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getMedicineCode() {
        return medicineCode;
    }

    public void setMedicineCode(String medicineCode) {
        this.medicineCode = medicineCode;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getGenericName() {
        return genericName;
    }

    public void setGenericName(String genericName) {
        this.genericName = genericName;
    }

    public String getBrandName() {
        return brandName;
    }

    public void setBrandName(String brandName) {
        this.brandName = brandName;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getDosageForm() {
        return dosageForm;
    }

    public void setDosageForm(String dosageForm) {
        this.dosageForm = dosageForm;
    }

    public String getStrength() {
        return strength;
    }

    public void setStrength(String strength) {
        this.strength = strength;
    }

    public String getManufacturer() {
        return manufacturer;
    }

    public void setManufacturer(String manufacturer) {
        this.manufacturer = manufacturer;
    }

    public Integer getStockQuantity() {
        return stockQuantity;
    }

    public void setStockQuantity(Integer stockQuantity) {
        this.stockQuantity = stockQuantity;
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

    public LocalDate getExpiryDate() {
        return expiryDate;
    }

    public void setExpiryDate(LocalDate expiryDate) {
        this.expiryDate = expiryDate;
    }

    public String getAllergyWarning() {
        return allergyWarning;
    }

    public void setAllergyWarning(String allergyWarning) {
        this.allergyWarning = allergyWarning;
    }

    public String getInteractionInformation() {
        return interactionInformation;
    }

    public void setInteractionInformation(
            String interactionInformation) {

        this.interactionInformation =
                interactionInformation;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}