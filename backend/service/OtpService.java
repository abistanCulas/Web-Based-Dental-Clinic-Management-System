package com.dentaflow.backend.service;

import com.dentaflow.backend.entity.PasswordResetOtp;
import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.repository.PasswordResetOtpRepository;
import com.dentaflow.backend.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

@Service
@Transactional
public class OtpService {

    private final PasswordResetOtpRepository otpRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final SecureRandom secureRandom = new SecureRandom();

    public OtpService(
            PasswordResetOtpRepository otpRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            EmailService emailService) {
        this.otpRepository = otpRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    // =========================================================
    // REQUEST PASSWORD RESET OTP
    // =========================================================

    public Map<String, Object> requestPasswordResetOtp(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new RuntimeException("Email address is required");
        }

        String normalizedEmail = email.trim().toLowerCase();
        Optional<User> userOpt = userRepository.findByEmail(normalizedEmail);

        // Anti-enumeration: if email does not exist, return generic success without generating OTP
        if (userOpt.isEmpty()) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "If this email is registered, a password reset code has been sent.");
            return response;
        }

        // Rate limiting: 60-second cooldown check
        Optional<PasswordResetOtp> latestOpt = otpRepository.findTopByEmailOrderByCreatedAtDesc(normalizedEmail);
        if (latestOpt.isPresent()) {
            PasswordResetOtp latest = latestOpt.get();
            if (latest.getCreatedAt() != null) {
                long elapsedSeconds = Duration.between(latest.getCreatedAt(), LocalDateTime.now()).getSeconds();
                if (elapsedSeconds < 60) {
                    throw new RuntimeException("Please wait " + (60 - elapsedSeconds) + " seconds before requesting another code.");
                }
            }
        }

        // Invalidate previous active OTPs for this email
        List<PasswordResetOtp> activeOtps = otpRepository.findByEmailAndUsedFalse(normalizedEmail);
        for (PasswordResetOtp o : activeOtps) {
            o.setUsed(true);
        }
        if (!activeOtps.isEmpty()) {
            otpRepository.saveAll(activeOtps);
        }

        // Generate cryptographically secure 6-digit OTP
        int code = 100000 + secureRandom.nextInt(900000);
        String otpPlain = String.valueOf(code);

        // Store secure hash only (never plaintext)
        String otpHashed = passwordEncoder.encode(otpPlain);

        PasswordResetOtp otpRecord = PasswordResetOtp.builder()
                .email(normalizedEmail)
                .otpHashed(otpHashed)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .verified(false)
                .used(false)
                .attemptCount(0)
                .build();

        otpRepository.save(otpRecord);

        // Dispatch email via EmailService
        emailService.sendPasswordResetOtp(normalizedEmail, otpPlain);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("email", normalizedEmail);
        response.put("message", "If this email is registered, a password reset code has been sent.");
        return response;
    }

    // =========================================================
    // VERIFY OTP
    // =========================================================

    @Transactional(noRollbackFor = RuntimeException.class)
    public Map<String, Object> verifyOtp(String email, String otp) {
        if (email == null || email.trim().isEmpty()) {
            throw new RuntimeException("Email address is required");
        }
        if (otp == null || otp.trim().isEmpty()) {
            throw new RuntimeException("Verification code is required");
        }

        String normalizedEmail = email.trim().toLowerCase();
        String trimmedOtp = otp.trim();

        PasswordResetOtp otpRecord = otpRepository.findTopByEmailOrderByCreatedAtDesc(normalizedEmail)
                .orElseThrow(() -> new RuntimeException("No active verification code found for this email. Please request a new one."));

        if (otpRecord.isUsed()) {
            throw new RuntimeException("This verification code has already been used. Please request a new one.");
        }

        if (otpRecord.getExpiresAt().isBefore(LocalDateTime.now())) {
            otpRecord.setUsed(true);
            otpRepository.save(otpRecord);
            throw new RuntimeException("Verification code has expired. Please request a new code.");
        }

        // Brute force protection: max 5 attempts
        if (otpRecord.getAttemptCount() >= 5) {
            otpRecord.setUsed(true);
            otpRepository.save(otpRecord);
            throw new RuntimeException("Too many incorrect attempts. This code is now invalid. Please request a new code.");
        }

        // Compare OTP against BCrypt hash
        if (!passwordEncoder.matches(trimmedOtp, otpRecord.getOtpHashed())) {
            otpRecord.setAttemptCount(otpRecord.getAttemptCount() + 1);
            otpRepository.save(otpRecord);
            int remaining = 5 - otpRecord.getAttemptCount();
            throw new RuntimeException("Invalid verification code. " + remaining + " attempts remaining.");
        }

        // Generate short-lived reset authorization token
        String resetToken = UUID.randomUUID().toString();
        otpRecord.setVerified(true);
        otpRecord.setResetToken(resetToken);
        otpRepository.save(otpRecord);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("resetToken", resetToken);
        response.put("message", "Code verified successfully. You can now reset your password.");
        return response;
    }

    // =========================================================
    // RESET PASSWORD
    // =========================================================

    public Map<String, Object> resetPassword(String email, String resetToken, String newPassword) {
        if (email == null || email.trim().isEmpty()) {
            throw new RuntimeException("Email address is required");
        }
        if (resetToken == null || resetToken.trim().isEmpty()) {
            throw new RuntimeException("Reset token is required");
        }
        if (newPassword == null || newPassword.trim().isEmpty()) {
            throw new RuntimeException("New password is required");
        }
        if (newPassword.trim().length() < 6) {
            throw new RuntimeException("New password must contain at least 6 characters");
        }

        String normalizedEmail = email.trim().toLowerCase();
        String trimmedToken = resetToken.trim();

        PasswordResetOtp otpRecord = otpRepository.findByResetTokenAndUsedFalse(trimmedToken)
                .orElseThrow(() -> new RuntimeException("Invalid or expired reset token. Please restart password recovery."));

        if (!otpRecord.isVerified()) {
            throw new RuntimeException("Verification code has not been verified yet.");
        }

        if (!otpRecord.getEmail().equalsIgnoreCase(normalizedEmail)) {
            throw new RuntimeException("Reset token does not match the provided email address.");
        }

        if (otpRecord.getExpiresAt().isBefore(LocalDateTime.now())) {
            otpRecord.setUsed(true);
            otpRepository.save(otpRecord);
            throw new RuntimeException("Reset session has expired. Please restart password recovery.");
        }

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new RuntimeException("User account not found"));

        // Update password with BCrypt hash
        user.setPassword(passwordEncoder.encode(newPassword.trim()));
        userRepository.save(user);

        // Invalidate OTP record and reset token
        otpRecord.setUsed(true);
        otpRepository.save(otpRecord);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Password has been reset successfully. You can now login with your new password.");
        return response;
    }

    // =========================================================
    // RESEND OTP
    // =========================================================

    public Map<String, Object> resendOtp(String email) {
        return requestPasswordResetOtp(email);
    }
}
