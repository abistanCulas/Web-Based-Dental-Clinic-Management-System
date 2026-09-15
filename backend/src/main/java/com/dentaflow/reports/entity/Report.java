package com.dentaflow.reports.entity;

import com.dentaflow.reports.enums.ReportType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "report")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ReportType reportType;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate endDate;

    @Column(nullable = false, length = 150)
    private String generatedBy;

    @Column(nullable = false, updatable = false)
    private LocalDateTime generatedDate;

    private Integer totalRecords;

    /** Human readable summary line shown in the report list */
    @Column(length = 500)
    private String summary;

    /** JSON-encoded metrics payload rendered as a chart/table on the frontend */
    @Lob
    @Column(columnDefinition = "TEXT")
    private String dataJson;

    @PrePersist
    protected void onCreate() {
        this.generatedDate = LocalDateTime.now();
    }
}
