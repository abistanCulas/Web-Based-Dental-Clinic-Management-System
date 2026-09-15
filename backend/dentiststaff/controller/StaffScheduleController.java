package com.dentalclinic.dentiststaff.controller;

import com.dentalclinic.dentiststaff.dto.StaffScheduleDTO;
import com.dentalclinic.dentiststaff.service.StaffScheduleService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/staff/{staffId}/schedule")
public class StaffScheduleController {

    private final StaffScheduleService staffScheduleService;

    public StaffScheduleController(StaffScheduleService staffScheduleService) {
        this.staffScheduleService = staffScheduleService;
    }

    @PostMapping
    public ResponseEntity<StaffScheduleDTO> addSchedule(@PathVariable Long staffId,
                                                          @Valid @RequestBody StaffScheduleDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(staffScheduleService.addSchedule(staffId, dto));
    }

    @GetMapping
    public ResponseEntity<List<StaffScheduleDTO>> getSchedule(@PathVariable Long staffId) {
        return ResponseEntity.ok(staffScheduleService.getScheduleForStaff(staffId));
    }

    @PutMapping("/{scheduleId}")
    public ResponseEntity<StaffScheduleDTO> updateSchedule(@PathVariable Long staffId,
                                                             @PathVariable Long scheduleId,
                                                             @Valid @RequestBody StaffScheduleDTO dto) {
        return ResponseEntity.ok(staffScheduleService.updateSchedule(staffId, scheduleId, dto));
    }

    @DeleteMapping("/{scheduleId}")
    public ResponseEntity<Void> deleteSchedule(@PathVariable Long staffId, @PathVariable Long scheduleId) {
        staffScheduleService.deleteSchedule(staffId, scheduleId);
        return ResponseEntity.noContent().build();
    }
}
