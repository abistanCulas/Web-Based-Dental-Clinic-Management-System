package com.dentaflow.backend.service;

import com.dentaflow.backend.entity.AuditLog;
import com.dentaflow.backend.entity.Role;
import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.repository.RoleRepository;
import com.dentaflow.backend.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    public AuthService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder,
            AuditLogService auditLogService) {

        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditLogService = auditLogService;
    }

    // =========================================================
    // REGISTER USER
    // =========================================================

    public User register(
            String firstName,
            String lastName,
            String email,
            String phone,
            String password,
            String roleName) {

        validateRegistrationData(
                firstName,
                lastName,
                email,
                password,
                roleName
        );

        String normalizedEmail =
                email.trim().toLowerCase();

        if (userRepository.existsByEmail(
                normalizedEmail)) {

            throw new RuntimeException(
                    "Email is already registered"
            );
        }

        Role role = roleRepository
                .findByName(
                        roleName.trim().toUpperCase()
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "Role not found: "
                                        + roleName
                        ));

        User user = new User();

        user.setFirstName(
                firstName.trim()
        );

        user.setLastName(
                lastName.trim()
        );

        user.setEmail(
                normalizedEmail
        );

        if (phone != null &&
                !phone.trim().isEmpty()) {

            user.setPhone(
                    phone.trim()
            );
        }

        user.setPassword(
                passwordEncoder.encode(password)
        );

        user.setRole(role);

        user.setStatus("ACTIVE");

        user.setPreferredLanguage("EN");

        user.setAuthProvider("LOCAL");

        user.setEmailVerified("NO");

        return userRepository.save(user);
    }

    // =========================================================
    // LOGIN
    // =========================================================

    @Transactional(readOnly = true)
    public User login(
            String email,
            String password) {

        if (email == null ||
                email.trim().isEmpty()) {

            throw new RuntimeException(
                    "Email is required"
            );
        }

        if (password == null ||
                password.isEmpty()) {

            throw new RuntimeException(
                    "Password is required"
            );
        }

        String normalizedEmail =
                email.trim().toLowerCase();

        User user = userRepository
                .findByEmail(normalizedEmail)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Invalid email or password"
                        ));

        if (!passwordEncoder.matches(
                password,
                user.getPassword())) {

            throw new RuntimeException(
                    "Invalid email or password"
            );
        }

        if ("DEACTIVATED".equalsIgnoreCase(user.getStatus()) ||
                "INACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new RuntimeException(
                    "Your account has been deactivated. Please contact clinic administration."
            );
        }

        if (!"ACTIVE".equalsIgnoreCase(user.getStatus()) &&
                !"DEACTIVATION_REQUESTED".equalsIgnoreCase(user.getStatus())) {
            throw new RuntimeException(
                    "Account is not active."
            );
        }

        return user;
    }

    // =========================================================
    // FIND USER BY EMAIL
    // =========================================================

    @Transactional(readOnly = true)
    public User getUserByEmail(
            String email) {

        if (email == null ||
                email.trim().isEmpty()) {

            throw new RuntimeException(
                    "Email is required"
            );
        }

        return userRepository
                .findByEmail(
                        email.trim().toLowerCase()
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "User not found with email: "
                                        + email
                        ));
    }

    // =========================================================
    // CHANGE PASSWORD
    // =========================================================

    public User changePassword(
            Long userId,
            String currentPassword,
            String newPassword) {

        if (currentPassword == null ||
                currentPassword.isEmpty()) {

            throw new RuntimeException(
                    "Current password is required"
            );
        }

        if (newPassword == null ||
                newPassword.isEmpty()) {

            throw new RuntimeException(
                    "New password is required"
            );
        }

        if (newPassword.length() < 6) {

            throw new RuntimeException(
                    "New password must contain at least 6 characters"
            );
        }

        User user = userRepository
                .findById(userId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "User not found with id: "
                                        + userId
                        ));

        if (!passwordEncoder.matches(
                currentPassword,
                user.getPassword())) {

            throw new RuntimeException(
                    "Current password is incorrect"
            );
        }

        user.setPassword(
                passwordEncoder.encode(newPassword)
        );

        return userRepository.save(user);
    }

    // =========================================================
    // DEACTIVATE ACCOUNT
    // =========================================================

    public Map<String, Object> deactivateAccount(
            Long userId,
            String reason) {

        User user = userRepository
                .findById(userId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "User not found with id: " + userId
                        ));

        String roleName = user.getRole() != null ? user.getRole().getName().toUpperCase() : "PATIENT";
        if (roleName.startsWith("ROLE_")) {
            roleName = roleName.substring(5);
        }

        if ("ADMIN".equalsIgnoreCase(roleName)) {
            throw new RuntimeException("Administrator accounts cannot be deactivated.");
        }

        AuditLog audit = new AuditLog();
        audit.setUser(user);
        audit.setEntityType("User");
        audit.setEntityId(userId);
        audit.setActionTime(LocalDateTime.now());

        if ("PATIENT".equalsIgnoreCase(roleName)) {
            // Patient self-deactivation is immediate without Admin approval
            user.setStatus("DEACTIVATED");
            user.setDeactivatedAt(LocalDateTime.now());
            if (reason != null && !reason.trim().isEmpty()) {
                user.setDeactivationReason(reason.trim());
            }
            userRepository.save(user);

            audit.setAction("USER_DEACTIVATED");
            audit.setDescription("Patient " + user.getEmail() + " deactivated account independently. Reason: " + (reason != null ? reason.trim() : "Self-deactivated"));
            auditLogService.createAuditLog(audit);

            return Map.of(
                    "success", true,
                    "status", "DEACTIVATED",
                    "requiresApproval", false,
                    "message", "Your account has been deactivated successfully."
            );
        } else {
            // Staff deactivation requires Admin approval
            user.setStatus("DEACTIVATION_REQUESTED");
            user.setDeactivationRequestedAt(LocalDateTime.now());
            if (reason != null && !reason.trim().isEmpty()) {
                user.setDeactivationReason(reason.trim());
            }
            userRepository.save(user);

            audit.setAction("DEACTIVATION_REQUESTED");
            audit.setDescription("Staff (" + roleName + ") " + user.getEmail() + " requested account deactivation. Reason: " + (reason != null ? reason.trim() : "Not specified"));
            auditLogService.createAuditLog(audit);

            return Map.of(
                    "success", true,
                    "status", "DEACTIVATION_REQUESTED",
                    "requiresApproval", true,
                    "message", "Deactivation request submitted successfully. An administrator will review your request."
            );
        }
    }

    public User deactivateAccount(Long userId) {
        deactivateAccount(userId, null);
        return userRepository.findById(userId).orElse(null);
    }

    // =========================================================
    // ACTIVATE ACCOUNT
    // =========================================================

    public User activateAccount(
            Long userId) {

        User user = userRepository
                .findById(userId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "User not found with id: "
                                        + userId
                        ));

        user.setStatus("ACTIVE");

        return userRepository.save(user);
    }

    // =========================================================
    // VALIDATE REGISTRATION
    // =========================================================

    private void validateRegistrationData(
            String firstName,
            String lastName,
            String email,
            String password,
            String roleName) {

        if (firstName == null ||
                firstName.trim().isEmpty()) {

            throw new RuntimeException(
                    "First name is required"
            );
        }

        if (lastName == null ||
                lastName.trim().isEmpty()) {

            throw new RuntimeException(
                    "Last name is required"
            );
        }

        if (email == null ||
                email.trim().isEmpty()) {

            throw new RuntimeException(
                    "Email is required"
            );
        }

        if (password == null ||
                password.isEmpty()) {

            throw new RuntimeException(
                    "Password is required"
            );
        }

        if (password.length() < 6) {

            throw new RuntimeException(
                    "Password must contain at least 6 characters"
            );
        }

        if (roleName == null ||
                roleName.trim().isEmpty()) {

            throw new RuntimeException(
                    "Role is required"
            );
        }
    }
}