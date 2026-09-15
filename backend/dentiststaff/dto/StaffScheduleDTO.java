package com.dentalclinic.dentiststaff.dto;

import jakarta.validation.constraints.NotNull;

import java.time.DayOfWeek;
import java.time.LocalTime;

public class StaffScheduleDTO {

    private Long id;

    @NotNull(message = "Day of week is required")
    private DayOfWeek dayOfWeek;

    @NotNull(message = "Shift start time is required")
    private LocalTime shiftStart;

    @NotNull(message = "Shift end time is required")
    private LocalTime shiftEnd;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public DayOfWeek getDayOfWeek() {
        return dayOfWeek;
    }

    public void setDayOfWeek(DayOfWeek dayOfWeek) {
        this.dayOfWeek = dayOfWeek;
    }

    public LocalTime getShiftStart() {
        return shiftStart;
    }

    public void setShiftStart(LocalTime shiftStart) {
        this.shiftStart = shiftStart;
    }

    public LocalTime getShiftEnd() {
        return shiftEnd;
    }

    public void setShiftEnd(LocalTime shiftEnd) {
        this.shiftEnd = shiftEnd;
    }
}
