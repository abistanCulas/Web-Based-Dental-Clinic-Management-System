package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.Treatment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TreatmentRepository extends JpaRepository<Treatment, Long> {

    // Find treatment by unique treatment code
    Optional<Treatment> findByTreatmentCode(String treatmentCode);

    // Check treatment code
    boolean existsByTreatmentCode(String treatmentCode);

    // Get all treatments of a patient
    List<Treatment> findByPatientIdOrderByTreatmentDateDesc(
            Long patientId
    );

    // Get all treatments performed by a dentist
    List<Treatment> findByDentistIdOrderByTreatmentDateDesc(
            Long dentistId
    );

    // Get treatments for a specific date
    List<Treatment> findByTreatmentDateOrderByTreatmentDateDesc(
            LocalDate treatmentDate
    );

    // Get treatments of a patient by status
    List<Treatment> findByPatientIdAndStatusIgnoreCaseOrderByTreatmentDateDesc(
            Long patientId,
            String status
    );

    // Get treatments of a dentist by status
    List<Treatment> findByDentistIdAndStatusIgnoreCaseOrderByTreatmentDateDesc(
            Long dentistId,
            String status
    );

    // Find treatments by treatment type
    List<Treatment> findByTreatmentTypeContainingIgnoreCase(
            String treatmentType
    );

    // Find treatments between two dates
    List<Treatment> findByTreatmentDateBetweenOrderByTreatmentDateDesc(
            LocalDate startDate,
            LocalDate endDate
    );

    // Find treatments of a patient between two dates
    List<Treatment> findByPatientIdAndTreatmentDateBetweenOrderByTreatmentDateDesc(
            Long patientId,
            LocalDate startDate,
            LocalDate endDate
    );

    // Find treatments linked to an appointment
    List<Treatment> findByAppointmentId(
            Long appointmentId
    );

    boolean existsByAppointmentId(Long appointmentId);

    // Find treatments by status
    List<Treatment> findByStatusIgnoreCaseOrderByTreatmentDateDesc(
            String status
    );

    boolean existsByPatientId(Long patientId);

    boolean existsByDentistId(Long dentistId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Treatment t SET t.dentist = null WHERE t.dentist.id = :dentistId")
    void unlinkDentist(@org.springframework.data.repository.query.Param("dentistId") Long dentistId);
}