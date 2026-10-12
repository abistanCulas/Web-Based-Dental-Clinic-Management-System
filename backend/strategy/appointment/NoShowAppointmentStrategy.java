package com.dentaflow.backend.strategy.appointment;

import com.dentaflow.backend.entity.Appointment;
import com.dentaflow.backend.entity.Dentist;
import com.dentaflow.backend.entity.Notification;
import com.dentaflow.backend.entity.Patient;
import com.dentaflow.backend.service.NotificationService;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Concrete Strategy for NO_SHOW appointments.
 * Handles patient absence recording, slot release, and clinic notification.
 */
@Component
public class NoShowAppointmentStrategy extends AbstractAppointmentStrategy {

    private final NotificationService notificationService;

    public NoShowAppointmentStrategy(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @Override
    public String getTargetStatus() {
        return "NO_SHOW";
    }

    @Override
    public List<String> getAllowedSourceStatuses() {
        return Arrays.asList("BOOKED", "CONFIRMED", "RESCHEDULED", "WAITING", "PENDING");
    }

    @Override
    public String getDescription() {
        return "Marks absent patients as NO_SHOW, logs non-attendance, and releases scheduled operatory slot.";
    }

    @Override
    public void validateTransition(Appointment appointment) {
        if (appointment == null) {
            throw new IllegalArgumentException("Appointment cannot be null");
        }
        String current = appointment.getStatus() != null ? appointment.getStatus().toUpperCase() : "PENDING";
        if ("CANCELLED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Cancelled appointment cannot be marked as no-show");
        }
        if ("COMPLETED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Completed appointment cannot be marked as no-show");
        }
        super.validateTransition(appointment);
    }

    @Override
    protected void applyStateEffects(Appointment appointment, Map<String, Object> context) {
        try {
            Patient patient = appointment.getPatient();
            Dentist dentist = appointment.getDentist();
            String patientName = patient != null
                    ? (patient.getFirstName() + " " + (patient.getLastName() != null ? patient.getLastName() : "")).trim()
                    : "Patient";

            if (dentist != null && dentist.getUser() != null && notificationService != null) {
                Notification notif = new Notification();
                notif.setTitle("Appointment Marked No-Show");
                notif.setMessage("Patient " + patientName + " was marked as no-show for appointment "
                        + appointment.getAppointmentCode() + " on " + appointment.getAppointmentDate() + ".");
                notif.setType("APPOINTMENT");
                notif.setReferenceType("APPOINTMENT");
                notif.setReferenceId(appointment.getId());
                notificationService.createNotification(notif, dentist.getUser().getId());
            }
        } catch (Exception ex) {
            System.err.println("Notice: NoShowAppointmentStrategy notification failed: " + ex.getMessage());
        }
    }
}
