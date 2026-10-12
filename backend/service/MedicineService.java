package com.dentaflow.backend.service;

import com.dentaflow.backend.entity.Medicine;
import com.dentaflow.backend.repository.MedicineRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@Transactional
public class MedicineService {

    private final MedicineRepository medicineRepository;
    private final com.dentaflow.backend.repository.PrescriptionItemRepository prescriptionItemRepository;

    public MedicineService(
            MedicineRepository medicineRepository,
            com.dentaflow.backend.repository.PrescriptionItemRepository prescriptionItemRepository) {

        this.medicineRepository = medicineRepository;
        this.prescriptionItemRepository = prescriptionItemRepository;
    }

    // =========================================================
    // CREATE MEDICINE
    // =========================================================

    public Medicine createMedicine(Medicine medicine) {

        if (medicine == null) {
            throw new RuntimeException(
                    "Medicine data is required"
            );
        }

        if (medicine.getName() == null ||
                medicine.getName().trim().isEmpty()) {

            throw new RuntimeException(
                    "Medicine name is required"
            );
        }

        if (medicine.getGenericName() == null ||
                medicine.getGenericName().trim().isEmpty()) {

            throw new RuntimeException(
                    "Generic name is required"
            );
        }

        if (medicine.getCategory() == null ||
                medicine.getCategory().trim().isEmpty()) {

            throw new RuntimeException(
                    "Category is required"
            );
        }

        // Generate medicine code automatically
        if (medicine.getMedicineCode() == null ||
                medicine.getMedicineCode().trim().isEmpty()) {

            medicine.setMedicineCode(
                    generateMedicineCode()
            );

        } else {

            String code =
                    medicine.getMedicineCode()
                            .trim()
                            .toUpperCase();

            if (medicineRepository
                    .existsByMedicineCode(code)) {

                throw new RuntimeException(
                        "Medicine code already exists: "
                                + code
                );
            }

            medicine.setMedicineCode(code);
        }

        medicine.setName(
                medicine.getName().trim()
        );

        medicine.setGenericName(
                medicine.getGenericName().trim()
        );

        medicine.setCategory(
                medicine.getCategory().trim()
        );

        if (medicine.getBrandName() != null) {
            medicine.setBrandName(
                    medicine.getBrandName().trim()
            );
        }

        if (medicine.getDosageForm() != null) {
            medicine.setDosageForm(
                    medicine.getDosageForm().trim()
            );
        }

        if (medicine.getStrength() != null) {
            medicine.setStrength(
                    medicine.getStrength().trim()
            );
        }

        if (medicine.getManufacturer() != null) {
            medicine.setManufacturer(
                    medicine.getManufacturer().trim()
            );
        }

        if (medicine.getAllergyWarning() != null) {
            medicine.setAllergyWarning(
                    medicine.getAllergyWarning().trim()
            );
        }

        if (medicine.getInteractionInformation() != null) {
            medicine.setInteractionInformation(
                    medicine.getInteractionInformation().trim()
            );
        }

        if (medicine.getStatus() == null ||
                medicine.getStatus().trim().isEmpty()) {

            medicine.setStatus("ACTIVE");

        } else {

            medicine.setStatus(
                    medicine.getStatus()
                            .trim()
                            .toUpperCase()
            );
        }

        if (medicine.getStockQuantity() == null) {
            medicine.setStockQuantity(0);
        }

        if (medicine.getReorderLevel() == null) {
            medicine.setReorderLevel(10);
        }

        if (medicine.getUnitPrice() == null) {
            medicine.setUnitPrice(
                    java.math.BigDecimal.ZERO
            );
        }

        validateStock(
                medicine.getStockQuantity()
        );

        validateReorderLevel(
                medicine.getReorderLevel()
        );

        validateUnitPrice(
                medicine.getUnitPrice()
        );

        if (medicine.getExpiryDate() == null) {
            throw new RuntimeException(
                    "Expiry date is required"
            );
        }

        validateExpiryDate(
                medicine.getExpiryDate()
        );

        return medicineRepository.save(medicine);
    }

    // =========================================================
    // GENERATE MEDICINE CODE
    // =========================================================

    private String generateMedicineCode() {

        long nextNumber =
                medicineRepository.count() + 1;

        String code;

        do {

            code = String.format(
                    "MED%05d",
                    nextNumber
            );

            nextNumber++;

        } while (
                medicineRepository
                        .existsByMedicineCode(code)
        );

        return code;
    }

    // =========================================================
    // GET ALL MEDICINES
    // =========================================================

    @Transactional(readOnly = true)
    public List<Medicine> getAllMedicines() {

        return medicineRepository.findAll();
    }

    // =========================================================
    // GET MEDICINE BY ID
    // =========================================================

    @Transactional(readOnly = true)
    public Medicine getMedicineById(Long id) {

        if (id == null) {
            throw new RuntimeException(
                    "Medicine ID is required"
            );
        }

        return medicineRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Medicine not found with id: "
                                        + id
                        ));
    }

    // =========================================================
    // GET MEDICINE BY CODE
    // =========================================================

    @Transactional(readOnly = true)
    public Medicine getMedicineByCode(
            String medicineCode) {

        if (medicineCode == null ||
                medicineCode.trim().isEmpty()) {

            throw new RuntimeException(
                    "Medicine code is required"
            );
        }

        return medicineRepository
                .findByMedicineCode(
                        medicineCode
                                .trim()
                                .toUpperCase()
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "Medicine not found: "
                                        + medicineCode
                        ));
    }

    // =========================================================
    // SEARCH BY NAME
    // =========================================================

    @Transactional(readOnly = true)
    public List<Medicine> searchByName(
            String name) {

        if (name == null ||
                name.trim().isEmpty()) {

            return medicineRepository.findAll();
        }

        return medicineRepository
                .findByNameContainingIgnoreCase(
                        name.trim()
                );
    }

    // =========================================================
    // SEARCH BY GENERIC NAME
    // =========================================================

    @Transactional(readOnly = true)
    public List<Medicine> searchByGenericName(
            String genericName) {

        if (genericName == null ||
                genericName.trim().isEmpty()) {

            return medicineRepository.findAll();
        }

        return medicineRepository
                .findByGenericNameContainingIgnoreCase(
                        genericName.trim()
                );
    }

    // =========================================================
    // SEARCH MEDICINES
    // =========================================================

    @Transactional(readOnly = true)
    public List<Medicine> searchMedicines(
            String keyword) {

        if (keyword == null ||
                keyword.trim().isEmpty()) {

            return medicineRepository.findAll();
        }

        String search =
                keyword.trim();

        return medicineRepository
                .findByNameContainingIgnoreCaseOrGenericNameContainingIgnoreCase(
                        search,
                        search
                );
    }

    // =========================================================
    // GET BY CATEGORY
    // =========================================================

    @Transactional(readOnly = true)
    public List<Medicine> getByCategory(
            String category) {

        if (category == null ||
                category.trim().isEmpty()) {

            return medicineRepository.findAll();
        }

        return medicineRepository
                .findByCategoryContainingIgnoreCase(
                        category.trim()
                );
    }

    // =========================================================
    // GET ACTIVE MEDICINES
    // =========================================================

    @Transactional(readOnly = true)
    public List<Medicine> getActiveMedicines() {

        return medicineRepository
                .findByStatusIgnoreCase("ACTIVE")
                .stream()
                .filter(medicine ->
                        medicine.getExpiryDate() == null
                                ||
                                !medicine.getExpiryDate()
                                        .isBefore(LocalDate.now())
                )
                .toList();
    }

    // =========================================================
    // GET LOW STOCK MEDICINES
    // =========================================================

    @Transactional(readOnly = true)
    public List<Medicine> getLowStockMedicines() {

        List<Medicine> medicines =
                medicineRepository.findAll();

        return medicines.stream()
                .filter(medicine ->
                        medicine.getStockQuantity() != null
                                &&
                                medicine.getReorderLevel() != null
                                &&
                                medicine.getStockQuantity()
                                        <= medicine.getReorderLevel()
                )
                .toList();
    }

    // =========================================================
    // GET EXPIRED MEDICINES
    // =========================================================

    @Transactional(readOnly = true)
    public List<Medicine> getExpiredMedicines() {

        return medicineRepository
                .findByExpiryDateBefore(
                        LocalDate.now()
                );
    }

    // =========================================================
    // GET ACTIVE EXPIRED MEDICINES
    // =========================================================

    @Transactional(readOnly = true)
    public List<Medicine> getActiveExpiredMedicines() {

        return medicineRepository
                .findByStatusIgnoreCaseAndExpiryDateBefore(
                        "ACTIVE",
                        LocalDate.now()
                );
    }

    // =========================================================
    // GET MEDICINES EXPIRING SOON
    //
    // Default: next 30 days
    // =========================================================

    @Transactional(readOnly = true)
    public List<Medicine> getMedicinesExpiringSoon() {

        LocalDate today =
                LocalDate.now();

        LocalDate futureDate =
                today.plusDays(30);

        return medicineRepository
                .findByStatusIgnoreCaseAndExpiryDateBetween(
                        "ACTIVE",
                        today,
                        futureDate
                );
    }

    // =========================================================
    // GET MEDICINES EXPIRING BETWEEN DATES
    // =========================================================

    @Transactional(readOnly = true)
    public List<Medicine> getMedicinesExpiringBetween(
            LocalDate startDate,
            LocalDate endDate) {

        if (startDate == null ||
                endDate == null) {

            throw new RuntimeException(
                    "Start date and end date are required"
            );
        }

        if (endDate.isBefore(startDate)) {

            throw new RuntimeException(
                    "End date cannot be before start date"
            );
        }

        return medicineRepository
                .findByExpiryDateBetween(
                        startDate,
                        endDate
                );
    }

    // =========================================================
    // UPDATE MEDICINE
    // =========================================================

    public Medicine updateMedicine(
            Long id,
            Medicine updatedMedicine) {

        Medicine existing =
                getMedicineById(id);

        if (updatedMedicine == null) {

            throw new RuntimeException(
                    "Medicine data is required"
            );
        }

        if (updatedMedicine.getName() != null) {
            if (updatedMedicine.getName().trim().isEmpty()) {
                throw new RuntimeException(
                        "Medicine name cannot be empty"
                );
            }
            existing.setName(
                    updatedMedicine.getName().trim()
            );
        }

        if (updatedMedicine.getGenericName() != null) {
            if (updatedMedicine.getGenericName().trim().isEmpty()) {
                throw new RuntimeException(
                        "Generic name cannot be empty"
                );
            }
            existing.setGenericName(
                    updatedMedicine
                            .getGenericName()
                            .trim()
            );
        }

        if (updatedMedicine.getBrandName() != null) {

            existing.setBrandName(
                    updatedMedicine
                            .getBrandName()
                            .trim()
            );
        }

        if (updatedMedicine.getCategory() != null) {
            if (updatedMedicine.getCategory().trim().isEmpty()) {
                throw new RuntimeException(
                        "Category cannot be empty"
                );
            }
            existing.setCategory(
                    updatedMedicine
                            .getCategory()
                            .trim()
            );
        }

        if (updatedMedicine.getDosageForm() != null) {

            existing.setDosageForm(
                    updatedMedicine
                            .getDosageForm()
                            .trim()
            );
        }

        if (updatedMedicine.getStrength() != null) {

            existing.setStrength(
                    updatedMedicine
                            .getStrength()
                            .trim()
            );
        }

        if (updatedMedicine.getManufacturer() != null) {

            existing.setManufacturer(
                    updatedMedicine
                            .getManufacturer()
                            .trim()
            );
        }

        if (updatedMedicine.getAllergyWarning() != null) {

            existing.setAllergyWarning(
                    updatedMedicine
                            .getAllergyWarning()
                            .trim()
            );
        }

        if (updatedMedicine
                .getInteractionInformation() != null) {

            existing.setInteractionInformation(
                    updatedMedicine
                            .getInteractionInformation()
                            .trim()
            );
        }

        if (updatedMedicine.getStockQuantity() != null) {

            validateStock(
                    updatedMedicine
                            .getStockQuantity()
            );

            existing.setStockQuantity(
                    updatedMedicine
                            .getStockQuantity()
            );
        }

        if (updatedMedicine.getReorderLevel() != null) {

            validateReorderLevel(
                    updatedMedicine
                            .getReorderLevel()
            );

            existing.setReorderLevel(
                    updatedMedicine
                            .getReorderLevel()
            );
        }

        if (updatedMedicine.getUnitPrice() != null) {

            validateUnitPrice(
                    updatedMedicine.getUnitPrice()
            );

            existing.setUnitPrice(
                    updatedMedicine.getUnitPrice()
            );
        }

        if (updatedMedicine.getExpiryDate() != null) {

            validateExpiryDate(
                    updatedMedicine.getExpiryDate()
            );

            existing.setExpiryDate(
                    updatedMedicine.getExpiryDate()
            );
        }

        if (updatedMedicine.getStatus() != null) {

            existing.setStatus(
                    updatedMedicine
                            .getStatus()
                            .trim()
                            .toUpperCase()
            );
        }

        return medicineRepository.save(existing);
    }

    // =========================================================
    // ADD STOCK
    // =========================================================

    public Medicine addStock(
            Long id,
            Integer quantity) {

        if (quantity == null ||
                quantity <= 0) {

            throw new RuntimeException(
                    "Stock quantity must be greater than zero"
            );
        }

        Medicine medicine =
                getMedicineById(id);

        if (isExpired(medicine)) {

            throw new RuntimeException(
                    "Cannot add stock to an expired medicine: "
                            + medicine.getName()
            );
        }

        int currentStock =
                medicine.getStockQuantity() != null
                        ? medicine.getStockQuantity()
                        : 0;

        medicine.setStockQuantity(
                currentStock + quantity
        );

        return medicineRepository.save(
                medicine
        );
    }

    // =========================================================
    // REMOVE STOCK
    // =========================================================

    public Medicine removeStock(
            Long id,
            Integer quantity) {

        if (quantity == null ||
                quantity <= 0) {

            throw new RuntimeException(
                    "Stock quantity must be greater than zero"
            );
        }

        Medicine medicine =
                getMedicineById(id);

        int currentStock =
                medicine.getStockQuantity() != null
                        ? medicine.getStockQuantity()
                        : 0;

        if (isExpired(medicine)) {

            throw new RuntimeException(
                    "Cannot dispense expired medicine: "
                            + medicine.getName()
            );
        }

        if (!"ACTIVE".equalsIgnoreCase(
                medicine.getStatus())) {

            throw new RuntimeException(
                    "Cannot dispense inactive medicine: "
                            + medicine.getName()
            );
        }

        if (quantity > currentStock) {

            throw new RuntimeException(
                    "Insufficient stock for medicine: "
                            + medicine.getName()
            );
        }

        medicine.setStockQuantity(
                currentStock - quantity
        );

        return medicineRepository.save(
                medicine
        );
    }

    // =========================================================
    // CHECK IF MEDICINE IS EXPIRED
    // =========================================================

    @Transactional(readOnly = true)
    public boolean isExpired(
            Medicine medicine) {

        return medicine != null
                &&
                medicine.getExpiryDate() != null
                &&
                medicine.getExpiryDate()
                        .isBefore(LocalDate.now());
    }

    // =========================================================
    // ACTIVATE MEDICINE
    // =========================================================

    public Medicine activateMedicine(Long id) {

        Medicine medicine =
                getMedicineById(id);

        if (isExpired(medicine)) {

            throw new RuntimeException(
                    "Cannot activate an expired medicine: "
                            + medicine.getName()
            );
        }

        medicine.setStatus("ACTIVE");

        return medicineRepository.save(
                medicine
        );
    }

    // =========================================================
    // DEACTIVATE MEDICINE
    // =========================================================

    public Medicine deactivateMedicine(Long id) {

        Medicine medicine =
                getMedicineById(id);

        medicine.setStatus("INACTIVE");

        return medicineRepository.save(
                medicine
        );
    }

    // =========================================================
    // DELETE MEDICINE
    // =========================================================

    public void deleteMedicine(Long id) {

        Medicine medicine =
                getMedicineById(id);

        if (!prescriptionItemRepository.findByMedicineId(id).isEmpty()) {
            throw new RuntimeException(
                    "Cannot delete medicine: referenced in existing clinical prescriptions"
            );
        }

        medicineRepository.delete(
                medicine
        );
    }

    // =========================================================
    // VALIDATE STOCK
    // =========================================================

    private void validateStock(
            Integer stock) {

        if (stock == null ||
                stock < 0) {

            throw new RuntimeException(
                    "Stock quantity cannot be negative"
            );
        }
    }

    // =========================================================
    // VALIDATE REORDER LEVEL
    // =========================================================

    private void validateReorderLevel(
            Integer reorderLevel) {

        if (reorderLevel == null ||
                reorderLevel < 0) {

            throw new RuntimeException(
                    "Reorder level cannot be negative"
            );
        }
    }

    // =========================================================
    // VALIDATE UNIT PRICE
    // =========================================================

    private void validateUnitPrice(
            java.math.BigDecimal unitPrice) {

        if (unitPrice == null ||
                unitPrice.signum() < 0) {

            throw new RuntimeException(
                    "Unit price cannot be negative"
            );
        }
    }

    // =========================================================
    // VALIDATE EXPIRY DATE
    // =========================================================

    private void validateExpiryDate(
            LocalDate expiryDate) {

        if (expiryDate != null &&
                expiryDate.isBefore(LocalDate.now())) {

            throw new RuntimeException(
                    "Expiry date cannot be in the past"
            );
        }
    }
}