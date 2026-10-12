package com.dentaflow.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "purchase_requests",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = "request_code")
        },
        indexes = {
                @Index(
                        name = "idx_purchase_req_pharmacist",
                        columnList = "pharmacist_id"
                ),
                @Index(
                        name = "idx_purchase_req_status",
                        columnList = "status"
                ),
                @Index(
                        name = "idx_purchase_req_date",
                        columnList = "request_date"
                )
        }
)
public class PurchaseRequest extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(
            name = "request_code",
            nullable = false,
            unique = true,
            length = 32
    )
    private String requestCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pharmacist_id", nullable = true)
    private User pharmacist;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medicine_id")
    private Medicine medicine;

    @Column(
            name = "medicine_name",
            nullable = false,
            length = 150
    )
    private String medicineName;

    @Column(
            name = "requested_quantity",
            nullable = false
    )
    private Integer requestedQuantity;

    @Column(
            nullable = false,
            length = 1000
    )
    private String reason;

    @Column(
            nullable = false,
            length = 30
    )
    private String status = "PENDING";

    @Column(
            name = "admin_note",
            length = 1000
    )
    private String adminNote;

    @Column(name = "request_date", nullable = false)
    private LocalDate requestDate;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "processed_by_id")
    private User processedBy;

    public PurchaseRequest() {
    }

    @PrePersist
    protected void onPurchaseRequestCreate() {
        if (requestDate == null) {
            requestDate = LocalDate.now();
        }
        if (status == null || status.trim().isEmpty()) {
            status = "PENDING";
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getRequestCode() {
        return requestCode;
    }

    public void setRequestCode(String requestCode) {
        this.requestCode = requestCode;
    }

    public User getPharmacist() {
        return pharmacist;
    }

    public void setPharmacist(User pharmacist) {
        this.pharmacist = pharmacist;
    }

    public Medicine getMedicine() {
        return medicine;
    }

    public void setMedicine(Medicine medicine) {
        this.medicine = medicine;
    }

    public String getMedicineName() {
        return medicineName;
    }

    public void setMedicineName(String medicineName) {
        this.medicineName = medicineName;
    }

    public Integer getRequestedQuantity() {
        return requestedQuantity;
    }

    public void setRequestedQuantity(Integer requestedQuantity) {
        this.requestedQuantity = requestedQuantity;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getAdminNote() {
        return adminNote;
    }

    public void setAdminNote(String adminNote) {
        this.adminNote = adminNote;
    }

    public LocalDate getRequestDate() {
        return requestDate;
    }

    public void setRequestDate(LocalDate requestDate) {
        this.requestDate = requestDate;
    }

    public LocalDateTime getProcessedAt() {
        return processedAt;
    }

    public void setProcessedAt(LocalDateTime processedAt) {
        this.processedAt = processedAt;
    }

    public User getProcessedBy() {
        return processedBy;
    }

    public void setProcessedBy(User processedBy) {
        this.processedBy = processedBy;
    }
}
