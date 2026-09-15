package com.dentalclinic.dentiststaff.controller;

import com.dentalclinic.dentiststaff.dto.DentistRequestDTO;
import com.dentalclinic.dentiststaff.dto.DentistResponseDTO;
import com.dentalclinic.dentiststaff.model.enums.DentistStatus;
import com.dentalclinic.dentiststaff.service.DentistService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dentists")
public class DentistController {

    private final DentistService dentistService;

    public DentistController(DentistService dentistService) {
        this.dentistService = dentistService;
    }

    // Add Dentist
    @PostMapping
    public ResponseEntity<DentistResponseDTO> addDentist(@Valid @RequestBody DentistRequestDTO request) {
        DentistResponseDTO created = dentistService.addDentist(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // Update Dentist Details
    @PutMapping("/{id}")
    public ResponseEntity<DentistResponseDTO> updateDentist(@PathVariable Long id,
                                                              @Valid @RequestBody DentistRequestDTO request) {
        return ResponseEntity.ok(dentistService.updateDentist(id, request));
    }

    // View Dentist Profile (single)
    @GetMapping("/{id}")
    public ResponseEntity<DentistResponseDTO> getDentist(@PathVariable Long id) {
        return ResponseEntity.ok(dentistService.getDentistById(id));
    }

    // View Dentist Profile (all)
    @GetMapping
    public ResponseEntity<List<DentistResponseDTO>> getAllDentists() {
        return ResponseEntity.ok(dentistService.getAllDentists());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDentist(@PathVariable Long id) {
        dentistService.deleteDentist(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<DentistResponseDTO> updateStatus(@PathVariable Long id,
                                                             @RequestParam DentistStatus status) {
        return ResponseEntity.ok(dentistService.updateStatus(id, status));
    }

    // Manage Specializations - assign a specialization to this dentist
    @PostMapping("/{id}/specializations/{specializationId}")
    public ResponseEntity<DentistResponseDTO> addSpecialization(@PathVariable Long id,
                                                                  @PathVariable Long specializationId) {
        return ResponseEntity.ok(dentistService.addSpecializationToDentist(id, specializationId));
    }

    // Manage Specializations - remove a specialization from this dentist
    @DeleteMapping("/{id}/specializations/{specializationId}")
    public ResponseEntity<DentistResponseDTO> removeSpecialization(@PathVariable Long id,
                                                                     @PathVariable Long specializationId) {
        return ResponseEntity.ok(dentistService.removeSpecializationFromDentist(id, specializationId));
    }
}
