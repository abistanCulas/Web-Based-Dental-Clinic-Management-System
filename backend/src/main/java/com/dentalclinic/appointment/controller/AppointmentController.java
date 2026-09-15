package com.dentalclinic.appointment.controller;

import com.dentalclinic.appointment.dto.AppointmentRequest;
import com.dentalclinic.appointment.dto.RescheduleRequest;
import com.dentalclinic.appointment.model.Appointment;
import com.dentalclinic.appointment.service.AppointmentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/*
 * MERGE NOTE FOR TEAM LEADER:
 * Keep this module under /api/appointments to avoid conflicts with other modules.
 */
@RestController
@RequestMapping("/api/appointments")
@CrossOrigin(origins = "*") // Development only; restrict origins in the final integrated system.
public class AppointmentController {
    private final AppointmentService service;

    public AppointmentController(AppointmentService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Appointment create(@Valid @RequestBody AppointmentRequest request) {
        return service.createAppointment(request);
    }

    @GetMapping
    public List<Appointment> getAll() { return service.getAllAppointments(); }

    @GetMapping("/{id}")
    public Appointment getOne(@PathVariable Long id) { return service.getAppointment(id); }

    @PutMapping("/{id}/reschedule")
    public Appointment reschedule(@PathVariable Long id, @Valid @RequestBody RescheduleRequest request) {
        return service.reschedule(id, request);
    }

    @PutMapping("/{id}/cancel")
    public Appointment cancel(@PathVariable Long id) { return service.cancelAppointment(id); }

    @PutMapping("/{id}/check-in")
    public Appointment checkIn(@PathVariable Long id) { return service.checkIn(id); }

    @GetMapping("/queue")
    public List<Appointment> queue() { return service.getTodayQueue(); }

    @PutMapping("/{id}/complete")
    public Appointment complete(@PathVariable Long id) { return service.completeAppointment(id); }

    @GetMapping("/upcoming")
    public List<Appointment> upcoming() { return service.getUpcomingAppointments(); }
}
