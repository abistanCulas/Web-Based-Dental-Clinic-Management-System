package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.DentalService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DentalServiceRepository extends JpaRepository<DentalService, Long> {

    List<DentalService> findByStatusIgnoreCase(String status);

    List<DentalService> findByStatusIgnoreCaseOrderByNameAsc(String status);

    List<DentalService> findAllByOrderByIdDesc();

    Optional<DentalService> findByServiceCode(String serviceCode);

    boolean existsByServiceCode(String serviceCode);

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}
