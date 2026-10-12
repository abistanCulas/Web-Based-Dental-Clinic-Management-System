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
 * Concrete Strategy for COMPLETED appointments.
 * Triggered when doctor completes consultation or finishes chair visit.
 */
@Component
public class CompletedAppointmentStrategy extends AbstractAppointmentStrategy {

    private final NotificationService notificationService;

    public CompletedAppointmentStrategy(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @Override
    public String getTargetStatus() {
        return "COMPLETED";
    }

    @Override
    public List<String> getAllowedSourceStatuses() {
        return Arrays.asList("IN_CONSULTATION", "WAITING", "CONFIRMED", "BOOKED", "PENDING");
    }

    @Override
    public String getDescription() {
        return "Finalizes consultation, releases operatory dental chair, and dispatches billing and patient departure alerts.";
    }

    @Override
    public void validateTransition(Appointment appointment) {
        if (appointment == null) {
            throw new IllegalArgumentException("Appointment cannot be null");
        }
        String current = appointment.getStatus() != null ? appointment.getStatus().toUpperCase() : "PENDING";
        if ("CANCELLED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Cancelled appointment cannot be completed");
        }
        if ("NO_SHOW".equalsIgnoreCase(current)) {
            throw new RuntimeException("No-show appointment cannot be completed");
        }
        super.validateTransition(appointment);
    }

    @Override
    protected void applyStateEffects(Appointment appointment, Map<String, Object> context) {
        try {
            Patient patient = appointment.getPatient();
            Dentist dentist = appointment.getDentist();
            String docName = dentist != null
                    ? ("Dr. " + (dentist.getFirstName() != null ? dentist.getFirstName() : "") + " " + (dentist.getLastName() != null ? dentist.getLastName() : "")).trim()
                    : "Doctor";

            if (patient != null && patient.getUser() != null && notificationService != null) {
                Notification notif = new Notification();
                notif.setTitle("Consultation Completed");
                notif.setMessage("Your consultation with " + docName + " ("
                        + appointment.getAppointmentCode() + ") is completed. Please proceed to Billing for checkout.");
                notif.setType("APPOINTMENT");
                notif.setReferenceType("APPOINTMENT");
                notif.setReferenceId(appointment.getId());
                notificationService.createNotification(notif, patient.getUser().getId());
            }
        } catch (Exception ex) {
            System.err.println("Notice: CompletedAppointmentStrategy notification failed: " + ex.getMessage());
        }
    }
}
