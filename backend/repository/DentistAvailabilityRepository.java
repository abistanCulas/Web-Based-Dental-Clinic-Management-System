package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.DentistAvailability;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.DayOfWeek;
import java.util.List;
import java.util.Optional;

public interface DentistAvailabilityRepository
        extends JpaRepository<DentistAvailability, Long> {

    // Get all availability records for a dentist
    List<DentistAvailability> findByDentistId(
            Long dentistId
    );

    // Get availability for a specific dentist on a specific day
    Optional<DentistAvailability>
    findByDentistIdAndDayOfWeek(
            Long dentistId,
            DayOfWeek dayOfWeek
    );

    // Get only available schedules for a dentist
    List<DentistAvailability>
    findByDentistIdAndAvailableTrue(
            Long dentistId
    );

    // Get all active/inactive availability records
    List<DentistAvailability>
    findByStatus(String status);

    // Check whether a schedule already exists
    boolean existsByDentistIdAndDayOfWeek(
            Long dentistId,
            DayOfWeek dayOfWeek
    );

    // Delete all availability records of a dentist
    void deleteByDentistId(
            Long dentistId
    );
}