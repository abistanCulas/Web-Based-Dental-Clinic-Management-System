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
 * Concrete Strategy for CONFIRMED appointments.
 * Encapsulates validation and side-effects for confirmed appointments.
 */
@Component
public class ConfirmedAppointmentStrategy extends AbstractAppointmentStrategy {

    private final NotificationService notificationService;

    public ConfirmedAppointmentStrategy(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @Override
    public String getTargetStatus() {
        return "CONFIRMED";
    }

    @Override
    public List<String> getAllowedSourceStatuses() {
        return Arrays.asList("PENDING", "BOOKED", "RESCHEDULED");
    }

    @Override
    public String getDescription() {
        return "Validates appointment confirmation, locks schedule slot, and notifies patient of confirmed booking.";
    }

    @Override
    public void validateTransition(Appointment appointment) {
        if (appointment == null) {
            throw new IllegalArgumentException("Appointment cannot be null");
        }
        String current = appointment.getStatus() != null ? appointment.getStatus().toUpperCase() : "PENDING";
        if ("CANCELLED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Cancelled appointment cannot be confirmed");
        }
        if ("COMPLETED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Completed appointment cannot be confirmed");
        }
        if ("NO_SHOW".equalsIgnoreCase(current)) {
            throw new RuntimeException("No-show appointment cannot be confirmed");
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
                    : "Assigned Dentist";

            if (patient != null && patient.getUser() != null && notificationService != null) {
                Notification notif = new Notification();
                notif.setTitle("Appointment Confirmed");
                notif.setMessage("Your dental consultation with " + docName + " on "
                        + appointment.getAppointmentDate() + " at " + appointment.getStartTime()
                        + " is confirmed (Ref: " + appointment.getAppointmentCode() + ").");
                notif.setType("APPOINTMENT");
                notif.setReferenceType("APPOINTMENT");
                notif.setReferenceId(appointment.getId());
                notificationService.createNotification(notif, patient.getUser().getId());
            }
        } catch (Exception ex) {
            System.err.println("Notice: ConfirmedAppointmentStrategy notification failed: " + ex.getMessage());
        }
    }
}
