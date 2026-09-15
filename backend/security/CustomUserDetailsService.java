package com.dentaflow.backend.security;

import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService
        implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(
            UserRepository userRepository) {

        this.userRepository = userRepository;
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

        return new CustomUserDetails(user);
    }
}