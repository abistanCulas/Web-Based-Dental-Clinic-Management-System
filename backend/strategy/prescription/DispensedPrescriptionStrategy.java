package com.dentaflow.backend.strategy.prescription;

import com.dentaflow.backend.entity.Medicine;
import com.dentaflow.backend.entity.Prescription;
import com.dentaflow.backend.entity.PrescriptionItem;
import com.dentaflow.backend.repository.MedicineRepository;
import com.dentaflow.backend.repository.PrescriptionItemRepository;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * Concrete Strategy for DISPENSED prescriptions.
 * Encapsulates validation of medicine shelf-life and stock quantities,
 * and performs atomic inventory stock deductions.
 */
@Component
public class DispensedPrescriptionStrategy extends AbstractPrescriptionStrategy {

    private final PrescriptionItemRepository prescriptionItemRepository;
    private final MedicineRepository medicineRepository;

    public DispensedPrescriptionStrategy(
            PrescriptionItemRepository prescriptionItemRepository,
            MedicineRepository medicineRepository) {
        this.prescriptionItemRepository = prescriptionItemRepository;
        this.medicineRepository = medicineRepository;
    }

    @Override
    public String getTargetStatus() {
        return "DISPENSED";
    }

    @Override
    public List<String> getAllowedSourceStatuses() {
        return Arrays.asList("ACTIVE", "VERIFIED", "DISPENSED");
    }

    @Override
    public String getDescription() {
        return "Verifies medicine shelf-life and stock quantities, deducts pharmacy inventory, and completes dispensing.";
    }

    @Override
    public void validateTransition(Prescription prescription) {
        if (prescription == null) {
            throw new IllegalArgumentException("Prescription cannot be null");
        }
        String current = prescription.getStatus() != null ? prescription.getStatus().toUpperCase() : "ACTIVE";
        if ("CANCELLED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Cannot dispense a cancelled prescription");
        }
        if ("DISPENSED".equalsIgnoreCase(current) || "COMPLETED".equalsIgnoreCase(current)) {
            throw new RuntimeException("Prescription is already dispensed / completed");
        }

        // Validate items, medicine active status, expiration date, and stock level
        if (prescription.getId() != null && prescriptionItemRepository != null) {
            List<PrescriptionItem> items = prescriptionItemRepository.findByPrescriptionId(prescription.getId());
            if (items != null) {
                for (PrescriptionItem item : items) {
                    Medicine medicine = item.getMedicine();
                    if (medicine == null) continue;

                    if (!"ACTIVE".equalsIgnoreCase(medicine.getStatus())) {
                        throw new RuntimeException(
                                "Cannot dispense inactive medicine: " + medicine.getName()
                        );
                    }

                    if (medicine.getExpiryDate() != null && medicine.getExpiryDate().isBefore(LocalDate.now())) {
                        throw new RuntimeException(
                                "Cannot dispense expired medicine: " + medicine.getName() + " (Expired on " + medicine.getExpiryDate() + ")"
                        );
                    }

                    int currentStock = medicine.getStockQuantity() != null ? medicine.getStockQuantity() : 0;
                    int reqQty = item.getQuantity() != null ? item.getQuantity() : 1;

                    if (reqQty > currentStock) {
                        throw new RuntimeException(
                                "Cannot dispense prescription: Insufficient stock for medicine: " + medicine.getName()
                                        + " (Available: " + currentStock + ", Required: " + reqQty + ")"
                        );
                    }
                }
            }
        }

        super.validateTransition(prescription);
    }

    @Override
    protected void applyStateEffects(Prescription prescription, Map<String, Object> context) {
        // Perform atomic inventory stock deductions
        if (prescription.getId() != null && prescriptionItemRepository != null && medicineRepository != null) {
            List<PrescriptionItem> items = prescriptionItemRepository.findByPrescriptionId(prescription.getId());
            if (items != null) {
                for (PrescriptionItem item : items) {
                    Medicine medicine = item.getMedicine();
                    if (medicine == null) continue;

                    int currentStock = medicine.getStockQuantity() != null ? medicine.getStockQuantity() : 0;
                    int reqQty = item.getQuantity() != null ? item.getQuantity() : 1;
                    medicine.setStockQuantity(Math.max(0, currentStock - reqQty));
                    medicineRepository.save(medicine);
                }
            }
        }

        if (context != null && context.get("notes") != null) {
            String existing = prescription.getDentistNotes() != null ? prescription.getDentistNotes() + " | " : "";
            prescription.setDentistNotes(existing + context.get("notes"));
        }
    }
}
