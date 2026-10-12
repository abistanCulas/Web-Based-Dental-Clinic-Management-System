package com.dentaflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppointmentDTO {

    private Long id;

    private String appointmentCode;

    private Long patientId;

    private String patientName;

    private Long dentistId;

    private String dentistName;

    private LocalDate appointmentDate;

    private LocalTime startTime;

    private LocalTime endTime;

    private String appointmentType;

    private String status;

    private String reason;

    private String notes;

    private String bookingSource;

    private Boolean reminderSent;
}