package com.dentaflow.backend.strategy.appointment;

import com.dentaflow.backend.entity.Appointment;

import java.util.List;
import java.util.Map;

/**
 * Strategy Design Pattern interface for Appointment lifecycle behaviors.
 * <p>
 * Encapsulates status transition validation, lifecycle side-effects,
 * and state-specific business logic for dental consultations.
 */
public interface AppointmentStrategy {

    /**
     * Canonical appointment status managed by this strategy.
     * Examples: CONFIRMED, WAITING, IN_CONSULTATION, COMPLETED, CANCELLED, NO_SHOW, RESCHEDULED
     *
     * @return target status string
     */
    String getTargetStatus();

    /**
     * Determines whether this strategy handles the given status string.
     *
     * @param status status name to check
     * @return true if this strategy matches the status
     */
    default boolean canHandle(String status) {
        return status != null && getTargetStatus().equalsIgnoreCase(status.trim());
    }

    /**
     * Validates whether the given appointment is legally permitted to transition
     * into the target status from its current status.
     *
     * @param appointment target appointment
     * @throws IllegalStateException or RuntimeException if the transition is disallowed
     */
    void validateTransition(Appointment appointment);

    /**
     * Executes the state-specific business rules, side effects (notifications,
     * slot releases, reminders, timestamps), and mutates the appointment status.
     *
     * @param appointment target appointment
     * @param context     contextual parameters (e.g. cancellation reason, reschedule dates)
     */
    void execute(Appointment appointment, Map<String, Object> context);

    /**
     * Returns the list of permitted previous statuses from which this transition is valid.
     *
     * @return list of allowed source statuses
     */
    List<String> getAllowedSourceStatuses();

    /**
     * Human-readable description of this strategy's responsibility in the DentaFlow system.
     *
     * @return strategy description
     */
    String getDescription();
}
