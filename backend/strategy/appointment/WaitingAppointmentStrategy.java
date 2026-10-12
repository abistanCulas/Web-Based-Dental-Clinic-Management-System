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
 * Concrete Strategy for WAITING appointments (Waiting in Lounge).
 * Triggered upon patient check-in at reception or arrival token generation.
 */
@Component
public class WaitingAppointmentStrategy extends AbstractAppointmentStrategy {

    private final NotificationService notificationService;

    public WaitingAppointmentStrategy(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @Override
    public String getTargetStatus() {
        return "WAITING";
    }

    @Override
    public List<String> getAllowedSourceStatuses() {
        return Arrays.asList("CONFIRMED", "BOOKED", "PENDING", "RESCHEDULED");
    }

    @Override
    public String getDescription() {
        return "Processes patient arrival and reception check-in, places consultation in Waiting Lounge queue, and alerts doctor.";
    }

    @Override
    public void validateTransition(Appointment appointment) {
        if (appointment == null) {
            throw new IllegalArgumentException("Appointment cannot be null");
        }
        String current = appointment.getStatus() != null ? appointment.getStatus().toUpperCase() : "PENDING";
        if ("COMPLETED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Completed appointment cannot be moved to waiting lounge");
        }
        if ("CANCELLED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Cancelled appointment cannot be moved to waiting lounge");
        }
        if ("NO_SHOW".equalsIgnoreCase(current)) {
            throw new RuntimeException("No-show appointment cannot be moved to waiting lounge");
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

            // If check-in note provided, append to appointment notes
            if (context != null && context.get("checkInNotes") != null) {
                String existing = appointment.getNotes() != null ? appointment.getNotes() + " | " : "";
                appointment.setNotes(existing + context.get("checkInNotes"));
            }

            // Notify dentist user that patient is waiting in the lounge
            if (dentist != null && dentist.getUser() != null && notificationService != null) {
                Notification notif = new Notification();
                notif.setTitle("Patient in Waiting Lounge");
                notif.setMessage("Patient " + patientName + " has checked in for consultation ("
                        + appointment.getAppointmentCode() + ") and is currently in the waiting lounge.");
                notif.setType("APPOINTMENT");
                notif.setReferenceType("APPOINTMENT");
                notif.setReferenceId(appointment.getId());
                notificationService.createNotification(notif, dentist.getUser().getId());
            }
        } catch (Exception ex) {
            System.err.println("Notice: WaitingAppointmentStrategy notification failed: " + ex.getMessage());
        }
    }
}
