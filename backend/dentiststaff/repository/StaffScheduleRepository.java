package com.dentalclinic.dentiststaff.repository;

import com.dentalclinic.dentiststaff.model.StaffSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StaffScheduleRepository extends JpaRepository<StaffSchedule, Long> {

    List<StaffSchedule> findByStaffId(Long staffId);

    void deleteByIdAndStaffId(Long id, Long staffId);
}
