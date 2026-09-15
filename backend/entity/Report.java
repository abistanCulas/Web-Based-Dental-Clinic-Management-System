package com.dentaflow.backend.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "reports",
        indexes = {
                @Index(
                        name = "idx_report_type",
                        columnList = "report_type"
                ),
                @Index(
                        name = "idx_report_created",
                        columnList = "created_at"
                )
        }
)
public class Report extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(
            name = "report_code",
            nullable = false,
            unique = true,
            length = 30
    )
    private String reportCode;

    @Column(
            name = "report_type",
            nullable = false,
            length = 50
    )
    private String reportType;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(length = 2000)
    private String description;

    @Column(
            name = "generated_by",
            length = 100
    )
    private String generatedBy;

    @Column(
            name = "generated_at",
            nullable = false
    )
    private LocalDateTime generatedAt;

    @Column(length = 30)
    private String status = "GENERATED";

    @Column(length = 5000)
    private String reportData;

    public Report() {
    }

    @PrePersist
    protected void onReportCreate() {

        if (generatedAt == null) {
            generatedAt = LocalDateTime.now();
        }

        if (status == null ||
                status.trim().isEmpty()) {

            status = "GENERATED";
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getReportCode() {
        return reportCode;
    }

    public void setReportCode(String reportCode) {
        this.reportCode = reportCode;
    }

    public String getReportType() {
        return reportType;
    }

    public void setReportType(String reportType) {
        this.reportType = reportType;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getGeneratedBy() {
        return generatedBy;
    }

    public void setGeneratedBy(String generatedBy) {
        this.generatedBy = generatedBy;
    }

    public LocalDateTime getGeneratedAt() {
        return generatedAt;
    }

    public void setGeneratedAt(LocalDateTime generatedAt) {
        this.generatedAt = generatedAt;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getReportData() {
        return reportData;
    }

    public void setReportData(String reportData) {
        this.reportData = reportData;
    }
}