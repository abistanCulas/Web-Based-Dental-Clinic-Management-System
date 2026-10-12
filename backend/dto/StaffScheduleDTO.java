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

    // MORNING / EVENING / FULL_DAY
    private String shift;

    // AUTO / MANUAL
    private String scheduleSource;

    private LocalDate scheduleDate;

    private String status;

    private Boolean generatedAutomatically;

    private Boolean modifiedByAdmin;

    private Boolean deletedByAdmin;

    // Enriched display fields for UI tables & cards
    private String name;

    private String role;

    private String specialization;

    private String notes;

    // Effective schedule fields
    private String effectiveSource; // OVERRIDE, WEEKLY, AUTO

    private String effectiveBadge; // [Admin Date Override], [Weekly Schedule], [Auto Generated]

    private Boolean isOverride;
}