package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository
        extends JpaRepository<Review, Long> {

    boolean existsByPatientIdAndDentistId(
            Long patientId,
            Long dentistId
    );

    List<Review> findByDentistIdOrderByIdDesc(
            Long dentistId
    );

    List<Review> findByPatientIdOrderByIdDesc(
            Long patientId
    );

    List<Review> findByRating(
            Integer rating
    );

    List<Review> findByStatusIgnoreCase(
            String status
    );

    List<Review> findByDentistIdAndStatusIgnoreCase(
            Long dentistId,
            String status
    );
}