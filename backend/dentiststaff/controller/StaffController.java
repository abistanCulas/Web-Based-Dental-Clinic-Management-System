package com.dentalclinic.dentiststaff.controller;

import com.dentalclinic.dentiststaff.dto.StaffRequestDTO;
import com.dentalclinic.dentiststaff.dto.StaffResponseDTO;
import com.dentalclinic.dentiststaff.model.enums.StaffRole;
import com.dentalclinic.dentiststaff.model.enums.StaffStatus;
import com.dentalclinic.dentiststaff.service.StaffService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/staff")
public class StaffController {

    private final StaffService staffService;

    public StaffController(StaffService staffService) {
        this.staffService = staffService;
    }

    @PostMapping
    public ResponseEntity<StaffResponseDTO> addStaff(@Valid @RequestBody StaffRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(staffService.addStaff(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<StaffResponseDTO> updateStaff(@PathVariable Long id,
                                                          @Valid @RequestBody StaffRequestDTO request) {
        return ResponseEntity.ok(staffService.updateStaff(id, request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<StaffResponseDTO> getStaff(@PathVariable Long id) {
        return ResponseEntity.ok(staffService.getStaffById(id));
    }

    // View all staff, optionally filtered by role e.g. /api/staff?role=RECEPTIONIST
    @GetMapping
    public ResponseEntity<List<StaffResponseDTO>> getAllStaff(@RequestParam(required = false) StaffRole role) {
        if (role != null) {
            return ResponseEntity.ok(staffService.getStaffByRole(role));
        }
        return ResponseEntity.ok(staffService.getAllStaff());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStaff(@PathVariable Long id) {
        staffService.deleteStaff(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<StaffResponseDTO> updateStatus(@PathVariable Long id,
                                                           @RequestParam StaffStatus status) {
        return ResponseEntity.ok(staffService.updateStatus(id, status));
    }
}
