package com.dentaflow.backend.service;

import com.dentaflow.backend.entity.Role;
import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.repository.RoleRepository;
import com.dentaflow.backend.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder) {

        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
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
                .findByEmailAndStatus(
                        normalizedEmail,
                        "ACTIVE"
                )
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

    public User deactivateAccount(
            Long userId) {

        User user = userRepository
                .findById(userId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "User not found with id: "
                                        + userId
                        ));

        user.setStatus("INACTIVE");

        return userRepository.save(user);
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