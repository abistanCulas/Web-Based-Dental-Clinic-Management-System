package com.dentaflow.backend.strategy.appointment;

import com.dentaflow.backend.entity.Appointment;
import com.dentaflow.backend.entity.Dentist;
import com.dentaflow.backend.entity.Notification;
import com.dentaflow.backend.entity.Patient;
import com.dentaflow.backend.service.EmailService;
import com.dentaflow.backend.service.NotificationService;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Concrete Strategy for RESCHEDULED appointments.
 * Encapsulates date/time mutation, reminder reset, and multi-channel reschedule alerts.
 */
@Component
public class RescheduledAppointmentStrategy extends AbstractAppointmentStrategy {

    private final EmailService emailService;
    private final NotificationService notificationService;

    public RescheduledAppointmentStrategy(EmailService emailService, NotificationService notificationService) {
        this.emailService = emailService;
        this.notificationService = notificationService;
    }

    @Override
    public String getTargetStatus() {
        return "RESCHEDULED";
    }

    @Override
    public List<String> getAllowedSourceStatuses() {
        return Arrays.asList("BOOKED", "CONFIRMED", "PENDING", "RESCHEDULED", "WAITING");
    }

    @Override
    public String getDescription() {
        return "Applies new consultation time slot, resets appointment reminders, and dispatches reschedule alerts.";
    }

    @Override
    public void validateTransition(Appointment appointment) {
        if (appointment == null) {
            throw new IllegalArgumentException("Appointment cannot be null");
        }
        String current = appointment.getStatus() != null ? appointment.getStatus().toUpperCase() : "PENDING";
        if ("COMPLETED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Completed appointment cannot be rescheduled");
        }
        if ("CANCELLED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Cancelled appointment cannot be rescheduled");
        }
        super.validateTransition(appointment);
    }

    @Override
    protected void applyStateEffects(Appointment appointment, Map<String, Object> context) {
        if (context != null) {
            if (context.get("newDate") instanceof LocalDate) {
                appointment.setAppointmentDate((LocalDate) context.get("newDate"));
            }
            if (context.get("newStartTime") instanceof LocalTime) {
                appointment.setStartTime((LocalTime) context.get("newStartTime"));
            }
            if (context.get("newEndTime") instanceof LocalTime) {
                appointment.setEndTime((LocalTime) context.get("newEndTime"));
            }
        }

        // Rescheduled appointment requires reminder reset
        appointment.setReminderSent(false);

        try {
            Patient patient = appointment.getPatient();
            Dentist dentist = appointment.getDentist();
            String pEmail = (patient != null && patient.getUser() != null && patient.getUser().getEmail() != null)
                    ? patient.getUser().getEmail() : (patient != null ? patient.getEmail() : null);
            String pName = patient != null ? (patient.getFirstName() + " " + (patient.getLastName() != null ? patient.getLastName() : "")).trim() : "Patient";
            String dName = dentist != null ? ("Dr. " + dentist.getFirstName() + " " + (dentist.getLastName() != null ? dentist.getLastName() : "")).trim() : "Dentist";

            if (pEmail != null && !pEmail.isEmpty() && emailService != null) {
                emailService.sendAppointmentRescheduled(
                        pEmail,
                        pName,
                        dName,
                        String.valueOf(appointment.getAppointmentDate()),
                        String.valueOf(appointment.getStartTime()),
                        appointment.getAppointmentCode()
                );
            }

            if (patient != null && patient.getUser() != null && notificationService != null) {
                Notification notif = new Notification();
                notif.setTitle("Appointment Rescheduled");
                notif.setMessage("Your consultation with " + dName + " has been rescheduled to "
                        + appointment.getAppointmentDate() + " at " + appointment.getStartTime()
                        + " (" + appointment.getAppointmentCode() + ").");
                notif.setType("APPOINTMENT");
                notif.setReferenceType("APPOINTMENT");
                notif.setReferenceId(appointment.getId());
                notificationService.createNotification(notif, patient.getUser().getId());
            }
        } catch (Exception ex) {
            System.err.println("Notice: RescheduledAppointmentStrategy notification failed: " + ex.getMessage());
        }
    }
}
