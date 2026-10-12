package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.InquiryDTO;
import com.dentaflow.backend.entity.Inquiry;
import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.mapper.InquiryMapper;
import com.dentaflow.backend.repository.UserRepository;
import com.dentaflow.backend.security.AccessControlService;
import com.dentaflow.backend.security.JwtService;
import com.dentaflow.backend.service.InquiryService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/inquiries")
public class InquiryController {

    private final InquiryService inquiryService;
    private final InquiryMapper inquiryMapper;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final AccessControlService accessControlService;

    public InquiryController(
            InquiryService inquiryService,
            InquiryMapper inquiryMapper,
            UserRepository userRepository,
            JwtService jwtService,
            AccessControlService accessControlService) {

        this.inquiryService = inquiryService;
        this.inquiryMapper = inquiryMapper;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.accessControlService = accessControlService;
    }

    // =========================================================
    // HELPER: Get authenticated user from token
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

    // =========================================================
    // CREATE INQUIRY (Public or Authenticated)
    // =========================================================

    @PostMapping
    public ResponseEntity<?> createInquiry(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody InquiryDTO dto) {

        try {
            if (dto == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Inquiry data is required"));
            }

            Inquiry inquiry = inquiryMapper.toEntity(dto);
            User authUser = resolveAuthenticatedUser(authHeader);

            Long userId = null;
            if (authUser != null) {
                if (!isStaffOrAdmin(authUser)) {
                    // Identity mismatch check for normal user / patient
                    if (dto.getUserId() != null && !dto.getUserId().equals(authUser.getId())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body(Map.of("error", "You cannot submit an inquiry on behalf of another user"));
                    }
                    userId = authUser.getId();
                    inquiry.setUser(authUser);
                } else {
                    userId = dto.getUserId() != null ? dto.getUserId() : authUser.getId();
                    if (dto.getUserId() != null) {
                        userRepository.findById(dto.getUserId()).ifPresent(inquiry::setUser);
                    } else {
                        inquiry.setUser(authUser);
                    }
                }

                if (inquiry.getName() == null || inquiry.getName().trim().isEmpty()) {
                    String fullName = ((authUser.getFirstName() != null ? authUser.getFirstName() : "")
                            + " " + (authUser.getLastName() != null ? authUser.getLastName() : "")).trim();
                    inquiry.setName(fullName.isEmpty() ? "User" : fullName);
                }
                if (inquiry.getEmail() == null || inquiry.getEmail().trim().isEmpty()) {
                    inquiry.setEmail(authUser.getEmail());
                }
            } else {
                // Public / anonymous inquiry submission from Contact Us form
                userId = null;
                inquiry.setUser(null);
            }

            Inquiry saved = inquiryService.createInquiry(inquiry, userId);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(inquiryMapper.toDTO(saved));

        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET ALL INQUIRIES (Admin & Staff)
    // =========================================================

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'RECEPTIONIST', 'DOCTOR')")
    public ResponseEntity<List<InquiryDTO>> getAllInquiries() {

        List<InquiryDTO> inquiries =
                inquiryService
                        .getAllInquiries()
                        .stream()
                        .map(inquiryMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(inquiries);
    }

    // =========================================================
    // GET INQUIRY BY ID
    // =========================================================

    @GetMapping("/{id}")
    public ResponseEntity<?> getInquiryById(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id) {

        try {
            Inquiry inquiry = inquiryService.getInquiryById(id);
            User authUser = resolveAuthenticatedUser(authHeader);

            if (!isStaffOrAdmin(authUser)) {
                boolean isOwner = authUser != null && (
                        (inquiry.getUser() != null && inquiry.getUser().getId().equals(authUser.getId()))
                                || (inquiry.getEmail() != null && inquiry.getEmail().equalsIgnoreCase(authUser.getEmail()))
                );
                if (!isOwner) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "You do not have permission to access this inquiry"));
                }
            }

            return ResponseEntity.ok(inquiryMapper.toDTO(inquiry));

        } catch (RuntimeException exception) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET INQUIRY BY CODE
    // =========================================================

    @GetMapping("/code/{inquiryCode}")
    public ResponseEntity<?> getInquiryByCode(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable String inquiryCode) {

        try {
            Inquiry inquiry = inquiryService.getInquiryByCode(inquiryCode);
            User authUser = resolveAuthenticatedUser(authHeader);

            if (!isStaffOrAdmin(authUser)) {
                boolean isOwner = authUser != null && (
                        (inquiry.getUser() != null && inquiry.getUser().getId().equals(authUser.getId()))
                                || (inquiry.getEmail() != null && inquiry.getEmail().equalsIgnoreCase(authUser.getEmail()))
                );
                if (!isOwner) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "You do not have permission to access this inquiry"));
                }
            }

            return ResponseEntity.ok(inquiryMapper.toDTO(inquiry));

        } catch (RuntimeException exception) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET MY INQUIRIES (Authenticated user)
    // =========================================================

    @GetMapping("/my")
    public ResponseEntity<?> getMyInquiries(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        User authUser = resolveAuthenticatedUser(authHeader);
        if (authUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        List<InquiryDTO> inquiries =
                inquiryService
                        .getUserInquiries(authUser.getId())
                        .stream()
                        .map(inquiryMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(inquiries);
    }

    // =========================================================
    // GET USER INQUIRIES
    // =========================================================

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserInquiries(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long userId) {

        try {
            User authUser = resolveAuthenticatedUser(authHeader);
            if (!isStaffOrAdmin(authUser)) {
                if (authUser == null || !authUser.getId().equals(userId)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "You do not have permission to access these inquiries"));
                }
            }

            List<InquiryDTO> inquiries =
                    inquiryService
                            .getUserInquiries(userId)
                            .stream()
                            .map(inquiryMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(inquiries);

        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET INQUIRIES BY STATUS
    // =========================================================

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'RECEPTIONIST')")
    public ResponseEntity<?> getInquiriesByStatus(
            @PathVariable String status) {

        try {
            List<InquiryDTO> inquiries =
                    inquiryService
                            .getInquiriesByStatus(status)
                            .stream()
                            .map(inquiryMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(inquiries);

        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET INQUIRIES BY TYPE
    // =========================================================

    @GetMapping("/type/{inquiryType}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'RECEPTIONIST')")
    public ResponseEntity<?> getInquiriesByType(
            @PathVariable String inquiryType) {

        try {
            List<InquiryDTO> inquiries =
                    inquiryService
                            .getInquiriesByType(inquiryType)
                            .stream()
                            .map(inquiryMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(inquiries);

        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // SEARCH BY EMAIL
    // =========================================================

    @GetMapping("/search/email")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'RECEPTIONIST')")
    public ResponseEntity<List<InquiryDTO>> searchByEmail(
            @RequestParam String email) {

        List<InquiryDTO> inquiries =
                inquiryService
                        .searchByEmail(email)
                        .stream()
                        .map(inquiryMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(inquiries);
    }

    // =========================================================
    // SEARCH BY SUBJECT
    // =========================================================

    @GetMapping("/search/subject")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'RECEPTIONIST')")
    public ResponseEntity<List<InquiryDTO>> searchBySubject(
            @RequestParam String subject) {

        List<InquiryDTO> inquiries =
                inquiryService
                        .searchBySubject(subject)
                        .stream()
                        .map(inquiryMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(inquiries);
    }

    // =========================================================
    // GET USER INQUIRIES BY STATUS
    // =========================================================

    @GetMapping("/user/{userId}/status/{status}")
    public ResponseEntity<?> getUserInquiriesByStatus(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long userId,
            @PathVariable String status) {

        try {
            User authUser = resolveAuthenticatedUser(authHeader);
            if (!isStaffOrAdmin(authUser)) {
                if (authUser == null || !authUser.getId().equals(userId)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "You do not have permission to access these inquiries"));
                }
            }

            List<InquiryDTO> inquiries =
                    inquiryService
                            .getUserInquiriesByStatus(userId, status)
                            .stream()
                            .map(inquiryMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(inquiries);

        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // UPDATE INQUIRY
    // =========================================================

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> updateInquiry(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long id,
            @RequestBody InquiryDTO dto) {

        try {
            User authUser = resolveAuthenticatedUser(authHeader);
            if (authUser == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required to update inquiry"));
            }

            Inquiry existing = inquiryService.getInquiryById(id);

            if (!isStaffOrAdmin(authUser)) {
                boolean isOwner = (existing.getUser() != null && existing.getUser().getId().equals(authUser.getId()))
                        || (existing.getEmail() != null && existing.getEmail().equalsIgnoreCase(authUser.getEmail()));
                if (!isOwner) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "You do not have permission to update this inquiry"));
                }

                if (dto != null && dto.getUserId() != null && !dto.getUserId().equals(authUser.getId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "You cannot change inquiry ownership"));
                }
            }

            Inquiry updatedInquiry = inquiryMapper.toEntity(dto);
            if (!isStaffOrAdmin(authUser)) {
                // Normal user cannot tamper with staff fields or change ownership
                updatedInquiry.setStatus(existing.getStatus());
                updatedInquiry.setResponse(existing.getResponse());
                updatedInquiry.setRespondedBy(existing.getRespondedBy());
                updatedInquiry.setUser(existing.getUser());
            }

            Inquiry updated = inquiryService.updateInquiry(id, updatedInquiry);

            return ResponseEntity.ok(inquiryMapper.toDTO(updated));

        } catch (RuntimeException exception) {
            HttpStatus respStatus = exception.getMessage() != null && exception.getMessage().toLowerCase().contains("not found")
                    ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
            return ResponseEntity
                    .status(respStatus)
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // UPDATE INQUIRY STATUS (Admin & Staff)
    // =========================================================

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'RECEPTIONIST')")
    public ResponseEntity<?> updateInquiryStatus(
            @PathVariable Long id,
            @RequestParam String status) {

        try {
            Inquiry inquiry =
                    inquiryService.updateStatus(id, status);

            return ResponseEntity.ok(inquiryMapper.toDTO(inquiry));

        } catch (RuntimeException exception) {
            HttpStatus respStatus = exception.getMessage() != null && exception.getMessage().toLowerCase().contains("not found")
                    ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
            return ResponseEntity
                    .status(respStatus)
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // RESPOND TO INQUIRY (Admin & Staff)
    // =========================================================

    @PutMapping("/{id}/respond")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'RECEPTIONIST')")
    public ResponseEntity<?> respondToInquiry(
            @PathVariable Long id,
            @RequestParam String response,
            @RequestParam(required = false) String respondedBy) {

        try {
            Inquiry inquiry =
                    inquiryService.respondToInquiry(
                            id,
                            response,
                            respondedBy
                    );

            return ResponseEntity.ok(inquiryMapper.toDTO(inquiry));

        } catch (RuntimeException exception) {
            HttpStatus respStatus = exception.getMessage() != null && exception.getMessage().toLowerCase().contains("not found")
                    ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
            return ResponseEntity
                    .status(respStatus)
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // CLOSE INQUIRY (Admin & Staff)
    // =========================================================

    @PutMapping("/{id}/close")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'RECEPTIONIST')")
    public ResponseEntity<?> closeInquiry(
            @PathVariable Long id) {

        try {
            Inquiry inquiry =
                    inquiryService.closeInquiry(id);

            return ResponseEntity.ok(inquiryMapper.toDTO(inquiry));

        } catch (RuntimeException exception) {
            HttpStatus respStatus = exception.getMessage() != null && exception.getMessage().toLowerCase().contains("not found")
                    ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
            return ResponseEntity
                    .status(respStatus)
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // REOPEN INQUIRY (Admin & Staff)
    // =========================================================

    @PutMapping("/{id}/reopen")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF', 'RECEPTIONIST')")
    public ResponseEntity<?> reopenInquiry(
            @PathVariable Long id) {

        try {
            Inquiry inquiry =
                    inquiryService.reopenInquiry(id);

            return ResponseEntity.ok(inquiryMapper.toDTO(inquiry));

        } catch (RuntimeException exception) {
            HttpStatus respStatus = exception.getMessage() != null && exception.getMessage().toLowerCase().contains("not found")
                    ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
            return ResponseEntity
                    .status(respStatus)
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // DELETE INQUIRY (Admin only)
    // =========================================================

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteInquiry(
            @PathVariable Long id) {

        try {
            inquiryService.deleteInquiry(id);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Inquiry deleted successfully"
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