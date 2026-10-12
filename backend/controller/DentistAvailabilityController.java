package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.DentistAvailabilityDTO;
import com.dentaflow.backend.entity.DentistAvailability;
import com.dentaflow.backend.mapper.DentistAvailabilityMapper;
import com.dentaflow.backend.security.AccessControlService;
import com.dentaflow.backend.service.DentistAvailabilityService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dentist-availability")
public class DentistAvailabilityController {

    private final DentistAvailabilityService availabilityService;
    private final DentistAvailabilityMapper availabilityMapper;
    private final AccessControlService accessControlService;

    // =========================================================
    // CONSTRUCTOR
    // =========================================================

    public DentistAvailabilityController(
            DentistAvailabilityService availabilityService,
            DentistAvailabilityMapper availabilityMapper) {

        this(availabilityService, availabilityMapper, null);
    }

    @Autowired
    public DentistAvailabilityController(
            DentistAvailabilityService availabilityService,
            DentistAvailabilityMapper availabilityMapper,
            AccessControlService accessControlService) {

        this.availabilityService =
                availabilityService;

        this.availabilityMapper =
                availabilityMapper;

        this.accessControlService =
                accessControlService;
    }

    // =========================================================
    // HELPER METHODS
    // =========================================================

    private ResponseEntity<?> checkDentistAccess(Long dentistId) {
        if (accessControlService != null) {
            if (accessControlService.getCurrentUserId() == null && !accessControlService.isAdmin()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }
            if (!accessControlService.canManageDentist(dentistId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: You cannot manage availability for another dentist"));
            }
        }
        return null;
    }

    private ResponseEntity<?> checkAvailabilityAccess(Long availabilityId) {
        if (accessControlService != null) {
            if (accessControlService.getCurrentUserId() == null && !accessControlService.isAdmin()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }
            if (!accessControlService.canManageDentistAvailability(availabilityId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: You cannot manage availability for another dentist"));
            }
        }
        return null;
    }

    // =========================================================
    // CREATE AVAILABILITY
    //
    // POST /api/dentist-availability/dentist/{dentistId}
    // =========================================================

    @PostMapping("/dentist/{dentistId}")
    @PreAuthorize("hasRole('ADMIN') or @accessControl.canManageDentist(#dentistId)")
    public ResponseEntity<?> createAvailability(
            @PathVariable Long dentistId,
            @RequestBody DentistAvailabilityDTO dto) {

        ResponseEntity<?> authCheck = checkDentistAccess(dentistId);
        if (authCheck != null) {
            return authCheck;
        }

        try {

            if (dto == null) {
                return ResponseEntity
                        .badRequest()
                        .body(Map.of("error", "Availability data is required"));
            }

            if (dto.getDayOfWeek() == null) {
                return ResponseEntity
                        .badRequest()
                        .body(Map.of("error", "Day of week is required"));
            }

            if (dto.getStartTime() == null ||
                    dto.getEndTime() == null) {

                return ResponseEntity
                        .badRequest()
                        .body(
                                Map.of("error", "Start time and end time are required")
                        );
            }

            DentistAvailability availability =
                    availabilityMapper.toEntity(dto);

            DentistAvailability saved =
                    availabilityService.createAvailability(
                            dentistId,
                            availability
                    );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(
                            availabilityMapper.toDTO(saved)
                    );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET ALL AVAILABILITY
    //
    // GET /api/dentist-availability
    // =========================================================

    @GetMapping
    public ResponseEntity<List<DentistAvailabilityDTO>>
    getAllAvailability() {

        List<DentistAvailabilityDTO> result =
                availabilityService
                        .getAllAvailability()
                        .stream()
                        .map(availabilityMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // GET AVAILABILITY BY ID
    //
    // GET /api/dentist-availability/{id}
    // =========================================================

    @GetMapping("/{id}")
    public ResponseEntity<?> getAvailabilityById(
            @PathVariable Long id) {

        try {

            DentistAvailability availability =
                    availabilityService
                            .getAvailabilityById(id);

            return ResponseEntity.ok(
                    availabilityMapper.toDTO(
                            availability
                    )
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET DENTIST AVAILABILITY
    //
    // GET /api/dentist-availability/dentist/{dentistId}
    // =========================================================

    @GetMapping("/dentist/{dentistId}")
    public ResponseEntity<?> getDentistAvailability(
            @PathVariable Long dentistId) {

        try {

            List<DentistAvailabilityDTO> result =
                    availabilityService
                            .getDentistAvailability(
                                    dentistId
                            )
                            .stream()
                            .map(availabilityMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET ONLY AVAILABLE SCHEDULES
    //
    // GET /api/dentist-availability/dentist/{dentistId}/available
    // =========================================================

    @GetMapping("/dentist/{dentistId}/available")
    public ResponseEntity<?> getAvailableSchedules(
            @PathVariable Long dentistId) {

        try {

            List<DentistAvailabilityDTO> result =
                    availabilityService
                            .getAvailableSchedules(
                                    dentistId
                            )
                            .stream()
                            .map(availabilityMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET AVAILABILITY FOR SPECIFIC DAY
    //
    // GET /api/dentist-availability/dentist/{dentistId}/day/{day}
    //
    // Example:
    // /dentist/1/day/MONDAY
    // =========================================================

    @GetMapping("/dentist/{dentistId}/day/{day}")
    public ResponseEntity<?> getAvailabilityForDay(
            @PathVariable Long dentistId,
            @PathVariable DayOfWeek day) {

        try {

            DentistAvailability availability =
                    availabilityService
                            .getAvailabilityForDay(
                                    dentistId,
                                    day
                            );

            return ResponseEntity.ok(
                    availabilityMapper.toDTO(
                            availability
                    )
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // UPDATE AVAILABILITY
    //
    // PUT /api/dentist-availability/{id}
    // =========================================================

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @accessControl.canManageDentistAvailability(#id)")
    public ResponseEntity<?> updateAvailability(
            @PathVariable Long id,
            @RequestBody DentistAvailabilityDTO dto) {

        ResponseEntity<?> authCheck = checkAvailabilityAccess(id);
        if (authCheck != null) {
            return authCheck;
        }

        try {

            if (dto == null) {
                return ResponseEntity
                        .badRequest()
                        .body(Map.of("error", "Availability data is required"));
            }

            DentistAvailability updated =
                    availabilityMapper.toEntity(dto);

            DentistAvailability saved =
                    availabilityService.updateAvailability(
                            id,
                            updated
                    );

            return ResponseEntity.ok(
                    availabilityMapper.toDTO(saved)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // ENABLE AVAILABILITY
    //
    // PUT /api/dentist-availability/{id}/enable
    // =========================================================

    @PutMapping("/{id}/enable")
    @PreAuthorize("hasRole('ADMIN') or @accessControl.canManageDentistAvailability(#id)")
    public ResponseEntity<?> enableAvailability(
            @PathVariable Long id) {

        ResponseEntity<?> authCheck = checkAvailabilityAccess(id);
        if (authCheck != null) {
            return authCheck;
        }

        try {

            DentistAvailability availability =
                    availabilityService
                            .enableAvailability(id);

            return ResponseEntity.ok(
                    availabilityMapper.toDTO(
                            availability
                    )
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // DISABLE AVAILABILITY
    //
    // PUT /api/dentist-availability/{id}/disable
    // =========================================================

    @PutMapping("/{id}/disable")
    @PreAuthorize("hasRole('ADMIN') or @accessControl.canManageDentistAvailability(#id)")
    public ResponseEntity<?> disableAvailability(
            @PathVariable Long id) {

        ResponseEntity<?> authCheck = checkAvailabilityAccess(id);
        if (authCheck != null) {
            return authCheck;
        }

        try {

            DentistAvailability availability =
                    availabilityService
                            .disableAvailability(id);

            return ResponseEntity.ok(
                    availabilityMapper.toDTO(
                            availability
                    )
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // DELETE AVAILABILITY
    //
    // DELETE /api/dentist-availability/{id}
    // =========================================================

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @accessControl.canManageDentistAvailability(#id)")
    public ResponseEntity<?> deleteAvailability(
            @PathVariable Long id) {

        ResponseEntity<?> authCheck = checkAvailabilityAccess(id);
        if (authCheck != null) {
            return authCheck;
        }

        try {

            availabilityService.deleteAvailability(id);

            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "message", "Dentist availability deleted successfully"
                    )
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // DELETE ALL DENTIST AVAILABILITY
    //
    // DELETE
    // /api/dentist-availability/dentist/{dentistId}
    // =========================================================

    @DeleteMapping("/dentist/{dentistId}")
    @PreAuthorize("hasRole('ADMIN') or @accessControl.canManageDentist(#dentistId)")
    public ResponseEntity<?> deleteDentistAvailability(
            @PathVariable Long dentistId) {

        ResponseEntity<?> authCheck = checkDentistAccess(dentistId);
        if (authCheck != null) {
            return authCheck;
        }

        try {

            availabilityService
                    .deleteDentistAvailability(
                            dentistId
                    );

            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "message", "All dentist availability deleted successfully"
                    )
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // CHECK DENTIST WORKING AVAILABILITY
    //
    // GET
    // /api/dentist-availability/check
    //
    // This checks dentist working hours only.
    // Appointment conflicts are checked separately.
    // =========================================================

    @GetMapping("/check")
    public ResponseEntity<?> checkDentistAvailability(
            @RequestParam Long dentistId,
            @RequestParam DayOfWeek dayOfWeek,
            @RequestParam java.time.LocalTime startTime,
            @RequestParam java.time.LocalTime endTime) {

        try {

            boolean available =
                    availabilityService
                            .isDentistAvailable(
                                    dentistId,
                                    dayOfWeek,
                                    startTime,
                                    endTime
                            );

            return ResponseEntity.ok(available);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }
}