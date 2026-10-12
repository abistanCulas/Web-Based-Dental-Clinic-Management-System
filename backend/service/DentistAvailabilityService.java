

package com.dentaflow.backend.service;

import com.dentaflow.backend.entity.Dentist;
import com.dentaflow.backend.entity.DentistAvailability;
import com.dentaflow.backend.entity.StaffSchedule;
import com.dentaflow.backend.repository.DentistAvailabilityRepository;
import com.dentaflow.backend.repository.DentistRepository;
import com.dentaflow.backend.repository.StaffScheduleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

@Service
@Transactional
public class DentistAvailabilityService {

    private final DentistAvailabilityRepository availabilityRepository;
    private final DentistRepository dentistRepository;
    private final StaffScheduleRepository staffScheduleRepository;

    // =========================================================
    // CONSTRUCTOR
    // =========================================================

    public DentistAvailabilityService(
            DentistAvailabilityRepository availabilityRepository,
            DentistRepository dentistRepository,
            StaffScheduleRepository staffScheduleRepository) {

        this.availabilityRepository =
                availabilityRepository;

        this.dentistRepository =
                dentistRepository;

        this.staffScheduleRepository =
                staffScheduleRepository;
    }

    // =========================================================
    // CREATE AVAILABILITY
    // =========================================================

    public DentistAvailability createAvailability(
            Long dentistId,
            DentistAvailability availability) {

        if (availability == null) {
            throw new RuntimeException(
                    "Availability data is required"
            );
        }

        Dentist dentist =
                dentistRepository.findById(dentistId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Dentist not found with id: "
                                                + dentistId
                                )
                        );

        if (availability.getDayOfWeek() == null) {
            throw new RuntimeException(
                    "Day of week is required"
            );
        }

        validateTimeRange(
                availability.getStartTime(),
                availability.getEndTime()
        );

        if (availabilityRepository
                .existsByDentistIdAndDayOfWeek(
                        dentistId,
                        availability.getDayOfWeek()
                )) {

            throw new RuntimeException(
                    "Availability already exists for "
                            + availability.getDayOfWeek()
            );
        }

        availability.setDentist(dentist);

        // Default values
        availability.setAvailable(true);
        availability.setStatus("ACTIVE");

        return availabilityRepository.save(
                availability
        );
    }

    // =========================================================
    // GET ALL AVAILABILITY
    // =========================================================

    @Transactional(readOnly = true)
    public List<DentistAvailability> getAllAvailability() {

        return availabilityRepository.findAll();
    }

    // =========================================================
    // GET AVAILABILITY BY ID
    // =========================================================

    @Transactional(readOnly = true)
    public DentistAvailability getAvailabilityById(
            Long id) {

        return availabilityRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Dentist availability not found with id: "
                                        + id
                        )
                );
    }

    // =========================================================
    // GET DENTIST AVAILABILITY
    // =========================================================

    @Transactional(readOnly = true)
    public List<DentistAvailability> getDentistAvailability(
            Long dentistId) {

        validateDentist(dentistId);

        return availabilityRepository
                .findByDentistId(dentistId);
    }

    // =========================================================
    // GET AVAILABLE SCHEDULES
    //
    // Only:
    // available = true
    // status = ACTIVE
    // =========================================================

    @Transactional(readOnly = true)
    public List<DentistAvailability> getAvailableSchedules(
            Long dentistId) {

        validateDentist(dentistId);

        Dentist dentist = dentistRepository.findById(dentistId).orElse(null);
        if (dentist == null || !"ACTIVE".equalsIgnoreCase(dentist.getStatus())) {
            return List.of();
        }

        return availabilityRepository
                .findByDentistIdAndAvailableTrue(
                        dentistId
                )
                .stream()
                .filter(availability ->
                        availability != null
                                &&
                                availability.isAvailable()
                                &&
                                isActiveStatus(
                                        availability.getStatus()
                                )
                )
                .toList();
    }

    // =========================================================
    // GET AVAILABILITY FOR DAY
    // =========================================================

    @Transactional(readOnly = true)
    public DentistAvailability getAvailabilityForDay(
            Long dentistId,
            DayOfWeek dayOfWeek) {

        if (dayOfWeek == null) {
            throw new RuntimeException(
                    "Day of week is required"
            );
        }

        validateDentist(dentistId);

        return availabilityRepository
                .findByDentistIdAndDayOfWeek(
                        dentistId,
                        dayOfWeek
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "No availability found for "
                                        + dayOfWeek
                        )
                );
    }

    // =========================================================
    // UPDATE AVAILABILITY
    // =========================================================

    public DentistAvailability updateAvailability(
            Long id,
            DentistAvailability updatedAvailability) {

        DentistAvailability existing =
                getAvailabilityById(id);

        if (updatedAvailability == null) {
            throw new RuntimeException(
                    "Availability data is required"
            );
        }

        // ---------------------------------------------------------
        // DAY OF WEEK
        // ---------------------------------------------------------

        if (updatedAvailability.getDayOfWeek() != null) {

            DayOfWeek newDay =
                    updatedAvailability.getDayOfWeek();

            // Check duplicate day if changed
            if (!newDay.equals(
                    existing.getDayOfWeek()
            )) {

                Long dentistId =
                        existing.getDentist().getId();

                if (availabilityRepository
                        .existsByDentistIdAndDayOfWeek(
                                dentistId,
                                newDay
                        )) {

                    throw new RuntimeException(
                            "Availability already exists for "
                                    + newDay
                    );
                }
            }

            existing.setDayOfWeek(
                    newDay
            );
        }

        // ---------------------------------------------------------
        // START TIME
        // ---------------------------------------------------------

        if (updatedAvailability.getStartTime() != null) {

            existing.setStartTime(
                    updatedAvailability.getStartTime()
            );
        }

        // ---------------------------------------------------------
        // END TIME
        // ---------------------------------------------------------

        if (updatedAvailability.getEndTime() != null) {

            existing.setEndTime(
                    updatedAvailability.getEndTime()
            );
        }

        // ---------------------------------------------------------
        // AVAILABLE
        // ---------------------------------------------------------

        existing.setAvailable(
                updatedAvailability.isAvailable()
        );

        // ---------------------------------------------------------
        // STATUS
        // ---------------------------------------------------------

        if (updatedAvailability.getStatus() != null) {

            String status =
                    updatedAvailability
                            .getStatus()
                            .trim()
                            .toUpperCase();

            if (!status.equals("ACTIVE") &&
                    !status.equals("INACTIVE")) {

                throw new RuntimeException(
                        "Status must be ACTIVE or INACTIVE"
                );
            }

            existing.setStatus(
                    status
            );

        } else {

            // Keep status consistent with availability
            existing.setStatus(
                    existing.isAvailable()
                            ? "ACTIVE"
                            : "INACTIVE"
            );
        }

        // ---------------------------------------------------------
        // KEEP AVAILABLE + STATUS CONSISTENT
        // ---------------------------------------------------------

        if (!existing.isAvailable()) {
            existing.setStatus("INACTIVE");
        }

        if (existing.isAvailable() &&
                !isActiveStatus(
                        existing.getStatus()
                )) {

            existing.setStatus("ACTIVE");
        }

        // ---------------------------------------------------------
        // VALIDATE TIME
        // ---------------------------------------------------------

        validateTimeRange(
                existing.getStartTime(),
                existing.getEndTime()
        );

        return availabilityRepository.save(
                existing
        );
    }

    // =========================================================
    // ENABLE AVAILABILITY
    // =========================================================

    public DentistAvailability enableAvailability(
            Long id) {

        DentistAvailability availability =
                getAvailabilityById(id);

        availability.setAvailable(true);
        availability.setStatus("ACTIVE");

        return availabilityRepository.save(
                availability
        );
    }

    // =========================================================
    // DISABLE AVAILABILITY
    // =========================================================

    public DentistAvailability disableAvailability(
            Long id) {

        DentistAvailability availability =
                getAvailabilityById(id);

        availability.setAvailable(false);
        availability.setStatus("INACTIVE");

        return availabilityRepository.save(
                availability
        );
    }

    // =========================================================
    // DELETE AVAILABILITY
    // =========================================================

    public void deleteAvailability(
            Long id) {

        DentistAvailability availability =
                getAvailabilityById(id);

        availabilityRepository.delete(
                availability
        );
    }

    // =========================================================
    // DELETE ALL DENTIST AVAILABILITY
    // =========================================================

    public void deleteDentistAvailability(
            Long dentistId) {

        validateDentist(dentistId);

        availabilityRepository.deleteByDentistId(
                dentistId
        );
    }

    // =========================================================
    // CHECK DENTIST AVAILABILITY
    //
    // This checks ONLY the dentist's working schedule.
    //
    // Appointment conflicts are checked separately by
    // AppointmentAvailabilityService.
    // =========================================================
    // CHECK DENTIST AVAILABILITY
    //
    // This checks the authoritative weekly schedule (StaffSchedule)
    // first, and falls back to DentistAvailability if unassigned.
    // Appointment conflicts are checked separately by
    // AppointmentAvailabilityService.
    // =========================================================

    @Transactional(readOnly = true)
    public boolean isDentistAvailable(
            Long dentistId,
            LocalDate date,
            LocalTime startTime,
            LocalTime endTime) {

        if (dentistId == null || date == null || startTime == null || endTime == null) {
            return false;
        }

        if (!startTime.isBefore(endTime)) {
            return false;
        }

        Dentist dentist = dentistRepository.findById(dentistId).orElse(null);
        if (dentist == null || !"ACTIVE".equalsIgnoreCase(dentist.getStatus())) {
            return false;
        }

        DayOfWeek dayOfWeek = date.getDayOfWeek();
        LocalDate weekStartDate = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

        // 1. Authoritative check: StaffSchedule for this specific week & day
        List<StaffSchedule> schedules = staffScheduleRepository
                .findByDentistIdAndWeekStartDateAndDayOfWeek(dentistId, weekStartDate, dayOfWeek);

        if (!schedules.isEmpty()) {
            for (StaffSchedule schedule : schedules) {
                // If explicitly marked as day OFF / not working, doctor is unavailable
                if (Boolean.FALSE.equals(schedule.getWorking())) {
                    return false;
                }
                if (Boolean.TRUE.equals(schedule.getWorking())) {
                    LocalTime workingStart = schedule.getStartTime();
                    LocalTime workingEnd = schedule.getEndTime();
                    if (workingStart == null || workingEnd == null || !workingStart.isBefore(workingEnd)) {
                        return false;
                    }
                    return !startTime.isBefore(workingStart) && !endTime.isAfter(workingEnd);
                }
            }
            return false;
        }

        // 2. Fallback: Check DentistAvailability
        try {
            DentistAvailability availability = getAvailabilityForDay(dentistId, dayOfWeek);
            if (availability.isAvailable() &&
                    isActiveStatus(availability.getStatus()) &&
                    availability.getStartTime() != null &&
                    availability.getEndTime() != null &&
                    availability.getStartTime().isBefore(availability.getEndTime())) {
                return !startTime.isBefore(availability.getStartTime()) && !endTime.isAfter(availability.getEndTime());
            }
        } catch (RuntimeException exception) {
            // Not found
        }

        return false;
    }

    @Transactional(readOnly = true)
    public boolean isDentistAvailable(
            Long dentistId,
            DayOfWeek dayOfWeek,
            LocalTime startTime,
            LocalTime endTime) {

        if (dayOfWeek == null) return false;
        LocalDate monday = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate targetDate = monday.plusDays(dayOfWeek.getValue() - 1);
        return isDentistAvailable(dentistId, targetDate, startTime, endTime);
    }

    // =========================================================
    // CHECK STATUS
    // =========================================================

    private boolean isActiveStatus(
            String status) {

        return status != null &&
                "ACTIVE".equalsIgnoreCase(
                        status.trim()
                );
    }

    // =========================================================
    // VALIDATE DENTIST
    // =========================================================

    private Dentist validateDentist(
            Long dentistId) {

        if (dentistId == null) {

            throw new RuntimeException(
                    "Dentist ID is required"
            );
        }

        return dentistRepository
                .findById(dentistId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Dentist not found with id: "
                                        + dentistId
                        )
                );
    }

    // =========================================================
    // VALIDATE TIME RANGE
    // =========================================================

    private void validateTimeRange(
            LocalTime startTime,
            LocalTime endTime) {

        if (startTime == null ||
                endTime == null) {

            throw new RuntimeException(
                    "Start time and end time are required"
            );
        }

        if (!startTime.isBefore(
                endTime
        )) {

            throw new RuntimeException(
                    "Start time must be before end time"
            );
        }
    }
}