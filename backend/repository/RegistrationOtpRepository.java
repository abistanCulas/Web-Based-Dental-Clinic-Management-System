package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.RegistrationOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RegistrationOtpRepository extends JpaRepository<RegistrationOtp, Long> {

    Optional<RegistrationOtp> findTopByEmailOrderByCreatedAtDesc(String email);

    List<RegistrationOtp> findByEmailAndUsedFalse(String email);

    Optional<RegistrationOtp> findByVerificationTokenAndUsedFalse(String verificationToken);
}
