package com.dentalclinic.dentiststaff.controller;

import com.dentalclinic.dentiststaff.dto.AvailabilityScheduleDTO;
import com.dentalclinic.dentiststaff.service.AvailabilityService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/dentists/{dentistId}/availability")
public class AvailabilityController {

    private final AvailabilityService availabilityService;

    public AvailabilityController(AvailabilityService availabilityService) {
        this.availabilityService = availabilityService;
    }

    @PostMapping
    public ResponseEntity<AvailabilityScheduleDTO> addAvailability(@PathVariable Long dentistId,
                                                                     @Valid @RequestBody AvailabilityScheduleDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(availabilityService.addAvailability(dentistId, dto));
    }

    @GetMapping
    public ResponseEntity<List<AvailabilityScheduleDTO>> getAvailability(@PathVariable Long dentistId) {
        return ResponseEntity.ok(availabilityService.getAvailabilityForDentist(dentistId));
    }

    @PutMapping("/{scheduleId}")
    public ResponseEntity<AvailabilityScheduleDTO> updateAvailability(@PathVariable Long dentistId,
                                                                        @PathVariable Long scheduleId,
                                                                        @Valid @RequestBody AvailabilityScheduleDTO dto) {
        return ResponseEntity.ok(availabilityService.updateAvailability(dentistId, scheduleId, dto));
    }

    @DeleteMapping("/{scheduleId}")
    public ResponseEntity<Void> deleteAvailability(@PathVariable Long dentistId, @PathVariable Long scheduleId) {
        availabilityService.deleteAvailability(dentistId, scheduleId);
        return ResponseEntity.noContent().build();
    }
}
