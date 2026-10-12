package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PatientRepository extends JpaRepository<Patient, Long> {

    // Find patient by unique patient code
    Optional<Patient> findByPatientCode(String patientCode);

    // Check patient code
    boolean existsByPatientCode(String patientCode);

    // Find patient by NIC
    Optional<Patient> findByNic(String nic);

    // Check NIC
    boolean existsByNic(String nic);

    // Find patient by linked user account
    Optional<Patient> findByUserId(Long userId);

    // Search by first name or last name
    List<Patient> findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(
            String firstName,
            String lastName
    );

    // Find patients by status
    List<Patient> findByStatus(String status);

    // Search by phone
    List<Patient> findByPhoneContaining(String phone);

    // Search by email
    List<Patient> findByEmailContainingIgnoreCase(String email);

    // Find patient by exact email
    Optional<Patient> findByEmailIgnoreCase(String email);

    // Check email
    boolean existsByEmailIgnoreCase(String email);

    // Search across code, first/last name, phone, and email
    @Query("SELECT p FROM Patient p WHERE " +
           "LOWER(p.firstName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(p.lastName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(p.patientCode) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "p.phone LIKE CONCAT('%', :kw, '%') OR " +
           "LOWER(p.email) LIKE LOWER(CONCAT('%', :kw, '%'))")
    List<Patient> searchAcrossFields(@Param("kw") String keyword);
}