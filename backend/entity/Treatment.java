package com.dentaflow.backend.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(
        name = "treatments",
        indexes = {
                @Index(name = "idx_treatment_date", columnList = "treatment_date"),
                @Index(name = "idx_treatment_status", columnList = "status")
        }
)
public class Treatment extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(
            name = "treatment_code",
            nullable = false,
            unique = true,
            length = 20
    )
    private String treatmentCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "dentist_id", nullable = false)
    private Dentist dentist;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id")
    private Appointment appointment;

    @Column(name = "treatment_date", nullable = false)
    private LocalDate treatmentDate;

    @Column(nullable = false, length = 150)
    private String treatmentType;

    @Column(length = 1000)
    private String diagnosis;

    @Column(length = 2000)
    private String description;

    @Column(length = 1000)
    private String toothDetails;

    @Column(precision = 12, scale = 2)
    private BigDecimal estimatedCost;

    @Column(precision = 12, scale = 2)
    private BigDecimal actualCost;

    @Column(nullable = false, length = 30)
    private String status = "PLANNED";

    @Column(length = 1000)
    private String dentistNotes;

    public Treatment() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTreatmentCode() {
        return treatmentCode;
    }

    public void setTreatmentCode(String treatmentCode) {
        this.treatmentCode = treatmentCode;
    }

    public Patient getPatient() {
        return patient;
    }

    public void setPatient(Patient patient) {
        this.patient = patient;
    }

    public Dentist getDentist() {
        return dentist;
    }

    public void setDentist(Dentist dentist) {
        this.dentist = dentist;
    }

    public Appointment getAppointment() {
        return appointment;
    }

    public void setAppointment(Appointment appointment) {
        this.appointment = appointment;
    }

    public LocalDate getTreatmentDate() {
        return treatmentDate;
    }

    public void setTreatmentDate(LocalDate treatmentDate) {
        this.treatmentDate = treatmentDate;
    }

    public String getTreatmentType() {
        return treatmentType;
    }

    public void setTreatmentType(String treatmentType) {
        this.treatmentType = treatmentType;
    }

    public String getDiagnosis() {
        return diagnosis;
    }

    public void setDiagnosis(String diagnosis) {
        this.diagnosis = diagnosis;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getToothDetails() {
        return toothDetails;
    }

    public void setToothDetails(String toothDetails) {
        this.toothDetails = toothDetails;
    }

    public BigDecimal getEstimatedCost() {
        return estimatedCost;
    }

    public void setEstimatedCost(BigDecimal estimatedCost) {
        this.estimatedCost = estimatedCost;
    }

    public BigDecimal getActualCost() {
        return actualCost;
    }

    public void setActualCost(BigDecimal actualCost) {
        this.actualCost = actualCost;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getDentistNotes() {
        return dentistNotes;
    }

    public void setDentistNotes(String dentistNotes) {
        this.dentistNotes = dentistNotes;
    }
}