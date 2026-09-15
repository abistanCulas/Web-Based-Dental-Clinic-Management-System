package com.dentaflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffScheduleDTO {

    private Long id;

    // Staff schedule
    private Long staffId;

    // Dentist schedule
    private Long dentistId;

    private DayOfWeek dayOfWeek;

    private LocalDate weekStartDate;

    private Boolean working;

    private LocalTime startTime;

    private LocalTime endTime;

    // MORNING / EVENING
    private String shift;

    // AUTO / MANUAL
    private String scheduleSource;

    private String notes;
}