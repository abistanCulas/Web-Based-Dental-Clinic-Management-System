package com.dentaflow.backend.service;

import com.dentaflow.backend.entity.AuditLog;
import com.dentaflow.backend.entity.Role;
import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.repository.RoleRepository;
import com.dentaflow.backend.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;
    private final com.dentaflow.backend.repository.DentistRepository dentistRepository;
    private final com.dentaflow.backend.repository.StaffRepository staffRepository;

    public UserService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder,
            AuditLogService auditLogService,
            com.dentaflow.backend.repository.DentistRepository dentistRepository,
            com.dentaflow.backend.repository.StaffRepository staffRepository) {

        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditLogService = auditLogService;
        this.dentistRepository = dentistRepository;
        this.staffRepository = staffRepository;
    }

    // Create user
    public User createUser(User user, String roleName) {

        if (user == null) {
            throw new RuntimeException("User data is required");
        }

        if (user.getEmail() == null ||
                user.getEmail().trim().isEmpty()) {

            throw new RuntimeException("Email is required");
        }

        if (user.getPassword() == null ||
                user.getPassword().trim().isEmpty()) {

            throw new RuntimeException("Password is required");
        }

        if (user.getPassword().length() < 6) {
            throw new RuntimeException("Password must be at least 6 characters");
        }

        String email = user.getEmail()
                .trim()
                .toLowerCase();

        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException(
                    "Email already registered: " + email
            );
        }

        String normalizedRoleName = roleName.trim().toUpperCase();
        Role role;
        if ("DOCTOR".equals(normalizedRoleName) || "DENTIST".equals(normalizedRoleName)) {
            role = roleRepository.findByName("DOCTOR")
                    .orElseGet(() -> roleRepository.findByName("DENTIST")
                            .orElseThrow(() -> new RuntimeException("Role not found: " + roleName)));
        } else {
            role = roleRepository.findByName(normalizedRoleName)
                    .orElseThrow(() ->
                            new RuntimeException(
                                    "Role not found: " + roleName
                            ));
        }

        user.setEmail(email);

        // Never store plain-text password
        user.setPassword(
                passwordEncoder.encode(user.getPassword())
        );

        user.setRole(role);

        if (user.getStatus() == null ||
                user.getStatus().trim().isEmpty()) {

            user.setStatus("ACTIVE");
        }

        if (user.getPreferredLanguage() == null ||
                user.getPreferredLanguage().trim().isEmpty()) {

            user.setPreferredLanguage("EN");
        }

        if (user.getAuthProvider() == null ||
                user.getAuthProvider().trim().isEmpty()) {

            user.setAuthProvider("LOCAL");
        }

        if (user.getEmailVerified() == null ||
                user.getEmailVerified().trim().isEmpty()) {

            user.setEmailVerified("NO");
        }

        return userRepository.save(user);
    }

    // Get all users
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    // Get user by ID
    public User getUserById(Long id) {

        return userRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "User not found with id: " + id
                        ));
    }

    // Get user by email
    public User getUserByEmail(String email) {

        if (email == null || email.trim().isEmpty()) {
            throw new RuntimeException("Email is required");
        }

        return userRepository.findByEmail(
                        email.trim().toLowerCase()
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "User not found with email: " + email
                        ));
    }

    // Get users by role
    public List<User> getUsersByRole(String roleName) {

        Role role = roleRepository.findByName(
                        roleName.trim().toUpperCase()
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "Role not found: " + roleName
                        ));

        return userRepository.findByRole(role);
    }

    // Get users by status
    public List<User> getUsersByStatus(String status) {

        return userRepository.findByStatus(
                status.trim().toUpperCase()
        );
    }

    // Search users
    public List<User> searchUsers(String keyword) {

        if (keyword == null || keyword.trim().isEmpty()) {
            return userRepository.findAll();
        }

        String search = keyword.trim();

        return userRepository
                .findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(
                        search,
                        search
                );
    }

    // Update user
    public User updateUser(Long id, User updatedUser) {

        User existingUser = getUserById(id);

        if (updatedUser == null) {
            throw new RuntimeException("User data is required");
        }

        if (updatedUser.getFirstName() != null) {
            existingUser.setFirstName(
                    updatedUser.getFirstName().trim()
            );
        }

        if (updatedUser.getLastName() != null) {
            existingUser.setLastName(
                    updatedUser.getLastName().trim()
            );
        }

        if (updatedUser.getPhone() != null) {
            existingUser.setPhone(
                    updatedUser.getPhone().trim()
            );
        }

        if (updatedUser.getGender() != null) {
            existingUser.setGender(
                    updatedUser.getGender().trim()
            );
        }

        if (updatedUser.getPreferredLanguage() != null) {
            existingUser.setPreferredLanguage(
                    updatedUser.getPreferredLanguage().trim().toUpperCase()
            );
        }

        if (updatedUser.getStatus() != null) {
            existingUser.setStatus(
                    updatedUser.getStatus().trim().toUpperCase()
            );
        }

        User savedUser = userRepository.save(existingUser);

        // Sync with linked Dentist if present
        dentistRepository.findByUserId(id).ifPresent(d -> {
            if (updatedUser.getFirstName() != null) d.setFirstName(updatedUser.getFirstName().trim());
            if (updatedUser.getLastName() != null) d.setLastName(updatedUser.getLastName().trim());
            if (updatedUser.getPhone() != null) d.setPhone(updatedUser.getPhone().trim());
            if (updatedUser.getStatus() != null) {
                String s = updatedUser.getStatus().trim().toUpperCase();
                d.setStatus("ACTIVE".equalsIgnoreCase(s) ? "ACTIVE" : "INACTIVE");
            }
            dentistRepository.save(d);
        });

        return savedUser;
    }

    // Update password
    public User updatePassword(
            Long id,
            String newPassword) {

        if (newPassword == null ||
                newPassword.trim().isEmpty()) {

            throw new RuntimeException(
                    "New password is required"
            );
        }

        if (newPassword.length() < 8) {
            throw new RuntimeException(
                    "Password must contain at least 8 characters"
            );
        }

        User user = getUserById(id);

        user.setPassword(
                passwordEncoder.encode(newPassword)
        );

        return userRepository.save(user);
    }

    // Change user status
    public User updateStatus(
            Long id,
            String status) {

        if (status == null ||
                status.trim().isEmpty()) {

            throw new RuntimeException("Status is required");
        }

        User user = getUserById(id);

        String upperStatus = status.trim().toUpperCase();
        user.setStatus(upperStatus);

        User saved = userRepository.save(user);

        // Sync to linked dentist
        dentistRepository.findByUserId(id).ifPresent(d -> {
            d.setStatus("ACTIVE".equalsIgnoreCase(upperStatus) ? "ACTIVE" : "INACTIVE");
            dentistRepository.save(d);
        });

        return saved;
    }

    // Verify email
    public User verifyEmail(Long id) {

        User user = getUserById(id);

        user.setEmailVerified("YES");

        return userRepository.save(user);
    }

    // Soft Delete / Deactivate user (Preserve all historical records)
    public User deleteUser(Long id) {

        User user = getUserById(id);

        String roleName = user.getRole() != null ? user.getRole().getName().toUpperCase() : "";
        if ("ADMIN".equalsIgnoreCase(roleName) || "ROLE_ADMIN".equalsIgnoreCase(roleName)) {
            throw new RuntimeException("Administrator accounts cannot be deleted or deactivated.");
        }

        user.setStatus("DEACTIVATED");
        user.setDeactivatedAt(LocalDateTime.now());
        User saved = userRepository.save(user);

        // Sync to linked dentist
        dentistRepository.findByUserId(id).ifPresent(d -> {
            d.setStatus("INACTIVE");
            dentistRepository.save(d);
        });

        // Sync to linked staff
        staffRepository.findByUserId(id).ifPresent(s -> {
            s.setStatus("INACTIVE");
            staffRepository.save(s);
        });

        AuditLog audit = new AuditLog();
        audit.setUser(user);
        audit.setEntityType("User");
        audit.setEntityId(id);
        audit.setAction("USER_DEACTIVATED");
        audit.setDescription("Administrator soft-deleted/deactivated user account: " + user.getEmail());
        audit.setActionTime(LocalDateTime.now());
        auditLogService.createAuditLog(audit);

        return saved;
    }

    // Get all pending deactivation requests
    public List<User> getDeactivationRequests() {
        return userRepository.findByStatusIgnoreCase("DEACTIVATION_REQUESTED");
    }

    // Admin approve deactivation request
    public User approveDeactivation(Long id, Long adminUserId) {
        User user = getUserById(id);

        String roleName = user.getRole() != null ? user.getRole().getName().toUpperCase() : "";
        if ("ADMIN".equalsIgnoreCase(roleName) || "ROLE_ADMIN".equalsIgnoreCase(roleName)) {
            throw new RuntimeException("Administrator accounts cannot be deactivated.");
        }

        user.setStatus("DEACTIVATED");
        user.setDeactivatedAt(LocalDateTime.now());
        User saved = userRepository.save(user);

        // Sync to linked dentist
        dentistRepository.findByUserId(id).ifPresent(d -> {
            d.setStatus("INACTIVE");
            dentistRepository.save(d);
        });

        AuditLog audit = new AuditLog();
        if (adminUserId != null) {
            userRepository.findById(adminUserId).ifPresent(audit::setUser);
        }
        audit.setEntityType("User");
        audit.setEntityId(id);
        audit.setAction("DEACTIVATION_APPROVED");
        audit.setDescription("Administrator approved account deactivation for: " + user.getEmail());
        audit.setActionTime(LocalDateTime.now());
        auditLogService.createAuditLog(audit);

        return saved;
    }

    // Admin reject deactivation request
    public User rejectDeactivation(Long id, Long adminUserId) {
        User user = getUserById(id);

        user.setStatus("ACTIVE");
        user.setDeactivationRequestedAt(null);
        user.setDeactivationReason(null);
        User saved = userRepository.save(user);

        // Sync to linked dentist
        dentistRepository.findByUserId(id).ifPresent(d -> {
            d.setStatus("ACTIVE");
            dentistRepository.save(d);
        });

        AuditLog audit = new AuditLog();
        if (adminUserId != null) {
            userRepository.findById(adminUserId).ifPresent(audit::setUser);
        }
        audit.setEntityType("User");
        audit.setEntityId(id);
        audit.setAction("DEACTIVATION_REJECTED");
        audit.setDescription("Administrator rejected account deactivation request for: " + user.getEmail());
        audit.setActionTime(LocalDateTime.now());
        auditLogService.createAuditLog(audit);

        return saved;
    }

    // Update profile image / avatar
    public User updateProfileImage(Long id, String profileImageBase64) {
        User user = getUserById(id);
        user.setProfileImage(profileImageBase64);
        User saved = userRepository.save(user);

        // Sync to linked dentist
        dentistRepository.findByUserId(id).ifPresent(d -> {
            d.setImageUrl(profileImageBase64);
            dentistRepository.save(d);
        });

        return saved;
    }

    // Validate login credentials
    public User authenticate(
            String email,
            String password) {

        if (email == null ||
                password == null) {

            throw new RuntimeException(
                    "Email and password are required"
            );
        }

        User user = userRepository
                .findByEmail(email.trim().toLowerCase())
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

        if (!"ACTIVE".equalsIgnoreCase(
                user.getStatus())) {

            throw new RuntimeException(
                    "User account is not active"
            );
        }

        return user;
    }
}