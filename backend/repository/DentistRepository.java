package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.Dentist;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DentistRepository extends JpaRepository<Dentist, Long> {

    // Find dentist by unique dentist code
    Optional<Dentist> findByDentistCode(String dentistCode);

    // Check dentist code
    boolean existsByDentistCode(String dentistCode);

    // Find dentist by email
    Optional<Dentist> findByEmail(String email);

    // Check email
    boolean existsByEmail(String email);

    // Find dentist by linked user account
    Optional<Dentist> findByUserId(Long userId);

    // Find dentists by specialization
    List<Dentist> findBySpecializationContainingIgnoreCase(
            String specialization
    );

    // Find dentists by status
    List<Dentist> findByStatus(String status);

    // Search dentists by first name or last name
    List<Dentist> findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(
            String firstName,
            String lastName
    );

    List<Dentist> findByStatusIgnoreCase(String status);

    List<Dentist> findBySpecializationContainingIgnoreCaseAndStatusIgnoreCase(
            String specialization,
            String status
    );

    @org.springframework.data.jpa.repository.Query("SELECT d FROM Dentist d WHERE " +
            "LOWER(d.firstName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
            "LOWER(d.lastName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
            "LOWER(d.dentistCode) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
            "LOWER(d.specialization) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
            "LOWER(d.email) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
            "LOWER(d.about) LIKE LOWER(CONCAT('%', :kw, '%'))")
    List<Dentist> searchAcrossFields(@org.springframework.data.repository.query.Param("kw") String keyword);

    @org.springframework.data.jpa.repository.Query("SELECT d FROM Dentist d WHERE LOWER(d.status) = LOWER(:status) AND (" +
            "LOWER(d.firstName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
            "LOWER(d.lastName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
            "LOWER(d.dentistCode) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
            "LOWER(d.specialization) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
            "LOWER(d.email) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
            "LOWER(d.about) LIKE LOWER(CONCAT('%', :kw, '%')))")
    List<Dentist> searchAcrossFieldsAndStatus(@org.springframework.data.repository.query.Param("kw") String keyword, @org.springframework.data.repository.query.Param("status") String status);
}