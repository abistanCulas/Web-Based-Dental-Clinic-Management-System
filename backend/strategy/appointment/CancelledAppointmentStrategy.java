package com.dentaflow.backend.strategy.appointment;

import com.dentaflow.backend.entity.Appointment;
import com.dentaflow.backend.entity.Dentist;
import com.dentaflow.backend.entity.Notification;
import com.dentaflow.backend.entity.Patient;
import com.dentaflow.backend.service.EmailService;
import com.dentaflow.backend.service.NotificationService;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Concrete Strategy for CANCELLED appointments.
 * Encapsulates the 2-hour cancellation policy, slot release, and multi-channel cancellation notifications.
 */
@Component
public class CancelledAppointmentStrategy extends AbstractAppointmentStrategy {

    private final EmailService emailService;
    private final NotificationService notificationService;

    public CancelledAppointmentStrategy(EmailService emailService, NotificationService notificationService) {
        this.emailService = emailService;
        this.notificationService = notificationService;
    }

    @Override
    public String getTargetStatus() {
        return "CANCELLED";
    }

    @Override
    public List<String> getAllowedSourceStatuses() {
        return Arrays.asList("PENDING", "BOOKED", "CONFIRMED", "RESCHEDULED", "WAITING");
    }

    @Override
    public String getDescription() {
        return "Enforces 2-hour cancellation policy, frees booked time slot, and triggers email and in-app cancellation notices.";
    }

    @Override
    public void validateTransition(Appointment appointment) {
        if (appointment == null) {
            throw new IllegalArgumentException("Appointment cannot be null");
        }
        String current = appointment.getStatus() != null ? appointment.getStatus().toUpperCase() : "PENDING";
        if ("COMPLETED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Completed appointment cannot be cancelled");
        }
        if ("CANCELLED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Appointment is already cancelled");
        }
        if ("NO_SHOW".equalsIgnoreCase(current)) {
            throw new RuntimeException("No-show appointment cannot be cancelled");
        }

        if (appointment.getAppointmentDate() != null && appointment.getStartTime() != null) {
            LocalDateTime appointmentDateTime = LocalDateTime.of(
                    appointment.getAppointmentDate(),
                    appointment.getStartTime()
            );
            LocalDateTime cancellationDeadline = appointmentDateTime.minusHours(2);
            if (!LocalDateTime.now().isBefore(cancellationDeadline)) {
                throw new RuntimeException(
                        "Appointment cannot be cancelled within 2 hours " +
                                "of the appointment time. You may reschedule " +
                                "the appointment, but cancellation/refund is not available."
                );
            }
        }

        super.validateTransition(appointment);
    }

    @Override
    protected void applyStateEffects(Appointment appointment, Map<String, Object> context) {
        if (context != null && context.get("reason") != null) {
            appointment.setReason(String.valueOf(context.get("reason")).trim());
        }

        try {
            Patient patient = appointment.getPatient();
            Dentist dentist = appointment.getDentist();
            String pEmail = (patient != null && patient.getUser() != null && patient.getUser().getEmail() != null)
                    ? patient.getUser().getEmail() : (patient != null ? patient.getEmail() : null);
            String pName = patient != null ? (patient.getFirstName() + " " + (patient.getLastName() != null ? patient.getLastName() : "")).trim() : "Patient";
            String dName = dentist != null ? ("Dr. " + dentist.getFirstName() + " " + (dentist.getLastName() != null ? dentist.getLastName() : "")).trim() : "Dentist";

            if (pEmail != null && !pEmail.isEmpty() && emailService != null) {
                emailService.sendAppointmentCancellation(
                        pEmail,
                        pName,
                        dName,
                        String.valueOf(appointment.getAppointmentDate()),
                        String.valueOf(appointment.getStartTime()),
                        appointment.getAppointmentCode(),
                        appointment.getReason() != null ? appointment.getReason() : "Patient requested cancellation"
                );
            }

            if (patient != null && patient.getUser() != null && notificationService != null) {
                Notification notif = new Notification();
                notif.setTitle("Appointment Cancelled");
                notif.setMessage("Your consultation with " + dName + " scheduled for "
                        + appointment.getAppointmentDate() + " has been cancelled.");
                notif.setType("APPOINTMENT");
                notif.setReferenceType("APPOINTMENT");
                notif.setReferenceId(appointment.getId());
                notificationService.createNotification(notif, patient.getUser().getId());
            }
        } catch (Exception ex) {
            System.err.println("Notice: CancelledAppointmentStrategy notification failed: " + ex.getMessage());
        }
    }
}
