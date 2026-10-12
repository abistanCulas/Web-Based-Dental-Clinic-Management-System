package com.dentaflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.DayOfWeek;
import java.time.LocalTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DentistAvailabilityDTO {

    private Long id;

    private Long dentistId;

    private DayOfWeek dayOfWeek;

    private boolean available;

    private LocalTime startTime;

    private LocalTime endTime;

    private String status;
}