package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.DrugInteraction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DrugInteractionRepository
        extends JpaRepository<DrugInteraction, Long> {

    // Find interactions involving a specific medicine
    List<DrugInteraction> findByMedicineOneIdOrMedicineTwoId(
            Long medicineOneId,
            Long medicineTwoId
    );

    // Find interaction between two specific medicines
    List<DrugInteraction> findByMedicineOneIdAndMedicineTwoId(
            Long medicineOneId,
            Long medicineTwoId
    );

    // Find interactions by severity
    List<DrugInteraction> findBySeverityIgnoreCase(
            String severity
    );

    // Find active interactions
    List<DrugInteraction> findByStatusIgnoreCase(
            String status
    );

    // Find active interactions involving a medicine
    List<DrugInteraction> findByMedicineOneIdAndStatusIgnoreCaseOrMedicineTwoIdAndStatusIgnoreCase(
            Long medicineOneId,
            String statusOne,
            Long medicineTwoId,
            String statusTwo
    );
}