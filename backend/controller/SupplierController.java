package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.SupplierDTO;
import com.dentaflow.backend.entity.Supplier;
import com.dentaflow.backend.mapper.SupplierMapper;
import com.dentaflow.backend.security.AccessControlService;
import com.dentaflow.backend.service.SupplierService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/suppliers")
@PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'STAFF', 'DENTIST', 'DOCTOR')")
public class SupplierController {

    private final SupplierService supplierService;
    private final SupplierMapper supplierMapper;
    private final AccessControlService accessControlService;

    @Autowired
    public SupplierController(
            SupplierService supplierService,
            SupplierMapper supplierMapper,
            AccessControlService accessControlService) {

        this.supplierService = supplierService;
        this.supplierMapper = supplierMapper;
        this.accessControlService = accessControlService;
    }

    public SupplierController(
            SupplierService supplierService,
            SupplierMapper supplierMapper) {

        this(supplierService, supplierMapper, null);
    }

    private boolean isUnauthenticated() {
        return accessControlService != null && accessControlService.getCurrentUserId() == null && !accessControlService.isAdmin();
    }

    private boolean canReadSuppliers() {
        if (accessControlService == null) return true;
        return accessControlService.isAdmin()
                || accessControlService.hasRole("PHARMACIST")
                || accessControlService.hasRole("STAFF")
                || accessControlService.hasRole("DENTIST")
                || accessControlService.hasRole("DOCTOR");
    }

    private boolean canManageSuppliers() {
        if (accessControlService == null) return true;
        return accessControlService.isAdmin()
                || accessControlService.hasRole("PHARMACIST");
    }

    // =========================================================
    // CREATE SUPPLIER
    // =========================================================

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> createSupplier(
            @RequestBody SupplierDTO dto) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canManageSuppliers()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            if (dto == null) {
                return ResponseEntity.badRequest()
                        .body("Supplier data is required");
            }

            Supplier supplier =
                    supplierMapper.toEntity(dto);

            Supplier saved =
                    supplierService.createSupplier(
                            supplier
                    );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(
                            supplierMapper.toDTO(saved)
                    );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET ALL SUPPLIERS
    // =========================================================

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'STAFF', 'DENTIST', 'DOCTOR')")
    public ResponseEntity<?> getAllSuppliers() {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadSuppliers()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        List<SupplierDTO> result =
                supplierService
                        .getAllSuppliers()
                        .stream()
                        .map(supplierMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // GET SUPPLIER BY ID
    // =========================================================

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'STAFF', 'DENTIST', 'DOCTOR')")
    public ResponseEntity<?> getSupplierById(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadSuppliers()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            Supplier supplier =
                    supplierService
                            .getSupplierById(id);

            return ResponseEntity.ok(
                    supplierMapper.toDTO(supplier)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET SUPPLIER BY CODE
    // =========================================================

    @GetMapping("/code/{supplierCode}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'STAFF', 'DENTIST', 'DOCTOR')")
    public ResponseEntity<?> getSupplierByCode(
            @PathVariable String supplierCode) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadSuppliers()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            Supplier supplier =
                    supplierService
                            .getSupplierByCode(
                                    supplierCode
                            );

            return ResponseEntity.ok(
                    supplierMapper.toDTO(supplier)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET SUPPLIER BY EMAIL
    // =========================================================

    @GetMapping("/email")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'STAFF', 'DENTIST', 'DOCTOR')")
    public ResponseEntity<?> getSupplierByEmail(
            @RequestParam String email) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadSuppliers()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            Supplier supplier =
                    supplierService
                            .getSupplierByEmail(email);

            return ResponseEntity.ok(
                    supplierMapper.toDTO(supplier)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // SEARCH SUPPLIERS
    // =========================================================

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'STAFF', 'DENTIST', 'DOCTOR')")
    public ResponseEntity<?> searchSuppliers(
            @RequestParam(required = false)
            String keyword) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadSuppliers()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        List<SupplierDTO> result =
                supplierService
                        .searchSuppliers(keyword)
                        .stream()
                        .map(supplierMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // SEARCH BY SUPPLIER NAME
    // =========================================================

    @GetMapping("/search/name")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'STAFF', 'DENTIST', 'DOCTOR')")
    public ResponseEntity<?> searchBySupplierName(
            @RequestParam String supplierName) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadSuppliers()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        List<SupplierDTO> result =
                supplierService
                        .searchBySupplierName(
                                supplierName
                        )
                        .stream()
                        .map(supplierMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // SEARCH BY CONTACT PERSON
    // =========================================================

    @GetMapping("/search/contact")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'STAFF', 'DENTIST', 'DOCTOR')")
    public ResponseEntity<?> searchByContactPerson(
            @RequestParam String contactPerson) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadSuppliers()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        List<SupplierDTO> result =
                supplierService
                        .searchByContactPerson(
                                contactPerson
                        )
                        .stream()
                        .map(supplierMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // GET SUPPLIERS BY STATUS
    // =========================================================

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'STAFF', 'DENTIST', 'DOCTOR')")
    public ResponseEntity<?> getSuppliersByStatus(
            @PathVariable String status) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadSuppliers()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            List<SupplierDTO> result =
                    supplierService
                            .getSuppliersByStatus(status)
                            .stream()
                            .map(supplierMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET SUPPLIERS BY CITY
    // =========================================================

    @GetMapping("/city/{city}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'STAFF', 'DENTIST', 'DOCTOR')")
    public ResponseEntity<?> getSuppliersByCity(
            @PathVariable String city) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canReadSuppliers()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        List<SupplierDTO> result =
                supplierService
                        .getSuppliersByCity(city)
                        .stream()
                        .map(supplierMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // UPDATE SUPPLIER
    // =========================================================

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> updateSupplier(
            @PathVariable Long id,
            @RequestBody SupplierDTO dto) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canManageSuppliers()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            if (dto == null) {
                return ResponseEntity.badRequest()
                        .body("Supplier data is required");
            }

            dto.setId(id);
            Supplier supplier =
                    supplierMapper.toEntity(dto);

            Supplier updated =
                    supplierService.updateSupplier(
                            id,
                            supplier
                    );

            return ResponseEntity.ok(
                    supplierMapper.toDTO(updated)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // ACTIVATE SUPPLIER
    // =========================================================

    @PutMapping("/{id}/activate")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> activateSupplier(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canManageSuppliers()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            Supplier supplier =
                    supplierService
                            .activateSupplier(id);

            return ResponseEntity.ok(
                    supplierMapper.toDTO(supplier)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // DEACTIVATE SUPPLIER
    // =========================================================

    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> deactivateSupplier(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canManageSuppliers()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            Supplier supplier =
                    supplierService
                            .deactivateSupplier(id);

            return ResponseEntity.ok(
                    supplierMapper.toDTO(supplier)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // DELETE SUPPLIER
    // =========================================================

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> deleteSupplier(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication required");
        }

        if (!canManageSuppliers()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Access denied: Unauthorized role");
        }

        try {

            supplierService.deleteSupplier(id);

            return ResponseEntity.ok(
                    "Supplier deleted successfully"
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }
}