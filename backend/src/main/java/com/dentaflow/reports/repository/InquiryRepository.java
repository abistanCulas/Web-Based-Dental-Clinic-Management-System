package com.dentaflow.reports.repository;

import com.dentaflow.reports.entity.Inquiry;
import com.dentaflow.reports.enums.InquiryStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface InquiryRepository extends JpaRepository<Inquiry, Long> {

    List<Inquiry> findByStatus(InquiryStatus status);

    List<Inquiry> findBySubmittedDateBetween(LocalDateTime start, LocalDateTime end);

    List<Inquiry> findByPatientId(Long patientId);
}
