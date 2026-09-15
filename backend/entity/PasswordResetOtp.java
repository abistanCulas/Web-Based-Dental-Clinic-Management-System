package com.dentaflow.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "password_reset_otps",
        indexes = {
                @Index(name = "idx_otp_email", columnList = "email"),
                @Index(name = "idx_otp_token", columnList = "resetToken"),
                @Index(name = "idx_otp_created", columnList = "created_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PasswordResetOtp extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String email;

    @Column(name = "otp_hashed", nullable = false, length = 255)
    private String otpHashed;

    @Column(name = "reset_token", length = 255)
    private String resetToken;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    @Builder.Default
    private boolean verified = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean used = false;

    @Column(name = "attempt_count", nullable = false)
    @Builder.Default
    private int attemptCount = 0;

    @PrePersist
    protected void onOtpCreate() {
        if (expiresAt == null) {
            expiresAt = LocalDateTime.now().plusMinutes(10);
        }
    }
}
