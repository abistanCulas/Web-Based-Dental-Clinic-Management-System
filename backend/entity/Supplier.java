package com.dentaflow.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(
        name = "suppliers",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = "supplierCode"),
                @UniqueConstraint(columnNames = "email")
        },
        indexes = {
                @Index(name = "idx_supplier_name", columnList = "supplier_name"),
                @Index(name = "idx_supplier_status", columnList = "status")
        }
)
public class Supplier extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(
            name = "supplier_code",
            nullable = false,
            unique = true,
            length = 30
    )
    private String supplierCode;

    @Column(
            name = "supplier_name",
            nullable = false,
            length = 150
    )
    private String supplierName;

    @Column(length = 150)
    private String contactPerson;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(length = 20)
    private String phone;

    @Column(length = 255)
    private String address;

    @Column(length = 100)
    private String city;

    @Column(length = 100)
    private String country = "Sri Lanka";

    @Column(length = 500)
    private String suppliedItems;

    @Column(nullable = false, length = 20)
    private String status = "ACTIVE";

    @Column(length = 500)
    private String notes;

    public Supplier() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getSupplierCode() {
        return supplierCode;
    }

    public void setSupplierCode(String supplierCode) {
        this.supplierCode = supplierCode;
    }

    public String getSupplierName() {
        return supplierName;
    }

    public void setSupplierName(String supplierName) {
        this.supplierName = supplierName;
    }

    public String getContactPerson() {
        return contactPerson;
    }

    public void setContactPerson(String contactPerson) {
        this.contactPerson = contactPerson;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public String getSuppliedItems() {
        return suppliedItems;
    }

    public void setSuppliedItems(String suppliedItems) {
        this.suppliedItems = suppliedItems;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}