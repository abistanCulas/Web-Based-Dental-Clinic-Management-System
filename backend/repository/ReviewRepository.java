package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.Review;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository
        extends JpaRepository<Review, Long> {

    boolean existsByPatientIdAndDentistId(
            Long patientId,
            Long dentistId
    );

    boolean existsByDentistId(
            Long dentistId
    );

    /**
     * Loads a review together with the patient, the patient's user account
     * (needed by the controller to evaluate review-owner authorization outside
     * the transaction) and the dentist (needed to render the review DTO).
     */
    @EntityGraph(attributePaths = {"patient", "patient.user", "dentist"})
    Optional<Review> findDetailedById(Long id);

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

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Review r SET r.dentist = null WHERE r.dentist.id = :dentistId")
    void unlinkDentist(@org.springframework.data.repository.query.Param("dentistId") Long dentistId);
}