package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

public interface AppointmentRepository
        extends JpaRepository<Appointment, Long> {

    // =========================================================
    // FIND BY APPOINTMENT CODE
    // =========================================================

    Optional<Appointment> findByAppointmentCode(
            String appointmentCode
    );

    // =========================================================
    // CHECK APPOINTMENT CODE
    // =========================================================

    boolean existsByAppointmentCode(
            String appointmentCode
    );

    // =========================================================
    // PATIENT APPOINTMENTS
    // =========================================================

    List<Appointment>
    findByPatientIdOrderByAppointmentDateDescStartTimeDesc(
            Long patientId
    );

    // =========================================================
    // DENTIST APPOINTMENTS
    // =========================================================

    List<Appointment>
    findByDentistIdOrderByAppointmentDateAscStartTimeAsc(
            Long dentistId
    );

    // =========================================================
    // APPOINTMENTS FOR DATE
    // =========================================================

    List<Appointment>
    findByAppointmentDateOrderByStartTimeAsc(
            LocalDate appointmentDate
    );

    // =========================================================
    // DENTIST APPOINTMENTS FOR DATE
    // =========================================================

    List<Appointment>
    findByDentistIdAndAppointmentDateOrderByStartTimeAsc(
            Long dentistId,
            LocalDate appointmentDate
    );

    // =========================================================
    // PATIENT APPOINTMENTS FOR DATE
    // =========================================================

    List<Appointment>
    findByPatientIdAndAppointmentDateOrderByStartTimeAsc(
            Long patientId,
            LocalDate appointmentDate
    );

    // =========================================================
    // FIND BY STATUS
    // =========================================================

    List<Appointment>
    findByStatusIgnoreCaseOrderByAppointmentDateAscStartTimeAsc(
            String status
    );

    // =========================================================
    // DENTIST APPOINTMENTS BY STATUS
    // =========================================================

    List<Appointment>
    findByDentistIdAndStatusIgnoreCaseOrderByAppointmentDateAscStartTimeAsc(
            Long dentistId,
            String status
    );

    // =========================================================
    // PATIENT APPOINTMENTS BY STATUS
    // =========================================================

    List<Appointment>
    findByPatientIdAndStatusIgnoreCaseOrderByAppointmentDateDescStartTimeDesc(
            Long patientId,
            String status
    );

    // =========================================================
    // CHECK EXACT START TIME
    // =========================================================

    boolean existsByDentistIdAndAppointmentDateAndStartTime(
            Long dentistId,
            LocalDate appointmentDate,
            LocalTime startTime
    );

    // =========================================================
    // CHECK OVERLAPPING APPOINTMENT
    //
    // Used by AppointmentService.
    //
    // Time overlap condition:
    //
    // Existing start < requested end
    // AND
    // Existing end > requested start
    // =========================================================

    List<Appointment>
    findByDentistIdAndAppointmentDateAndStartTimeLessThanAndEndTimeGreaterThan(
            Long dentistId,
            LocalDate appointmentDate,
            LocalTime endTime,
            LocalTime startTime
    );

    // =========================================================
    // CHECK ACTIVE OVERLAPPING APPOINTMENT
    //
    // Only active appointment statuses should block a slot.
    //
    // Recommended statuses:
    // BOOKED
    // CONFIRMED
    //
    // CANCELLED and RESCHEDULED do not block the slot.
    // =========================================================

    List<Appointment>
    findByDentistIdAndAppointmentDateAndStatusInAndStartTimeLessThanAndEndTimeGreaterThan(
            Long dentistId,
            LocalDate appointmentDate,
            List<String> statuses,
            LocalTime endTime,
            LocalTime startTime
    );

    List<Appointment>
    findByPatientIdAndAppointmentDateAndStatusInAndStartTimeLessThanAndEndTimeGreaterThan(
            Long patientId,
            LocalDate appointmentDate,
            List<String> statuses,
            LocalTime endTime,
            LocalTime startTime
    );

    // =========================================================
    // ACTIVE APPOINTMENTS FOR DENTIST ON DATE
    //
    // Useful when generating available slots.
    // =========================================================

    List<Appointment>
    findByDentistIdAndAppointmentDateAndStatusInOrderByStartTimeAsc(
            Long dentistId,
            LocalDate appointmentDate,
            List<String> statuses
    );

    // =========================================================
    // APPOINTMENTS BETWEEN TWO DATES
    // =========================================================

    List<Appointment>
    findByAppointmentDateBetweenOrderByAppointmentDateAscStartTimeAsc(
            LocalDate startDate,
            LocalDate endDate
    );

    // =========================================================
    // DENTIST APPOINTMENTS BETWEEN TWO DATES
    // =========================================================

    List<Appointment>
    findByDentistIdAndAppointmentDateBetweenOrderByAppointmentDateAscStartTimeAsc(
            Long dentistId,
            LocalDate startDate,
            LocalDate endDate
    );

    // =========================================================
    // APPOINTMENTS THAT NEED REMINDERS
    //
    // Used by the scheduled reminder process.
    // =========================================================

    List<Appointment>
    findByReminderSentFalseAndAppointmentDateGreaterThanEqualOrderByAppointmentDateAscStartTimeAsc(
            LocalDate date
    );

    // =========================================================
    // ACTIVE APPOINTMENTS THAT NEED REMINDERS
    //
    // Cancelled and old rescheduled records should not receive
    // normal appointment reminders.
    // =========================================================

    List<Appointment>
    findByReminderSentFalseAndAppointmentDateGreaterThanEqualAndStatusInOrderByAppointmentDateAscStartTimeAsc(
            LocalDate date,
            List<String> statuses
    );

    boolean existsByPatientId(Long patientId);

    boolean existsByDentistId(Long dentistId);

    // =========================================================
    // SEARCH APPOINTMENTS
    // =========================================================

    @Query("SELECT a FROM Appointment a " +
           "LEFT JOIN a.patient p " +
           "LEFT JOIN a.dentist d " +
           "WHERE LOWER(a.appointmentCode) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(a.appointmentType) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(a.status) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(a.reason) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(p.firstName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(p.lastName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(p.patientCode) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(d.firstName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(d.lastName) LIKE LOWER(CONCAT('%', :kw, '%')) " +
           "ORDER BY a.appointmentDate DESC, a.startTime DESC")
    List<Appointment> searchAcrossFields(@Param("kw") String keyword);

    @Query("SELECT a FROM Appointment a " +
           "LEFT JOIN a.patient p " +
           "WHERE a.dentist.id = :dentistId AND (" +
           "LOWER(a.appointmentCode) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(a.appointmentType) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(a.status) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(a.reason) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(p.firstName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(p.lastName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(p.patientCode) LIKE LOWER(CONCAT('%', :kw, '%'))" +
           ") ORDER BY a.appointmentDate DESC, a.startTime DESC")
    List<Appointment> searchByDentistAndKeyword(@Param("dentistId") Long dentistId, @Param("kw") String keyword);

    @Query("SELECT a FROM Appointment a " +
           "LEFT JOIN a.dentist d " +
           "WHERE a.patient.id = :patientId AND (" +
           "LOWER(a.appointmentCode) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(a.appointmentType) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(a.status) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(a.reason) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(d.firstName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(d.lastName) LIKE LOWER(CONCAT('%', :kw, '%'))" +
           ") ORDER BY a.appointmentDate DESC, a.startTime DESC")
    List<Appointment> searchByPatientAndKeyword(@Param("patientId") Long patientId, @Param("kw") String keyword);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Appointment a SET a.dentist = null WHERE a.dentist.id = :dentistId")
    void unlinkDentist(@org.springframework.data.repository.query.Param("dentistId") Long dentistId);
}