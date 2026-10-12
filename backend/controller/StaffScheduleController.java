package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.StaffScheduleDTO;
import com.dentaflow.backend.entity.StaffSchedule;
import com.dentaflow.backend.mapper.StaffScheduleMapper;
import com.dentaflow.backend.service.StaffScheduleService;
import com.dentaflow.backend.scheduler.WeeklyScheduleScheduler;
import com.dentaflow.backend.security.AccessControlService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/staff-schedules")
public class StaffScheduleController {

    private final StaffScheduleService staffScheduleService;
    private final StaffScheduleMapper staffScheduleMapper;
    private final AccessControlService accessControlService;
    private final WeeklyScheduleScheduler weeklyScheduleScheduler;

    public StaffScheduleController(
            StaffScheduleService staffScheduleService,
            StaffScheduleMapper staffScheduleMapper) {

        this(staffScheduleService, staffScheduleMapper, null, null);
    }

    public StaffScheduleController(
            StaffScheduleService staffScheduleService,
            StaffScheduleMapper staffScheduleMapper,
            AccessControlService accessControlService) {

        this(staffScheduleService, staffScheduleMapper, accessControlService, null);
    }

    @Autowired
    public StaffScheduleController(
            StaffScheduleService staffScheduleService,
            StaffScheduleMapper staffScheduleMapper,
            AccessControlService accessControlService,
            @Autowired(required = false) WeeklyScheduleScheduler weeklyScheduleScheduler) {

        this.staffScheduleService = staffScheduleService;
        this.staffScheduleMapper = staffScheduleMapper;
        this.accessControlService = accessControlService;
        this.weeklyScheduleScheduler = weeklyScheduleScheduler;
    }

    // =========================================================
    // HELPER METHODS
    // =========================================================

    private ResponseEntity<?> checkStaffAccess(Long staffId) {
        if (accessControlService != null) {
            if (accessControlService.getCurrentUserId() == null && !accessControlService.isAdmin()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }
            if (!accessControlService.canManageStaff(staffId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: You cannot manage schedules for another staff member"));
            }
        }
        return null;
    }

    private ResponseEntity<?> checkDentistAccess(Long dentistId) {
        if (accessControlService != null) {
            if (accessControlService.getCurrentUserId() == null && !accessControlService.isAdmin()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }
            if (!accessControlService.canManageDentist(dentistId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: You cannot manage schedules for another dentist"));
            }
        }
        return null;
    }

    private ResponseEntity<?> checkScheduleAccess(Long scheduleId) {
        if (accessControlService != null) {
            if (accessControlService.getCurrentUserId() == null && !accessControlService.isAdmin()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }
            if (!accessControlService.isAdmin()) {
                StaffSchedule schedule;
                try {
                    schedule = staffScheduleService.getScheduleById(scheduleId);
                } catch (RuntimeException e) {
                    return ResponseEntity.status(HttpStatus.NOT_FOUND)
                            .body(Map.of("error", e.getMessage()));
                }
                if (schedule != null) {
                    if (schedule.getStaff() != null) {
                        if (!accessControlService.canManageStaff(schedule.getStaff().getId())) {
                            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                    .body(Map.of("error", "Access denied: You cannot manage this schedule"));
                        }
                    } else if (schedule.getDentist() != null) {
                        if (!accessControlService.canManageDentist(schedule.getDentist().getId())) {
                            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                    .body(Map.of("error", "Access denied: You cannot manage this schedule"));
                        }
                    }
                }
            }
        }
        return null;
    }

    // =========================================================
    // CREATE STAFF SCHEDULE
    // =========================================================

    @PostMapping("/staff/{staffId}")
    @PreAuthorize("hasRole('ADMIN') or @accessControl.canManageStaff(#staffId)")
    public ResponseEntity<?> createStaffSchedule(
            @PathVariable Long staffId,
            @RequestBody StaffScheduleDTO dto) {

        ResponseEntity<?> authCheck = checkStaffAccess(staffId);
        if (authCheck != null) {
            return authCheck;
        }

        try {

            if (dto == null) {
                return ResponseEntity.badRequest()
                        .body("Schedule data is required");
            }

            StaffSchedule schedule =
                    staffScheduleMapper.toEntity(dto);

            StaffSchedule saved =
                    staffScheduleService.createStaffSchedule(
                            staffId,
                            schedule
                    );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(
                            staffScheduleMapper.toDTO(saved)
                    );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // CREATE DENTIST SCHEDULE
    // =========================================================

    @PostMapping("/dentist/{dentistId}")
    @PreAuthorize("hasRole('ADMIN') or @accessControl.canManageDentist(#dentistId)")
    public ResponseEntity<?> createDentistSchedule(
            @PathVariable Long dentistId,
            @RequestBody StaffScheduleDTO dto) {

        ResponseEntity<?> authCheck = checkDentistAccess(dentistId);
        if (authCheck != null) {
            return authCheck;
        }

        try {

            if (dto == null) {
                return ResponseEntity.badRequest()
                        .body("Schedule data is required");
            }

            StaffSchedule schedule =
                    staffScheduleMapper.toEntity(dto);

            StaffSchedule saved =
                    staffScheduleService.createDentistSchedule(
                            dentistId,
                            schedule
                    );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(
                            staffScheduleMapper.toDTO(saved)
                    );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GENERATE STAFF WEEKLY SCHEDULE
    // =========================================================

    @PostMapping("/staff/{staffId}/generate-weekly")
    @PreAuthorize("hasRole('ADMIN') or @accessControl.canManageStaff(#staffId)")
    public ResponseEntity<?> generateStaffWeeklySchedule(
            @PathVariable Long staffId,
            @RequestParam(required = false)
            @DateTimeFormat(
                    iso = DateTimeFormat.ISO.DATE
            )
            LocalDate weekStartDate) {

        ResponseEntity<?> authCheck = checkStaffAccess(staffId);
        if (authCheck != null) {
            return authCheck;
        }

        try {

            List<StaffScheduleDTO> result =
                    staffScheduleService
                            .generateWeeklySchedule(
                                     staffId,
                                    weekStartDate
                            )
                            .stream()
                            .map(staffScheduleMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GENERATE DENTIST WEEKLY SCHEDULE
    // =========================================================

    @PostMapping("/dentist/{dentistId}/generate-weekly")
    @PreAuthorize("hasRole('ADMIN') or @accessControl.canManageDentist(#dentistId)")
    public ResponseEntity<?> generateDentistWeeklySchedule(
            @PathVariable Long dentistId,
            @RequestParam(required = false)
            @DateTimeFormat(
                    iso = DateTimeFormat.ISO.DATE
            )
            LocalDate weekStartDate) {

        ResponseEntity<?> authCheck = checkDentistAccess(dentistId);
        if (authCheck != null) {
            return authCheck;
        }

        try {

            List<StaffScheduleDTO> result =
                    staffScheduleService
                            .generateDentistWeeklySchedule(
                                    dentistId,
                                    weekStartDate
                            )
                            .stream()
                            .map(staffScheduleMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GENERATE ALL STAFF WEEKLY SCHEDULES
    // =========================================================

    @PostMapping("/generate/staff")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> generateAllStaffSchedules(
            @RequestParam(required = false)
            @DateTimeFormat(
                    iso = DateTimeFormat.ISO.DATE
            )
            LocalDate weekStartDate) {

        try {

            List<StaffScheduleDTO> result =
                    staffScheduleService
                            .generateWeeklySchedulesForAllStaff(
                                    weekStartDate
                            )
                            .stream()
                            .map(staffScheduleMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GENERATE ALL DENTIST WEEKLY SCHEDULES
    // =========================================================

    @PostMapping("/generate/dentists")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> generateAllDentistSchedules(
            @RequestParam(required = false)
            @DateTimeFormat(
                    iso = DateTimeFormat.ISO.DATE
            )
            LocalDate weekStartDate) {

        try {

            List<StaffScheduleDTO> result =
                    staffScheduleService
                            .generateWeeklySchedulesForAllDentists(
                                    weekStartDate
                            )
                            .stream()
                            .map(staffScheduleMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GENERATE EVERYONE'S WEEKLY SCHEDULES
    // =========================================================

    @PostMapping("/generate/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> generateEveryoneSchedules(
            @RequestParam(required = false)
            @DateTimeFormat(
                    iso = DateTimeFormat.ISO.DATE
            )
            LocalDate weekStartDate) {

        try {

            List<StaffScheduleDTO> result =
                    staffScheduleService
                            .generateWeeklySchedulesForEveryone(
                                    weekStartDate
                            )
                            .stream()
                            .map(staffScheduleMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // CREATE OR UPDATE WEEKLY STAFF SCHEDULE
    // =========================================================

    @PostMapping("/staff/{staffId}/weekly")
    @PreAuthorize("hasRole('ADMIN') or @accessControl.canManageStaff(#staffId)")
    public ResponseEntity<?> createWeeklyStaffSchedule(
            @PathVariable Long staffId,
            @RequestBody List<StaffScheduleDTO> dtos) {

        return saveWeeklyStaffScheduleInternal(staffId, dtos);
    }

    @PutMapping("/staff/{staffId}/weekly")
    @PreAuthorize("hasRole('ADMIN') or @accessControl.canManageStaff(#staffId)")
    public ResponseEntity<?> updateWeeklyStaffSchedule(
            @PathVariable Long staffId,
            @RequestBody List<StaffScheduleDTO> dtos) {

        return saveWeeklyStaffScheduleInternal(staffId, dtos);
    }

    private ResponseEntity<?> saveWeeklyStaffScheduleInternal(Long staffId, List<StaffScheduleDTO> dtos) {
        ResponseEntity<?> authCheck = checkStaffAccess(staffId);
        if (authCheck != null) {
            return authCheck;
        }

        try {
            if (dtos == null || dtos.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body("Weekly schedule cannot be empty");
            }

            List<StaffSchedule> schedules =
                    dtos.stream()
                            .map(staffScheduleMapper::toEntity)
                            .collect(Collectors.toList());

            List<StaffSchedule> saved =
                    staffScheduleService
                            .saveOrUpdateWeeklyStaffSchedule(
                                    staffId,
                                    schedules.get(0).getWeekStartDate(),
                                    schedules
                            );

            return ResponseEntity
                    .ok(
                            saved.stream()
                                    .map(staffScheduleMapper::toDTO)
                                    .collect(Collectors.toList())
                    );

        } catch (RuntimeException e) {
            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // CREATE OR UPDATE WEEKLY DENTIST SCHEDULE
    // =========================================================

    @PostMapping("/dentist/{dentistId}/weekly")
    @PreAuthorize("hasRole('ADMIN') or @accessControl.canManageDentist(#dentistId)")
    public ResponseEntity<?> createWeeklyDentistSchedule(
            @PathVariable Long dentistId,
            @RequestBody List<StaffScheduleDTO> dtos) {

        return saveWeeklyDentistScheduleInternal(dentistId, dtos);
    }

    @PutMapping("/dentist/{dentistId}/weekly")
    @PreAuthorize("hasRole('ADMIN') or @accessControl.canManageDentist(#dentistId)")
    public ResponseEntity<?> updateWeeklyDentistSchedule(
            @PathVariable Long dentistId,
            @RequestBody List<StaffScheduleDTO> dtos) {

        return saveWeeklyDentistScheduleInternal(dentistId, dtos);
    }

    private ResponseEntity<?> saveWeeklyDentistScheduleInternal(Long dentistId, List<StaffScheduleDTO> dtos) {
        ResponseEntity<?> authCheck = checkDentistAccess(dentistId);
        if (authCheck != null) {
            return authCheck;
        }

        try {
            if (dtos == null || dtos.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body("Weekly schedule cannot be empty");
            }

            List<StaffSchedule> schedules =
                    dtos.stream()
                            .map(staffScheduleMapper::toEntity)
                            .collect(Collectors.toList());

            List<StaffSchedule> saved =
                    staffScheduleService
                            .saveOrUpdateWeeklyDentistSchedule(
                                    dentistId,
                                    schedules.get(0).getWeekStartDate(),
                                    schedules
                            );

            return ResponseEntity
                    .ok(
                            saved.stream()
                                    .map(staffScheduleMapper::toDTO)
                                    .collect(Collectors.toList())
                    );

        } catch (RuntimeException e) {
            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET ALL SCHEDULES
    // =========================================================

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<StaffScheduleDTO>>
    getAllSchedules() {

        List<StaffScheduleDTO> result =
                staffScheduleService
                        .getAllSchedules()
                        .stream()
                        .map(staffScheduleMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // GET SCHEDULE BY ID
    // =========================================================

    @GetMapping("/{id}")
    public ResponseEntity<?> getScheduleById(
            @PathVariable Long id) {

        ResponseEntity<?> authCheck = checkScheduleAccess(id);
        if (authCheck != null) {
            return authCheck;
        }

        try {

            StaffSchedule schedule =
                    staffScheduleService
                            .getScheduleById(id);

            return ResponseEntity.ok(
                    staffScheduleMapper.toDTO(schedule)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET ALL STAFF SCHEDULES
    // =========================================================

    @GetMapping("/staff/{staffId}")
    @PreAuthorize("hasRole('ADMIN') or @accessControl.canManageStaff(#staffId)")
    public ResponseEntity<?> getStaffSchedules(
            @PathVariable Long staffId) {

        ResponseEntity<?> authCheck = checkStaffAccess(staffId);
        if (authCheck != null) {
            return authCheck;
        }

        try {

            List<StaffScheduleDTO> result =
                    staffScheduleService
                            .getStaffSchedules(staffId)
                            .stream()
                            .map(staffScheduleMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET ALL DENTIST SCHEDULES
    // =========================================================

    @GetMapping("/dentist/{dentistId}")
    @PreAuthorize("hasRole('ADMIN') or @accessControl.canManageDentist(#dentistId)")
    public ResponseEntity<?> getDentistSchedules(
            @PathVariable Long dentistId) {

        ResponseEntity<?> authCheck = checkDentistAccess(dentistId);
        if (authCheck != null) {
            return authCheck;
        }

        try {

            List<StaffScheduleDTO> result =
                    staffScheduleService
                            .getDentistSchedules(dentistId)
                            .stream()
                            .map(staffScheduleMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET STAFF WEEKLY SCHEDULE
    // =========================================================

    @GetMapping("/staff/{staffId}/weekly")
    @PreAuthorize("hasRole('ADMIN') or @accessControl.canManageStaff(#staffId)")
    public ResponseEntity<?> getWeeklyStaffSchedule(
            @PathVariable Long staffId,
            @RequestParam(required = false)
            @DateTimeFormat(
                    iso = DateTimeFormat.ISO.DATE
            )
            LocalDate weekStartDate) {

        ResponseEntity<?> authCheck = checkStaffAccess(staffId);
        if (authCheck != null) {
            return authCheck;
        }

        try {

            List<StaffScheduleDTO> result =
                    staffScheduleService
                            .getOrCreateWeeklyStaffSchedule(
                                    staffId,
                                    weekStartDate
                            )
                            .stream()
                            .map(staffScheduleMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET STAFF EFFECTIVE SCHEDULE (SINGLE DATE & FULL WEEK)
    // =========================================================

    @GetMapping("/staff/{staffId}/effective")
    @PreAuthorize("hasRole('ADMIN') or @accessControl.canManageStaff(#staffId)")
    public ResponseEntity<?> getStaffEffectiveSchedule(
            @PathVariable Long staffId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date) {

        ResponseEntity<?> authCheck = checkStaffAccess(staffId);
        if (authCheck != null) {
            return authCheck;
        }

        try {
            StaffScheduleDTO result = staffScheduleService
                    .getEffectiveStaffSchedule(staffId, date != null ? date : LocalDate.now());
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/staff/{staffId}/effective-week")
    @PreAuthorize("hasRole('ADMIN') or @accessControl.canManageStaff(#staffId)")
    public ResponseEntity<?> getStaffEffectiveWeekSchedule(
            @PathVariable Long staffId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate weekStartDate) {

        ResponseEntity<?> authCheck = checkStaffAccess(staffId);
        if (authCheck != null) {
            return authCheck;
        }

        try {
            List<StaffScheduleDTO> result = staffScheduleService
                    .getEffectiveStaffWeekSchedule(staffId, weekStartDate != null ? weekStartDate : LocalDate.now());
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET DENTIST WEEKLY SCHEDULE
    // =========================================================

    @GetMapping("/dentist/{dentistId}/weekly")
    @PreAuthorize("hasRole('ADMIN') or @accessControl.canManageDentist(#dentistId)")
    public ResponseEntity<?> getWeeklyDentistSchedule(
            @PathVariable Long dentistId,
            @RequestParam(required = false)
            @DateTimeFormat(
                    iso = DateTimeFormat.ISO.DATE
            )
            LocalDate weekStartDate) {

        ResponseEntity<?> authCheck = checkDentistAccess(dentistId);
        if (authCheck != null) {
            return authCheck;
        }

        try {

            List<StaffScheduleDTO> result =
                    staffScheduleService
                            .getOrCreateWeeklyDentistSchedule(
                                    dentistId,
                                    weekStartDate
                            )
                            .stream()
                            .map(staffScheduleMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET STAFF SCHEDULES FOR DAY
    // =========================================================

    @GetMapping("/staff/{staffId}/day")
    @PreAuthorize("hasRole('ADMIN') or @accessControl.canManageStaff(#staffId)")
    public ResponseEntity<?> getStaffScheduleForDay(
            @PathVariable Long staffId,

            @RequestParam
            @DateTimeFormat(
                    iso = DateTimeFormat.ISO.DATE
            )
            LocalDate weekStartDate,

            @RequestParam DayOfWeek dayOfWeek) {

        ResponseEntity<?> authCheck = checkStaffAccess(staffId);
        if (authCheck != null) {
            return authCheck;
        }

        try {

            List<StaffScheduleDTO> result =
                    staffScheduleService
                            .getSchedulesForDay(
                                    staffId,
                                    weekStartDate,
                                    dayOfWeek
                            )
                            .stream()
                            .map(staffScheduleMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET DENTIST SCHEDULES FOR DAY
    // =========================================================

    @GetMapping("/dentist/{dentistId}/day")
    @PreAuthorize("hasRole('ADMIN') or @accessControl.canManageDentist(#dentistId)")
    public ResponseEntity<?> getDentistScheduleForDay(
            @PathVariable Long dentistId,

            @RequestParam
            @DateTimeFormat(
                    iso = DateTimeFormat.ISO.DATE
            )
            LocalDate weekStartDate,

            @RequestParam DayOfWeek dayOfWeek) {

        ResponseEntity<?> authCheck = checkDentistAccess(dentistId);
        if (authCheck != null) {
            return authCheck;
        }

        try {

            List<StaffScheduleDTO> result =
                    staffScheduleService
                            .getDentistSchedulesForDay(
                                    dentistId,
                                    weekStartDate,
                                    dayOfWeek
                            )
                            .stream()
                            .map(staffScheduleMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET STAFF SPECIFIC SHIFT
    // =========================================================

    @GetMapping("/staff/{staffId}/shift")
    @PreAuthorize("hasRole('ADMIN') or @accessControl.canManageStaff(#staffId)")
    public ResponseEntity<?> getStaffScheduleForShift(
            @PathVariable Long staffId,

            @RequestParam
            @DateTimeFormat(
                    iso = DateTimeFormat.ISO.DATE
            )
            LocalDate weekStartDate,

            @RequestParam DayOfWeek dayOfWeek,

            @RequestParam String shift) {

        ResponseEntity<?> authCheck = checkStaffAccess(staffId);
        if (authCheck != null) {
            return authCheck;
        }

        try {

            StaffSchedule schedule =
                    staffScheduleService
                            .getScheduleForShift(
                                    staffId,
                                    weekStartDate,
                                    dayOfWeek,
                                    shift
                            );

            return ResponseEntity.ok(
                    staffScheduleMapper.toDTO(schedule)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET DENTIST SPECIFIC SHIFT
    // =========================================================

    @GetMapping("/dentist/{dentistId}/shift")
    @PreAuthorize("hasRole('ADMIN') or @accessControl.canManageDentist(#dentistId)")
    public ResponseEntity<?> getDentistScheduleForShift(
            @PathVariable Long dentistId,

            @RequestParam
            @DateTimeFormat(
                    iso = DateTimeFormat.ISO.DATE
            )
            LocalDate weekStartDate,

            @RequestParam DayOfWeek dayOfWeek,

            @RequestParam String shift) {

        ResponseEntity<?> authCheck = checkDentistAccess(dentistId);
        if (authCheck != null) {
            return authCheck;
        }

        try {

            StaffSchedule schedule =
                    staffScheduleService
                            .getDentistScheduleForShift(
                                    dentistId,
                                    weekStartDate,
                                    dayOfWeek,
                                    shift
                            );

            return ResponseEntity.ok(
                    staffScheduleMapper.toDTO(schedule)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET STAFF WORKING SCHEDULES
    // =========================================================

    @GetMapping("/staff/{staffId}/working")
    @PreAuthorize("hasRole('ADMIN') or @accessControl.canManageStaff(#staffId)")
    public ResponseEntity<?> getWorkingSchedules(
            @PathVariable Long staffId) {

        ResponseEntity<?> authCheck = checkStaffAccess(staffId);
        if (authCheck != null) {
            return authCheck;
        }

        try {

            List<StaffScheduleDTO> result =
                    staffScheduleService
                            .getWorkingSchedules(staffId)
                            .stream()
                            .map(staffScheduleMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET DENTIST WORKING SCHEDULES
    // =========================================================

    @GetMapping("/dentist/{dentistId}/working")
    @PreAuthorize("hasRole('ADMIN') or @accessControl.canManageDentist(#dentistId)")
    public ResponseEntity<?> getWorkingDentistSchedules(
            @PathVariable Long dentistId) {

        ResponseEntity<?> authCheck = checkDentistAccess(dentistId);
        if (authCheck != null) {
            return authCheck;
        }

        try {

            List<StaffScheduleDTO> result =
                    staffScheduleService
                            .getWorkingDentistSchedules(
                                    dentistId
                            )
                            .stream()
                            .map(staffScheduleMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET SCHEDULES BY SHIFT
    // =========================================================

    @GetMapping("/shift")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getSchedulesByShift(
            @RequestParam String shift) {

        try {

            List<StaffScheduleDTO> result =
                    staffScheduleService
                            .getSchedulesByShift(shift)
                            .stream()
                            .map(staffScheduleMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // UPDATE SCHEDULE
    // =========================================================

    @PutMapping("/{id}")
    public ResponseEntity<?> updateSchedule(
            @PathVariable Long id,
            @RequestBody StaffScheduleDTO dto) {

        ResponseEntity<?> authCheck = checkScheduleAccess(id);
        if (authCheck != null) {
            return authCheck;
        }

        try {

            if (dto == null) {
                return ResponseEntity.badRequest()
                        .body("Schedule data is required");
            }

            StaffSchedule schedule =
                    staffScheduleMapper.toEntity(dto);

            StaffSchedule updated =
                    staffScheduleService.updateSchedule(
                            id,
                            schedule
                    );

            return ResponseEntity.ok(
                    staffScheduleMapper.toDTO(updated)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // MARK AS OFF DAY
    // =========================================================

    @PutMapping("/{id}/off-day")
    public ResponseEntity<?> markAsOffDay(
            @PathVariable Long id) {

        ResponseEntity<?> authCheck = checkScheduleAccess(id);
        if (authCheck != null) {
            return authCheck;
        }

        try {

            StaffSchedule schedule =
                    staffScheduleService
                            .markAsOffDay(id);

            return ResponseEntity.ok(
                    staffScheduleMapper.toDTO(schedule)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // DELETE SCHEDULE
    // =========================================================

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSchedule(
            @PathVariable Long id) {

        ResponseEntity<?> authCheck = checkScheduleAccess(id);
        if (authCheck != null) {
            return authCheck;
        }

        try {

            staffScheduleService.deleteSchedule(id);

            return ResponseEntity.ok(
                    "Schedule deleted successfully"
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // DELETE ALL STAFF SCHEDULES
    // =========================================================

    @DeleteMapping("/staff/{staffId}")
    @PreAuthorize("hasRole('ADMIN') or @accessControl.canManageStaff(#staffId)")
    public ResponseEntity<?> deleteStaffSchedules(
            @PathVariable Long staffId) {

        ResponseEntity<?> authCheck = checkStaffAccess(staffId);
        if (authCheck != null) {
            return authCheck;
        }

        try {

            staffScheduleService
                    .deleteStaffSchedules(staffId);

            return ResponseEntity.ok(
                    "All staff schedules deleted successfully"
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // DELETE ALL DENTIST SCHEDULES
    // =========================================================

    @DeleteMapping("/dentist/{dentistId}")
    @PreAuthorize("hasRole('ADMIN') or @accessControl.canManageDentist(#dentistId)")
    public ResponseEntity<?> deleteDentistSchedules(
            @PathVariable Long dentistId) {

        ResponseEntity<?> authCheck = checkDentistAccess(dentistId);
        if (authCheck != null) {
            return authCheck;
        }

        try {

            staffScheduleService
                    .deleteDentistSchedules(dentistId);

            return ResponseEntity.ok(
                    "All dentist schedules deleted successfully"
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // SEND WEEKLY SCHEDULE EMAIL FOR DENTIST
    // =========================================================

    @PostMapping("/dentist/{dentistId}/send-email")
    @PreAuthorize("hasRole('ADMIN') or @accessControl.canManageDentist(#dentistId)")
    public ResponseEntity<?> sendWeeklyScheduleEmailForDentist(
            @PathVariable Long dentistId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate weekStartDate,
            @RequestParam(required = false, defaultValue = "false")
            boolean force) {

        ResponseEntity<?> authCheck = checkDentistAccess(dentistId);
        if (authCheck != null) {
            return authCheck;
        }

        try {
            boolean sent = staffScheduleService.sendWeeklyScheduleEmailForDentist(dentistId, weekStartDate, force);
            return ResponseEntity.ok(Map.of(
                    "success", sent,
                    "dentistId", dentistId,
                    "message", sent
                            ? "Weekly schedule email sent successfully"
                            : "Email skipped (schedule already sent for this week or doctor email not configured)"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // SEND WEEKLY SCHEDULE EMAIL FOR STAFF
    // =========================================================

    @PostMapping("/staff/{staffId}/send-email")
    @PreAuthorize("hasRole('ADMIN') or @accessControl.canManageStaff(#staffId)")
    public ResponseEntity<?> sendWeeklyScheduleEmailForStaff(
            @PathVariable Long staffId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate weekStartDate,
            @RequestParam(required = false, defaultValue = "false")
            boolean force) {

        ResponseEntity<?> authCheck = checkStaffAccess(staffId);
        if (authCheck != null) {
            return authCheck;
        }

        try {
            boolean sent = staffScheduleService.sendWeeklyScheduleEmailForStaff(staffId, weekStartDate, force);
            return ResponseEntity.ok(Map.of(
                    "success", sent,
                    "staffId", staffId,
                    "message", sent
                            ? "Weekly schedule email sent successfully"
                            : "Email skipped (schedule already sent for this week or staff email not configured)"
            ));
        } catch (RuntimeException e) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // TRIGGER WEEKLY BROADCAST TO ALL DOCTORS & STAFF
    // =========================================================

    @PostMapping("/trigger-weekly-emails")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> triggerWeeklyEmails(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate weekStartDate,
            @RequestParam(required = false, defaultValue = "false")
            boolean force) {

        try {
            Map<String, Object> result;
            if (weeklyScheduleScheduler != null) {
                result = weeklyScheduleScheduler.triggerBroadcast(weekStartDate, force);
            } else {
                result = staffScheduleService.sendWeeklySchedulesToEveryone(weekStartDate, force);
            }
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // AUTOMATION MANAGEMENT (ADMIN)
    // =========================================================

    @GetMapping("/automation/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAutomationStatus() {
        if (weeklyScheduleScheduler == null) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "Weekly schedule scheduler not available"));
        }
        return ResponseEntity.ok(weeklyScheduleScheduler.getAutomationStatus());
    }

    @PostMapping("/automation/toggle")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> toggleAutomation(
            @RequestParam(required = false) Boolean enabled) {
        if (weeklyScheduleScheduler == null) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "Weekly schedule scheduler not available"));
        }
        if (enabled != null) {
            weeklyScheduleScheduler.setEnabled(enabled);
        } else {
            weeklyScheduleScheduler.setEnabled(!weeklyScheduleScheduler.isEnabled());
        }
        return ResponseEntity.ok(weeklyScheduleScheduler.getAutomationStatus());
    }

    @PostMapping("/automation/run-now")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> runAutomationNow(
            @RequestParam(required = false, defaultValue = "false") boolean force) {
        if (weeklyScheduleScheduler == null) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "Weekly schedule scheduler not available"));
        }
        try {
            Map<String, Object> result = weeklyScheduleScheduler.triggerBroadcast(null, force);
            Map<String, Object> status = weeklyScheduleScheduler.getAutomationStatus();
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Weekly schedule broadcast executed successfully",
                    "result", result,
                    "automation", status
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }
}
