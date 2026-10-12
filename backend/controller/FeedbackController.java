package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.FeedbackDTO;
import com.dentaflow.backend.entity.Appointment;
import com.dentaflow.backend.entity.Feedback;
import com.dentaflow.backend.entity.Patient;
import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.mapper.FeedbackMapper;
import com.dentaflow.backend.repository.AppointmentRepository;
import com.dentaflow.backend.repository.DentistRepository;
import com.dentaflow.backend.repository.PatientRepository;
import com.dentaflow.backend.repository.UserRepository;
import com.dentaflow.backend.security.AccessControlService;
import com.dentaflow.backend.security.JwtService;
import com.dentaflow.backend.service.FeedbackService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/feedback")
public class FeedbackController {

    private final FeedbackService feedbackService;
    private final FeedbackMapper feedbackMapper;
    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final DentistRepository dentistRepository;
    private final AppointmentRepository appointmentRepository;
    private final JwtService jwtService;
    private final AccessControlService accessControlService;

    @Autowired
    public FeedbackController(
            FeedbackService feedbackService,
            FeedbackMapper feedbackMapper,
            UserRepository userRepository,
            PatientRepository patientRepository,
            DentistRepository dentistRepository,
            AppointmentRepository appointmentRepository,
            JwtService jwtService,
            AccessControlService accessControlService) {

        this.feedbackService = feedbackService;
        this.feedbackMapper = feedbackMapper;
        this.userRepository = userRepository;
        this.patientRepository = patientRepository;
        this.dentistRepository = dentistRepository;
        this.appointmentRepository = appointmentRepository;
        this.jwtService = jwtService;
        this.accessControlService = accessControlService;
    }

    public FeedbackController(
            FeedbackService feedbackService,
            FeedbackMapper feedbackMapper,
            UserRepository userRepository,
            PatientRepository patientRepository,
            AppointmentRepository appointmentRepository,
            JwtService jwtService,
            AccessControlService accessControlService) {

        this(
                feedbackService,
                feedbackMapper,
                userRepository,
                patientRepository,
                null,
                appointmentRepository,
                jwtService,
                accessControlService
        );
    }

    // =========================================================
    // HELPER METHODS
    // =========================================================

    private User resolveAuthenticatedUser(String authHeader) {
        User user = accessControlService != null ? accessControlService.getCurrentUser() : null;
        if (user != null) {
            return user;
        }
        return getAuthenticatedUser(authHeader);
    }

    private User getAuthenticatedUser(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return null;
        }
        try {
            Long userId = jwtService.extractUserId(authHeader.substring(7).trim());
            if (userId != null) {
                return userRepository.findById(userId).orElse(null);
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private boolean isStaffOrAdmin(User user) {
        if (accessControlService != null && (accessControlService.isAdmin() || accessControlService.isStaff())) {
            return true;
        }
        if (user == null || user.getRole() == null) {
            return false;
        }
        String role = user.getRole().getName().toUpperCase();
        return role.contains("ADMIN") || role.contains("STAFF") || role.contains("RECEPTIONIST") || role.contains("DOCTOR");
    }

    private boolean isFeedbackOwner(Feedback feedback, User user) {
        if (user == null || feedback == null) return false;
        try {
            if (feedback.getUser() != null && user.getId().equals(feedback.getUser().getId())) {
                return true;
            }
        } catch (Exception ignored) {
        }
        try {
            Patient callerPatient = patientRepository.findByUserId(user.getId()).orElse(null);
            if (callerPatient != null && feedback.getPatient() != null
                    && callerPatient.getId().equals(feedback.getPatient().getId())) {
                return true;
            }
        } catch (Exception ignored) {
        }
        return false;
    }

    // =========================================================
    // CREATE FEEDBACK
    // =========================================================

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> createFeedback(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody FeedbackDTO dto) {

        try {
            User authUser = resolveAuthenticatedUser(authHeader);
            if (authUser == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required to submit feedback"));
            }

            if (dto == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Feedback data is required"));
            }

            if (dto.getRating() == null || dto.getRating() < 1 || dto.getRating() > 5) {
                return ResponseEntity.badRequest().body(Map.of("error", "Rating must be between 1 and 5"));
            }

            Feedback feedback = feedbackMapper.toEntity(dto);

            if (!isStaffOrAdmin(authUser)) {
                // Identity mismatch checks for PATIENT / non-staff
                if (dto.getUserId() != null && !dto.getUserId().equals(authUser.getId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "You cannot submit feedback on behalf of another user"));
                }

                Patient callerPatient = patientRepository.findByUserId(authUser.getId()).orElse(null);
                if (dto.getPatientId() != null) {
                    if (callerPatient == null || !dto.getPatientId().equals(callerPatient.getId())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body(Map.of("error", "You cannot submit feedback on behalf of another patient"));
                    }
                }

                if (dto.getAppointmentId() != null) {
                    Appointment appt = appointmentRepository.findById(dto.getAppointmentId()).orElse(null);
                    if (appt != null && appt.getPatient() != null) {
                        Long apptPatientId = appt.getPatient().getId();
                        if (callerPatient == null || !callerPatient.getId().equals(apptPatientId)) {
                            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                    .body(Map.of("error", "You cannot submit feedback for another patient's appointment"));
                        }
                    }
                }

                // Force ownership to authenticated user and patient profile
                feedback.setUser(authUser);
                if (callerPatient != null) {
                    feedback.setPatient(callerPatient);
                }
            } else {
                if (dto.getUserId() != null) {
                    userRepository.findById(dto.getUserId()).ifPresent(feedback::setUser);
                } else {
                    feedback.setUser(authUser);
                }

                if (dto.getPatientId() != null) {
                    patientRepository.findById(dto.getPatientId()).ifPresent(feedback::setPatient);
                } else if (feedback.getUser() != null) {
                    patientRepository.findByUserId(feedback.getUser().getId()).ifPresent(feedback::setPatient);
                }
            }

            if (dto.getDentistId() != null && dentistRepository != null) {
                dentistRepository.findById(dto.getDentistId()).ifPresent(feedback::setDentist);
            }

            if (dto.getAppointmentId() != null) {
                appointmentRepository.findById(dto.getAppointmentId()).ifPresent(appt -> {
                    feedback.setAppointment(appt);
                    if (feedback.getDentist() == null && appt.getDentist() != null) {
                        feedback.setDentist(appt.getDentist());
                    }
                });
            }

            Feedback saved = feedbackService.createFeedback(feedback);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(feedbackMapper.toDTO(saved));

        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET ALL FEEDBACK (Admin & Staff)
    // =========================================================

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'RECEPTIONIST')")
    public ResponseEntity<List<FeedbackDTO>> getAllFeedback() {

        List<FeedbackDTO> feedback =
                feedbackService
                        .getAllFeedback()
                        .stream()
                        .map(feedbackMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(feedback);
    }

    // =========================================================
    // GET FEEDBACK BY ID
    // =========================================================

    @GetMapping("/{id}")
    public ResponseEntity<?> getFeedbackById(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id) {

        try {
            Feedback feedback = feedbackService.getFeedbackById(id);
            User authUser = resolveAuthenticatedUser(authHeader);

            if (!isStaffOrAdmin(authUser)) {
                if (!isFeedbackOwner(feedback, authUser)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "You do not have permission to view this feedback"));
                }
            }

            return ResponseEntity.ok(feedbackMapper.toDTO(feedback));

        } catch (RuntimeException exception) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET FEEDBACK BY CODE
    // =========================================================

    @GetMapping("/code/{feedbackCode}")
    public ResponseEntity<?> getFeedbackByCode(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable String feedbackCode) {

        try {
            Feedback feedback = feedbackService.getFeedbackByCode(feedbackCode);
            User authUser = resolveAuthenticatedUser(authHeader);

            if (!isStaffOrAdmin(authUser)) {
                if (!isFeedbackOwner(feedback, authUser)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "You do not have permission to view this feedback"));
                }
            }

            return ResponseEntity.ok(feedbackMapper.toDTO(feedback));

        } catch (RuntimeException exception) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET USER FEEDBACK
    // =========================================================

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserFeedback(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long userId) {

        try {
            User authUser = resolveAuthenticatedUser(authHeader);
            if (!isStaffOrAdmin(authUser)) {
                if (authUser == null || !authUser.getId().equals(userId)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "You do not have permission to view this feedback"));
                }
            }

            List<FeedbackDTO> feedback =
                    feedbackService
                            .getUserFeedback(userId)
                            .stream()
                            .map(feedbackMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(feedback);

        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET PATIENT FEEDBACK
    // =========================================================

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<?> getPatientFeedback(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long patientId) {

        try {
            User authUser = resolveAuthenticatedUser(authHeader);
            if (!isStaffOrAdmin(authUser)) {
                Patient callerPatient = authUser != null ? patientRepository.findByUserId(authUser.getId()).orElse(null) : null;
                if (callerPatient == null || !callerPatient.getId().equals(patientId)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "You do not have permission to view this feedback"));
                }
            }

            List<FeedbackDTO> feedback =
                    feedbackService
                            .getPatientFeedback(patientId)
                            .stream()
                            .map(feedbackMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(feedback);

        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET APPOINTMENT FEEDBACK
    // =========================================================

    @GetMapping("/appointment/{appointmentId}")
    public ResponseEntity<?> getAppointmentFeedback(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long appointmentId) {

        try {
            User authUser = resolveAuthenticatedUser(authHeader);
            if (!isStaffOrAdmin(authUser)) {
                Appointment appt = appointmentRepository.findById(appointmentId).orElse(null);
                boolean isOwner = appt != null && appt.getPatient() != null && appt.getPatient().getUser() != null
                        && authUser != null && appt.getPatient().getUser().getId().equals(authUser.getId());
                if (!isOwner) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "You do not have permission to view this feedback"));
                }
            }

            List<FeedbackDTO> feedback =
                    feedbackService
                            .getAppointmentFeedback(appointmentId)
                            .stream()
                            .map(feedbackMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(feedback);

        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET FEEDBACK BY RATING
    // =========================================================

    @GetMapping("/rating/{rating}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'RECEPTIONIST')")
    public ResponseEntity<?> getFeedbackByRating(
            @PathVariable Integer rating) {

        try {
            List<FeedbackDTO> feedback =
                    feedbackService
                            .getFeedbackByRating(rating)
                            .stream()
                            .map(feedbackMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(feedback);

        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET FEEDBACK BY CATEGORY
    // =========================================================

    @GetMapping("/category/{category}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'RECEPTIONIST')")
    public ResponseEntity<?> getFeedbackByCategory(
            @PathVariable String category) {

        try {
            List<FeedbackDTO> feedback =
                    feedbackService
                            .getFeedbackByCategory(category)
                            .stream()
                            .map(feedbackMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(feedback);

        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET FEEDBACK BY STATUS
    // =========================================================

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'RECEPTIONIST')")
    public ResponseEntity<?> getFeedbackByStatus(
            @PathVariable String status) {

        try {
            List<FeedbackDTO> feedback =
                    feedbackService
                            .getFeedbackByStatus(status)
                            .stream()
                            .map(feedbackMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(feedback);

        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET FEEDBACK BY SENTIMENT
    // =========================================================

    @GetMapping("/sentiment/{sentiment}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'RECEPTIONIST')")
    public ResponseEntity<?> getFeedbackBySentiment(
            @PathVariable String sentiment) {

        try {
            List<FeedbackDTO> feedback =
                    feedbackService
                            .getFeedbackBySentiment(sentiment)
                            .stream()
                            .map(feedbackMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(feedback);

        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // FEEDBACK REQUIRING ADMIN REVIEW
    // =========================================================

    @GetMapping("/review")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<List<FeedbackDTO>> getFeedbackRequiringReview() {

        List<FeedbackDTO> feedback =
                feedbackService
                        .getFeedbackRequiringReview()
                        .stream()
                        .map(feedbackMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(feedback);
    }

    // =========================================================
    // UPDATE FEEDBACK
    // =========================================================

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> updateFeedback(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id,
            @RequestBody FeedbackDTO dto) {

        try {
            User authUser = resolveAuthenticatedUser(authHeader);
            if (authUser == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required to update feedback"));
            }

            Feedback existing = feedbackService.getFeedbackById(id);

            if (!isStaffOrAdmin(authUser)) {
                if (!isFeedbackOwner(existing, authUser)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "You do not have permission to update this feedback"));
                }

                if (dto != null) {
                    if (dto.getUserId() != null && !dto.getUserId().equals(authUser.getId())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body(Map.of("error", "You cannot change feedback ownership"));
                    }
                    Patient callerPatient = patientRepository.findByUserId(authUser.getId()).orElse(null);
                    if (dto.getPatientId() != null) {
                        if (callerPatient == null || !dto.getPatientId().equals(callerPatient.getId())) {
                            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                    .body(Map.of("error", "You cannot change feedback ownership"));
                        }
                    }
                }
            }

            Feedback updatedFeedback = feedbackMapper.toEntity(dto);
            Feedback updated = feedbackService.updateFeedback(id, updatedFeedback);

            return ResponseEntity.ok(feedbackMapper.toDTO(updated));

        } catch (RuntimeException exception) {
            HttpStatus respStatus = exception.getMessage() != null && exception.getMessage().toLowerCase().contains("not found")
                    ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
            return ResponseEntity
                    .status(respStatus)
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // RESPOND TO FEEDBACK (Admin & Staff)
    // =========================================================

    @PutMapping("/{id}/respond")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<?> respondToFeedback(
            @PathVariable Long id,
            @RequestParam(required = false) String adminResponse,
            @RequestParam(required = false) String respondedBy,
            @RequestBody(required = false) Map<String, Object> body) {

        try {
            String responseText = adminResponse;
            String by = respondedBy;
            if ((responseText == null || responseText.isBlank()) && body != null) {
                if (body.get("adminResponse") != null) {
                    responseText = body.get("adminResponse").toString();
                } else if (body.get("response") != null) {
                    responseText = body.get("response").toString();
                } else if (body.get("reply") != null) {
                    responseText = body.get("reply").toString();
                }
                if ((by == null || by.isBlank()) && body.get("respondedBy") != null) {
                    by = body.get("respondedBy").toString();
                }
            }
            if (by == null || by.isBlank()) {
                by = "Clinic Admin";
            }
            if (responseText == null || responseText.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Admin response is required"));
            }

            Feedback feedback =
                    feedbackService.respondToFeedback(
                            id,
                            responseText,
                            by
                    );

            return ResponseEntity.ok(feedbackMapper.toDTO(feedback));

        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    public ResponseEntity<?> respondToFeedback(
            Long id,
            String adminResponse,
            String respondedBy) {
        return respondToFeedback(id, adminResponse, respondedBy, null);
    }

    // =========================================================
    // MARK AS UNDER REVIEW (Admin only)
    // =========================================================

    @PutMapping("/{id}/under-review")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> markAsUnderReview(
            @PathVariable Long id) {

        try {
            Feedback feedback =
                    feedbackService.markAsUnderReview(id);

            return ResponseEntity.ok(feedbackMapper.toDTO(feedback));

        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // APPROVE FEEDBACK (Admin only)
    // =========================================================

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> approveFeedback(
            @PathVariable Long id) {

        try {
            Feedback feedback =
                    feedbackService.approveFeedback(id);

            return ResponseEntity.ok(feedbackMapper.toDTO(feedback));

        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // REJECT FEEDBACK (Admin only)
    // =========================================================

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> rejectFeedback(
            @PathVariable Long id) {

        try {
            Feedback feedback =
                    feedbackService.rejectFeedback(id);

            return ResponseEntity.ok(feedbackMapper.toDTO(feedback));

        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // DELETE FEEDBACK (Admin or Owner)
    // =========================================================

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> deleteFeedback(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id) {

        try {
            User authUser = resolveAuthenticatedUser(authHeader);
            if (authUser == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required to delete feedback"));
            }

            Feedback existing = feedbackService.getFeedbackById(id);

            if (!isStaffOrAdmin(authUser)) {
                if (!isFeedbackOwner(existing, authUser)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "You do not have permission to delete this feedback"));
                }
            }

            feedbackService.deleteFeedback(id);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Feedback deleted successfully"
            ));

        } catch (RuntimeException exception) {
            HttpStatus respStatus = exception.getMessage() != null && exception.getMessage().toLowerCase().contains("not found")
                    ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
            return ResponseEntity
                    .status(respStatus)
                    .body(Map.of("error", exception.getMessage()));
        }
    }
}