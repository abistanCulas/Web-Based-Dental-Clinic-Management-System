package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.Medicine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface MedicineRepository
        extends JpaRepository<Medicine, Long> {

    // =========================================================
    // FIND BY MEDICINE CODE
    // =========================================================

    Optional<Medicine> findByMedicineCode(
            String medicineCode
    );

    // =========================================================
    // CHECK MEDICINE CODE
    // =========================================================

    boolean existsByMedicineCode(
            String medicineCode
    );

    // =========================================================
    // SEARCH BY NAME
    // =========================================================

    List<Medicine> findByNameContainingIgnoreCase(
            String name
    );

    // =========================================================
    // SEARCH BY GENERIC NAME
    // =========================================================

    List<Medicine> findByGenericNameContainingIgnoreCase(
            String genericName
    );

    // =========================================================
    // FIND BY CATEGORY
    // =========================================================

    List<Medicine> findByCategoryContainingIgnoreCase(
            String category
    );

    // =========================================================
    // FIND BY STATUS
    // =========================================================

    List<Medicine> findByStatusIgnoreCase(
            String status
    );

    // =========================================================
    // FIND MEDICINES WITH STOCK
    // =========================================================

    List<Medicine> findByStockQuantityGreaterThan(
            Integer quantity
    );

    // =========================================================
    // FIND MEDICINES BY BRAND NAME
    // =========================================================

    List<Medicine> findByBrandNameContainingIgnoreCase(
            String brandName
    );

    // =========================================================
    // SEARCH NAME OR GENERIC NAME
    // =========================================================

    List<Medicine>
    findByNameContainingIgnoreCaseOrGenericNameContainingIgnoreCase(
            String name,
            String genericName
    );

    // =========================================================
    // FIND MEDICINES BY EXPIRY DATE
    // =========================================================

    List<Medicine> findByExpiryDateBefore(
            LocalDate date
    );

    // =========================================================
    // FIND MEDICINES EXPIRING ON A SPECIFIC DATE
    // =========================================================

    List<Medicine> findByExpiryDate(
            LocalDate date
    );

    // =========================================================
    // FIND MEDICINES EXPIRING BEFORE OR ON A DATE
    // =========================================================

    List<Medicine> findByExpiryDateLessThanEqual(
            LocalDate date
    );

    // =========================================================
    // FIND MEDICINES EXPIRING BETWEEN TWO DATES
    // =========================================================

    List<Medicine> findByExpiryDateBetween(
            LocalDate startDate,
            LocalDate endDate
    );

    // =========================================================
    // FIND ACTIVE MEDICINES THAT ARE EXPIRED
    // =========================================================

    List<Medicine> findByStatusIgnoreCaseAndExpiryDateBefore(
            String status,
            LocalDate date
    );

    // =========================================================
    // FIND ACTIVE MEDICINES EXPIRING SOON
    // =========================================================

    List<Medicine>
    findByStatusIgnoreCaseAndExpiryDateBetween(
            String status,
            LocalDate startDate,
            LocalDate endDate
    );
}