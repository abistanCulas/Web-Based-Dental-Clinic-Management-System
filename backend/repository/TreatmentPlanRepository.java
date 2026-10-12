package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.TreatmentPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TreatmentPlanRepository
        extends JpaRepository<TreatmentPlan, Long> {

    // Find treatment plan by unique plan code
    Optional<TreatmentPlan> findByPlanCode(String planCode);

    // Check plan code
    boolean existsByPlanCode(String planCode);

    // Get all treatment plans of a patient
    List<TreatmentPlan> findByPatientIdOrderByStartDateDesc(
            Long patientId
    );

    // Get all treatment plans created by a dentist
    List<TreatmentPlan> findByDentistIdOrderByStartDateDesc(
            Long dentistId
    );

    // Get patient treatment plans by status
    List<TreatmentPlan> findByPatientIdAndStatusIgnoreCaseOrderByStartDateDesc(
            Long patientId,
            String status
    );

    // Get dentist treatment plans by status
    List<TreatmentPlan> findByDentistIdAndStatusIgnoreCaseOrderByStartDateDesc(
            Long dentistId,
            String status
    );

    // Get treatment plans by status
    List<TreatmentPlan> findByStatusIgnoreCaseOrderByStartDateDesc(
            String status
    );

    // Search treatment plans by name
    List<TreatmentPlan> findByPlanNameContainingIgnoreCase(
            String planName
    );

    boolean existsByPatientId(Long patientId);

    boolean existsByDentistId(Long dentistId);

    // =========================================================
    // SEARCH TREATMENT PLANS
    // =========================================================

    @Query("SELECT t FROM TreatmentPlan t " +
           "LEFT JOIN t.patient pat " +
           "LEFT JOIN t.dentist d " +
           "WHERE LOWER(t.planCode) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(t.planName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(t.description) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(t.status) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(pat.firstName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(pat.lastName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(pat.patientCode) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(d.firstName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(d.lastName) LIKE LOWER(CONCAT('%', :kw, '%')) " +
           "ORDER BY t.startDate DESC")
    List<TreatmentPlan> searchAcrossFields(@Param("kw") String keyword);

    @Query("SELECT t FROM TreatmentPlan t " +
           "LEFT JOIN t.patient pat " +
           "WHERE t.dentist.id = :dentistId AND (" +
           "LOWER(t.planCode) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(t.planName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(t.description) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(t.status) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(pat.firstName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(pat.lastName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(pat.patientCode) LIKE LOWER(CONCAT('%', :kw, '%'))" +
           ") ORDER BY t.startDate DESC")
    List<TreatmentPlan> searchByDentistAndKeyword(@Param("dentistId") Long dentistId, @Param("kw") String keyword);

    @Query("SELECT t FROM TreatmentPlan t " +
           "LEFT JOIN t.dentist d " +
           "WHERE t.patient.id = :patientId AND (" +
           "LOWER(t.planCode) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(t.planName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(t.description) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(t.status) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(d.firstName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(d.lastName) LIKE LOWER(CONCAT('%', :kw, '%'))" +
           ") ORDER BY t.startDate DESC")
    List<TreatmentPlan> searchByPatientAndKeyword(@Param("patientId") Long patientId, @Param("kw") String keyword);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE TreatmentPlan t SET t.dentist = null WHERE t.dentist.id = :dentistId")
    void unlinkDentist(@org.springframework.data.repository.query.Param("dentistId") Long dentistId);
}