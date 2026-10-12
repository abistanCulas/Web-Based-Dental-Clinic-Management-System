package com.dentaflow.backend.strategy.appointment;

import com.dentaflow.backend.entity.Appointment;

import java.util.List;
import java.util.Map;

/**
 * Base abstract class providing reusable transition validation logic
 * for concrete AppointmentStrategy implementations.
 */
public abstract class AbstractAppointmentStrategy implements AppointmentStrategy {

    @Override
    public void validateTransition(Appointment appointment) {
        if (appointment == null) {
            throw new IllegalArgumentException("Appointment cannot be null for status transition");
        }

        String currentStatus = appointment.getStatus() != null
                ? appointment.getStatus().trim().toUpperCase()
                : "PENDING";

        // Idempotent transition to the same status is accepted
        if (currentStatus.equalsIgnoreCase(getTargetStatus())) {
            return;
        }

        List<String> allowedSources = getAllowedSourceStatuses();
        if (allowedSources != null && !allowedSources.isEmpty() && !allowedSources.contains(currentStatus)) {
            String apptIdentifier = appointment.getAppointmentCode() != null
                    ? appointment.getAppointmentCode()
                    : ("#" + appointment.getId());

            throw new IllegalStateException(
                    String.format(
                            "Invalid transition: Cannot transition appointment %s from %s to %s. Allowed previous states: %s",
                            apptIdentifier,
                            currentStatus,
                            getTargetStatus(),
                            allowedSources
                    )
            );
        }
    }

    @Override
    public void execute(Appointment appointment, Map<String, Object> context) {
        if (appointment == null) {
            throw new IllegalArgumentException("Appointment cannot be null");
        }
        appointment.setStatus(getTargetStatus());
        applyStateEffects(appointment, context);
    }

    /**
     * Hook method for concrete strategies to implement state-specific side effects.
     *
     * @param appointment target appointment
     * @param context     contextual transition parameters
     */
    protected abstract void applyStateEffects(Appointment appointment, Map<String, Object> context);
}
