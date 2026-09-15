package com.dentalclinic.appointment.repository;

import com.dentalclinic.appointment.model.Appointment;
import com.dentalclinic.appointment.model.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    boolean existsByDentistIdAndAppointmentDateAndAppointmentTimeAndStatusNot(
        Long dentistId, LocalDate appointmentDate, LocalTime appointmentTime, AppointmentStatus status);

    List<Appointment> findByAppointmentDateOrderByAppointmentTimeAsc(LocalDate date);

    List<Appointment> findByAppointmentDateAndQueueNumberIsNotNullOrderByQueueNumberAsc(LocalDate date);

    List<Appointment> findByAppointmentDateBetweenOrderByAppointmentDateAscAppointmentTimeAsc(
        LocalDate startDate, LocalDate endDate);
}
