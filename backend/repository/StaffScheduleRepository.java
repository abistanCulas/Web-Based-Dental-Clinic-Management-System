package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.StaffSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface StaffScheduleRepository
        extends JpaRepository<StaffSchedule, Long> {

    // =========================================================
    // STAFF - WEEKLY SCHEDULE
    // =========================================================

    List<StaffSchedule>
    findByStaffIdAndWeekStartDate(
            Long staffId,
            LocalDate weekStartDate
    );

    // =========================================================
    // DENTIST - WEEKLY SCHEDULE
    // =========================================================

    List<StaffSchedule>
    findByDentistIdAndWeekStartDate(
            Long dentistId,
            LocalDate weekStartDate
    );

    // =========================================================
    // ALL SCHEDULES FOR A WEEK
    // =========================================================

    List<StaffSchedule>
    findByWeekStartDate(
            LocalDate weekStartDate
    );

    // =========================================================
    // STAFF - SPECIFIC DAY + SHIFT
    // =========================================================

    Optional<StaffSchedule>
    findByStaffIdAndWeekStartDateAndDayOfWeekAndShift(
            Long staffId,
            LocalDate weekStartDate,
            DayOfWeek dayOfWeek,
            String shift
    );

    // =========================================================
    // DENTIST - SPECIFIC DAY + SHIFT
    // =========================================================

    Optional<StaffSchedule>
    findByDentistIdAndWeekStartDateAndDayOfWeekAndShift(
            Long dentistId,
            LocalDate weekStartDate,
            DayOfWeek dayOfWeek,
            String shift
    );

    // =========================================================
    // STAFF - ALL SHIFTS FOR A DAY
    // =========================================================

    List<StaffSchedule>
    findByStaffIdAndWeekStartDateAndDayOfWeek(
            Long staffId,
            LocalDate weekStartDate,
            DayOfWeek dayOfWeek
    );

    // =========================================================
    // DENTIST - ALL SHIFTS FOR A DAY
    // =========================================================

    List<StaffSchedule>
    findByDentistIdAndWeekStartDateAndDayOfWeek(
            Long dentistId,
            LocalDate weekStartDate,
            DayOfWeek dayOfWeek
    );

    // =========================================================
    // CHECK STAFF WEEKLY SCHEDULE
    // =========================================================

    boolean existsByStaffIdAndWeekStartDate(
            Long staffId,
            LocalDate weekStartDate
    );

    // =========================================================
    // CHECK DENTIST WEEKLY SCHEDULE
    // =========================================================

    boolean existsByDentistIdAndWeekStartDate(
            Long dentistId,
            LocalDate weekStartDate
    );

    // =========================================================
    // CHECK STAFF SPECIFIC SHIFT
    // =========================================================

    boolean existsByStaffIdAndWeekStartDateAndDayOfWeekAndShift(
            Long staffId,
            LocalDate weekStartDate,
            DayOfWeek dayOfWeek,
            String shift
    );

    // =========================================================
    // CHECK DENTIST SPECIFIC SHIFT
    // =========================================================

    boolean existsByDentistIdAndWeekStartDateAndDayOfWeekAndShift(
            Long dentistId,
            LocalDate weekStartDate,
            DayOfWeek dayOfWeek,
            String shift
    );

    // =========================================================
    // GET ALL STAFF SCHEDULES
    // =========================================================

    List<StaffSchedule>
    findByStaffId(
            Long staffId
    );

    // =========================================================
    // GET ALL DENTIST SCHEDULES
    // =========================================================

    List<StaffSchedule>
    findByDentistId(
            Long dentistId
    );

    // =========================================================
    // GET WORKING STAFF SCHEDULES
    // =========================================================

    List<StaffSchedule>
    findByStaffIdAndWorkingTrue(
            Long staffId
    );

    // =========================================================
    // GET WORKING DENTIST SCHEDULES
    // =========================================================

    List<StaffSchedule>
    findByDentistIdAndWorkingTrue(
            Long dentistId
    );

    // =========================================================
    // GET BY SCHEDULE SOURCE
    // AUTO / MANUAL
    // =========================================================

    List<StaffSchedule>
    findByScheduleSource(
            String scheduleSource
    );

    // =========================================================
    // GET BY SHIFT
    // =========================================================

    List<StaffSchedule>
    findByShift(
            String shift
    );

    // =========================================================
    // GET WEEK + SHIFT
    // =========================================================

    List<StaffSchedule>
    findByWeekStartDateAndShift(
            LocalDate weekStartDate,
            String shift
    );

    // =========================================================
    // DELETE STAFF SCHEDULES
    // =========================================================

    void deleteByStaffId(
            Long staffId
    );

    // =========================================================
    // DELETE DENTIST SCHEDULES
    // =========================================================

    void deleteByDentistId(
            Long dentistId
    );
}