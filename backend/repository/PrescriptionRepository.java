package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface PrescriptionRepository
        extends JpaRepository<Prescription, Long> {

    // Find prescription by unique prescription code
    Optional<Prescription> findByPrescriptionCode(String prescriptionCode);

    // Check prescription code
    boolean existsByPrescriptionCode(String prescriptionCode);

    // Get all prescriptions of a patient
    List<Prescription> findByPatientIdOrderByPrescriptionDateDesc(
            Long patientId
    );

    // Get all prescriptions created by a dentist
    List<Prescription> findByDentistIdOrderByPrescriptionDateDesc(
            Long dentistId
    );

    // Get prescriptions of a patient by status
    List<Prescription> findByPatientIdAndStatusIgnoreCaseOrderByPrescriptionDateDesc(
            Long patientId,
            String status
    );

    // Get prescriptions of a dentist by status
    List<Prescription> findByDentistIdAndStatusIgnoreCaseOrderByPrescriptionDateDesc(
            Long dentistId,
            String status
    );

    // Get prescriptions by status
    List<Prescription> findByStatusIgnoreCaseOrderByPrescriptionDateDesc(
            String status
    );

    // Get prescriptions for a specific date
    List<Prescription> findByPrescriptionDateOrderByPrescriptionDateDesc(
            LocalDate prescriptionDate
    );

    // Get prescriptions between two dates
    List<Prescription> findByPrescriptionDateBetweenOrderByPrescriptionDateDesc(
            LocalDate startDate,
            LocalDate endDate
    );

    // Get prescriptions linked to a treatment
    List<Prescription> findByTreatmentId(
            Long treatmentId
    );
}