package com.dentaflow.backend.strategy.treatment;

import com.dentaflow.backend.entity.Treatment;

import java.util.List;
import java.util.Map;

/**
 * Strategy interface defining the contract for clinical Treatment lifecycle state transitions.
 * Part of the Strategy Design Pattern for the DentaFlow treatment module.
 */
public interface TreatmentStrategy {

    /**
     * Target clinical treatment status this strategy handles (e.g. PLANNED, IN_PROGRESS, COMPLETED, CANCELLED).
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
     * Validates transition pre-conditions against clinical invariants.
     * Throws an exception if transition is illegal.
     *
     * @param treatment the target treatment entity
     */
    void validateTransition(Treatment treatment);

    /**
     * Executes the status transition and applies clinical side-effects (e.g. cost calculation, timestamps).
     *
     * @param treatment the treatment entity to mutate
     * @param context   contextual parameters for the transition
     */
    void execute(Treatment treatment, Map<String, Object> context);
}
