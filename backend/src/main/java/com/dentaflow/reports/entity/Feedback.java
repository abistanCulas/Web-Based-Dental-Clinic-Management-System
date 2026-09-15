package com.dentaflow.reports.entity;

import com.dentaflow.reports.enums.FeedbackStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "feedback")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Feedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long patientId;

    @Column(length = 150)
    private String patientName;

    @Column(nullable = false, length = 150)
    private String subject;

    @Column(nullable = false, length = 2000)
    private String comments;

    /** 1 (poor) to 5 (excellent) */
    @Column(nullable = false)
    private Integer rating;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FeedbackStatus status;

    @Column(length = 2000)
    private String staffResponse;

    @Column(length = 150)
    private String respondedBy;

    @Column(nullable = false, updatable = false)
    private LocalDateTime submittedDate;

    private LocalDateTime resolvedDate;

    @PrePersist
    protected void onCreate() {
        this.submittedDate = LocalDateTime.now();
        if (this.status == null) {
            this.status = FeedbackStatus.SUBMITTED;
        }
    }
}
