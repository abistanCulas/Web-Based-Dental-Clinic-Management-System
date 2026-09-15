package com.dentaflow.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(
        name = "complaints",
        indexes = {
                @Index(name = "idx_complaint_status", columnList = "status"),
                @Index(name = "idx_complaint_priority", columnList = "priority")
        }
)
public class Complaint extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(
            name = "complaint_code",
            nullable = false,
            unique = true,
            length = 30
    )
    private String complaintCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id")
    private Patient patient;

    @Column(nullable = false, length = 150)
    private String subject;

    @Column(nullable = false, length = 2000)
    private String description;

    @Column(nullable = false, length = 30)
    private String priority = "MEDIUM";

    @Column(nullable = false, length = 30)
    private String status = "OPEN";

    @Column(length = 2000)
    private String resolution;

    @Column(length = 100)
    private String handledBy;

    public Complaint() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getComplaintCode() {
        return complaintCode;
    }

    public void setComplaintCode(String complaintCode) {
        this.complaintCode = complaintCode;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public Patient getPatient() {
        return patient;
    }

    public void setPatient(Patient patient) {
        this.patient = patient;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getResolution() {
        return resolution;
    }

    public void setResolution(String resolution) {
        this.resolution = resolution;
    }

    public String getHandledBy() {
        return handledBy;
    }

    public void setHandledBy(String handledBy) {
        this.handledBy = handledBy;
    }
}