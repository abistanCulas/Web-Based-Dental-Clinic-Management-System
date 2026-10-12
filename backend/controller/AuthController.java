package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.ChangePasswordRequest;
import com.dentaflow.backend.dto.ForgotPasswordRequest;
import com.dentaflow.backend.dto.GoogleAuthRequest;
import com.dentaflow.backend.dto.LoginRequest;
import com.dentaflow.backend.dto.LoginResponse;
import com.dentaflow.backend.dto.RegisterRequest;
import com.dentaflow.backend.dto.RegisterSendOtpRequest;
import com.dentaflow.backend.dto.RegisterVerifyOtpRequest;
import com.dentaflow.backend.dto.ResendOtpRequest;
import com.dentaflow.backend.dto.ResetPasswordRequest;
import com.dentaflow.backend.dto.VerifyOtpRequest;
import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.security.JwtService;
import com.dentaflow.backend.service.AuthService;
import com.dentaflow.backend.service.GoogleAuthService;
import com.dentaflow.backend.service.OtpService;
import com.dentaflow.backend.service.RegistrationOtpService;

import jakarta.validation.Valid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final GoogleAuthService googleAuthService;
    private final JwtService jwtService;
    private final OtpService otpService;
    private final RegistrationOtpService registrationOtpService;

    @Autowired
    public AuthController(
            AuthService authService,
            GoogleAuthService googleAuthService,
            JwtService jwtService,
            OtpService otpService,
            RegistrationOtpService registrationOtpService) {

        this.authService = authService;
        this.googleAuthService = googleAuthService;
        this.jwtService = jwtService;
        this.otpService = otpService;
        this.registrationOtpService = registrationOtpService;
    }

    public AuthController(
            AuthService authService,
            JwtService jwtService,
            OtpService otpService,
            RegistrationOtpService registrationOtpService) {

        this(authService, null, jwtService, otpService, registrationOtpService);
    }

    // =========================================================
    // REGISTER - SEND OTP
    // =========================================================

    @PostMapping("/register/send-otp")
    public ResponseEntity<?> sendRegistrationOtp(
            @Valid @RequestBody RegisterSendOtpRequest request) {

        try {
            Map<String, Object> result =
                    registrationOtpService.sendRegistrationOtp(request.getEmail());

            return ResponseEntity.ok(result);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(errorResponse(exception.getMessage()));
        }
    }

    // =========================================================
    // REGISTER - RESEND OTP
    // =========================================================

    @PostMapping("/register/resend-otp")
    public ResponseEntity<?> resendRegistrationOtp(
            @Valid @RequestBody RegisterSendOtpRequest request) {

        return sendRegistrationOtp(request);
    }

    // =========================================================
    // REGISTER - VERIFY OTP
    // =========================================================

    @PostMapping("/register/verify-otp")
    public ResponseEntity<?> verifyRegistrationOtp(
            @Valid @RequestBody RegisterVerifyOtpRequest request) {

        try {
            Map<String, Object> result =
                    registrationOtpService.verifyRegistrationOtp(request);

            if (result.containsKey("user") && result.get("user") instanceof User user) {
                Map<String, Object> userResp = createUserResponse(user);
                userResp.put("success", true);
                userResp.put("message", "Account registered successfully.");
                return ResponseEntity.status(HttpStatus.CREATED).body(userResp);
            }

            return ResponseEntity.ok(result);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(errorResponse(exception.getMessage()));
        }
    }

    // =========================================================
    // REGISTER - COMPLETE REGISTRATION
    // =========================================================

    @PostMapping("/register")
    public ResponseEntity<?> register(
            @Valid @RequestBody RegisterRequest request) {

        try {
            User user = registrationOtpService.completeRegistration(request);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(createUserResponse(user));

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(errorResponse(
                            exception.getMessage()
                    ));
        }
    }

    // =========================================================
    // LOGIN
    // =========================================================

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest request) {

        try {

            User user = authService.login(
                    request.getUsernameOrEmail(),
                    request.getPassword()
            );

            String token =
                    jwtService.generateToken(user);

            LoginResponse response =
                    LoginResponse.builder()
                            .token(token)
                            .tokenType("Bearer")
                            .userId(user.getId())
                            .username(user.getEmail())
                            .role(
                                    user.getRole() != null
                                            ? user.getRole().getName()
                                            : null
                            )
                            .build();

            return ResponseEntity.ok(response);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(errorResponse(
                            exception.getMessage()
                    ));
        }
    }

    // =========================================================
    // GOOGLE OAUTH 2.0 LOGIN & REGISTRATION
    // =========================================================

    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@RequestBody GoogleAuthRequest request) {
        try {
            LoginResponse response = googleAuthService.authenticate(request);
            return ResponseEntity.ok(response);
        } catch (RuntimeException exception) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(errorResponse(exception.getMessage()));
        }
    }

    @GetMapping("/oauth2/google/config")
    public ResponseEntity<?> getGoogleOAuthConfig() {
        Map<String, Object> config = new HashMap<>();
        config.put("configured", googleAuthService.isConfigured());
        config.put("clientId", googleAuthService.getClientId());
        config.put("redirectUri", googleAuthService.getRedirectUri());
        return ResponseEntity.ok(config);
    }

    @GetMapping("/oauth2/google/url")
    public ResponseEntity<?> getGoogleAuthUrl(
            @RequestParam(value = "redirectUri", required = false) String redirectUri,
            @RequestParam(value = "state", required = false) String state) {
        try {
            String url = googleAuthService.buildAuthorizationUrl(redirectUri, state);
            return ResponseEntity.ok(Map.of("url", url));
        } catch (RuntimeException ex) {
            return ResponseEntity
                    .badRequest()
                    .body(errorResponse(ex.getMessage()));
        }
    }

    @GetMapping("/oauth2/google")
    public RedirectView redirectToGoogle(
            @RequestParam(value = "redirectUri", required = false) String redirectUri,
            @RequestParam(value = "state", required = false) String state) {
        String url = googleAuthService.buildAuthorizationUrl(redirectUri, state);
        return new RedirectView(url);
    }

    @GetMapping("/oauth2/callback/google")
    public RedirectView handleGoogleCallback(
            @RequestParam(value = "code", required = false) String code,
            @RequestParam(value = "state", required = false) String state,
            @RequestParam(value = "error", required = false) String error) {

        String redirectTarget = googleAuthService.getRedirectUri();

        if (error != null && !error.isBlank()) {
            return new RedirectView(redirectTarget + "?error=" + URLEncoder.encode(error, StandardCharsets.UTF_8));
        }

        if (code == null || code.isBlank()) {
            return new RedirectView(redirectTarget + "?error=" + URLEncoder.encode("Missing authorization code from Google", StandardCharsets.UTF_8));
        }

        try {
            String mode = null;
            if (state != null) {
                if (state.startsWith("register_")) {
                    mode = "register";
                } else if (state.startsWith("login_")) {
                    mode = "login";
                }
            }

            GoogleAuthRequest authRequest = GoogleAuthRequest.builder()
                    .code(code)
                    .redirectUri(googleAuthService.getRedirectUri())
                    .mode(mode)
                    .build();
            LoginResponse response = googleAuthService.authenticate(authRequest);
            return new RedirectView(redirectTarget + "?token=" + response.getToken() + "&status=success");
        } catch (Exception ex) {
            return new RedirectView(redirectTarget + "?error=" + URLEncoder.encode(ex.getMessage(), StandardCharsets.UTF_8));
        }
    }

    // =========================================================
    // CURRENT USER
    // =========================================================

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(
            @RequestHeader("Authorization")
            String authorizationHeader) {

        try {

            String token =
                    extractToken(authorizationHeader);

            String email =
                    jwtService.extractEmail(token);

            User user =
                    authService.getUserByEmail(email);

            return ResponseEntity.ok(
                    createUserResponse(user)
            );

        } catch (Exception exception) {

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(errorResponse(
                            "Invalid or expired token"
                    ));
        }
    }

    // =========================================================
    // CHANGE PASSWORD
    // =========================================================

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @RequestHeader("Authorization")
            String authorizationHeader,

            @Valid @RequestBody
            ChangePasswordRequest request) {

        try {

            String token =
                    extractToken(authorizationHeader);

            Long userId =
                    jwtService.extractUserId(token);

            if (userId == null) {

                throw new RuntimeException(
                        "User ID not found in token"
                );
            }

            authService.changePassword(
                    userId,
                    request.getCurrentPassword(),
                    request.getNewPassword()
            );

            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "message",
                            "Password changed successfully"
                    )
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(errorResponse(
                            exception.getMessage()
                    ));
        }
    }

    // =========================================================
    // DEACTIVATE ACCOUNT
    // =========================================================

    @PostMapping("/deactivate")
    public ResponseEntity<?> deactivateAccount(
            @RequestHeader("Authorization")
            String authorizationHeader,
            @RequestBody(required = false)
            Map<String, String> body) {

        try {

            String token =
                    extractToken(authorizationHeader);

            Long userId =
                    jwtService.extractUserId(token);

            if (userId == null) {

                throw new RuntimeException(
                        "User ID not found in token"
                );
            }

            String reason = body != null ? body.get("reason") : null;
            Map<String, Object> result = authService.deactivateAccount(userId, reason);

            return ResponseEntity.ok(result);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(errorResponse(
                            exception.getMessage()
                    ));
        }
    }

    // =========================================================
    // ACTIVATE ACCOUNT
    // =========================================================

    @PostMapping("/activate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> activateAccount(
            @RequestHeader(value = "Authorization", required = false)
            String authorizationHeader) {

        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(errorResponse("Unauthorized"));
        }

        try {

            String token =
                    extractToken(authorizationHeader);

            String role = jwtService.extractRole(token);
            if (role == null || (!role.equalsIgnoreCase("ADMIN") && !role.equalsIgnoreCase("ROLE_ADMIN"))) {
                return ResponseEntity
                        .status(HttpStatus.FORBIDDEN)
                        .body(errorResponse("Access denied: Administrator role required"));
            }

            Long userId =
                    jwtService.extractUserId(token);

            if (userId == null) {

                throw new RuntimeException(
                        "User ID not found in token"
                );
            }

            authService.activateAccount(userId);

            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "message",
                            "Account activated successfully"
                    )
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(errorResponse(
                            exception.getMessage()
                    ));
        }
    }

    // =========================================================
    // FORGOT PASSWORD - REQUEST OTP
    // =========================================================

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request) {

        try {
            Map<String, Object> result = otpService.requestPasswordResetOtp(request.getEmail());
            return ResponseEntity.ok(result);
        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(errorResponse(exception.getMessage()));
        }
    }

    // =========================================================
    // VERIFY OTP
    // =========================================================

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(
            @Valid @RequestBody VerifyOtpRequest request) {

        try {
            Map<String, Object> result = otpService.verifyOtp(request.getEmail(), request.getOtp());
            return ResponseEntity.ok(result);
        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(errorResponse(exception.getMessage()));
        }
    }

    // =========================================================
    // RESET PASSWORD
    // =========================================================

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request) {

        try {
            Map<String, Object> result = otpService.resetPassword(
                    request.getEmail(),
                    request.getResetToken(),
                    request.getNewPassword()
            );
            return ResponseEntity.ok(result);
        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(errorResponse(exception.getMessage()));
        }
    }

    // =========================================================
    // RESEND OTP
    // =========================================================

    @PostMapping("/resend-otp")
    public ResponseEntity<?> resendOtp(
            @Valid @RequestBody ResendOtpRequest request) {

        try {
            Map<String, Object> result = otpService.resendOtp(request.getEmail());
            return ResponseEntity.ok(result);
        } catch (RuntimeException exception) {
            return ResponseEntity
                    .badRequest()
                    .body(errorResponse(exception.getMessage()));
        }
    }

    // =========================================================
    // EXTRACT TOKEN
    // =========================================================

    private String extractToken(
            String authorizationHeader) {

        if (authorizationHeader == null ||
                authorizationHeader.trim().isEmpty()) {

            throw new RuntimeException(
                    "Authorization header is required"
            );
        }

        if (!authorizationHeader.startsWith("Bearer ")) {

            throw new RuntimeException(
                    "Invalid Authorization header"
            );
        }

        String token =
                authorizationHeader
                        .substring(7)
                        .trim();

        if (token.isEmpty()) {

            throw new RuntimeException(
                    "JWT token is required"
            );
        }

        return token;
    }

    // =========================================================
    // USER RESPONSE
    // =========================================================

    private Map<String, Object> createUserResponse(
            User user) {

        Map<String, Object> response =
                new HashMap<>();

        response.put("id", user.getId());
        response.put("firstName", user.getFirstName());
        response.put("lastName", user.getLastName());
        response.put("email", user.getEmail());
        response.put("phone", user.getPhone());
        response.put("status", user.getStatus());
        response.put(
                "preferredLanguage",
                user.getPreferredLanguage()
        );
        response.put(
                "emailVerified",
                user.getEmailVerified()
        );
        response.put("profileImage", user.getProfileImage());
        response.put("authProvider", user.getAuthProvider());
        response.put("providerId", user.getProviderId());
        response.put("deactivationReason", user.getDeactivationReason());
        response.put("deactivationRequestedAt", user.getDeactivationRequestedAt());
        response.put("deactivatedAt", user.getDeactivatedAt());

        if (user.getRole() != null) {

            response.put(
                    "role",
                    user.getRole().getName()
            );
        }

        return response;
    }

    // =========================================================
    // ERROR RESPONSE
    // =========================================================

    private Map<String, Object> errorResponse(
            String message) {

        Map<String, Object> response =
                new HashMap<>();

        String msg = message != null
                ? message
                : "Something went wrong";

        response.put("success", false);
        response.put("error", msg);
        response.put("message", msg);

        return response;
    }
}