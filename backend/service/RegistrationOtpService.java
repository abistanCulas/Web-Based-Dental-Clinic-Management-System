package com.dentaflow.backend.service;

import com.dentaflow.backend.dto.RegisterRequest;
import com.dentaflow.backend.dto.RegisterVerifyOtpRequest;
import com.dentaflow.backend.entity.Patient;
import com.dentaflow.backend.entity.RegistrationOtp;
import com.dentaflow.backend.entity.Role;
import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.repository.PatientRepository;
import com.dentaflow.backend.repository.RegistrationOtpRepository;
import com.dentaflow.backend.repository.RoleRepository;
import com.dentaflow.backend.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
@Transactional
public class RegistrationOtpService {

    private final RegistrationOtpRepository registrationOtpRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PatientRepository patientRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final SecureRandom secureRandom = new SecureRandom();

    public RegistrationOtpService(
            RegistrationOtpRepository registrationOtpRepository,
            UserRepository userRepository,
            RoleRepository roleRepository,
            PatientRepository patientRepository,
            PasswordEncoder passwordEncoder,
            EmailService emailService) {
        this.registrationOtpRepository = registrationOtpRepository;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.patientRepository = patientRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    // =========================================================
    // SEND REGISTRATION OTP
    // =========================================================

    public Map<String, Object> sendRegistrationOtp(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new RuntimeException("Email address is required");
        }

        String normalizedEmail = email.trim().toLowerCase();

        // Prevent registration with already existing email
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new RuntimeException("Email is already registered");
        }

        // Rate limiting: 60-second cooldown check
        Optional<RegistrationOtp> latestOpt = registrationOtpRepository.findTopByEmailOrderByCreatedAtDesc(normalizedEmail);
        if (latestOpt.isPresent()) {
            RegistrationOtp latest = latestOpt.get();
            if (latest.getCreatedAt() != null) {
                long elapsedSeconds = Duration.between(latest.getCreatedAt(), LocalDateTime.now()).getSeconds();
                if (elapsedSeconds < 60) {
                    throw new RuntimeException("Please wait " + (60 - elapsedSeconds) + " seconds before requesting another code.");
                }
            }
        }

        // Invalidate prior active registration OTPs for this email
        List<RegistrationOtp> activeOtps = registrationOtpRepository.findByEmailAndUsedFalse(normalizedEmail);
        for (RegistrationOtp o : activeOtps) {
            o.setUsed(true);
        }
        if (!activeOtps.isEmpty()) {
            registrationOtpRepository.saveAll(activeOtps);
        }

        // Generate cryptographically secure 6-digit OTP
        int code = 100000 + secureRandom.nextInt(900000);
        String otpPlain = String.valueOf(code);

        // Store secure hash only (never plaintext)
        String otpHashed = passwordEncoder.encode(otpPlain);

        // 5-minute TTL
        RegistrationOtp otpRecord = RegistrationOtp.builder()
                .email(normalizedEmail)
                .otpHashed(otpHashed)
                .expiresAt(LocalDateTime.now().plusMinutes(5))
                .verified(false)
                .used(false)
                .attemptCount(0)
                .build();

        registrationOtpRepository.save(otpRecord);

        // Dispatch email via existing Spring Mail configuration
        emailService.sendRegistrationOtp(normalizedEmail, otpPlain);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("email", normalizedEmail);
        response.put("message", "Verification code sent to your email.");
        return response;
    }

    // =========================================================
    // VERIFY REGISTRATION OTP
    // =========================================================

    @Transactional(noRollbackFor = RuntimeException.class)
    public Map<String, Object> verifyRegistrationOtp(RegisterVerifyOtpRequest request) {
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw new RuntimeException("Email address is required");
        }
        if (request.getOtp() == null || request.getOtp().trim().isEmpty()) {
            throw new RuntimeException("Verification code is required");
        }

        String normalizedEmail = request.getEmail().trim().toLowerCase();
        String trimmedOtp = request.getOtp().trim();

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new RuntimeException("Email is already registered");
        }

        RegistrationOtp otpRecord = registrationOtpRepository.findTopByEmailOrderByCreatedAtDesc(normalizedEmail)
                .orElseThrow(() -> new RuntimeException("No active verification code found for this email. Please request a new code."));

        if (otpRecord.isUsed()) {
            throw new RuntimeException("This verification code has already been used. Please request a new code.");
        }

        if (otpRecord.getExpiresAt().isBefore(LocalDateTime.now())) {
            otpRecord.setUsed(true);
            registrationOtpRepository.save(otpRecord);
            throw new RuntimeException("Verification code has expired. Please request a new code.");
        }

        // Brute force protection: max 5 attempts
        if (otpRecord.getAttemptCount() >= 5) {
            otpRecord.setUsed(true);
            registrationOtpRepository.save(otpRecord);
            throw new RuntimeException("Too many incorrect attempts. This code is now invalid. Please request a new code.");
        }

        // Compare OTP against BCrypt hash
        if (!passwordEncoder.matches(trimmedOtp, otpRecord.getOtpHashed())) {
            otpRecord.setAttemptCount(otpRecord.getAttemptCount() + 1);
            registrationOtpRepository.save(otpRecord);
            int remaining = 5 - otpRecord.getAttemptCount();
            throw new RuntimeException("Invalid verification code. " + remaining + " attempts remaining.");
        }

        // Success: Mark verified & issue verificationToken
        String verificationToken = UUID.randomUUID().toString();
        otpRecord.setVerified(true);
        otpRecord.setVerificationToken(verificationToken);
        registrationOtpRepository.save(otpRecord);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("verificationToken", verificationToken);
        response.put("message", "Email verified successfully.");

        // If full registration payload is provided, complete registration immediately
        if (request.getFirstName() != null && !request.getFirstName().trim().isEmpty()
                && request.getPassword() != null && !request.getPassword().trim().isEmpty()) {

            User user = createUserAccount(
                    request.getFirstName(),
                    request.getLastName(),
                    normalizedEmail,
                    request.getPhone(),
                    request.getPassword(),
                    request.getRole()
            );

            otpRecord.setUsed(true);
            registrationOtpRepository.save(otpRecord);

            response.put("user", user);
            response.put("message", "Account registered successfully.");
        }

        return response;
    }

    // =========================================================
    // COMPLETE REGISTRATION (WITH VERIFICATION TOKEN OR OTP)
    // =========================================================

    public User completeRegistration(RegisterRequest request) {
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw new RuntimeException("Email is required");
        }

        String normalizedEmail = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new RuntimeException("Email is already registered");
        }

        // Must verify via verificationToken or otp
        boolean verified = false;

        if (request.getVerificationToken() != null && !request.getVerificationToken().trim().isEmpty()) {
            String token = request.getVerificationToken().trim();
            RegistrationOtp otpRecord = registrationOtpRepository.findByVerificationTokenAndUsedFalse(token)
                    .orElseThrow(() -> new RuntimeException("Invalid or expired verification session. Please verify your email again."));

            if (!otpRecord.isVerified()) {
                throw new RuntimeException("Email verification is pending. Please verify your OTP code.");
            }

            if (!otpRecord.getEmail().equalsIgnoreCase(normalizedEmail)) {
                throw new RuntimeException("Verification token does not match the provided email.");
            }

            if (otpRecord.getExpiresAt().isBefore(LocalDateTime.now())) {
                otpRecord.setUsed(true);
                registrationOtpRepository.save(otpRecord);
                throw new RuntimeException("Verification session has expired. Please request a new code.");
            }

            otpRecord.setUsed(true);
            registrationOtpRepository.save(otpRecord);
            verified = true;
        } else if (request.getOtp() != null && !request.getOtp().trim().isEmpty()) {
            RegisterVerifyOtpRequest verifyReq = RegisterVerifyOtpRequest.builder()
                    .email(normalizedEmail)
                    .otp(request.getOtp().trim())
                    .build();
            verifyRegistrationOtp(verifyReq);
            // Invalidate the record
            Optional<RegistrationOtp> opt = registrationOtpRepository.findTopByEmailOrderByCreatedAtDesc(normalizedEmail);
            if (opt.isPresent()) {
                opt.get().setUsed(true);
                registrationOtpRepository.save(opt.get());
            }
            verified = true;
        }

        if (!verified) {
            throw new RuntimeException("Registration requires email verification. Please verify your email first.");
        }

        return createUserAccount(
                request.getFirstName(),
                request.getLastName(),
                normalizedEmail,
                request.getPhone(),
                request.getPassword(),
                request.getRole()
        );
    }

    // =========================================================
    // INTERNAL: CREATE USER & PATIENT PROFILE
    // =========================================================

    private User createUserAccount(
            String firstName,
            String lastName,
            String normalizedEmail,
            String phone,
            String password,
            String roleName) {

        if (firstName == null || firstName.trim().isEmpty()) {
            throw new RuntimeException("First name is required");
        }
        if (password == null || password.trim().length() < 6) {
            throw new RuntimeException("Password must contain at least 6 characters");
        }

        if (roleName != null && !roleName.trim().isEmpty()) {
            String checkRole = roleName.trim().toUpperCase();
            if (checkRole.startsWith("ROLE_")) {
                checkRole = checkRole.substring(5);
            }
            if (!"PATIENT".equalsIgnoreCase(checkRole)) {
                throw new RuntimeException("Public registration is only permitted for patients. Staff and doctor accounts must be created by an administrator.");
            }
        }

        final String effectiveRole = "PATIENT";

        Role role = roleRepository.findByName(effectiveRole)
                .orElseThrow(() -> new RuntimeException("Role not found: " + effectiveRole));

        User user = new User();
        user.setFirstName(firstName.trim());
        user.setLastName(lastName != null ? lastName.trim() : "");
        user.setEmail(normalizedEmail);
        if (phone != null && !phone.trim().isEmpty()) {
            user.setPhone(phone.trim());
        }
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(role);
        user.setStatus("ACTIVE");
        user.setPreferredLanguage("EN");
        user.setAuthProvider("LOCAL");
        user.setEmailVerified("YES");

        User savedUser = userRepository.save(user);

        // If user is a PATIENT, create linked Patient profile if not already present
        if ("PATIENT".equalsIgnoreCase(role.getName())) {
            createPatientProfileIfAbsent(savedUser);
        }

        return savedUser;
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
    }
}
