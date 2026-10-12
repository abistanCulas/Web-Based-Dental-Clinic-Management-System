package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.ReviewDTO;
import com.dentaflow.backend.entity.Dentist;
import com.dentaflow.backend.entity.Patient;
import com.dentaflow.backend.entity.Review;
import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.repository.DentistRepository;
import com.dentaflow.backend.repository.PatientRepository;
import com.dentaflow.backend.repository.UserRepository;
import com.dentaflow.backend.security.JwtService;
import com.dentaflow.backend.service.ReviewService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewService reviewService;
    private final PatientRepository patientRepository;
    private final DentistRepository dentistRepository;
    private final UserRepository userRepository;
    private final JwtService jwtService;

    public ReviewController(
            ReviewService reviewService,
            PatientRepository patientRepository,
            DentistRepository dentistRepository,
            UserRepository userRepository,
            JwtService jwtService) {
        this.reviewService = reviewService;
        this.patientRepository = patientRepository;
        this.dentistRepository = dentistRepository;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
    }

    // =========================================================
    // PUBLIC: GET ACTIVE REVIEWS (No auth required)
    // =========================================================

    @GetMapping("/public")
    public ResponseEntity<List<ReviewDTO>> getPublicReviews() {
        List<Review> active = reviewService.getActiveReviews();
        return ResponseEntity.ok(active.stream().map(this::toDTO).collect(Collectors.toList()));
    }

    // =========================================================
    // GET ALL REVIEWS (Admin / Staff / Doctor)
    // =========================================================

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'DOCTOR')")
    public ResponseEntity<List<ReviewDTO>> getAllReviews() {
        List<Review> all = reviewService.getAllReviews();
        return ResponseEntity.ok(all.stream().map(this::toDTO).collect(Collectors.toList()));
    }

    // =========================================================
    // GET REVIEWS FOR A DENTIST
    // =========================================================

    @GetMapping("/dentist/{dentistId}")
    public ResponseEntity<List<ReviewDTO>> getDentistReviews(@PathVariable Long dentistId) {
        List<Review> reviews = reviewService.getDentistReviews(dentistId);
        return ResponseEntity.ok(reviews.stream().map(this::toDTO).collect(Collectors.toList()));
    }

    // =========================================================
    // GET MY REVIEWS (Logged-in Patient)
    // =========================================================

    @GetMapping("/my")
    public ResponseEntity<?> getMyReviews(
            @RequestHeader("Authorization") String authorizationHeader) {
        try {
            Long userId = extractUserId(authorizationHeader);
            Patient patient = patientRepository.findByUserId(userId)
                    .orElse(null);

            if (patient == null) {
                return ResponseEntity.ok(List.of());
            }

            List<Review> reviews = reviewService.getPatientReviews(patient.getId());
            return ResponseEntity.ok(reviews.stream().map(this::toDTO).collect(Collectors.toList()));

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET REVIEW BY ID
    //
    // Authorization FAILS CLOSED:
    //   - No Bearer token  -> only ACTIVE reviews are returned (public access).
    //   - Bearer token present but invalid/expired/malformed/unusable
    //     -> 401 UNAUTHORIZED, the review is NEVER returned.
    //   - Valid token      -> non-ACTIVE reviews are only returned to
    //     ADMIN / STAFF / DOCTOR staff or the review owner; everyone
    //     else gets 403 FORBIDDEN.
    // Token-processing exceptions are converted to failures (401), never
    // swallowed, so execution can never fall through to a successful read.
    // =========================================================

    @GetMapping("/{id}")
    public ResponseEntity<?> getReviewById(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        try {
            Review review = reviewService.getReviewById(id);
            boolean isActive = "ACTIVE".equalsIgnoreCase(review.getStatus());

            if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
                if (!isActive) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "You do not have permission to view this review"));
                }
                return ResponseEntity.ok(toDTO(review));
            }

            Long userId;
            try {
                userId = extractUserId(authorizationHeader);
            } catch (RuntimeException e) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Invalid or expired token"));
            }
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Invalid or expired token"));
            }

            User user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "User not found"));
            }

            if (!isActive) {
                boolean isStaffOrAdmin = user.getRole() != null &&
                        (user.getRole().getName().contains("ADMIN")
                                || user.getRole().getName().contains("STAFF")
                                || user.getRole().getName().contains("DOCTOR"));
                boolean isOwner = review.getPatient() != null && review.getPatient().getUser() != null
                        && review.getPatient().getUser().getId().equals(userId);

                if (!isStaffOrAdmin && !isOwner) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "You do not have permission to view this review"));
                }
            }

            return ResponseEntity.ok(toDTO(review));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // CREATE REVIEW (Patient CRUD - Immediate ACTIVE status, NO approval)
    // =========================================================

    @PostMapping
    public ResponseEntity<?> createReview(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestBody ReviewDTO dto) {

        try {
            if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required to submit a review"));
            }

            Long userId;
            try {
                userId = extractUserId(authorizationHeader);
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid or expired token"));
            }

            User user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not found"));
            }

            String roleName = user.getRole() != null ? user.getRole().getName() : null;
            boolean isPatientRole = roleName != null
                    && (roleName.equalsIgnoreCase("PATIENT")
                            || roleName.equalsIgnoreCase("ROLE_PATIENT"));
            if (!isPatientRole) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Only a patient can submit a review"));
            }

            if (dto == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Review data is required"));
            }

            if (dto.getRating() == null || dto.getRating() < 1 || dto.getRating() > 5) {
                return ResponseEntity.badRequest().body(Map.of("error", "Rating must be an integer between 1 and 5"));
            }

            if (dto.getComment() == null || dto.getComment().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Review comment is required"));
            }

            Long patientId = null;
            Patient p = patientRepository.findByUserId(userId).orElse(null);
            if (p != null) {
                patientId = p.getId();
            }

            if (patientId == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Patient profile required to submit a review"));
            }

            Long dentistId = dto.getDentistId();
            if (dentistId == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Dentist selection is required"));
            }

            if (!dentistRepository.existsById(dentistId)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Dentist not found with id: " + dentistId));
            }

            Review review = new Review();
            review.setRating(dto.getRating());
            review.setComment(dto.getComment().trim());
            // NO ADMIN APPROVAL: reviews are ACTIVE immediately upon creation
            review.setStatus("ACTIVE");

            Review created = reviewService.createReview(patientId, dentistId, review);
            return ResponseEntity.status(HttpStatus.CREATED).body(toDTO(created));

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // UPDATE REVIEW (Patient edit own review or Admin)
    // =========================================================

    @PutMapping("/{id}")
    public ResponseEntity<?> updateReview(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestBody ReviewDTO dto) {

        try {
            if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
            }

            Long userId;
            try {
                userId = extractUserId(authorizationHeader);
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid or expired token"));
            }

            User user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not found"));
            }

            Review existing = reviewService.getReviewById(id);

            boolean isAdmin = user.getRole() != null && "ADMIN".equalsIgnoreCase(user.getRole().getName());
            boolean isOwner = existing.getPatient() != null && existing.getPatient().getUser() != null
                    && existing.getPatient().getUser().getId().equals(userId);

            if (!isAdmin && !isOwner) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You do not have permission to modify this review"));
            }

            if (dto.getRating() != null && (dto.getRating() < 1 || dto.getRating() > 5)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Rating must be between 1 and 5"));
            }

            if (dto.getComment() != null && dto.getComment().trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Comment cannot be empty"));
            }

            Review updatedFields = new Review();
            if (dto.getRating() != null) updatedFields.setRating(dto.getRating());
            if (dto.getComment() != null) updatedFields.setComment(dto.getComment().trim());
            if (dto.getStatus() != null) updatedFields.setStatus(dto.getStatus().trim().toUpperCase());

            Review saved = reviewService.updateReview(id, updatedFields);
            return ResponseEntity.ok(toDTO(saved));

        } catch (RuntimeException e) {
            HttpStatus status = e.getMessage() != null && e.getMessage().toLowerCase().contains("not found")
                    ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
            return ResponseEntity.status(status).body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // DELETE REVIEW (Patient delete own review or Admin)
    // =========================================================

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteReview(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {

        try {
            if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
            }

            Long userId;
            try {
                userId = extractUserId(authorizationHeader);
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid or expired token"));
            }

            User user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not found"));
            }

            Review existing = reviewService.getReviewById(id);

            boolean isAdmin = user.getRole() != null && "ADMIN".equalsIgnoreCase(user.getRole().getName());
            boolean isOwner = existing.getPatient() != null && existing.getPatient().getUser() != null
                    && existing.getPatient().getUser().getId().equals(userId);

            if (!isAdmin && !isOwner) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You do not have permission to delete this review"));
            }

            reviewService.deleteReview(id);
            return ResponseEntity.ok(Map.of("success", true, "message", "Review deleted successfully"));

        } catch (RuntimeException e) {
            HttpStatus status = e.getMessage() != null && e.getMessage().toLowerCase().contains("not found")
                    ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
            return ResponseEntity.status(status).body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // MODERATE REVIEW: HIDE (Admin only)
    // =========================================================

    @PutMapping("/{id}/hide")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> hideReview(@PathVariable Long id) {
        try {
            Review hidden = reviewService.hideReview(id);
            return ResponseEntity.ok(toDTO(hidden));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // MODERATE REVIEW: ACTIVATE (Admin only)
    // =========================================================

    @PutMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> activateReview(@PathVariable Long id) {
        try {
            Review activated = reviewService.activateReview(id);
            return ResponseEntity.ok(toDTO(activated));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // HELPER: Convert Entity to DTO
    // =========================================================

    private ReviewDTO toDTO(Review review) {
        if (review == null) return null;

        Long patientId = null;
        String patientName = "Anonymous Patient";
        String patientEmail = null;
        if (review.getPatient() != null) {
            patientId = review.getPatient().getId();
            patientName = (review.getPatient().getFirstName() + " "
                    + (review.getPatient().getLastName() != null ? review.getPatient().getLastName() : "")).trim();
            patientEmail = review.getPatient().getEmail();
        }

        Long dentistId = null;
        String dentistName = "Dental Specialist";
        if (review.getDentist() != null) {
            dentistId = review.getDentist().getId();
            dentistName = "Dr. " + (review.getDentist().getFirstName() + " "
                    + (review.getDentist().getLastName() != null ? review.getDentist().getLastName() : "")).trim();
        }

        return ReviewDTO.builder()
                .id(review.getId())
                .patientId(patientId)
                .patientName(patientName)
                .patientEmail(patientEmail)
                .dentistId(dentistId)
                .dentistName(dentistName)
                .rating(review.getRating())
                .comment(review.getComment())
                .status(review.getStatus())
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .build();
    }

    private Long extractUserId(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Authorization token is required");
        }
        return jwtService.extractUserId(authorizationHeader.substring(7).trim());
    }
}
