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
 * Concrete Strategy for IN_CONSULTATION appointments (In Dental Chair).
 * Triggered when doctor clicks 'Start Consult' or calls patient to chair.
 */
@Component
public class InConsultationAppointmentStrategy extends AbstractAppointmentStrategy {

    private final NotificationService notificationService;

    public InConsultationAppointmentStrategy(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @Override
    public String getTargetStatus() {
        return "IN_CONSULTATION";
    }

    @Override
    public List<String> getAllowedSourceStatuses() {
        return Arrays.asList("WAITING", "CONFIRMED", "BOOKED", "PENDING");
    }

    @Override
    public String getDescription() {
        return "Transitions appointment into active clinical consultation chair-side, updating operatory occupancy.";
    }

    @Override
    public void validateTransition(Appointment appointment) {
        if (appointment == null) {
            throw new IllegalArgumentException("Appointment cannot be null");
        }
        String current = appointment.getStatus() != null ? appointment.getStatus().toUpperCase() : "PENDING";
        if ("COMPLETED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Completed appointment cannot be restarted into consultation");
        }
        if ("CANCELLED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Cancelled appointment cannot be started");
        }
        if ("NO_SHOW".equalsIgnoreCase(current)) {
            throw new RuntimeException("No-show appointment cannot be started");
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
                    : "Attending Dentist";

            if (context != null && context.get("notes") != null) {
                String existing = appointment.getNotes() != null ? appointment.getNotes() + " | " : "";
                appointment.setNotes(existing + context.get("notes"));
            }

            if (patient != null && patient.getUser() != null && notificationService != null) {
                Notification notif = new Notification();
                notif.setTitle("Consultation Commenced");
                notif.setMessage("Your consultation with " + docName + " has commenced in the operatory chair ("
                        + appointment.getAppointmentCode() + ").");
                notif.setType("APPOINTMENT");
                notif.setReferenceType("APPOINTMENT");
                notif.setReferenceId(appointment.getId());
                notificationService.createNotification(notif, patient.getUser().getId());
            }
        } catch (Exception ex) {
            System.err.println("Notice: InConsultationAppointmentStrategy notification failed: " + ex.getMessage());
        }
    }
}
