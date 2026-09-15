package com.dentalclinic.dentiststaff.repository;

import com.dentalclinic.dentiststaff.model.AvailabilitySchedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AvailabilityScheduleRepository extends JpaRepository<AvailabilitySchedule, Long> {

    List<AvailabilitySchedule> findByDentistId(Long dentistId);

    void deleteByIdAndDentistId(Long id, Long dentistId);
}
