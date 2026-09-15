package com.dentalclinic.appointment.service;

import com.dentalclinic.appointment.dto.AppointmentRequest;
import com.dentalclinic.appointment.dto.RescheduleRequest;
import com.dentalclinic.appointment.exception.AppointmentNotFoundException;
import com.dentalclinic.appointment.model.Appointment;
import com.dentalclinic.appointment.model.AppointmentStatus;
import com.dentalclinic.appointment.repository.AppointmentRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.util.List;

@Service
public class AppointmentService {
    private final AppointmentRepository repository;

    public AppointmentService(AppointmentRepository repository) {
        this.repository = repository;
    }

    // US13 - Book appointment
    public Appointment createAppointment(AppointmentRequest request) {
        boolean booked = repository.existsByDentistIdAndAppointmentDateAndAppointmentTimeAndStatusNot(
            request.getDentistId(), request.getAppointmentDate(),
            request.getAppointmentTime(), AppointmentStatus.CANCELLED);

        if (booked) throw new IllegalArgumentException("The dentist already has an appointment at this time.");

        Appointment a = new Appointment();
        a.setPatientId(request.getPatientId());
        a.setDentistId(request.getDentistId());
        a.setAppointmentDate(request.getAppointmentDate());
        a.setAppointmentTime(request.getAppointmentTime());
        a.setReason(request.getReason());
        a.setStatus(AppointmentStatus.SCHEDULED);
        return repository.save(a);
    }

    public List<Appointment> getAllAppointments() { return repository.findAll(); }

    public Appointment getAppointment(Long id) {
        return repository.findById(id)
            .orElseThrow(() -> new AppointmentNotFoundException("Appointment not found with ID: " + id));
    }

    // US14 - Reschedule appointment
    public Appointment reschedule(Long id, RescheduleRequest request) {
        Appointment a = getAppointment(id);
        boolean booked = repository.existsByDentistIdAndAppointmentDateAndAppointmentTimeAndStatusNot(
            a.getDentistId(), request.getAppointmentDate(),
            request.getAppointmentTime(), AppointmentStatus.CANCELLED);

        if (booked) throw new IllegalArgumentException("Selected appointment time is not available.");

        a.setAppointmentDate(request.getAppointmentDate());
        a.setAppointmentTime(request.getAppointmentTime());
        return repository.save(a);
    }

    public Appointment cancelAppointment(Long id) {
        Appointment a = getAppointment(id);
        a.setStatus(AppointmentStatus.CANCELLED);
        a.setQueueNumber(null);
        return repository.save(a);
    }

    // US15 - Queue management
    public Appointment checkIn(Long id) {
        Appointment a = getAppointment(id);
        if (!a.getAppointmentDate().equals(LocalDate.now()))
            throw new IllegalArgumentException("Only today's appointments can check in.");

        List<Appointment> queue =
            repository.findByAppointmentDateAndQueueNumberIsNotNullOrderByQueueNumberAsc(LocalDate.now());

        a.setQueueNumber(queue.size() + 1);
        a.setStatus(AppointmentStatus.IN_QUEUE);
        return repository.save(a);
    }

    public List<Appointment> getTodayQueue() {
        return repository.findByAppointmentDateAndQueueNumberIsNotNullOrderByQueueNumberAsc(LocalDate.now());
    }

    public Appointment completeAppointment(Long id) {
        Appointment a = getAppointment(id);
        a.setStatus(AppointmentStatus.COMPLETED);
        return repository.save(a);
    }

    // US16 - In-system upcoming appointment reminders
    public List<Appointment> getUpcomingAppointments() {
        LocalDate today = LocalDate.now();
        return repository.findByAppointmentDateBetweenOrderByAppointmentDateAscAppointmentTimeAsc(
            today, today.plusDays(2));
    }
}
