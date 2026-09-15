package com.dentaflow.reports.service;

import com.dentaflow.reports.dto.request.InquiryRequest;
import com.dentaflow.reports.dto.request.InquiryResponseRequest;
import com.dentaflow.reports.entity.Inquiry;
import com.dentaflow.reports.enums.InquiryStatus;
import com.dentaflow.reports.exception.RecordSaveException;
import com.dentaflow.reports.exception.ResourceNotFoundException;
import com.dentaflow.reports.repository.InquiryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class InquiryService {

    private final InquiryRepository inquiryRepository;

    public List<Inquiry> getAll(InquiryStatus status) {
        return status == null ? inquiryRepository.findAll() : inquiryRepository.findByStatus(status);
    }

    public Inquiry getById(Long id) {
        return inquiryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inquiry not found with id " + id));
    }

    @Transactional
    public Inquiry submit(InquiryRequest request) {
        Inquiry inquiry = Inquiry.builder()
                .patientId(request.getPatientId())
                .patientName(request.getPatientName())
                .contactEmail(request.getContactEmail())
                .subject(request.getSubject())
                .message(request.getMessage())
                .status(InquiryStatus.PENDING)
                .build();
        return save(inquiry);
    }

    // Staff reviews the inquiry, prepares a response, and updates its status.
    @Transactional
    public Inquiry respond(Long id, InquiryResponseRequest request) {
        Inquiry inquiry = getById(id);
        inquiry.setStatus(request.getStatus());
        inquiry.setResponse(request.getResponse());
        inquiry.setRespondedBy(request.getRespondedBy());
        if (request.getStatus() == InquiryStatus.RESOLVED) {
            inquiry.setResolvedDate(LocalDateTime.now());
        }
        return save(inquiry);
    }

    @Transactional
    public void delete(Long id) {
        Inquiry inquiry = getById(id);
        inquiryRepository.delete(inquiry);
    }

    private Inquiry save(Inquiry inquiry) {
        try {
            return inquiryRepository.save(inquiry);
        } catch (Exception ex) {
            throw new RecordSaveException("Failed to save inquiry record", ex);
        }
    }
}
