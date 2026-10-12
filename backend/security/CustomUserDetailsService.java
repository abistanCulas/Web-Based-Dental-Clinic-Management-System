package com.dentaflow.backend.security;

import com.dentaflow.backend.entity.Staff;
import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.repository.StaffRepository;
import com.dentaflow.backend.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService
        implements UserDetailsService {

    private final UserRepository userRepository;
    private final StaffRepository staffRepository;

    public CustomUserDetailsService(
            UserRepository userRepository,
            StaffRepository staffRepository) {

        this.userRepository = userRepository;
        this.staffRepository = staffRepository;
    }

    @Override
    public UserDetails loadUserByUsername(
            String email)
            throws UsernameNotFoundException {

        if (email == null ||
                email.trim().isEmpty()) {

            throw new UsernameNotFoundException(
                    "Email is required"
            );
        }

        String normalizedEmail =
                email.trim().toLowerCase();

        User user = userRepository
                .findByEmail(normalizedEmail)
                .orElseThrow(() ->
                        new UsernameNotFoundException(
                                "User not found: "
                                        + normalizedEmail
                        ));

        String staffRole = staffRepository.findByUserId(user.getId())
                .map(Staff::getRole)
                .orElse(null);

        return new CustomUserDetails(user, staffRole);
    }
}