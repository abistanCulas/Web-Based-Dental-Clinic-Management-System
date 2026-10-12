package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.Role;
import com.dentaflow.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    // Find user by email - mainly used for login
    Optional<User> findByEmail(String email);

    // Check whether email already exists
    boolean existsByEmail(String email);

    // Find users by role
    List<User> findByRole(Role role);

    // Find users by account status
    List<User> findByStatus(String status);

    List<User> findByStatusIgnoreCase(String status);

    // Find users by role and status
    List<User> findByRoleAndStatus(Role role, String status);

    // Search users by first name or last name
    List<User> findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(
            String firstName,
            String lastName
    );

    // Find user by email and status
    Optional<User> findByEmailAndStatus(String email, String status);
}