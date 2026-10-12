package com.dentaflow.backend.strategy.payment;

import com.dentaflow.backend.entity.Payment;

import java.util.List;
import java.util.Map;

/**
 * Strategy interface defining the contract for financial Payment lifecycle state transitions.
 * Part of the Strategy Design Pattern for the DentaFlow billing / payment module.
 */
public interface PaymentStrategy {

    /**
     * Target payment status this strategy handles (e.g. PENDING, SUCCESS, FAILED, CANCELLED, REFUNDED).
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
     * Human-readable description of this strategy's domain role and financial invariants.
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
     * Validates transition pre-conditions against financial and ledger invariants.
     * Throws an exception if transition is illegal.
     *
     * @param payment the target payment entity
     */
    void validateTransition(Payment payment);

    /**
     * Overloaded validation method that accepts contextual data (such as refund amounts).
     *
     * @param payment the target payment entity
     * @param context contextual parameters
     */
    default void validateTransition(Payment payment, Map<String, Object> context) {
        validateTransition(payment);
    }

    /**
     * Executes the payment status transition and applies financial side-effects
     * (e.g. updating bill paidAmount, balanceAmount, receipt emails, and in-app alerts).
     *
     * @param payment the payment entity to mutate
     * @param context contextual parameters for the transition
     */
    void execute(Payment payment, Map<String, Object> context);
}
