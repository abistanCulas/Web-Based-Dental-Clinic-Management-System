package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.MedicalRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface MedicalRecordRepository
        extends JpaRepository<MedicalRecord, Long> {

    List<MedicalRecord> findByPatientIdOrderByRecordDateDesc(
            Long patientId
    );

    List<MedicalRecord> findByDentistIdOrderByRecordDateDesc(
            Long dentistId
    );

    List<MedicalRecord> findByRecordTypeIgnoreCase(
            String recordType
    );

    List<MedicalRecord> findByRecordDateOrderByIdDesc(
            LocalDate recordDate
    );

    List<MedicalRecord> findByStatusIgnoreCase(
            String status
    );

    List<MedicalRecord> findByPatientIdAndStatusIgnoreCase(
            Long patientId,
            String status
    );

    List<MedicalRecord> findByDentistIdAndStatusIgnoreCase(
            Long dentistId,
            String status
    );

    List<MedicalRecord> findByDentistIdAndPatientId(
            Long dentistId,
            Long patientId
    );

    boolean existsByPatientId(Long patientId);

    boolean existsByDentistId(Long dentistId);

    // =========================================================
    // SEARCH MEDICAL RECORDS
    // =========================================================

    @Query("SELECT m FROM MedicalRecord m " +
           "LEFT JOIN m.patient p " +
           "LEFT JOIN m.dentist d " +
           "WHERE LOWER(m.diagnosis) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(m.symptoms) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(m.clinicalNotes) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(m.recordType) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(p.firstName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(p.lastName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(p.patientCode) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(d.firstName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(d.lastName) LIKE LOWER(CONCAT('%', :kw, '%')) " +
           "ORDER BY m.recordDate DESC")
    List<MedicalRecord> searchAcrossFields(@Param("kw") String keyword);

    @Query("SELECT m FROM MedicalRecord m " +
           "LEFT JOIN m.patient p " +
           "WHERE m.dentist.id = :dentistId AND (" +
           "LOWER(m.diagnosis) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(m.symptoms) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(m.clinicalNotes) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(m.recordType) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(p.firstName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(p.lastName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(p.patientCode) LIKE LOWER(CONCAT('%', :kw, '%'))" +
           ") ORDER BY m.recordDate DESC")
    List<MedicalRecord> searchByDentistAndKeyword(@Param("dentistId") Long dentistId, @Param("kw") String keyword);

    @Query("SELECT m FROM MedicalRecord m " +
           "LEFT JOIN m.dentist d " +
           "WHERE m.patient.id = :patientId AND (" +
           "LOWER(m.diagnosis) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(m.symptoms) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(m.clinicalNotes) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(m.recordType) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(d.firstName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(d.lastName) LIKE LOWER(CONCAT('%', :kw, '%'))" +
           ") ORDER BY m.recordDate DESC")
    List<MedicalRecord> searchByPatientAndKeyword(@Param("patientId") Long patientId, @Param("kw") String keyword);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE MedicalRecord m SET m.dentist = null WHERE m.dentist.id = :dentistId")
    void unlinkDentist(@org.springframework.data.repository.query.Param("dentistId") Long dentistId);
}