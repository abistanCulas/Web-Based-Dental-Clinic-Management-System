package com.dentalclinic.dentiststaff.controller;

import com.dentalclinic.dentiststaff.dto.SpecializationDTO;
import com.dentalclinic.dentiststaff.service.SpecializationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/specializations")
public class SpecializationController {

    private final SpecializationService specializationService;

    public SpecializationController(SpecializationService specializationService) {
        this.specializationService = specializationService;
    }

    @PostMapping
    public ResponseEntity<SpecializationDTO> create(@Valid @RequestBody SpecializationDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(specializationService.create(dto));
    }

    @GetMapping
    public ResponseEntity<List<SpecializationDTO>> getAll() {
        return ResponseEntity.ok(specializationService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SpecializationDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(specializationService.getById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SpecializationDTO> update(@PathVariable Long id, @Valid @RequestBody SpecializationDTO dto) {
        return ResponseEntity.ok(specializationService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        specializationService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
