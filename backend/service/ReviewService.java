package com.dentaflow.backend.service;

import com.dentaflow.backend.entity.Dentist;
import com.dentaflow.backend.entity.Patient;
import com.dentaflow.backend.entity.Review;
import com.dentaflow.backend.repository.DentistRepository;
import com.dentaflow.backend.repository.PatientRepository;
import com.dentaflow.backend.repository.ReviewRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final PatientRepository patientRepository;
    private final DentistRepository dentistRepository;

    public ReviewService(
            ReviewRepository reviewRepository,
            PatientRepository patientRepository,
            DentistRepository dentistRepository) {

        this.reviewRepository = reviewRepository;
        this.patientRepository = patientRepository;
        this.dentistRepository = dentistRepository;
    }

    // =========================================================
    // CREATE REVIEW
    // =========================================================

    public Review createReview(
            Long patientId,
            Long dentistId,
            Review review) {

        if (review == null) {
            throw new RuntimeException(
                    "Review data is required"
            );
        }

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Patient not found with id: " + patientId
                        ));

        Dentist dentist = dentistRepository.findById(dentistId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Dentist not found with id: " + dentistId
                        ));

        if (review.getRating() == null) {
            throw new RuntimeException(
                    "Rating is required"
            );
        }

        if (review.getRating() < 1 ||
                review.getRating() > 5) {

            throw new RuntimeException(
                    "Rating must be between 1 and 5"
            );
        }

        if (review.getComment() == null ||
                review.getComment().trim().isEmpty()) {

            throw new RuntimeException(
                    "Review comment is required"
            );
        }

        // Prevent duplicate review
        if (reviewRepository
                .existsByPatientIdAndDentistId(
                        patientId,
                        dentistId
                )) {

            throw new RuntimeException(
                    "Patient has already reviewed this dentist"
            );
        }

        review.setPatient(patient);
        review.setDentist(dentist);

        review.setComment(
                review.getComment().trim()
        );

        if (review.getStatus() == null ||
                review.getStatus().trim().isEmpty()) {

            review.setStatus("ACTIVE");
        }

        return reviewRepository.save(review);
    }

    // =========================================================
    // GET ALL REVIEWS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Review> getAllReviews() {
        return reviewRepository.findAll();
    }

    // =========================================================
    // GET REVIEW BY ID
    // =========================================================

    @Transactional(readOnly = true)
    public Review getReviewById(Long id) {

        return reviewRepository.findDetailedById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Review not found with id: " + id
                        ));
    }

    // =========================================================
    // GET DENTIST REVIEWS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Review> getDentistReviews(
            Long dentistId) {

        dentistRepository.findById(dentistId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Dentist not found with id: "
                                        + dentistId
                        ));

        return reviewRepository
                .findByDentistIdOrderByIdDesc(
                        dentistId
                );
    }

    // =========================================================
    // GET PATIENT REVIEWS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Review> getPatientReviews(
            Long patientId) {

        patientRepository.findById(patientId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Patient not found with id: "
                                        + patientId
                        ));

        return reviewRepository
                .findByPatientIdOrderByIdDesc(
                        patientId
                );
    }

    // =========================================================
    // GET REVIEWS BY RATING
    // =========================================================

    @Transactional(readOnly = true)
    public List<Review> getReviewsByRating(
            Integer rating) {

        if (rating == null ||
                rating < 1 ||
                rating > 5) {

            throw new RuntimeException(
                    "Rating must be between 1 and 5"
            );
        }

        return reviewRepository.findByRating(
                rating
        );
    }

    // =========================================================
    // GET ACTIVE REVIEWS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Review> getActiveReviews() {

        return reviewRepository
                .findByStatusIgnoreCase("ACTIVE");
    }

    // =========================================================
    // CALCULATE DENTIST AVERAGE RATING
    // =========================================================

    @Transactional(readOnly = true)
    public Double getAverageRating(
            Long dentistId) {

        dentistRepository.findById(dentistId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Dentist not found with id: "
                                        + dentistId
                        ));

        List<Review> reviews =
                reviewRepository
                        .findByDentistIdAndStatusIgnoreCase(
                                dentistId,
                                "ACTIVE"
                        );

        if (reviews == null ||
                reviews.isEmpty()) {

            return 0.0;
        }

        double total = 0;

        int count = 0;

        for (Review review : reviews) {

            if (review.getRating() != null) {

                total += review.getRating();

                count++;
            }
        }

        if (count == 0) {
            return 0.0;
        }

        return total / count;
    }

    // =========================================================
    // UPDATE REVIEW
    // =========================================================

    public Review updateReview(
            Long id,
            Review updatedReview) {

        Review existing =
                getReviewById(id);

        if (updatedReview == null) {
            throw new RuntimeException(
                    "Review data is required"
            );
        }

        if (updatedReview.getRating() != null) {

            if (updatedReview.getRating() < 1 ||
                    updatedReview.getRating() > 5) {

                throw new RuntimeException(
                        "Rating must be between 1 and 5"
                );
            }

            existing.setRating(
                    updatedReview.getRating()
            );
        }

        if (updatedReview.getComment() != null &&
                !updatedReview.getComment()
                        .trim()
                        .isEmpty()) {

            existing.setComment(
                    updatedReview
                            .getComment()
                            .trim()
            );
        }

        if (updatedReview.getStatus() != null) {

            existing.setStatus(
                    updatedReview
                            .getStatus()
                            .trim()
                            .toUpperCase()
            );
        }

        return reviewRepository.save(existing);
    }

    // =========================================================
    // ACTIVATE REVIEW
    // =========================================================

    public Review activateReview(Long id) {

        Review review =
                getReviewById(id);

        review.setStatus("ACTIVE");

        return reviewRepository.save(review);
    }

    // =========================================================
    // HIDE REVIEW
    // =========================================================

    public Review hideReview(Long id) {

        Review review =
                getReviewById(id);

        review.setStatus("HIDDEN");

        return reviewRepository.save(review);
    }

    // =========================================================
    // DELETE REVIEW
    // =========================================================

    public void deleteReview(Long id) {

        Review review =
                getReviewById(id);

        reviewRepository.delete(review);
    }
}