package com.dentalclinic.dentiststaff.repository;

import com.dentalclinic.dentiststaff.model.Dentist;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DentistRepository extends JpaRepository<Dentist, Long> {

    Optional<Dentist> findByEmail(String email);

    Optional<Dentist> findByLicenseNumber(String licenseNumber);

    boolean existsByEmail(String email);

    boolean existsByLicenseNumber(String licenseNumber);
}
