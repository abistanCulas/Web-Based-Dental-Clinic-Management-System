package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.MedicineDTO;
import com.dentaflow.backend.dto.DrugInteractionDTO;
import com.dentaflow.backend.entity.DrugInteraction;
import com.dentaflow.backend.entity.Medicine;
import com.dentaflow.backend.mapper.MedicineMapper;
import com.dentaflow.backend.security.AccessControlService;
import com.dentaflow.backend.service.MedicineService;
import com.dentaflow.backend.service.DrugInteractionService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/medicines")
@PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'DENTIST', 'DOCTOR', 'STAFF')")
public class MedicineController {

    private final MedicineService medicineService;
    private final MedicineMapper medicineMapper;
    private final AccessControlService accessControlService;
    private final DrugInteractionService drugInteractionService;

    @Autowired
    public MedicineController(
            MedicineService medicineService,
            MedicineMapper medicineMapper,
            AccessControlService accessControlService,
            @Autowired(required = false) DrugInteractionService drugInteractionService) {

        this.medicineService = medicineService;
        this.medicineMapper = medicineMapper;
        this.accessControlService = accessControlService;
        this.drugInteractionService = drugInteractionService;
    }

    public MedicineController(
            MedicineService medicineService,
            MedicineMapper medicineMapper,
            AccessControlService accessControlService) {

        this(medicineService, medicineMapper, accessControlService, null);
    }

    public MedicineController(
            MedicineService medicineService,
            MedicineMapper medicineMapper) {

        this(medicineService, medicineMapper, null, null);
    }

    private boolean isUnauthenticated() {
        return accessControlService != null && accessControlService.getCurrentUserId() == null && !accessControlService.isAdmin();
    }

    private boolean canReadMedicines() {
        if (accessControlService == null) return true;
        return accessControlService.isAdmin()
                || accessControlService.hasRole("PHARMACIST")
                || accessControlService.hasRole("STAFF")
                || accessControlService.hasRole("DENTIST")
                || accessControlService.hasRole("DOCTOR");
    }

    private boolean canManageMedicines() {
        if (accessControlService == null) return true;
        return accessControlService.isAdmin()
                || accessControlService.hasRole("PHARMACIST");
    }

    // =========================================================
    // CREATE MEDICINE
    // =========================================================

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> createMedicine(
            @RequestBody MedicineDTO dto) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canManageMedicines()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            if (dto == null) {
                return ResponseEntity
                        .badRequest()
                        .body("Medicine data is required");
            }

            Medicine medicine =
                    medicineMapper.toEntity(dto);

            Medicine saved =
                    medicineService.createMedicine(
                            medicine
                    );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(
                            medicineMapper.toDTO(saved)
                    );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET ALL MEDICINES
    // =========================================================

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'DENTIST', 'DOCTOR', 'STAFF')")
    public ResponseEntity<?> getAllMedicines() {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadMedicines()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        List<MedicineDTO> medicines =
                medicineService
                        .getAllMedicines()
                        .stream()
                        .map(medicineMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(medicines);
    }

    // =========================================================
    // GET MEDICINE BY ID
    // =========================================================

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'DENTIST', 'DOCTOR', 'STAFF')")
    public ResponseEntity<?> getMedicineById(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadMedicines()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            Medicine medicine =
                    medicineService
                            .getMedicineById(id);

            return ResponseEntity.ok(
                    medicineMapper.toDTO(medicine)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET MEDICINE BY CODE
    // =========================================================

    @GetMapping("/code/{medicineCode}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'DENTIST', 'DOCTOR', 'STAFF')")
    public ResponseEntity<?> getMedicineByCode(
            @PathVariable String medicineCode) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadMedicines()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            Medicine medicine =
                    medicineService
                            .getMedicineByCode(
                                    medicineCode
                            );

            return ResponseEntity.ok(
                    medicineMapper.toDTO(medicine)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // SEARCH BY NAME
    // =========================================================

    @GetMapping("/search/name")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'DENTIST', 'DOCTOR', 'STAFF')")
    public ResponseEntity<?> searchByName(
            @RequestParam String name) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadMedicines()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        List<MedicineDTO> result =
                medicineService
                        .searchByName(name)
                        .stream()
                        .map(medicineMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // SEARCH BY GENERIC NAME
    // =========================================================

    @GetMapping("/search/generic")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'DENTIST', 'DOCTOR', 'STAFF')")
    public ResponseEntity<?> searchByGenericName(
            @RequestParam String genericName) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadMedicines()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        List<MedicineDTO> result =
                medicineService
                        .searchByGenericName(
                                genericName
                        )
                        .stream()
                        .map(medicineMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // SEARCH MEDICINES
    // =========================================================

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'DENTIST', 'DOCTOR', 'STAFF')")
    public ResponseEntity<?> searchMedicines(
            @RequestParam String keyword) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadMedicines()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        List<MedicineDTO> result =
                medicineService
                        .searchMedicines(keyword)
                        .stream()
                        .map(medicineMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // GET BY CATEGORY
    // =========================================================

    @GetMapping("/category/{category}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'DENTIST', 'DOCTOR', 'STAFF')")
    public ResponseEntity<?> getByCategory(
            @PathVariable String category) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadMedicines()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        List<MedicineDTO> result =
                medicineService
                        .getByCategory(category)
                        .stream()
                        .map(medicineMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // GET ACTIVE MEDICINES
    // =========================================================

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'DENTIST', 'DOCTOR', 'STAFF')")
    public ResponseEntity<?> getActiveMedicines() {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadMedicines()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        List<MedicineDTO> result =
                medicineService
                        .getActiveMedicines()
                        .stream()
                        .map(medicineMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // GET LOW STOCK MEDICINES
    // =========================================================

    @GetMapping("/low-stock")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'DENTIST', 'DOCTOR', 'STAFF')")
    public ResponseEntity<?> getLowStockMedicines() {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadMedicines()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        List<MedicineDTO> result =
                medicineService
                        .getLowStockMedicines()
                        .stream()
                        .map(medicineMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // GET EXPIRED MEDICINES
    // =========================================================

    @GetMapping("/expired")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'DENTIST', 'DOCTOR', 'STAFF')")
    public ResponseEntity<?> getExpiredMedicines() {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadMedicines()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        List<MedicineDTO> result =
                medicineService
                        .getExpiredMedicines()
                        .stream()
                        .map(medicineMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // GET ACTIVE EXPIRED MEDICINES
    // =========================================================

    @GetMapping("/expired/active")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'DENTIST', 'DOCTOR', 'STAFF')")
    public ResponseEntity<?> getActiveExpiredMedicines() {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadMedicines()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        List<MedicineDTO> result =
                medicineService
                        .getActiveExpiredMedicines()
                        .stream()
                        .map(medicineMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // GET MEDICINES EXPIRING SOON
    // =========================================================

    @GetMapping("/expiring-soon")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'DENTIST', 'DOCTOR', 'STAFF')")
    public ResponseEntity<?> getMedicinesExpiringSoon() {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadMedicines()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        List<MedicineDTO> result =
                medicineService
                        .getMedicinesExpiringSoon()
                        .stream()
                        .map(medicineMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // GET MEDICINES EXPIRING BETWEEN DATES
    // =========================================================

    @GetMapping("/expiring-between")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'DENTIST', 'DOCTOR', 'STAFF')")
    public ResponseEntity<?> getMedicinesExpiringBetween(
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadMedicines()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            List<MedicineDTO> result =
                    medicineService
                            .getMedicinesExpiringBetween(
                                    startDate,
                                    endDate
                            )
                            .stream()
                            .map(medicineMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // UPDATE MEDICINE
    // =========================================================

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> updateMedicine(
            @PathVariable Long id,
            @RequestBody MedicineDTO dto) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canManageMedicines()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            if (dto == null) {
                return ResponseEntity
                        .badRequest()
                        .body("Medicine data is required");
            }

            dto.setId(id);
            Medicine updatedMedicine =
                    medicineMapper.toEntity(dto);

            Medicine saved =
                    medicineService.updateMedicine(
                            id,
                            updatedMedicine
                    );

            return ResponseEntity.ok(
                    medicineMapper.toDTO(saved)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // ADD STOCK
    // =========================================================

    @PutMapping("/{id}/stock/add")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> addStock(
            @PathVariable Long id,
            @RequestParam Integer quantity) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canManageMedicines()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        if (quantity == null || quantity <= 0) {
            return ResponseEntity.badRequest()
                    .body("Stock quantity must be greater than zero");
        }

        try {

            Medicine medicine =
                    medicineService.addStock(
                            id,
                            quantity
                    );

            return ResponseEntity.ok(
                    medicineMapper.toDTO(medicine)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // REMOVE STOCK
    // =========================================================

    @PutMapping("/{id}/stock/remove")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> removeStock(
            @PathVariable Long id,
            @RequestParam Integer quantity) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canManageMedicines()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        if (quantity == null || quantity <= 0) {
            return ResponseEntity.badRequest()
                    .body("Stock quantity must be greater than zero");
        }

        try {

            Medicine medicine =
                    medicineService.removeStock(
                            id,
                            quantity
                    );

            return ResponseEntity.ok(
                    medicineMapper.toDTO(medicine)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // ACTIVATE MEDICINE
    // =========================================================

    @PutMapping("/{id}/activate")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> activateMedicine(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canManageMedicines()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            Medicine medicine =
                    medicineService
                            .activateMedicine(id);

            return ResponseEntity.ok(
                    medicineMapper.toDTO(medicine)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // DEACTIVATE MEDICINE
    // =========================================================

    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> deactivateMedicine(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canManageMedicines()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            Medicine medicine =
                    medicineService
                            .deactivateMedicine(id);

            return ResponseEntity.ok(
                    medicineMapper.toDTO(medicine)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // DELETE MEDICINE
    // =========================================================

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> deleteMedicine(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canManageMedicines()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            medicineService.deleteMedicine(id);

            return ResponseEntity.ok(
                    "Medicine deleted successfully"
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // CHECK DRUG INTERACTIONS FOR MEDICINE LIST
    // =========================================================

    @PostMapping("/check-interactions")
    public ResponseEntity<List<DrugInteractionDTO>> checkInteractions(@RequestBody Object requestBody) {
        if (drugInteractionService == null) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        List<Long> medicineIds = new java.util.ArrayList<>();

        if (requestBody instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof Number number) {
                    medicineIds.add(number.longValue());
                } else if (item instanceof String str) {
                    try {
                        medicineIds.add(Long.parseLong(str.trim()));
                    } catch (NumberFormatException ignored) {}
                }
            }
        } else if (requestBody instanceof Map<?, ?> map) {
            Object idsObj = map.get("medicineIds");
            if (idsObj instanceof List<?> list) {
                for (Object item : list) {
                    if (item instanceof Number number) {
                        medicineIds.add(number.longValue());
                    } else if (item instanceof String str) {
                        try {
                            medicineIds.add(Long.parseLong(str.trim()));
                        } catch (NumberFormatException ignored) {}
                    }
                }
            }
        }

        if (medicineIds.size() < 2) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        List<DrugInteractionDTO> dtos = drugInteractionService.checkInteractionsForList(medicineIds).stream()
                .map(di -> DrugInteractionDTO.builder()
                        .id(di.getId())
                        .medicineOneId(di.getMedicineOne() != null ? di.getMedicineOne().getId() : null)
                        .medicineOneName(di.getMedicineOne() != null ? di.getMedicineOne().getName() : "")
                        .medicineTwoId(di.getMedicineTwo() != null ? di.getMedicineTwo().getId() : null)
                        .medicineTwoName(di.getMedicineTwo() != null ? di.getMedicineTwo().getName() : "")
                        .severity(di.getSeverity())
                        .description(di.getDescription())
                        .recommendation(di.getRecommendation())
                        .status(di.getStatus())
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }
}