package com.dentaflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleOperationResult {

    private boolean success;

    private boolean emailSent;

    private String message;

    private StaffScheduleDTO schedule;

    private List<StaffScheduleDTO> schedules;

    private StaffScheduleDTO fallbackSchedule;
}
