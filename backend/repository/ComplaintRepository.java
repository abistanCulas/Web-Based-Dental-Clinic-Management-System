package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.Complaint;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ComplaintRepository extends JpaRepository<Complaint, Long> {

    // Find complaint by unique complaint code
    Optional<Complaint> findByComplaintCode(String complaintCode);

    // Check complaint code
    boolean existsByComplaintCode(String complaintCode);

    // Find complaints submitted by a user
    List<Complaint> findByUserIdOrderByCreatedAtDesc(Long userId);

    // Find complaints submitted by a patient
    List<Complaint> findByPatientIdOrderByCreatedAtDesc(Long patientId);

    // Find complaints by status
    List<Complaint> findByStatusIgnoreCaseOrderByCreatedAtDesc(
            String status
    );

    // Find complaints by priority
    List<Complaint> findByPriorityIgnoreCaseOrderByCreatedAtDesc(
            String priority
    );

    // Find complaints by user and status
    List<Complaint> findByUserIdAndStatusIgnoreCaseOrderByCreatedAtDesc(
            Long userId,
            String status
    );

    // Find complaints by patient and status
    List<Complaint> findByPatientIdAndStatusIgnoreCaseOrderByCreatedAtDesc(
            Long patientId,
            String status
    );

    // Search complaints by subject
    List<Complaint> findBySubjectContainingIgnoreCaseOrderByCreatedAtDesc(
            String subject
    );

    // Find complaints that need attention
    List<Complaint> findByStatusInOrderByCreatedAtDesc(
            List<String> statuses
    );

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Complaint c SET c.user = null WHERE c.user.id = :userId")
    void unlinkUser(@org.springframework.data.repository.query.Param("userId") Long userId);
}