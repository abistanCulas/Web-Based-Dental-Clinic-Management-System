package com.dental.inventory.service;

import com.dental.inventory.dto.request.LoginRequest;
import com.dental.inventory.dto.request.RegisterRequest;
import com.dental.inventory.dto.response.AuthResponse;
import com.dental.inventory.entity.User;
import com.dental.inventory.exception.DuplicateResourceException;
import com.dental.inventory.repository.UserRepository;
import com.dental.inventory.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateResourceException("Username '" + request.getUsername() + "' is already taken.");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email '" + request.getEmail() + "' is already registered.");
        }

        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .build();

        userRepository.save(user);

        String token = jwtUtil.generateToken(user, user.getRole().name());

        return AuthResponse.builder()
                .token(token)
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole().name())
                .message("User registered successfully.")
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        // Step 2 & 3 in Sequence Diagram: authenticateUser()
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        // Step 4 & 5 in Sequence Diagram: findUserByCredentials()
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found."));

        // Step 11: loginSuccess(userInfo)
        String token = jwtUtil.generateToken(user, user.getRole().name());

        return AuthResponse.builder()
                .token(token)
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole().name())
                .message("Login successful.")
                .build();
    }
}
