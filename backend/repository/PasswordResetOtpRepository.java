package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.PasswordResetOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PasswordResetOtpRepository extends JpaRepository<PasswordResetOtp, Long> {

    List<PasswordResetOtp> findByEmailAndUsedFalse(String email);

    Optional<PasswordResetOtp> findTopByEmailOrderByCreatedAtDesc(String email);

    Optional<PasswordResetOtp> findByResetTokenAndUsedFalse(String resetToken);

    void deleteByExpiresAtBefore(LocalDateTime time);
}
