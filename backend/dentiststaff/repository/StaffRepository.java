package com.dentalclinic.dentiststaff.repository;

import com.dentalclinic.dentiststaff.model.Staff;
import com.dentalclinic.dentiststaff.model.enums.StaffRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StaffRepository extends JpaRepository<Staff, Long> {

    Optional<Staff> findByEmail(String email);

    boolean existsByEmail(String email);

    List<Staff> findByRole(StaffRole role);
}
