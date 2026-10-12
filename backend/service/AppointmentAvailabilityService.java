package com.dentaflow.backend.service;

import com.dentaflow.backend.entity.Appointment;
import com.dentaflow.backend.entity.Dentist;
import com.dentaflow.backend.entity.DentistAvailability;
import com.dentaflow.backend.entity.StaffSchedule;
import com.dentaflow.backend.repository.AppointmentRepository;
import com.dentaflow.backend.repository.DentistAvailabilityRepository;
import com.dentaflow.backend.repository.DentistRepository;
import com.dentaflow.backend.repository.StaffScheduleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class AppointmentAvailabilityService {

    // =========================================================
    // ACTIVE APPOINTMENT STATUSES
    //
    // Only these statuses block a dentist's time slot.
    //
    // BOOKED       -> blocks slot
    // CONFIRMED    -> blocks slot
    // RESCHEDULED  -> blocks NEW slot
    //
    // CANCELLED    -> does NOT block slot
    // COMPLETED    -> does NOT block slot
    // NO_SHOW      -> does NOT block slot
    // =========================================================

    private static final List<String> ACTIVE_STATUSES =
            List.of(
                    "BOOKED",
                    "CONFIRMED",
                    "RESCHEDULED"
            );

    // =========================================================
    // BOOKING WINDOW
    //
    // Today -> next 15 days
    // =========================================================

    private static final int MAX_BOOKING_DAYS = 15;

    // =========================================================
    // REPOSITORIES
    // =========================================================

    private final AppointmentRepository appointmentRepository;
    private final DentistAvailabilityRepository dentistAvailabilityRepository;
    private final StaffScheduleRepository staffScheduleRepository;
    private final DentistRepository dentistRepository;

    // =========================================================
    // CONSTRUCTOR
    // =========================================================

    public AppointmentAvailabilityService(
            AppointmentRepository appointmentRepository,
            DentistAvailabilityRepository dentistAvailabilityRepository,
            StaffScheduleRepository staffScheduleRepository,
            DentistRepository dentistRepository) {

        this.appointmentRepository =
                appointmentRepository;

        this.dentistAvailabilityRepository =
                dentistAvailabilityRepository;

        this.staffScheduleRepository =
                staffScheduleRepository;

        this.dentistRepository =
                dentistRepository;
    }

    // =========================================================
    // AUTHORITATIVE WORKING HOURS RESOLVER
    //
    // Prioritizes StaffSchedule for the date's week and day.
    // Falls back to DentistAvailability only if no StaffSchedule exists.
    // =========================================================

    private static class WorkingHours {
        final LocalTime startTime;
        final LocalTime endTime;
        final boolean isWorking;

        WorkingHours(LocalTime startTime, LocalTime endTime, boolean isWorking) {
            this.startTime = startTime;
            this.endTime = endTime;
            this.isWorking = isWorking;
        }
    }

    private WorkingHours resolveAuthoritativeWorkingHours(Long dentistId, LocalDate date) {
        DayOfWeek dayOfWeek = date.getDayOfWeek();
        LocalDate weekStartDate = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

        // 1. Authoritative check: StaffSchedule for this specific week & day
        List<StaffSchedule> schedules = staffScheduleRepository
                .findByDentistIdAndWeekStartDateAndDayOfWeek(dentistId, weekStartDate, dayOfWeek);

        if (!schedules.isEmpty()) {
            for (StaffSchedule schedule : schedules) {
                // If explicitly marked as day OFF / not working, doctor is unavailable
                if (Boolean.FALSE.equals(schedule.getWorking())) {
                    return new WorkingHours(null, null, false);
                }
                if (Boolean.TRUE.equals(schedule.getWorking()) &&
                        schedule.getStartTime() != null && schedule.getEndTime() != null &&
                        schedule.getStartTime().isBefore(schedule.getEndTime())) {
                    return new WorkingHours(schedule.getStartTime(), schedule.getEndTime(), true);
                }
            }
            return new WorkingHours(null, null, false);
        }

        // 2. Fallback to DentistAvailability if no StaffSchedule exists
        Optional<DentistAvailability> availabilityOpt = dentistAvailabilityRepository
                .findByDentistIdAndDayOfWeek(dentistId, dayOfWeek);

        if (availabilityOpt.isPresent()) {
            DentistAvailability av = availabilityOpt.get();
            if (isActiveAvailability(av) && av.getStartTime() != null && av.getEndTime() != null &&
                    av.getStartTime().isBefore(av.getEndTime())) {
                return new WorkingHours(av.getStartTime(), av.getEndTime(), true);
            }
        }

        return new WorkingHours(null, null, false);
    }

    // =========================================================
    // GET AVAILABLE TIME RANGES
    //
    // Returns free time ranges for a dentist on a date.
    //
    // Example:
    //
    // Dentist working:
    // 08:00 - 17:00
    //
    // Existing:
    // 10:00 - 10:30
    // 14:00 - 15:00
    //
    // Result:
    // 08:00 - 10:00
    // 10:30 - 14:00
    // 15:00 - 17:00
    // =========================================================

    public List<AvailableTimeSlot> getAvailableTimeRanges(
            Long dentistId,
            LocalDate date) {

        validateInput(
                dentistId,
                date
        );

        Dentist dentist = dentistRepository.findById(dentistId).orElse(null);
        if (dentist == null || !"ACTIVE".equalsIgnoreCase(dentist.getStatus())) {
            return new ArrayList<>();
        }

        // ---------------------------------------------------------
        // TODAY -> NEXT 15 DAYS
        // ---------------------------------------------------------

        if (!isDateWithinBookingWindow(date)) {
            return new ArrayList<>();
        }

        // =========================================================
        // GET AUTHORITATIVE WORKING HOURS (STAFF SCHEDULE FIRST)
        // =========================================================

        WorkingHours wh = resolveAuthoritativeWorkingHours(dentistId, date);
        if (!wh.isWorking || wh.startTime == null || wh.endTime == null) {
            return new ArrayList<>();
        }

        LocalTime workingStart = wh.startTime;
        LocalTime workingEnd = wh.endTime;

        // =========================================================
        // SAME-DAY RULE
        //
        // If today is selected, don't show past times.
        // =========================================================

        LocalTime effectiveStart =
                workingStart;

        if (date.equals(LocalDate.now())) {

            LocalTime currentTime =
                    LocalTime.now();

            if (!currentTime.isBefore(
                    workingEnd
            )) {
                return new ArrayList<>();
            }

            if (currentTime.isAfter(
                    effectiveStart
            )) {
                effectiveStart =
                        currentTime;
            }
        }

        // =========================================================
        // GET ACTIVE APPOINTMENTS
        // =========================================================

        List<Appointment> appointments =
                appointmentRepository
                        .findByDentistIdAndAppointmentDateAndStatusInOrderByStartTimeAsc(
                                dentistId,
                                date,
                                ACTIVE_STATUSES
                        );

        if (appointments == null) {
            appointments =
                    new ArrayList<>();
        }

        appointments.sort(
                Comparator.comparing(
                        Appointment::getStartTime,
                        Comparator.nullsLast(
                                Comparator.naturalOrder()
                        )
                )
        );

        List<AvailableTimeSlot> availableSlots =
                new ArrayList<>();

        // =========================================================
        // START OF FREE PERIOD
        // =========================================================

        LocalTime freeStart =
                effectiveStart;

        // =========================================================
        // PROCESS APPOINTMENTS
        // =========================================================

        for (Appointment appointment :
                appointments) {

            if (appointment == null) {
                continue;
            }

            LocalTime appointmentStart =
                    appointment.getStartTime();

            LocalTime appointmentEnd =
                    appointment.getEndTime();

            if (appointmentStart == null ||
                    appointmentEnd == null) {

                continue;
            }

            // -----------------------------------------------------
            // Appointment completely before free period
            // -----------------------------------------------------

            if (!appointmentEnd.isAfter(
                    freeStart
            )) {

                continue;
            }

            // -----------------------------------------------------
            // Appointment starts after working period
            // -----------------------------------------------------

            if (!appointmentStart.isBefore(
                    workingEnd
            )) {

                break;
            }

            // -----------------------------------------------------
            // BLOCKED START
            // -----------------------------------------------------

            LocalTime blockedStart =
                    appointmentStart.isBefore(
                            effectiveStart
                    )
                            ? effectiveStart
                            : appointmentStart;

            // -----------------------------------------------------
            // BLOCKED END
            // -----------------------------------------------------

            LocalTime blockedEnd =
                    appointmentEnd.isAfter(
                            workingEnd
                    )
                            ? workingEnd
                            : appointmentEnd;

            // -----------------------------------------------------
            // FREE TIME BEFORE APPOINTMENT
            // -----------------------------------------------------

            if (freeStart.isBefore(
                    blockedStart
            )) {

                availableSlots.add(
                        new AvailableTimeSlot(
                                freeStart,
                                blockedStart
                        )
                );
            }

            // -----------------------------------------------------
            // MOVE FREE START
            // -----------------------------------------------------

            if (blockedEnd.isAfter(
                    freeStart
            )) {

                freeStart =
                        blockedEnd;
            }

            // -----------------------------------------------------
            // WORKING PERIOD FINISHED
            // -----------------------------------------------------

            if (!freeStart.isBefore(
                    workingEnd
            )) {

                break;
            }
        }

        // =========================================================
        // FREE TIME AFTER LAST APPOINTMENT
        // =========================================================

        if (freeStart.isBefore(
                workingEnd
        )) {

            availableSlots.add(
                    new AvailableTimeSlot(
                            freeStart,
                            workingEnd
                    )
            );
        }

        return mergeOverlappingSlots(
                availableSlots
        );
    }

    // =========================================================
    // CHECK SPECIFIC TIME AVAILABILITY
    //
    // Used before booking/rescheduling.
    // =========================================================

    public boolean isTimeAvailable(
            Long dentistId,
            LocalDate date,
            LocalTime startTime,
            LocalTime endTime) {

        validateInput(
                dentistId,
                date
        );

        Dentist dentist = dentistRepository.findById(dentistId).orElse(null);
        if (dentist == null || !"ACTIVE".equalsIgnoreCase(dentist.getStatus())) {
            return false;
        }

        // ---------------------------------------------------------
        // DATE MUST BE TODAY -> NEXT 15 DAYS
        // ---------------------------------------------------------

        if (!isDateWithinBookingWindow(date)) {
            return false;
        }

        if (startTime == null ||
                endTime == null) {

            return false;
        }

        if (!startTime.isBefore(
                endTime
        )) {

            return false;
        }

        // ---------------------------------------------------------
        // SAME DAY: START TIME MUST BE FUTURE
        // ---------------------------------------------------------

        if (date.equals(
                LocalDate.now()
        )) {

            if (!startTime.isAfter(
                    LocalTime.now()
            )) {

                return false;
            }
        }

        // =========================================================
        // GET AUTHORITATIVE WORKING HOURS (STAFF SCHEDULE FIRST)
        // =========================================================

        WorkingHours wh = resolveAuthoritativeWorkingHours(dentistId, date);
        if (!wh.isWorking || wh.startTime == null || wh.endTime == null) {
            return false;
        }

        LocalTime workingStart = wh.startTime;
        LocalTime workingEnd = wh.endTime;

        // =========================================================
        // CHECK WORKING HOURS
        // =========================================================

        if (startTime.isBefore(workingStart) ||
                endTime.isAfter(workingEnd)) {
            return false;
        }

        // =========================================================
        // CHECK ACTIVE APPOINTMENT OVERLAP
        // =========================================================

        List<Appointment> overlappingAppointments =
                appointmentRepository
                        .findByDentistIdAndAppointmentDateAndStatusInAndStartTimeLessThanAndEndTimeGreaterThan(
                                dentistId,
                                date,
                                ACTIVE_STATUSES,
                                endTime,
                                startTime
                        );

        return overlappingAppointments == null ||
                overlappingAppointments.isEmpty();
    }

    // =========================================================
    // GET ACTIVE APPOINTMENTS
    // =========================================================

    public List<Appointment> getActiveAppointments(
            Long dentistId,
            LocalDate date) {

        validateInput(
                dentistId,
                date
        );

        return appointmentRepository
                .findByDentistIdAndAppointmentDateAndStatusInOrderByStartTimeAsc(
                        dentistId,
                        date,
                        ACTIVE_STATUSES
                );
    }

    // =========================================================
    // GET DENTIST WORKING PERIOD
    // =========================================================

    public Optional<DentistAvailability> getWorkingPeriod(
            Long dentistId,
            LocalDate date) {

        validateInput(
                dentistId,
                date
        );

        // Outside booking window
        if (!isDateWithinBookingWindow(date)) {
            return Optional.empty();
        }

        WorkingHours wh = resolveAuthoritativeWorkingHours(dentistId, date);
        if (!wh.isWorking || wh.startTime == null || wh.endTime == null) {
            return Optional.empty();
        }

        DentistAvailability da = new DentistAvailability();
        Dentist d = dentistRepository.findById(dentistId).orElse(null);
        da.setDentist(d);
        da.setDayOfWeek(date.getDayOfWeek());
        da.setStartTime(wh.startTime);
        da.setEndTime(wh.endTime);
        da.setAvailable(true);
        da.setStatus("ACTIVE");
        return Optional.of(da);
    }

    // =========================================================
    // CHECK DATE WITHIN BOOKING WINDOW
    //
    // TODAY -> TODAY + 15 DAYS
    //
    // Example:
    //
    // Today = 24
    //
    // 24 -> allowed
    // 25 -> allowed
    // ...
    // 08 Sep -> allowed
    // 09 Sep -> not allowed
    // =========================================================

    public boolean isDateWithinBookingWindow(
            LocalDate date) {

        if (date == null) {
            return false;
        }

        LocalDate today =
                LocalDate.now();

        LocalDate maxDate =
                today.plusDays(
                        MAX_BOOKING_DAYS
                );

        return !date.isBefore(today) &&
                !date.isAfter(maxDate);
    }

    // =========================================================
    // GET MAX BOOKING DATE
    // =========================================================

    public LocalDate getMaximumBookingDate() {

        return LocalDate.now()
                .plusDays(
                        MAX_BOOKING_DAYS
                );
    }

    // =========================================================
    // GET ACTIVE STATUSES
    //
    // Useful if another service needs the same rule.
    // =========================================================

    public List<String> getActiveStatuses() {

        return List.copyOf(
                ACTIVE_STATUSES
        );
    }

    // =========================================================
    // VALIDATE INPUT
    // =========================================================

    private void validateInput(
            Long dentistId,
            LocalDate date) {

        if (dentistId == null) {

            throw new IllegalArgumentException(
                    "Dentist ID is required"
            );
        }

        if (date == null) {

            throw new IllegalArgumentException(
                    "Appointment date is required"
            );
        }
    }

    // =========================================================
    // CHECK ACTIVE AVAILABILITY
    // =========================================================

    private boolean isActiveAvailability(
            DentistAvailability availability) {

        if (availability == null) {
            return false;
        }

        // DentistAvailability uses primitive boolean
        // through isAvailable().

        if (!availability.isAvailable()) {
            return false;
        }

        String status =
                availability.getStatus();

        return status == null ||
                status.trim().isEmpty() ||
                "ACTIVE".equalsIgnoreCase(
                        status
                );
    }

    // =========================================================
    // MERGE OVERLAPPING FREE RANGES
    // =========================================================

    private List<AvailableTimeSlot> mergeOverlappingSlots(
            List<AvailableTimeSlot> slots) {

        if (slots == null ||
                slots.isEmpty()) {

            return new ArrayList<>();
        }

        slots.sort(
                Comparator.comparing(
                        AvailableTimeSlot::getStartTime
                )
        );

        List<AvailableTimeSlot> merged =
                new ArrayList<>();

        AvailableTimeSlot current =
                slots.get(0);

        for (int i = 1;
             i < slots.size();
             i++) {

            AvailableTimeSlot next =
                    slots.get(i);

            // -----------------------------------------------------
            // Overlapping or touching ranges
            // -----------------------------------------------------

            if (!current.getEndTime()
                    .isBefore(
                            next.getStartTime()
                    )) {

                if (next.getEndTime()
                        .isAfter(
                                current.getEndTime()
                        )) {

                    current =
                            new AvailableTimeSlot(
                                    current.getStartTime(),
                                    next.getEndTime()
                            );
                }

            } else {

                merged.add(
                        current
                );

                current =
                        next;
            }
        }

        merged.add(
                current
        );

        return merged;
    }

    // =========================================================
    // AVAILABLE TIME SLOT
    // =========================================================

    public static class AvailableTimeSlot {

        private final LocalTime startTime;
        private final LocalTime endTime;

        public AvailableTimeSlot(
                LocalTime startTime,
                LocalTime endTime) {

            this.startTime =
                    startTime;

            this.endTime =
                    endTime;
        }

        public LocalTime getStartTime() {
            return startTime;
        }

        public LocalTime getEndTime() {
            return endTime;
        }
    }
}