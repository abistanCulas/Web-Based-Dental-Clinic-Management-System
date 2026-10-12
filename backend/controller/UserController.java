package com.dentaflow.backend.controller;

import com.dentaflow.backend.entity.AuditLog;
import com.dentaflow.backend.entity.Role;
import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.repository.DentistRepository;
import com.dentaflow.backend.repository.RoleRepository;
import com.dentaflow.backend.repository.StaffRepository;
import com.dentaflow.backend.repository.UserRepository;
import com.dentaflow.backend.security.AccessControlService;
import com.dentaflow.backend.security.JwtService;
import com.dentaflow.backend.service.AuditLogService;
import com.dentaflow.backend.service.UserService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserService userService;
    private final JwtService jwtService;
    private final AuditLogService auditLogService;
    private final DentistRepository dentistRepository;
    private final StaffRepository staffRepository;
    private final AccessControlService accessControl;

    @Autowired
    public UserController(
            UserRepository userRepository,
            RoleRepository roleRepository,
            UserService userService,
            JwtService jwtService,
            AuditLogService auditLogService,
            DentistRepository dentistRepository,
            StaffRepository staffRepository,
            AccessControlService accessControl) {

        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userService = userService;
        this.jwtService = jwtService;
        this.auditLogService = auditLogService;
        this.dentistRepository = dentistRepository;
        this.staffRepository = staffRepository;
        this.accessControl = accessControl;
    }

    public UserController(
            UserRepository userRepository,
            RoleRepository roleRepository,
            UserService userService,
            JwtService jwtService,
            AuditLogService auditLogService,
            DentistRepository dentistRepository,
            StaffRepository staffRepository) {

        this(userRepository, roleRepository, userService, jwtService, auditLogService, dentistRepository, staffRepository, null);
    }

    private boolean isUnauthenticated() {
        return accessControl != null && accessControl.getCurrentUserId() == null && !accessControl.isAdmin();
    }

    private boolean isAdmin() {
        if (accessControl == null) return true;
        return accessControl.isAdmin();
    }

    // =========================================================
    // GET ALL USERS
    // =========================================================

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllUsers() {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }
        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Administrator role required"));
        }

        List<User> users = userRepository.findAll();

        return ResponseEntity.ok(
                users.stream()
                        .map(this::toUserResponse)
                        .toList()
        );
    }
 
    // =========================================================
    // CREATE USER (ADMIN DIRECT)
    // =========================================================

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createUser(
            @RequestBody Map<String, String> payload) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }
        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Administrator role required"));
        }

        try {
            String firstName = payload.getOrDefault("firstName", "User");
            String lastName = payload.getOrDefault("lastName", "Member");
            String email = payload.get("email");
            String phone = payload.getOrDefault("phone", "0771234567");
            String password = payload.get("password");
            if (password == null || password.trim().isEmpty()) {
                password = "demo123";
            }
            String roleName = payload.getOrDefault("role", "PATIENT");

            if (email == null || email.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Email is required"));
            }

            User user = new User();
            user.setFirstName(firstName);
            user.setLastName(lastName);
            user.setEmail(email);
            user.setPhone(phone);
            user.setPassword(password);
            user.setStatus("ACTIVE");
            user.setEmailVerified("YES");

            User created = userService.createUser(user, roleName);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(toUserResponse(created));

        } catch (RuntimeException e) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // GET USER BY ID
    // =========================================================

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getUserById(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }
        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Administrator role required"));
        }

        User user = userRepository
                .findById(id)
                .orElse(null);

        if (user == null) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "error",
                            "User not found"
                    ));
        }

        return ResponseEntity.ok(
                toUserResponse(user)
        );
    }

    // =========================================================
    // ACTIVATE USER
    // =========================================================

    @PutMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> activateUser(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }
        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Administrator role required"));
        }

        User user = userRepository
                .findById(id)
                .orElse(null);

        if (user == null) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "error",
                            "User not found"
                    ));
        }

        user.setStatus("ACTIVE");

        User savedUser =
                userRepository.save(user);

        dentistRepository.findByUserId(id).ifPresent(d -> {
            d.setStatus("ACTIVE");
            dentistRepository.save(d);
        });
        staffRepository.findByUserId(id).ifPresent(s -> {
            s.setStatus("ACTIVE");
            staffRepository.save(s);
        });

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "User activated successfully",
                        "user",
                        toUserResponse(savedUser)
                )
        );
    }

    // =========================================================
    // DEACTIVATE USER (ADMIN)
    // =========================================================

    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deactivateUser(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }
        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Administrator role required"));
        }

        User user = userRepository
                .findById(id)
                .orElse(null);

        if (user == null) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "error",
                            "User not found"
                    ));
        }

        String roleName = user.getRole() != null ? user.getRole().getName().toUpperCase() : "";
        if ("ADMIN".equalsIgnoreCase(roleName) || "ROLE_ADMIN".equalsIgnoreCase(roleName)) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "error",
                            "Administrator accounts cannot be deactivated."
                    ));
        }

        user.setStatus("DEACTIVATED");
        user.setDeactivatedAt(java.time.LocalDateTime.now());
        User savedUser = userRepository.save(user);

        dentistRepository.findByUserId(id).ifPresent(d -> {
            d.setStatus("INACTIVE");
            dentistRepository.save(d);
        });
        staffRepository.findByUserId(id).ifPresent(s -> {
            s.setStatus("INACTIVE");
            staffRepository.save(s);
        });

        AuditLog audit = new AuditLog();
        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            Long adminUserId = jwtService.extractUserId(authorizationHeader.substring(7).trim());
            if (adminUserId != null) {
                userRepository.findById(adminUserId).ifPresent(audit::setUser);
            }
        }
        audit.setEntityType("User");
        audit.setEntityId(id);
        audit.setAction("USER_DEACTIVATED");
        audit.setDescription("Administrator deactivated user: " + user.getEmail());
        audit.setActionTime(java.time.LocalDateTime.now());
        auditLogService.createAuditLog(audit);

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "User deactivated successfully",
                        "user",
                        toUserResponse(savedUser)
                )
        );
    }

    // =========================================================
    // GET DEACTIVATION REQUESTS (ADMIN)
    // =========================================================

    @GetMapping("/deactivation-requests")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getDeactivationRequests() {
        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }
        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Administrator role required"));
        }
        List<User> requests = userService.getDeactivationRequests();
        return ResponseEntity.ok(requests.stream().map(this::toUserResponse).toList());
    }

    // =========================================================
    // APPROVE DEACTIVATION (ADMIN)
    // =========================================================

    @PutMapping("/{id}/deactivation/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> approveDeactivation(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }
        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Administrator role required"));
        }
        try {
            Long adminUserId = null;
            if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
                adminUserId = jwtService.extractUserId(authorizationHeader.substring(7).trim());
            }
            User approved = userService.approveDeactivation(id, adminUserId);
            dentistRepository.findByUserId(id).ifPresent(d -> {
                d.setStatus("INACTIVE");
                dentistRepository.save(d);
            });
            staffRepository.findByUserId(id).ifPresent(s -> {
                s.setStatus("INACTIVE");
                staffRepository.save(s);
            });
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "User deactivation approved successfully",
                    "user", toUserResponse(approved)
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // REJECT DEACTIVATION (ADMIN)
    // =========================================================

    @PutMapping("/{id}/deactivation/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> rejectDeactivation(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }
        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Administrator role required"));
        }
        try {
            Long adminUserId = null;
            if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
                adminUserId = jwtService.extractUserId(authorizationHeader.substring(7).trim());
            }
            User rejected = userService.rejectDeactivation(id, adminUserId);
            dentistRepository.findByUserId(id).ifPresent(d -> {
                d.setStatus("ACTIVE");
                dentistRepository.save(d);
            });
            staffRepository.findByUserId(id).ifPresent(s -> {
                s.setStatus("ACTIVE");
                staffRepository.save(s);
            });
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "User deactivation request rejected",
                    "user", toUserResponse(rejected)
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // CHANGE USER ROLE
    // =========================================================

    @PutMapping("/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> changeUserRole(
            @PathVariable Long id,
            @RequestParam String role) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }
        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Administrator role required"));
        }

        User user = userRepository
                .findById(id)
                .orElse(null);

        if (user == null) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                            "error",
                            "User not found"
                    ));
        }

        String roleName =
                role.trim().toUpperCase();

        Role newRole = roleRepository
                .findByName(roleName)
                .orElse(null);

        if (newRole == null) {

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(Map.of(
                            "error",
                            "Role not found",
                            "role",
                            roleName
                    ));
        }

        user.setRole(newRole);

        User savedUser =
                userRepository.save(user);

        return ResponseEntity.ok(
                Map.of(
                        "message",
                        "User role updated successfully",
                        "user",
                        toUserResponse(savedUser)
                )
        );
    }

    // =========================================================
    // DELETE USER (SOFT-DELETE PRESERVING HISTORICAL RECORDS)
    // =========================================================

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteUser(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }
        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Administrator role required"));
        }

        try {
            User user = userService.deleteUser(id);
            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "message", "User account deactivated (soft-deleted). Historical medical records, appointments, and bills preserved.",
                            "user", toUserResponse(user)
                    )
            );
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // UPDATE MY AVATAR
    // =========================================================

    @PostMapping("/me/avatar")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> updateMyAvatar(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestBody Map<String, String> payload) {
        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }
        try {
            Long userId = null;
            if (accessControl != null && accessControl.getCurrentUserId() != null) {
                userId = accessControl.getCurrentUserId();
            } else if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
                userId = jwtService.extractUserId(authorizationHeader.substring(7).trim());
            }
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
            }

            if (payload == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Profile image data is required"));
            }

            String image = payload.get("image");
            if (image == null || image.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Profile image data is required"));
            }

            if (!image.startsWith("data:image/") && !image.startsWith("http://") && !image.startsWith("https://")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid image format. Supported formats: JPEG, PNG, WebP, GIF."));
            }

            if (image.length() > 7 * 1024 * 1024) {
                return ResponseEntity.badRequest().body(Map.of("error", "Image size exceeds maximum allowed limit (5MB)"));
            }

            User updated = userService.updateProfileImage(userId, image);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Profile picture updated successfully",
                    "user", toUserResponse(updated)
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // DELETE MY AVATAR
    // =========================================================

    @DeleteMapping("/me/avatar")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> deleteMyAvatar(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader) {
        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }
        try {
            Long userId = null;
            if (accessControl != null && accessControl.getCurrentUserId() != null) {
                userId = accessControl.getCurrentUserId();
            } else if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
                userId = jwtService.extractUserId(authorizationHeader.substring(7).trim());
            }
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
            }

            User updated = userService.updateProfileImage(userId, null);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Profile picture removed successfully",
                    "user", toUserResponse(updated)
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // ADMIN UPDATE USER AVATAR
    // =========================================================

    @PostMapping("/{id}/avatar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateUserAvatar(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload) {
        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }
        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Administrator role required"));
        }
        try {
            if (payload == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Profile image data is required"));
            }

            String image = payload.get("image");
            if (image == null || image.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Profile image data is required"));
            }

            if (!image.startsWith("data:image/") && !image.startsWith("http://") && !image.startsWith("https://")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid image format. Supported formats: JPEG, PNG, WebP, GIF."));
            }

            if (image.length() > 7 * 1024 * 1024) {
                return ResponseEntity.badRequest().body(Map.of("error", "Image size exceeds maximum allowed limit (5MB)"));
            }

            User updated = userService.updateProfileImage(id, image);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "User avatar updated successfully",
                    "user", toUserResponse(updated)
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // ADMIN DELETE USER AVATAR
    // =========================================================

    @DeleteMapping("/{id}/avatar")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteUserAvatar(
            @PathVariable Long id) {
        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Unauthorized"));
        }
        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Administrator role required"));
        }
        try {
            User updated = userService.updateProfileImage(id, null);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "User avatar removed successfully",
                    "user", toUserResponse(updated)
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // USER RESPONSE
    // =========================================================

    private Map<String, Object> toUserResponse(
            User user) {

        Map<String, Object> response =
                new HashMap<>();

        response.put("id", user.getId());
        response.put(
                "firstName",
                user.getFirstName()
        );
        response.put(
                "lastName",
                user.getLastName()
        );
        response.put(
                "email",
                user.getEmail()
        );
        response.put(
                "phone",
                user.getPhone()
        );
        response.put(
                "status",
                user.getStatus()
        );
        response.put(
                "emailVerified",
                user.getEmailVerified()
        );
        response.put(
                "preferredLanguage",
                user.getPreferredLanguage()
        );
        response.put(
                "authProvider",
                user.getAuthProvider()
        );
        response.put(
                "profileImage",
                user.getProfileImage()
        );
        response.put(
                "deactivationReason",
                user.getDeactivationReason()
        );
        response.put(
                "deactivationRequestedAt",
                user.getDeactivationRequestedAt()
        );
        response.put(
                "deactivatedAt",
                user.getDeactivatedAt()
        );

        if (user.getRole() != null) {

            response.put(
                    "role",
                    user.getRole().getName()
            );

            response.put(
                    "roleId",
                    user.getRole().getId()
            );

        } else {

            response.put("role", null);
            response.put("roleId", null);
        }

        return response;
    }
}