package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.Inquiry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface InquiryRepository extends JpaRepository<Inquiry, Long> {

    // Find inquiry by unique inquiry code
    Optional<Inquiry> findByInquiryCode(String inquiryCode);

    // Check inquiry code
    boolean existsByInquiryCode(String inquiryCode);

    // Find inquiries submitted by a user
    List<Inquiry> findByUserIdOrderByCreatedAtDesc(Long userId);

    // Find inquiries by status
    List<Inquiry> findByStatusIgnoreCaseOrderByCreatedAtDesc(
            String status
    );

    // Find inquiries by type
    List<Inquiry> findByInquiryTypeIgnoreCaseOrderByCreatedAtDesc(
            String inquiryType
    );

    // Find inquiries by email
    List<Inquiry> findByEmailContainingIgnoreCaseOrderByCreatedAtDesc(
            String email
    );

    // Search inquiries by subject
    List<Inquiry> findBySubjectContainingIgnoreCaseOrderByCreatedAtDesc(
            String subject
    );

    // Find inquiries by user and status
    List<Inquiry> findByUserIdAndStatusIgnoreCaseOrderByCreatedAtDesc(
            Long userId,
            String status
    );

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Inquiry i SET i.user = null WHERE i.user.id = :userId")
    void unlinkUser(@org.springframework.data.repository.query.Param("userId") Long userId);
}