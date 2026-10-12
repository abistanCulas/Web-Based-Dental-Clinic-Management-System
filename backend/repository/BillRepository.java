package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.Bill;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface BillRepository extends JpaRepository<Bill, Long> {

    // Find bill by unique bill number
    Optional<Bill> findByBillNumber(String billNumber);

    // Check whether bill number already exists
    boolean existsByBillNumber(String billNumber);

    // Get all bills of a patient
    List<Bill> findByPatientIdOrderByBillDateDesc(Long patientId);

    // Get bills by status
    List<Bill> findByStatusIgnoreCaseOrderByBillDateDesc(String status);

    // Get bills of a patient by status
    List<Bill> findByPatientIdAndStatusIgnoreCaseOrderByBillDateDesc(
            Long patientId,
            String status
    );

    // Find bills linked to an appointment
    List<Bill> findByAppointmentId(Long appointmentId);

    // Find bills linked to a treatment
    List<Bill> findByTreatmentId(Long treatmentId);

    // Get bills between two dates
    List<Bill> findByBillDateBetweenOrderByBillDateDesc(
            LocalDateTime startDate,
            LocalDateTime endDate
    );

    // Get unpaid / partially paid bills
    List<Bill> findByStatusInOrderByBillDateDesc(
            List<String> statuses
    );

    boolean existsByPatientId(Long patientId);

    boolean existsByTreatmentId(Long treatmentId);

    boolean existsByAppointmentId(Long appointmentId);
}