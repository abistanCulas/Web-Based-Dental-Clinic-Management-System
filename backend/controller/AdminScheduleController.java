package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.StaffScheduleDTO;
import com.dentaflow.backend.entity.StaffSchedule;
import com.dentaflow.backend.mapper.StaffScheduleMapper;
import com.dentaflow.backend.service.StaffScheduleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/schedules")
@PreAuthorize("hasRole('ADMIN')")
public class AdminScheduleController {

    private final StaffScheduleService staffScheduleService;
    private final StaffScheduleMapper staffScheduleMapper;

    @Autowired
    public AdminScheduleController(
            StaffScheduleService staffScheduleService,
            StaffScheduleMapper staffScheduleMapper) {

        this.staffScheduleService = staffScheduleService;
        this.staffScheduleMapper = staffScheduleMapper;
    }

    // =========================================================
    // GET ALL / FILTERED SCHEDULES (ADMIN)
    // =========================================================

    @GetMapping
    public ResponseEntity<List<StaffScheduleDTO>> getAdminSchedules(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate startDate,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate endDate,

            @RequestParam(required = false)
            Long dentistId,

            @RequestParam(required = false)
            Long staffId,

            @RequestParam(required = false)
            String role,

            @RequestParam(required = false)
            String status,

            @RequestParam(required = false)
            String search) {

        List<StaffSchedule> schedules = staffScheduleService.getAdminSchedules(
                date, startDate, endDate, dentistId, staffId, role, status, search
        );

        List<StaffScheduleDTO> dtos = schedules.stream()
                .map(staffScheduleMapper::toDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    // =========================================================
    // GET SCHEDULE BY ID (ADMIN)
    // =========================================================

    @GetMapping("/{id}")
    public ResponseEntity<?> getScheduleById(@PathVariable Long id) {
        try {
            StaffSchedule schedule = staffScheduleService.getScheduleById(id);
            return ResponseEntity.ok(staffScheduleMapper.toDTO(schedule));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // CREATE SCHEDULE MANUALLY (ADMIN)
    // =========================================================

    @PostMapping
    public ResponseEntity<?> createSchedule(@RequestBody StaffScheduleDTO dto) {
        try {
            StaffSchedule saved = staffScheduleService.createAdminSchedule(dto);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(staffScheduleMapper.toDTO(saved));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // UPDATE SCHEDULE (ADMIN)
    // =========================================================

    @PutMapping("/{id}")
    public ResponseEntity<?> updateSchedule(
            @PathVariable Long id,
            @RequestBody StaffScheduleDTO dto) {

        try {
            StaffSchedule updated = staffScheduleService.updateAdminSchedule(id, dto);
            return ResponseEntity.ok(staffScheduleMapper.toDTO(updated));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // DELETE SCHEDULE (ADMIN - SOFT DELETE)
    // =========================================================

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSchedule(@PathVariable Long id) {
        try {
            staffScheduleService.deleteAdminSchedule(id);
            return ResponseEntity.ok(Map.of(
                    "message", "Schedule deleted successfully",
                    "id", id
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // TRIGGER AUTO-SCHEDULE GENERATION (ADMIN)
    // =========================================================

    @PostMapping("/generate")
    public ResponseEntity<?> autoGenerateSchedules(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate targetDate,

            @RequestParam(required = false, defaultValue = "false")
            boolean force) {

        try {
            if (targetDate == null) {
                targetDate = LocalDate.now();
            }

            List<StaffSchedule> generated = staffScheduleService.autoGenerateSchedulesForWeek(targetDate, force);
            List<StaffScheduleDTO> dtos = generated.stream()
                    .map(staffScheduleMapper::toDTO)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of(
                    "message", "Schedules generated successfully for week of " + targetDate,
                    "count", dtos.size(),
                    "schedules", dtos
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // STAFF SCHEDULE MANAGEMENT: WEEKLY & EFFECTIVE SCHEDULE
    // =========================================================

    @GetMapping("/staff/{staffId}/effective")
    public ResponseEntity<?> getStaffEffectiveSchedule(
            @PathVariable Long staffId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date) {

        try {
            StaffScheduleDTO dto = staffScheduleService.getEffectiveStaffSchedule(staffId, date != null ? date : LocalDate.now());
            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/staff/{staffId}/effective-week")
    public ResponseEntity<?> getStaffEffectiveWeekSchedule(
            @PathVariable Long staffId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate weekStartDate) {

        try {
            List<StaffScheduleDTO> list = staffScheduleService.getEffectiveStaffWeekSchedule(staffId, weekStartDate != null ? weekStartDate : LocalDate.now());
            return ResponseEntity.ok(list);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/staff/{staffId}/weekly")
    public ResponseEntity<?> updateStaffWeeklySchedule(
            @PathVariable Long staffId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate weekStartDate,
            @RequestBody List<StaffScheduleDTO> dtos) {

        try {
            com.dentaflow.backend.dto.ScheduleOperationResult result =
                    staffScheduleService.saveStaffWeeklyScheduleWithNotification(staffId, weekStartDate, dtos);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // STAFF DATE-SPECIFIC OVERRIDE MANAGEMENT (ADMIN ONLY)
    // =========================================================

    @PostMapping("/staff/{staffId}/override")
    public ResponseEntity<?> createDateOverride(
            @PathVariable Long staffId,
            @RequestBody StaffScheduleDTO dto) {

        try {
            com.dentaflow.backend.dto.ScheduleOperationResult result =
                    staffScheduleService.createOrUpdateDateOverride(staffId, dto);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/staff/{staffId}/override")
    public ResponseEntity<?> updateDateOverride(
            @PathVariable Long staffId,
            @RequestBody StaffScheduleDTO dto) {

        try {
            com.dentaflow.backend.dto.ScheduleOperationResult result =
                    staffScheduleService.createOrUpdateDateOverride(staffId, dto);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/staff/{staffId}/override")
    public ResponseEntity<?> deleteDateOverride(
            @PathVariable Long staffId,
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date) {

        try {
            com.dentaflow.backend.dto.ScheduleOperationResult result =
                    staffScheduleService.deleteDateOverride(staffId, date);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
