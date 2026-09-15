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
}