package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    // Find payment by unique reference
    Optional<Payment> findByPaymentReference(String paymentReference);

    // Check payment reference
    boolean existsByPaymentReference(String paymentReference);

    // Get all payments for a bill
    List<Payment> findByBillIdOrderByPaymentDateDesc(Long billId);

    // Get payments by status
    List<Payment> findByStatusIgnoreCaseOrderByPaymentDateDesc(
            String status
    );

    // Get payments by method
    List<Payment> findByPaymentMethodIgnoreCaseOrderByPaymentDateDesc(
            String paymentMethod
    );

    // Get payments between two dates
    List<Payment> findByPaymentDateBetweenOrderByPaymentDateDesc(
            LocalDateTime startDate,
            LocalDateTime endDate
    );

    // Get successful payments for a bill
    List<Payment> findByBillIdAndStatusIgnoreCaseOrderByPaymentDateDesc(
            Long billId,
            String status
    );

    // Find payment by transaction ID
    Optional<Payment> findByTransactionId(String transactionId);

    // Check transaction ID
    boolean existsByTransactionId(String transactionId);

    boolean existsByBillId(Long billId);

    List<Payment> findByBillPatientIdOrderByPaymentDateDesc(Long patientId);
}