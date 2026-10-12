package com.dentaflow.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(
        name = "drug_interactions",
        indexes = {
                @Index(
                        name = "idx_drug_interaction_medicine_one",
                        columnList = "medicine_one_id"
                ),
                @Index(
                        name = "idx_drug_interaction_medicine_two",
                        columnList = "medicine_two_id"
                )
        }
)
public class DrugInteraction extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "medicine_one_id", nullable = false)
    private Medicine medicineOne;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "medicine_two_id", nullable = false)
    private Medicine medicineTwo;

    @Column(nullable = false, length = 20)
    private String severity;

    @Column(nullable = false, length = 1000)
    private String description;

    @Column(length = 1000)
    private String recommendation;

    @Column(nullable = false, length = 20)
    private String status = "ACTIVE";

    public DrugInteraction() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Medicine getMedicineOne() {
        return medicineOne;
    }

    public void setMedicineOne(Medicine medicineOne) {
        this.medicineOne = medicineOne;
    }

    public Medicine getMedicineTwo() {
        return medicineTwo;
    }

    public void setMedicineTwo(Medicine medicineTwo) {
        this.medicineTwo = medicineTwo;
    }

    public String getSeverity() {
        return severity;
    }

    public void setSeverity(String severity) {
        this.severity = severity;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getRecommendation() {
        return recommendation;
    }

    public void setRecommendation(String recommendation) {
        this.recommendation = recommendation;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}