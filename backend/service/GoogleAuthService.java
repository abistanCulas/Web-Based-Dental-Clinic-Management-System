package com.dentaflow.backend.service;

import com.dentaflow.backend.dto.GoogleAuthRequest;
import com.dentaflow.backend.dto.GoogleUserInfo;
import com.dentaflow.backend.dto.LoginResponse;
import com.dentaflow.backend.entity.AuditLog;
import com.dentaflow.backend.entity.Patient;
import com.dentaflow.backend.entity.Role;
import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.exception.BadRequestException;
import com.dentaflow.backend.exception.UnauthorizedException;
import com.dentaflow.backend.repository.PatientRepository;
import com.dentaflow.backend.repository.RoleRepository;
import com.dentaflow.backend.repository.UserRepository;
import com.dentaflow.backend.security.JwtService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@Transactional
public class GoogleAuthService {

    private static final Logger log = LoggerFactory.getLogger(GoogleAuthService.class);

    private static final String GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
    private static final String GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";
    private static final String GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
    private static final String GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PatientRepository patientRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuditLogService auditLogService;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${google.client.id:}")
    private String clientId;

    @Value("${google.client.secret:}")
    private String clientSecret;

    @Value("${google.redirect.uri:http://localhost:5173/login}")
    private String redirectUri;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    public GoogleAuthService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            PatientRepository patientRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            AuditLogService auditLogService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.patientRepository = patientRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.auditLogService = auditLogService;
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    public boolean isConfigured() {
        return clientId != null && !clientId.trim().isEmpty();
    }

    public String getClientId() {
        return clientId != null ? clientId.trim() : "";
    }

    public String getRedirectUri() {
        return redirectUri != null ? redirectUri.trim() : "";
    }

    /**
     * Builds the Google OAuth 2.0 authorization URL for client redirects.
     */
    public String buildAuthorizationUrl(String overrideRedirectUri, String state) {
        if (!isConfigured()) {
            throw new BadRequestException("Google OAuth is not configured. Please set GOOGLE_CLIENT_ID in your configuration.");
        }

        String effectiveRedirectUri = (overrideRedirectUri != null && !overrideRedirectUri.trim().isEmpty())
                ? overrideRedirectUri.trim()
                : this.redirectUri;

        StringBuilder sb = new StringBuilder(GOOGLE_AUTH_URL);
        sb.append("?client_id=").append(URLEncoder.encode(clientId.trim(), StandardCharsets.UTF_8));
        sb.append("&redirect_uri=").append(URLEncoder.encode(effectiveRedirectUri, StandardCharsets.UTF_8));
        sb.append("&response_type=code");
        sb.append("&scope=").append(URLEncoder.encode("openid email profile", StandardCharsets.UTF_8));
        sb.append("&access_type=offline");
        sb.append("&prompt=select_account");

        if (state != null && !state.trim().isEmpty()) {
            sb.append("&state=").append(URLEncoder.encode(state.trim(), StandardCharsets.UTF_8));
        }

        return sb.toString();
    }

    /**
     * Handles Google authentication using either an ID token or an OAuth authorization code.
     */
    public LoginResponse authenticate(GoogleAuthRequest request) {
        if (request == null) {
            throw new BadRequestException("Google authentication request cannot be empty.");
        }

        GoogleUserInfo userInfo;

        if (request.getCode() != null && !request.getCode().trim().isEmpty()) {
            // Flow A: Authorization code exchange
            userInfo = exchangeCodeForUserInfo(request.getCode().trim(), request.getRedirectUri());
        } else if (request.getIdToken() != null && !request.getIdToken().trim().isEmpty()) {
            // Flow B: Direct ID Token validation
            userInfo = verifyIdToken(request.getIdToken().trim());
        } else {
            throw new BadRequestException("Either Google authorization code or ID token must be provided.");
        }

        if (userInfo == null || userInfo.getEmail() == null || userInfo.getEmail().trim().isEmpty()) {
            throw new BadRequestException("Failed to obtain verified email from Google account.");
        }

        return processAuthenticatedUser(userInfo, request.getMode());
    }

    /**
     * Exchanges Google authorization code with Google Token Endpoint for tokens, then extracts user info.
     */
    public GoogleUserInfo exchangeCodeForUserInfo(String code, String requestRedirectUri) {
        if (!isConfigured()) {
            throw new BadRequestException("Google OAuth is not configured on the server. Please set the GOOGLE_CLIENT_ID environment variable.");
        }
        if (clientSecret == null || clientSecret.trim().isEmpty()) {
            throw new BadRequestException("Google Client Secret is not configured. Please set the GOOGLE_CLIENT_SECRET environment variable.");
        }

        String effectiveRedirectUri = (requestRedirectUri != null && !requestRedirectUri.trim().isEmpty())
                ? requestRedirectUri.trim()
                : this.redirectUri;

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("code", code);
        body.add("client_id", clientId.trim());
        body.add("client_secret", clientSecret.trim());
        body.add("redirect_uri", effectiveRedirectUri);
        body.add("grant_type", "authorization_code");

        HttpEntity<MultiValueMap<String, String>> requestEntity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(GOOGLE_TOKEN_URL, requestEntity, String.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                log.error("Google token exchange returned non-success status: {}", response.getStatusCode());
                throw new BadRequestException("Failed to exchange authorization code with Google.");
            }

            JsonNode root = objectMapper.readTree(response.getBody());
            String idToken = root.has("id_token") ? root.get("id_token").asText() : null;
            String accessToken = root.has("access_token") ? root.get("access_token").asText() : null;

            // Try verifying ID Token if returned
            if (idToken != null && !idToken.isBlank()) {
                try {
                    return verifyIdToken(idToken);
                } catch (Exception ex) {
                    log.warn("ID token verification after code exchange failed, falling back to userinfo: {}", ex.getMessage());
                }
            }

            // Fallback to Google UserInfo endpoint with Access Token
            if (accessToken != null && !accessToken.isBlank()) {
                return fetchUserInfoFromAccessToken(accessToken);
            }

            throw new BadRequestException("Google token exchange did not return valid tokens.");

        } catch (BadRequestException bre) {
            throw bre;
        } catch (Exception e) {
            log.error("Error exchanging Google authorization code: {}", e.getMessage(), e);
            throw new BadRequestException("Google authentication failed: " + e.getMessage());
        }
    }

    /**
     * Verifies Google ID Token cryptographically and extracts claims.
     */
    public GoogleUserInfo verifyIdToken(String idTokenString) {
        // 1. Primary: Verify using Google API Client library GoogleIdTokenVerifier
        try {
            GoogleIdTokenVerifier.Builder verifierBuilder = new GoogleIdTokenVerifier.Builder(
                    GoogleNetHttpTransport.newTrustedTransport(),
                    GsonFactory.getDefaultInstance()
            );

            if (isConfigured()) {
                verifierBuilder.setAudience(Collections.singletonList(clientId.trim()));
            }

            GoogleIdTokenVerifier verifier = verifierBuilder.build();
            GoogleIdToken idToken = verifier.verify(idTokenString);

            if (idToken != null) {
                GoogleIdToken.Payload payload = idToken.getPayload();
                return GoogleUserInfo.builder()
                        .sub(payload.getSubject())
                        .email(payload.getEmail())
                        .emailVerified(Boolean.TRUE.equals(payload.getEmailVerified()))
                        .name((String) payload.get("name"))
                        .givenName((String) payload.get("given_name"))
                        .familyName((String) payload.get("family_name"))
                        .picture((String) payload.get("picture"))
                        .build();
            }
        } catch (Exception e) {
            log.warn("GoogleIdTokenVerifier failed, checking fallback tokeninfo endpoint: {}", e.getMessage());
        }

        // 2. Secondary fallback: Check Google tokeninfo endpoint
        try {
            String url = GOOGLE_TOKENINFO_URL + "?id_token=" + URLEncoder.encode(idTokenString, StandardCharsets.UTF_8);
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode node = objectMapper.readTree(response.getBody());

                // If clientId configured, verify aud match
                if (isConfigured() && node.has("aud")) {
                    String aud = node.get("aud").asText();
                    if (!clientId.trim().equals(aud)) {
                        log.warn("Token audience {} does not match configured clientId {}", aud, clientId);
                    }
                }

                return GoogleUserInfo.builder()
                        .sub(node.has("sub") ? node.get("sub").asText() : null)
                        .email(node.has("email") ? node.get("email").asText() : null)
                        .emailVerified(node.has("email_verified") && Boolean.parseBoolean(node.get("email_verified").asText()))
                        .name(node.has("name") ? node.get("name").asText() : null)
                        .givenName(node.has("given_name") ? node.get("given_name").asText() : null)
                        .familyName(node.has("family_name") ? node.get("family_name").asText() : null)
                        .picture(node.has("picture") ? node.get("picture").asText() : null)
                        .build();
            }
        } catch (Exception ex) {
            log.error("Google tokeninfo fallback check failed: {}", ex.getMessage());
        }

        throw new BadRequestException("Invalid or expired Google ID token.");
    }

    /**
     * Fetches user profile from Google UserInfo endpoint using an access token.
     */
    private GoogleUserInfo fetchUserInfoFromAccessToken(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        HttpEntity<?> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    GOOGLE_USERINFO_URL,
                    HttpMethod.GET,
                    entity,
                    String.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode node = objectMapper.readTree(response.getBody());
                return GoogleUserInfo.builder()
                        .sub(node.has("sub") ? node.get("sub").asText() : null)
                        .email(node.has("email") ? node.get("email").asText() : null)
                        .emailVerified(node.has("email_verified") && node.get("email_verified").asBoolean())
                        .name(node.has("name") ? node.get("name").asText() : null)
                        .givenName(node.has("given_name") ? node.get("given_name").asText() : null)
                        .familyName(node.has("family_name") ? node.get("family_name").asText() : null)
                        .picture(node.has("picture") ? node.get("picture").asText() : null)
                        .build();
            }
        } catch (Exception e) {
            log.error("Failed to fetch Google userinfo from access token: {}", e.getMessage());
        }

        throw new BadRequestException("Failed to retrieve user profile from Google.");
    }

    /**
     * Resolves the DentaFlow user account (finds existing or creates new),
     * applies role and patient profile, and issues DentaFlow JWT.
     */
    public LoginResponse processAuthenticatedUser(GoogleUserInfo userInfo) {
        return processAuthenticatedUser(userInfo, null);
    }

    /**
     * Resolves the DentaFlow user account with mode validation ("login" or "register").
     */
    public LoginResponse processAuthenticatedUser(GoogleUserInfo userInfo, String mode) {
        String rawEmail = userInfo.getEmail();
        if (rawEmail == null || rawEmail.trim().isEmpty()) {
            throw new BadRequestException("Google account must provide an email address.");
        }

        String normalizedEmail = rawEmail.trim().toLowerCase();
        Optional<User> existingUserOpt = userRepository.findByEmail(normalizedEmail);

        String effectiveMode = (mode != null && !mode.trim().isEmpty())
                ? mode.trim().toLowerCase()
                : null;

        if ("login".equals(effectiveMode) && existingUserOpt.isEmpty()) {
            throw new BadRequestException("No DentaFlow account was found for this Google account. Please register first.");
        }

        if ("register".equals(effectiveMode) && existingUserOpt.isPresent()) {
            throw new BadRequestException("An account already exists with this Google/email address. Please login instead.");
        }

        User user;
        boolean isNewUser = false;

        if (existingUserOpt.isPresent()) {
            // Existing user: preserve role and permissions
            user = existingUserOpt.get();

            if ("DEACTIVATED".equalsIgnoreCase(user.getStatus()) ||
                    "INACTIVE".equalsIgnoreCase(user.getStatus())) {
                throw new UnauthorizedException("Your account has been deactivated. Please contact clinic administration.");
            }

            // Update OAuth metadata and avatar if not already customized
            if (userInfo.getSub() != null && !userInfo.getSub().isBlank()) {
                user.setProviderId(userInfo.getSub());
            }
            user.setAuthProvider("GOOGLE");
            user.setEmailVerified("YES");

            if ((user.getProfileImage() == null || user.getProfileImage().isBlank()) && userInfo.getPicture() != null) {
                user.setProfileImage(userInfo.getPicture());
            }

            user = userRepository.save(user);

            // Create patient profile if missing and user has PATIENT role
            if (user.getRole() != null && "PATIENT".equalsIgnoreCase(user.getRole().getName())) {
                createPatientProfileIfAbsent(user);
            }

            logAudit(user, "LOGIN", "User logged in with Google OAuth: " + user.getEmail());

        } else {
            // New user registration via Google
            isNewUser = true;

            String firstName = userInfo.getGivenName();
            String lastName = userInfo.getFamilyName();

            if (firstName == null || firstName.isBlank()) {
                if (userInfo.getName() != null && !userInfo.getName().isBlank()) {
                    String[] parts = userInfo.getName().trim().split("\\s+");
                    firstName = parts[0];
                    lastName = parts.length > 1 ? String.join(" ", Arrays.copyOfRange(parts, 1, parts.length)) : "User";
                } else {
                    firstName = "Google";
                    lastName = "User";
                }
            }
            if (lastName == null || lastName.isBlank()) {
                lastName = "User";
            }

            Role patientRole = roleRepository.findByName("PATIENT")
                    .orElseThrow(() -> new RuntimeException("Default PATIENT role not found in system."));

            user = new User();
            user.setFirstName(firstName.trim());
            user.setLastName(lastName.trim());
            user.setEmail(normalizedEmail);
            user.setRole(patientRole);
            user.setStatus("ACTIVE");
            user.setPreferredLanguage("EN");
            user.setAuthProvider("GOOGLE");
            user.setProviderId(userInfo.getSub());
            user.setEmailVerified("YES");
            user.setProfileImage(userInfo.getPicture());

            // Store cryptographically secure random password hash (NEVER plaintext)
            String randomPassword = UUID.randomUUID().toString();
            user.setPassword(passwordEncoder.encode(randomPassword));

            user = userRepository.save(user);

            // Automatically create linked Patient entity with unique patientCode
            createPatientProfileIfAbsent(user);

            logAudit(user, "REGISTER", "New user registered with Google OAuth: " + user.getEmail());
        }

        // Generate DentaFlow JWT token with existing claims (userId, email, role)
        String token = jwtService.generateToken(user);

        return LoginResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .userId(user.getId())
                .username(user.getEmail())
                .role(user.getRole() != null ? user.getRole().getName() : null)
                .build();
    }

    private void createPatientProfileIfAbsent(User user) {
        if (user == null || user.getId() == null) return;
        if (patientRepository.findByUserId(user.getId()).isPresent()) return;

        long count = patientRepository.count() + 1;
        String code;
        do {
            code = String.format("P%04d", count);
            count++;
        } while (patientRepository.existsByPatientCode(code));

        Patient patient = new Patient();
        patient.setUser(user);
        patient.setFirstName(user.getFirstName());
        patient.setLastName(user.getLastName());
        patient.setEmail(user.getEmail());
        patient.setPhone(user.getPhone());
        patient.setDateOfBirth(LocalDate.of(2000, 1, 1)); // Default DOB for self-registered patient
        patient.setGender("OTHER");
        patient.setStatus("ACTIVE");
        patient.setPatientCode(code);

        patientRepository.save(patient);
        log.info("Created linked Patient profile {} for Google user {}", code, user.getEmail());
    }

    private void logAudit(User user, String action, String description) {
        try {
            AuditLog audit = new AuditLog();
            audit.setUser(user);
            audit.setEntityType("User");
            audit.setEntityId(user.getId());
            audit.setAction(action);
            audit.setDescription(description);
            audit.setActionTime(LocalDateTime.now());
            auditLogService.createAuditLog(audit);
        } catch (Exception ex) {
            log.warn("Failed to create audit log for Google auth: {}", ex.getMessage());
        }
    }
}
