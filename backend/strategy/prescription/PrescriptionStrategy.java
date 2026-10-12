package com.dentaflow.backend.strategy.prescription;

import com.dentaflow.backend.entity.Prescription;

import java.util.List;
import java.util.Map;

/**
 * Strategy interface defining the contract for clinical Prescription lifecycle state transitions.
 * Part of the Strategy Design Pattern for the DentaFlow prescription / pharmacy module.
 */
public interface PrescriptionStrategy {

    /**
     * Target prescription status this strategy handles (e.g. ACTIVE, VERIFIED, DISPENSED, CANCELLED).
     *
     * @return uppercase status string
     */
    String getTargetStatus();

    /**
     * Returns valid source statuses from which a transition to the target status is permitted.
     *
     * @return list of permitted origin statuses
     */
    List<String> getAllowedSourceStatuses();

    /**
     * Human-readable description of this strategy's domain role and clinical invariants.
     *
     * @return strategy summary
     */
    String getDescription();

    /**
     * Determines whether this strategy handles the given target status.
     *
     * @param targetStatus the desired status
     * @return true if this strategy is responsible
     */
    default boolean canHandle(String targetStatus) {
        return targetStatus != null && targetStatus.equalsIgnoreCase(getTargetStatus());
    }

    /**
     * Validates transition pre-conditions against clinical and inventory invariants.
     * Throws an exception if transition is illegal.
     *
     * @param prescription the target prescription entity
     */
    void validateTransition(Prescription prescription);

    /**
     * Executes the status transition and applies clinical side-effects (e.g. medicine inventory stock deduction).
     *
     * @param prescription the prescription entity to mutate
     * @param context      contextual parameters for the transition
     */
    void execute(Prescription prescription, Map<String, Object> context);
}
