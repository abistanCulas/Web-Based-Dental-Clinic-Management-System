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

    List<Staff> findByStatusIgnoreCase(String status);

    @org.springframework.data.jpa.repository.Query("SELECT s FROM Staff s WHERE " +
            "LOWER(s.firstName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
            "LOWER(s.lastName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
            "LOWER(s.staffCode) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
            "LOWER(s.role) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
            "LOWER(s.email) LIKE LOWER(CONCAT('%', :kw, '%'))")
    List<Staff> searchAcrossFields(@org.springframework.data.repository.query.Param("kw") String keyword);

    // Find all staff EXCLUDING Doctor/Dentist roles (prevents cross-contamination)
    @org.springframework.data.jpa.repository.Query("SELECT s FROM Staff s WHERE " +
            "LOWER(s.role) NOT LIKE '%doctor%' AND " +
            "LOWER(s.role) NOT LIKE '%dentist%'")
    List<Staff> findAllExcludingDoctors();

    // Find staff by role excluding Doctor/Dentist
    @org.springframework.data.jpa.repository.Query("SELECT s FROM Staff s WHERE " +
            "LOWER(s.role) = LOWER(:role) AND " +
            "LOWER(s.role) NOT LIKE '%doctor%' AND " +
            "LOWER(s.role) NOT LIKE '%dentist%'")
    List<Staff> findByRoleExcludingDoctors(@org.springframework.data.repository.query.Param("role") String role);
}