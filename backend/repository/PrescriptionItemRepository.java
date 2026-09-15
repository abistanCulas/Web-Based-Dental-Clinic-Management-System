package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.PrescriptionItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PrescriptionItemRepository
        extends JpaRepository<PrescriptionItem, Long> {

    // Get all medicines/items belonging to a prescription
    List<PrescriptionItem> findByPrescriptionId(Long prescriptionId);

    // Get all prescription items for a medicine
    List<PrescriptionItem> findByMedicineId(Long medicineId);

    // Get prescription items for a prescription ordered by ID
    List<PrescriptionItem> findByPrescriptionIdOrderByIdAsc(
            Long prescriptionId
    );

    // Delete all items belonging to a prescription
    void deleteByPrescriptionId(Long prescriptionId);

    // Check whether a medicine is already added to a prescription
    boolean existsByPrescriptionIdAndMedicineId(
            Long prescriptionId,
            Long medicineId
    );
}