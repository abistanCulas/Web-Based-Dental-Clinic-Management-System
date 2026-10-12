package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    boolean existsByPatientId(Long patientId);

    boolean existsByDentistId(Long dentistId);

    // Get prescriptions between two dates
    List<Prescription> findByPrescriptionDateBetweenOrderByPrescriptionDateDesc(
            LocalDate startDate,
            LocalDate endDate
    );

    // Get prescriptions linked to a treatment
    List<Prescription> findByTreatmentId(
            Long treatmentId
    );

    boolean existsByTreatmentId(Long treatmentId);

    // =========================================================
    // SEARCH PRESCRIPTIONS
    // =========================================================

    @Query("SELECT p FROM Prescription p " +
           "LEFT JOIN p.patient pat " +
           "LEFT JOIN p.dentist d " +
           "WHERE LOWER(p.prescriptionCode) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(p.diagnosis) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(p.instructions) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(p.status) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(pat.firstName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(pat.lastName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(pat.patientCode) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(d.firstName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(d.lastName) LIKE LOWER(CONCAT('%', :kw, '%')) " +
           "ORDER BY p.prescriptionDate DESC")
    List<Prescription> searchAcrossFields(@Param("kw") String keyword);

    @Query("SELECT p FROM Prescription p " +
           "LEFT JOIN p.patient pat " +
           "WHERE p.dentist.id = :dentistId AND (" +
           "LOWER(p.prescriptionCode) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(p.diagnosis) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(p.instructions) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(p.status) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(pat.firstName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(pat.lastName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(pat.patientCode) LIKE LOWER(CONCAT('%', :kw, '%'))" +
           ") ORDER BY p.prescriptionDate DESC")
    List<Prescription> searchByDentistAndKeyword(@Param("dentistId") Long dentistId, @Param("kw") String keyword);

    @Query("SELECT p FROM Prescription p " +
           "LEFT JOIN p.dentist d " +
           "WHERE p.patient.id = :patientId AND (" +
           "LOWER(p.prescriptionCode) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(p.diagnosis) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(p.instructions) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(p.status) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(d.firstName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(d.lastName) LIKE LOWER(CONCAT('%', :kw, '%'))" +
           ") ORDER BY p.prescriptionDate DESC")
    List<Prescription> searchByPatientAndKeyword(@Param("patientId") Long patientId, @Param("kw") String keyword);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Prescription p SET p.dentist = null WHERE p.dentist.id = :dentistId")
    void unlinkDentist(@org.springframework.data.repository.query.Param("dentistId") Long dentistId);
}