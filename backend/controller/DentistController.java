package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.DentistDTO;
import com.dentaflow.backend.entity.Dentist;
import com.dentaflow.backend.mapper.DentistMapper;
import com.dentaflow.backend.service.DentistService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dentists")
public class DentistController {

    private final DentistService dentistService;
    private final DentistMapper dentistMapper;

    public DentistController(
            DentistService dentistService,
            DentistMapper dentistMapper) {

        this.dentistService = dentistService;
        this.dentistMapper = dentistMapper;
    }

    // =========================================================
    // CREATE DENTIST
    // =========================================================

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createDentist(
            @RequestBody DentistDTO dto) {

        try {

            Dentist dentist =
                    dentistMapper.toEntity(dto);

            Dentist saved =
                    dentistService.createDentist(
                            dentist,
                            dto.getUserId(),
                            dto.getPassword()
                    );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(
                            dentistMapper.toDTO(saved)
                    );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(java.util.Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET ALL ACTIVE DENTISTS (PUBLIC)
    // Supports ?all=true only if caller has ROLE_ADMIN
    // =========================================================

    @GetMapping
    public ResponseEntity<List<DentistDTO>> getAllDentists(
            @RequestParam(required = false, defaultValue = "false") boolean all) {

        boolean isAdmin = false;
        org.springframework.security.core.Authentication auth =
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()) {
            isAdmin = auth.getAuthorities().stream()
                    .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        }

        List<Dentist> list = (all && isAdmin)
                ? dentistService.getAllDentistsAdmin()
                : dentistService.getAllActiveDentists();

        List<DentistDTO> dentists =
                list.stream()
                        .map(dentistMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(dentists);
    }

    // =========================================================
    // GET ALL DENTISTS FOR ADMIN (ADMIN ONLY)
    // =========================================================

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<DentistDTO>> getAllDentistsAdmin() {

        List<DentistDTO> dentists =
                dentistService
                        .getAllDentistsAdmin()
                        .stream()
                        .map(dentistMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(dentists);
    }

    // =========================================================
    // GET DENTIST BY ID
    // =========================================================

    @GetMapping("/{id}")
    public ResponseEntity<?> getDentistById(
            @PathVariable Long id) {

        try {

            Dentist dentist =
                    dentistService.getDentistById(id);

            return ResponseEntity.ok(
                    dentistMapper.toDTO(dentist)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET DENTIST BY CODE
    // =========================================================

    @GetMapping("/code/{dentistCode}")
    public ResponseEntity<?> getDentistByCode(
            @PathVariable String dentistCode) {

        try {

            Dentist dentist =
                    dentistService.getDentistByCode(
                            dentistCode
                    );

            return ResponseEntity.ok(
                    dentistMapper.toDTO(dentist)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET DENTIST BY EMAIL
    // =========================================================

    @GetMapping("/email/{email}")
    public ResponseEntity<?> getDentistByEmail(
            @PathVariable String email) {

        try {

            Dentist dentist =
                    dentistService.getDentistByEmail(email);

            return ResponseEntity.ok(
                    dentistMapper.toDTO(dentist)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET DENTIST BY USER ID
    // =========================================================

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getDentistByUserId(
            @PathVariable Long userId) {

        try {

            Dentist dentist =
                    dentistService.getDentistByUserId(userId);

            return ResponseEntity.ok(
                    dentistMapper.toDTO(dentist)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET BY SPECIALIZATION
    // =========================================================

    @GetMapping("/specialization/{specialization}")
    public ResponseEntity<?> getBySpecialization(
            @PathVariable String specialization) {

        try {

            List<DentistDTO> dentists =
                    dentistService
                            .getDentistsBySpecialization(
                                    specialization
                            )
                            .stream()
                            .map(dentistMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(dentists);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET BY STATUS
    // =========================================================

    @GetMapping("/status/{status}")
    public ResponseEntity<?> getByStatus(
            @PathVariable String status) {

        try {
            if (!"ACTIVE".equalsIgnoreCase(status)) {
                boolean isAdmin = false;
                org.springframework.security.core.Authentication auth =
                        org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
                if (auth != null && auth.isAuthenticated()) {
                    isAdmin = auth.getAuthorities().stream()
                            .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
                }
                if (!isAdmin) {
                    return ResponseEntity.ok(List.of());
                }
            }

            List<DentistDTO> dentists =
                    dentistService
                            .getDentistsByStatus(status)
                            .stream()
                            .map(dentistMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(dentists);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // SEARCH DENTISTS (PUBLIC ACTIVE ONLY, ADMIN ALL)
    // =========================================================

    @GetMapping("/search")
    public ResponseEntity<?> searchDentists(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false, defaultValue = "false") boolean all) {

        try {
            boolean isAdmin = false;
            org.springframework.security.core.Authentication auth =
                    org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()) {
                isAdmin = auth.getAuthorities().stream()
                        .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
            }

            List<Dentist> list = (all && isAdmin)
                    ? dentistService.searchDentistsAdmin(keyword)
                    : dentistService.searchDentists(keyword);

            List<DentistDTO> dentists =
                    list.stream()
                            .map(dentistMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(dentists);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // UPDATE DENTIST
    // =========================================================

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateDentist(
            @PathVariable Long id,
            @RequestBody DentistDTO dto) {

        try {

            Dentist updatedDentist =
                    dentistMapper.toEntity(dto);

            Dentist updated =
                    dentistService.updateDentist(
                            id,
                            updatedDentist
                    );

            return ResponseEntity.ok(
                    dentistMapper.toDTO(updated)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(java.util.Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // ACTIVATE DENTIST
    // =========================================================

    @PutMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> activateDentist(
            @PathVariable Long id) {

        try {

            Dentist dentist =
                    dentistService.activateDentist(id);

            return ResponseEntity.ok(
                    dentistMapper.toDTO(dentist)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(java.util.Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // DEACTIVATE DENTIST
    // =========================================================

    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deactivateDentist(
            @PathVariable Long id) {

        try {

            Dentist dentist =
                    dentistService.deactivateDentist(id);

            return ResponseEntity.ok(
                    dentistMapper.toDTO(dentist)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(java.util.Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // DELETE DENTIST
    // =========================================================

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteDentist(
            @PathVariable Long id) {

        try {

            dentistService.deleteDentist(id);

            return ResponseEntity.ok(
                    java.util.Map.of(
                            "success", true,
                            "message", "Dentist deleted successfully"
                    )
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(java.util.Map.of("error", exception.getMessage()));
        }
    }
}