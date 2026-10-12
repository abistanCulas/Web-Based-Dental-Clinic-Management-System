package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.ComplaintDTO;
import com.dentaflow.backend.entity.Complaint;
import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.mapper.ComplaintMapper;
import com.dentaflow.backend.security.AccessControlService;
import com.dentaflow.backend.service.ComplaintService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/complaints")
public class ComplaintController {

    private final ComplaintService complaintService;
    private final ComplaintMapper complaintMapper;
    private final AccessControlService accessControl;

    @Autowired
    public ComplaintController(
            ComplaintService complaintService,
            ComplaintMapper complaintMapper,
            AccessControlService accessControl) {

        this.complaintService = complaintService;
        this.complaintMapper = complaintMapper;
        this.accessControl = accessControl;
    }

    public ComplaintController(
            ComplaintService complaintService,
            ComplaintMapper complaintMapper) {
        this(complaintService, complaintMapper, null);
    }

    private boolean isUnauthenticated() {
        return accessControl != null && accessControl.getCurrentUserId() == null && !accessControl.isAdmin();
    }

    private boolean isAdmin() {
        if (accessControl == null) return true;
        return accessControl.isAdmin();
    }

    // =========================================================
    // CREATE COMPLAINT
    // =========================================================

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> createComplaint(
            @RequestBody ComplaintDTO dto) {

        if (isUnauthenticated()) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        try {

            if (dto == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Complaint data is required"));
            }

            Complaint complaint =
                    complaintMapper.toEntity(dto);

            User currentUser =
                    accessControl != null ? accessControl.getCurrentUser() : null;

            if (currentUser == null) {
                return ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Authentication required"));
            }

            Long userId = dto.getUserId();
            Long patientId = dto.getPatientId();

            if (accessControl != null && !accessControl.isStaff()) {

                if (userId != null
                        && !currentUser.getId().equals(userId)) {
                    return ResponseEntity
                            .status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "You can only file a complaint for yourself"));
                }

                if (patientId != null
                        && !accessControl
                                .isSelfPatientOrAdmin(patientId)) {
                    return ResponseEntity
                            .status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "You can only file a complaint for your own patient profile"));
                }

                userId = currentUser.getId();
            }

            Complaint saved =
                    complaintService.createComplaint(
                            complaint,
                            userId,
                            patientId
                    );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(
                            complaintMapper.toDTO(saved)
                    );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET ALL COMPLAINTS
    // =========================================================

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllComplaints() {

        if (isUnauthenticated()) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!isAdmin()) {
            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Administrator role required"));
        }

        List<ComplaintDTO> result =
                complaintService
                        .getAllComplaints()
                        .stream()
                        .map(complaintMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // GET COMPLAINT BY ID
    // =========================================================

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or isAuthenticated()")
    public ResponseEntity<?> getComplaintById(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        try {

            Complaint complaint =
                    complaintService
                            .getComplaintById(id);

            if (!isAdmin()) {
                User currentUser = accessControl != null ? accessControl.getCurrentUser() : null;
                boolean isUserOwner = complaint.getUser() != null && currentUser != null
                        && complaint.getUser().getId().equals(currentUser.getId());
                boolean isPatientOwner = complaint.getPatient() != null && accessControl != null
                        && accessControl.isSelfPatientOrAdmin(complaint.getPatient().getId());

                if (!isUserOwner && !isPatientOwner) {
                    return ResponseEntity
                            .status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: You do not have permission to view this complaint"));
                }
            }

            return ResponseEntity.ok(
                    complaintMapper.toDTO(complaint)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET COMPLAINT BY CODE
    // =========================================================

    @GetMapping("/code/{complaintCode}")
    @PreAuthorize("hasRole('ADMIN') or isAuthenticated()")
    public ResponseEntity<?> getComplaintByCode(
            @PathVariable String complaintCode) {

        if (isUnauthenticated()) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        try {

            Complaint complaint =
                    complaintService
                            .getComplaintByCode(
                                    complaintCode
                            );

            if (!isAdmin()) {
                User currentUser = accessControl != null ? accessControl.getCurrentUser() : null;
                boolean isUserOwner = complaint.getUser() != null && currentUser != null
                        && complaint.getUser().getId().equals(currentUser.getId());
                boolean isPatientOwner = complaint.getPatient() != null && accessControl != null
                        && accessControl.isSelfPatientOrAdmin(complaint.getPatient().getId());

                if (!isUserOwner && !isPatientOwner) {
                    return ResponseEntity
                            .status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: You do not have permission to view this complaint"));
                }
            }

            return ResponseEntity.ok(
                    complaintMapper.toDTO(complaint)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET USER COMPLAINTS
    // =========================================================

    @GetMapping("/user/{userId}")
    @PreAuthorize("@accessControl.isSelfOrAdmin(#userId)")
    public ResponseEntity<?> getUserComplaints(
            @PathVariable Long userId) {

        if (isUnauthenticated()) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (accessControl != null && !accessControl.isSelfOrAdmin(userId)) {
            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: You can only view your own complaints"));
        }

        try {

            List<ComplaintDTO> result =
                    complaintService
                            .getUserComplaints(userId)
                            .stream()
                            .map(complaintMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET PATIENT COMPLAINTS
    // =========================================================

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("@accessControl.isSelfPatientOrAdmin(#patientId)")
    public ResponseEntity<?> getPatientComplaints(
            @PathVariable Long patientId) {

        if (isUnauthenticated()) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (accessControl != null && !accessControl.isSelfPatientOrAdmin(patientId)) {
            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: You can only view complaints for your own patient profile"));
        }

        try {

            List<ComplaintDTO> result =
                    complaintService
                            .getPatientComplaints(patientId)
                            .stream()
                            .map(complaintMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET COMPLAINTS BY STATUS
    // =========================================================

    @GetMapping("/status/{status}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getComplaintsByStatus(
            @PathVariable String status) {

        if (isUnauthenticated()) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!isAdmin()) {
            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Administrator role required"));
        }

        try {

            List<ComplaintDTO> result =
                    complaintService
                            .getComplaintsByStatus(status)
                            .stream()
                            .map(complaintMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET COMPLAINTS BY PRIORITY
    // =========================================================

    @GetMapping("/priority/{priority}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getComplaintsByPriority(
            @PathVariable String priority) {

        if (isUnauthenticated()) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!isAdmin()) {
            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Administrator role required"));
        }

        try {

            List<ComplaintDTO> result =
                    complaintService
                            .getComplaintsByPriority(priority)
                            .stream()
                            .map(complaintMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET USER COMPLAINTS BY STATUS
    // =========================================================

    @GetMapping("/user/{userId}/status/{status}")
    @PreAuthorize("@accessControl.isSelfOrAdmin(#userId)")
    public ResponseEntity<?> getUserComplaintsByStatus(
            @PathVariable Long userId,
            @PathVariable String status) {

        if (isUnauthenticated()) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (accessControl != null && !accessControl.isSelfOrAdmin(userId)) {
            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: You can only view your own complaints"));
        }

        try {

            List<ComplaintDTO> result =
                    complaintService
                            .getUserComplaintsByStatus(
                                    userId,
                                    status
                            )
                            .stream()
                            .map(complaintMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET PATIENT COMPLAINTS BY STATUS
    // =========================================================

    @GetMapping("/patient/{patientId}/status/{status}")
    @PreAuthorize("@accessControl.isSelfPatientOrAdmin(#patientId)")
    public ResponseEntity<?> getPatientComplaintsByStatus(
            @PathVariable Long patientId,
            @PathVariable String status) {

        if (isUnauthenticated()) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (accessControl != null && !accessControl.isSelfPatientOrAdmin(patientId)) {
            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: You can only view complaints for your own patient profile"));
        }

        try {

            List<ComplaintDTO> result =
                    complaintService
                            .getPatientComplaintsByStatus(
                                    patientId,
                                    status
                            )
                            .stream()
                            .map(complaintMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // SEARCH COMPLAINTS
    // =========================================================

    @GetMapping("/search")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> searchComplaints(
            @RequestParam(required = false)
            String subject) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }
        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Administrator role required"));
        }

        try {

            List<ComplaintDTO> result =
                    complaintService
                            .searchComplaints(subject)
                            .stream()
                            .map(complaintMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // COMPLAINTS NEEDING ATTENTION
    // =========================================================

    @GetMapping("/attention")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?>
    getComplaintsNeedingAttention() {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }
        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Administrator role required"));
        }

        List<ComplaintDTO> result =
                complaintService
                        .getComplaintsNeedingAttention()
                        .stream()
                        .map(complaintMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // =========================================================
    // UPDATE COMPLAINT
    // =========================================================

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateComplaint(
            @PathVariable Long id,
            @RequestBody ComplaintDTO dto) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }
        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Administrator role required"));
        }

        try {

            if (dto == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Complaint data is required"));
            }

            Complaint complaint =
                    complaintMapper.toEntity(dto);

            Complaint updated =
                    complaintService.updateComplaint(
                            id,
                            complaint
                    );

            return ResponseEntity.ok(
                    complaintMapper.toDTO(updated)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // RESOLVE COMPLAINT
    // =========================================================

    @PutMapping("/{id}/resolve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> resolveComplaint(
            @PathVariable Long id,
            @RequestParam String resolution,
            @RequestParam(required = false)
            String handledBy) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }
        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Administrator role required"));
        }

        try {

            Complaint complaint =
                    complaintService.resolveComplaint(
                            id,
                            resolution,
                            handledBy
                    );

            return ResponseEntity.ok(
                    complaintMapper.toDTO(complaint)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // CLOSE COMPLAINT
    // =========================================================

    @PutMapping("/{id}/close")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> closeComplaint(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }
        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Administrator role required"));
        }

        try {

            Complaint complaint =
                    complaintService.closeComplaint(id);

            return ResponseEntity.ok(
                    complaintMapper.toDTO(complaint)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // REOPEN COMPLAINT
    // =========================================================

    @PutMapping("/{id}/reopen")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> reopenComplaint(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }
        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Administrator role required"));
        }

        try {

            Complaint complaint =
                    complaintService.reopenComplaint(id);

            return ResponseEntity.ok(
                    complaintMapper.toDTO(complaint)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // DELETE COMPLAINT
    // =========================================================

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteComplaint(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }
        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Administrator role required"));
        }

        try {

            complaintService.deleteComplaint(id);

            return ResponseEntity.ok(
                    "Complaint deleted successfully"
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
}