package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.Staff;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StaffRepository extends JpaRepository<Staff, Long> {

    // Find staff by unique staff code
    Optional<Staff> findByStaffCode(String staffCode);

    // Check whether staff code already exists
    boolean existsByStaffCode(String staffCode);

    // Find staff by email
    Optional<Staff> findByEmail(String email);

    // Check whether email already exists
    boolean existsByEmail(String email);

    // Find staff by linked user account
    Optional<Staff> findByUserId(Long userId);

    // Search staff by role
    List<Staff> findByRoleContainingIgnoreCase(String role);

    // Find staff by exact role
    List<Staff> findByRoleIgnoreCase(String role);

    // Find staff by status
    List<Staff> findByStatus(String status);

    // Search staff by first name or last name
    List<Staff> findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(
            String firstName,
            String lastName
    );

    // Search staff by role and status
    List<Staff> findByRoleContainingIgnoreCaseAndStatusIgnoreCase(
            String role,
            String status
    );
}