package com.dentaflow.backend.mapper;

import com.dentaflow.backend.dto.AppointmentDTO;
import com.dentaflow.backend.entity.Appointment;
import org.springframework.stereotype.Component;

@Component
public class AppointmentMapper {

    // =========================================================
    // ENTITY → DTO
    // =========================================================

    public AppointmentDTO toDTO(Appointment appointment) {

        if (appointment == null) {
            return null;
        }

        return AppointmentDTO.builder()
                .id(appointment.getId())
                .appointmentCode(
                        appointment.getAppointmentCode()
                )
                .patientId(
                        appointment.getPatient() != null
                                ? appointment.getPatient().getId()
                                : null
                )
                .patientName(
                        appointment.getPatient() != null
                                ? ((appointment.getPatient().getFirstName() != null ? appointment.getPatient().getFirstName() : "") + " " +
                                   (appointment.getPatient().getLastName() != null ? appointment.getPatient().getLastName() : "")).trim()
                                : null
                )
                .dentistId(
                        appointment.getDentist() != null
                                ? appointment.getDentist().getId()
                                : null
                )
                .dentistName(
                        appointment.getDentist() != null
                                ? (((appointment.getDentist().getFirstName() != null ? appointment.getDentist().getFirstName() : "") + " " +
                                    (appointment.getDentist().getLastName() != null ? appointment.getDentist().getLastName() : "")).trim().startsWith("Dr.")
                                        ? ((appointment.getDentist().getFirstName() != null ? appointment.getDentist().getFirstName() : "") + " " +
                                           (appointment.getDentist().getLastName() != null ? appointment.getDentist().getLastName() : "")).trim()
                                        : "Dr. " + ((appointment.getDentist().getFirstName() != null ? appointment.getDentist().getFirstName() : "") + " " +
                                                    (appointment.getDentist().getLastName() != null ? appointment.getDentist().getLastName() : "")).trim())
                                : null
                )
                .appointmentDate(
                        appointment.getAppointmentDate()
                )
                .startTime(
                        appointment.getStartTime()
                )
                .endTime(
                        appointment.getEndTime()
                )
                .appointmentType(
                        appointment.getAppointmentType()
                )
                .status(
                        appointment.getStatus()
                )
                .reason(
                        appointment.getReason()
                )
                .notes(
                        appointment.getNotes()
                )
                .bookingSource(
                        appointment.getBookingSource()
                )
                .reminderSent(
                        appointment.getReminderSent()
                )
                .build();
    }

    // =========================================================
    // DTO → ENTITY
    //
    // Patient and Dentist relationships are intentionally NOT
    // set here.
    //
    // AppointmentService fetches the real Patient and Dentist
    // entities and sets them before saving.
    // =========================================================

    public Appointment toEntity(AppointmentDTO dto) {

        if (dto == null) {
            return null;
        }

        Appointment appointment =
                new Appointment();

        appointment.setId(
                dto.getId()
        );

        appointment.setAppointmentCode(
                dto.getAppointmentCode()
        );

        appointment.setAppointmentDate(
                dto.getAppointmentDate()
        );

        appointment.setStartTime(
                dto.getStartTime()
        );

        appointment.setEndTime(
                dto.getEndTime()
        );

        appointment.setAppointmentType(
                dto.getAppointmentType()
        );

        appointment.setStatus(
                dto.getStatus()
        );

        appointment.setReason(
                dto.getReason()
        );

        appointment.setNotes(
                dto.getNotes()
        );

        appointment.setBookingSource(
                dto.getBookingSource()
        );

        appointment.setReminderSent(
                dto.getReminderSent()
        );

        return appointment;
    }
}