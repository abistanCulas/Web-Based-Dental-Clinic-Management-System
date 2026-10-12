package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.DentalServiceDTO;
import com.dentaflow.backend.entity.DentalService;
import com.dentaflow.backend.mapper.DentalServiceMapper;
import com.dentaflow.backend.service.DentalServiceService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/services")
public class DentalServiceController {

    private final DentalServiceService dentalServiceService;
    private final DentalServiceMapper dentalServiceMapper;

    public DentalServiceController(
            DentalServiceService dentalServiceService,
            DentalServiceMapper dentalServiceMapper) {
        this.dentalServiceService = dentalServiceService;
        this.dentalServiceMapper = dentalServiceMapper;
    }

    // =========================================================
    // GET ALL ACTIVE SERVICES (PUBLIC)
    // =========================================================
    @GetMapping
    public ResponseEntity<List<DentalServiceDTO>> getAllActiveServices() {
        List<DentalServiceDTO> services = dentalServiceService
                .getAllActiveServices()
                .stream()
                .map(dentalServiceMapper::toDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(services);
    }

    // =========================================================
    // GET ALL SERVICES FOR ADMIN (ADMIN ONLY)
    // =========================================================
    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<DentalServiceDTO>> getAllServicesAdmin() {
        List<DentalServiceDTO> services = dentalServiceService
                .getAllServicesAdmin()
                .stream()
                .map(dentalServiceMapper::toDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(services);
    }

    // =========================================================
    // GET SERVICE BY ID (PUBLIC)
    // =========================================================
    @GetMapping("/{id}")
    public ResponseEntity<?> getServiceById(@PathVariable Long id) {
        try {
            DentalService service = dentalServiceService.getServiceById(id);
            return ResponseEntity.ok(dentalServiceMapper.toDTO(service));
        } catch (RuntimeException ex) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", ex.getMessage()));
        }
    }

    // =========================================================
    // CREATE SERVICE (ADMIN ONLY)
    // =========================================================
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createService(@RequestBody DentalServiceDTO dto) {
        try {
            DentalService entity = dentalServiceMapper.toEntity(dto);
            DentalService saved = dentalServiceService.createService(entity);
            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(dentalServiceMapper.toDTO(saved));
        } catch (RuntimeException ex) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", ex.getMessage()));
        }
    }

    // =========================================================
    // UPDATE SERVICE (ADMIN ONLY)
    // =========================================================
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateService(
            @PathVariable Long id,
            @RequestBody DentalServiceDTO dto) {
        try {
            DentalService entity = dentalServiceMapper.toEntity(dto);
            DentalService updated = dentalServiceService.updateService(id, entity);
            return ResponseEntity.ok(dentalServiceMapper.toDTO(updated));
        } catch (RuntimeException ex) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", ex.getMessage()));
        }
    }

    // =========================================================
    // DELETE SERVICE (ADMIN ONLY)
    // =========================================================
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteService(@PathVariable Long id) {
        try {
            dentalServiceService.deleteService(id);
            return ResponseEntity.ok(Map.of("message", "Service deleted successfully"));
        } catch (RuntimeException ex) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", ex.getMessage()));
        }
    }
}
