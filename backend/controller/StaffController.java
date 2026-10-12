package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.StaffDTO;
import com.dentaflow.backend.entity.Staff;
import com.dentaflow.backend.mapper.StaffMapper;
import com.dentaflow.backend.service.StaffService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/staff")
public class StaffController {

    private final StaffService staffService;
    private final StaffMapper staffMapper;

    public StaffController(
            StaffService staffService,
            StaffMapper staffMapper) {

        this.staffService = staffService;
        this.staffMapper = staffMapper;
    }

    // =========================================================
    // CREATE STAFF
    // =========================================================

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createStaff(
            @RequestBody StaffDTO dto) {

        try {

            if (dto == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Staff data is required"));
            }

            Staff staff =
                    staffMapper.toEntity(dto);

            Staff saved =
                    staffService.createStaff(
                            staff,
                            dto.getUserId(),
                            dto.getPassword()
                    );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(staffMapper.toDTO(saved));

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET ALL STAFF
    // =========================================================

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'DENTIST', 'DOCTOR', 'PHARMACIST', 'CASHIER', 'STAFF')")
    public ResponseEntity<List<StaffDTO>> getAllStaff() {

        List<StaffDTO> result =
                staffService
                        .getAllStaff()
                        .stream()
                        .map(staffMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // GET STAFF BY ID
    // =========================================================

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'DENTIST', 'DOCTOR', 'PHARMACIST', 'CASHIER', 'STAFF')")
    public ResponseEntity<?> getStaffById(
            @PathVariable Long id) {

        try {

            Staff staff =
                    staffService.getStaffById(id);

            return ResponseEntity.ok(
                    staffMapper.toDTO(staff)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET STAFF BY CODE
    // =========================================================

    @GetMapping("/code/{staffCode}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'DENTIST', 'DOCTOR', 'PHARMACIST', 'CASHIER', 'STAFF')")
    public ResponseEntity<?> getStaffByCode(
            @PathVariable String staffCode) {

        try {

            Staff staff =
                    staffService.getStaffByCode(
                            staffCode
                    );

            return ResponseEntity.ok(
                    staffMapper.toDTO(staff)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET STAFF BY EMAIL
    // =========================================================

    @GetMapping("/email/{email}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'DENTIST', 'DOCTOR', 'PHARMACIST', 'CASHIER', 'STAFF')")
    public ResponseEntity<?> getStaffByEmail(
            @PathVariable String email) {

        try {

            Staff staff =
                    staffService.getStaffByEmail(email);

            return ResponseEntity.ok(
                    staffMapper.toDTO(staff)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET STAFF BY USER ID
    // =========================================================

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'DENTIST', 'DOCTOR', 'PHARMACIST', 'CASHIER', 'STAFF')")
    public ResponseEntity<?> getStaffByUserId(
            @PathVariable Long userId) {

        try {

            Staff staff =
                    staffService.getStaffByUserId(userId);

            return ResponseEntity.ok(
                    staffMapper.toDTO(staff)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET STAFF BY ROLE
    // =========================================================

    @GetMapping("/role/{role}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'DENTIST', 'DOCTOR', 'PHARMACIST', 'CASHIER', 'STAFF')")
    public ResponseEntity<?> getStaffByRole(
            @PathVariable String role) {

        try {

            List<StaffDTO> result =
                    staffService
                            .getStaffByRole(role)
                            .stream()
                            .map(staffMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // SEARCH STAFF
    // =========================================================

    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'DENTIST', 'DOCTOR', 'PHARMACIST', 'CASHIER', 'STAFF')")
    public ResponseEntity<?> searchStaff(
            @RequestParam(required = false)
            String keyword) {

        try {

            List<StaffDTO> result =
                    staffService
                            .searchStaff(keyword)
                            .stream()
                            .map(staffMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET STAFF BY STATUS
    // =========================================================

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'DENTIST', 'DOCTOR', 'PHARMACIST', 'CASHIER', 'STAFF')")
    public ResponseEntity<?> getStaffByStatus(
            @PathVariable String status) {

        try {

            List<StaffDTO> result =
                    staffService
                            .getStaffByStatus(status)
                            .stream()
                            .map(staffMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET STAFF BY ROLE AND STATUS
    // =========================================================

    @GetMapping("/role/{role}/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'DENTIST', 'DOCTOR', 'PHARMACIST', 'CASHIER', 'STAFF')")
    public ResponseEntity<?> getStaffByRoleAndStatus(
            @PathVariable String role,
            @PathVariable String status) {

        try {

            List<StaffDTO> result =
                    staffService
                            .getStaffByRoleAndStatus(
                                    role,
                                    status
                            )
                            .stream()
                            .map(staffMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // UPDATE STAFF
    // =========================================================

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateStaff(
            @PathVariable Long id,
            @RequestBody StaffDTO dto) {

        try {

            if (dto == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Staff data is required"));
            }

            Staff staff =
                    staffMapper.toEntity(dto);

            Staff updated =
                    staffService.updateStaff(
                            id,
                            staff
                    );

            return ResponseEntity.ok(
                    staffMapper.toDTO(updated)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // ACTIVATE STAFF
    // =========================================================

    @PutMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> activateStaff(
            @PathVariable Long id) {

        try {

            Staff staff =
                    staffService.activateStaff(id);

            return ResponseEntity.ok(
                    staffMapper.toDTO(staff)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // DEACTIVATE STAFF
    // =========================================================

    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deactivateStaff(
            @PathVariable Long id) {

        try {

            Staff staff =
                    staffService.deactivateStaff(id);

            return ResponseEntity.ok(
                    staffMapper.toDTO(staff)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // DELETE STAFF
    // =========================================================

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteStaff(
            @PathVariable Long id) {

        try {

            staffService.deleteStaff(id);

            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "message", "Staff deleted successfully"
                    )
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
}