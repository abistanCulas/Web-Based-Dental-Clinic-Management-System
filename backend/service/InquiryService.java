package com.dentaflow.backend.service;

import com.dentaflow.backend.entity.Inquiry;
import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.repository.InquiryRepository;
import com.dentaflow.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class InquiryService {

    private final InquiryRepository inquiryRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    public InquiryService(
            InquiryRepository inquiryRepository,
            UserRepository userRepository,
            EmailService emailService) {

        this.inquiryRepository = inquiryRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
    }

    // =========================================================
    // CREATE INQUIRY
    // =========================================================

    public Inquiry createInquiry(
            Inquiry inquiry,
            Long userId) {

        if (inquiry == null) {
            throw new RuntimeException(
                    "Inquiry data is required"
            );
        }

        if (inquiry.getName() == null ||
                inquiry.getName().trim().isEmpty()) {

            throw new RuntimeException(
                    "Name is required"
            );
        }

        if (inquiry.getEmail() == null ||
                inquiry.getEmail().trim().isEmpty()) {

            throw new RuntimeException(
                    "Email is required"
            );
        }

        String emailTrimmed = inquiry.getEmail().trim().toLowerCase();
        if (!emailTrimmed.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$")) {
            throw new RuntimeException("Invalid email format");
        }

        if (inquiry.getName() != null && inquiry.getName().trim().length() > 150) {
            throw new RuntimeException("Name cannot exceed 150 characters");
        }

        if (inquiry.getSubject() != null && inquiry.getSubject().trim().length() > 200) {
            throw new RuntimeException("Subject cannot exceed 200 characters");
        }

        if (inquiry.getMessage() != null && inquiry.getMessage().trim().length() > 2000) {
            throw new RuntimeException("Message cannot exceed 2000 characters");
        }

        if (inquiry.getInquiryType() == null ||
                inquiry.getInquiryType()
                        .trim()
                        .isEmpty()) {

            throw new RuntimeException(
                    "Inquiry type is required"
            );
        }

        if (inquiry.getSubject() == null ||
                inquiry.getSubject()
                        .trim()
                        .isEmpty()) {

            throw new RuntimeException(
                    "Subject is required"
            );
        }

        if (inquiry.getMessage() == null ||
                inquiry.getMessage()
                        .trim()
                        .isEmpty()) {

            throw new RuntimeException(
                    "Message is required"
            );
        }

        // =====================================================
        // LINK USER
        // =====================================================

        if (userId != null) {

            User user =
                    userRepository.findById(userId)
                            .orElseThrow(() ->
                                    new RuntimeException(
                                            "User not found with id: "
                                                    + userId
                                    ));

            inquiry.setUser(user);
        }

        // =====================================================
        // GENERATE INQUIRY CODE
        // =====================================================

        inquiry.setInquiryCode(
                generateInquiryCode()
        );

        // =====================================================
        // CLEAN DATA
        // =====================================================

        inquiry.setName(
                inquiry.getName().trim()
        );

        inquiry.setEmail(
                inquiry.getEmail()
                        .trim()
                        .toLowerCase()
        );

        if (inquiry.getPhone() != null) {

            inquiry.setPhone(
                    inquiry.getPhone().trim()
            );
        }

        inquiry.setInquiryType(
                inquiry.getInquiryType()
                        .trim()
                        .toUpperCase()
        );

        inquiry.setSubject(
                inquiry.getSubject().trim()
        );

        inquiry.setMessage(
                inquiry.getMessage().trim()
        );

        // =====================================================
        // DEFAULT STATUS
        // =====================================================

        if (inquiry.getStatus() == null ||
                inquiry.getStatus()
                        .trim()
                        .isEmpty()) {

            inquiry.setStatus("OPEN");

        } else {

            inquiry.setStatus(
                    inquiry.getStatus()
                            .trim()
                            .toUpperCase()
            );
        }

        // =====================================================
        // CLEAN EXISTING RESPONSE
        // =====================================================

        if (inquiry.getResponse() != null) {

            inquiry.setResponse(
                    inquiry.getResponse().trim()
            );
        }

        if (inquiry.getRespondedBy() != null) {

            inquiry.setRespondedBy(
                    inquiry.getRespondedBy().trim()
            );
        }

        // =====================================================
        // SAVE INQUIRY FIRST
        // =====================================================

        Inquiry savedInquiry =
                inquiryRepository.save(inquiry);

        // =====================================================
        // AUTOMATIC ACKNOWLEDGEMENT EMAIL
        // =====================================================

        sendInquiryAutoResponse(
                savedInquiry
        );

        return savedInquiry;
    }

    // =========================================================
    // SEND INQUIRY AUTO RESPONSE
    // =========================================================

    private void sendInquiryAutoResponse(
            Inquiry inquiry) {

        try {

            emailService.sendQuestionAutoResponse(
                    inquiry.getEmail()
            );

        } catch (Exception exception) {

            /*
             * Email failure should not prevent the inquiry
             * from being successfully saved.
             */

            System.err.println(
                    "Failed to send inquiry auto-response "
                            + "for inquiry "
                            + inquiry.getInquiryCode()
                            + ": "
                            + exception.getMessage()
            );
        }
    }

    // =========================================================
    // GENERATE INQUIRY CODE
    // =========================================================

    private String generateInquiryCode() {

        long nextNumber =
                inquiryRepository.count() + 1;

        String code;

        do {

            code = String.format(
                    "INQ%05d",
                    nextNumber
            );

            nextNumber++;

        } while (
                inquiryRepository
                        .existsByInquiryCode(code)
        );

        return code;
    }

    // =========================================================
    // GET ALL INQUIRIES
    // =========================================================

    @Transactional(readOnly = true)
    public List<Inquiry> getAllInquiries() {

        return inquiryRepository.findAll();
    }

    // =========================================================
    // GET INQUIRY BY ID
    // =========================================================

    @Transactional(readOnly = true)
    public Inquiry getInquiryById(Long id) {

        return inquiryRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Inquiry not found with id: "
                                        + id
                        ));
    }

    // =========================================================
    // GET INQUIRY BY CODE
    // =========================================================

    @Transactional(readOnly = true)
    public Inquiry getInquiryByCode(
            String inquiryCode) {

        if (inquiryCode == null ||
                inquiryCode.trim().isEmpty()) {

            throw new RuntimeException(
                    "Inquiry code is required"
            );
        }

        return inquiryRepository
                .findByInquiryCode(
                        inquiryCode
                                .trim()
                                .toUpperCase()
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "Inquiry not found: "
                                        + inquiryCode
                        ));
    }

    // =========================================================
    // GET USER INQUIRIES
    // =========================================================

    @Transactional(readOnly = true)
    public List<Inquiry> getUserInquiries(
            Long userId) {

        if (userId == null) {
            throw new RuntimeException(
                    "User ID is required"
            );
        }

        return inquiryRepository
                .findByUserIdOrderByCreatedAtDesc(
                        userId
                );
    }

    // =========================================================
    // GET BY STATUS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Inquiry> getInquiriesByStatus(
            String status) {

        if (status == null ||
                status.trim().isEmpty()) {

            throw new RuntimeException(
                    "Status is required"
            );
        }

        return inquiryRepository
                .findByStatusIgnoreCaseOrderByCreatedAtDesc(
                        status.trim()
                );
    }

    // =========================================================
    // GET BY INQUIRY TYPE
    // =========================================================

    @Transactional(readOnly = true)
    public List<Inquiry> getInquiriesByType(
            String inquiryType) {

        if (inquiryType == null ||
                inquiryType.trim().isEmpty()) {

            throw new RuntimeException(
                    "Inquiry type is required"
            );
        }

        return inquiryRepository
                .findByInquiryTypeIgnoreCaseOrderByCreatedAtDesc(
                        inquiryType.trim()
                );
    }

    // =========================================================
    // SEARCH BY EMAIL
    // =========================================================

    @Transactional(readOnly = true)
    public List<Inquiry> searchByEmail(
            String email) {

        if (email == null ||
                email.trim().isEmpty()) {

            return inquiryRepository.findAll();
        }

        return inquiryRepository
                .findByEmailContainingIgnoreCaseOrderByCreatedAtDesc(
                        email.trim()
                );
    }

    // =========================================================
    // SEARCH BY SUBJECT
    // =========================================================

    @Transactional(readOnly = true)
    public List<Inquiry> searchBySubject(
            String subject) {

        if (subject == null ||
                subject.trim().isEmpty()) {

            return inquiryRepository.findAll();
        }

        return inquiryRepository
                .findBySubjectContainingIgnoreCaseOrderByCreatedAtDesc(
                        subject.trim()
                );
    }

    // =========================================================
    // GET USER INQUIRIES BY STATUS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Inquiry> getUserInquiriesByStatus(
            Long userId,
            String status) {

        if (userId == null) {
            throw new RuntimeException(
                    "User ID is required"
            );
        }

        if (status == null ||
                status.trim().isEmpty()) {

            throw new RuntimeException(
                    "Status is required"
            );
        }

        return inquiryRepository
                .findByUserIdAndStatusIgnoreCaseOrderByCreatedAtDesc(
                        userId,
                        status.trim()
                );
    }

    // =========================================================
    // UPDATE INQUIRY
    // =========================================================

    public Inquiry updateInquiry(
            Long id,
            Inquiry updatedInquiry) {

        Inquiry existingInquiry =
                getInquiryById(id);

        if (updatedInquiry == null) {
            throw new RuntimeException(
                    "Inquiry data is required"
            );
        }

        if (updatedInquiry.getName() != null &&
                !updatedInquiry.getName()
                        .trim()
                        .isEmpty()) {

            existingInquiry.setName(
                    updatedInquiry.getName().trim()
            );
        }

        if (updatedInquiry.getEmail() != null &&
                !updatedInquiry.getEmail()
                        .trim()
                        .isEmpty()) {

            existingInquiry.setEmail(
                    updatedInquiry.getEmail()
                            .trim()
                            .toLowerCase()
            );
        }

        if (updatedInquiry.getPhone() != null) {

            existingInquiry.setPhone(
                    updatedInquiry.getPhone().trim()
            );
        }

        if (updatedInquiry.getInquiryType() != null &&
                !updatedInquiry.getInquiryType()
                        .trim()
                        .isEmpty()) {

            existingInquiry.setInquiryType(
                    updatedInquiry.getInquiryType()
                            .trim()
                            .toUpperCase()
            );
        }

        if (updatedInquiry.getSubject() != null &&
                !updatedInquiry.getSubject()
                        .trim()
                        .isEmpty()) {

            existingInquiry.setSubject(
                    updatedInquiry.getSubject().trim()
            );
        }

        if (updatedInquiry.getMessage() != null &&
                !updatedInquiry.getMessage()
                        .trim()
                        .isEmpty()) {

            existingInquiry.setMessage(
                    updatedInquiry.getMessage().trim()
            );
        }

        if (updatedInquiry.getStatus() != null &&
                !updatedInquiry.getStatus()
                        .trim()
                        .isEmpty()) {

            existingInquiry.setStatus(
                    updatedInquiry.getStatus()
                            .trim()
                            .toUpperCase()
            );
        }

        if (updatedInquiry.getResponse() != null) {

            existingInquiry.setResponse(
                    updatedInquiry.getResponse().trim()
            );
        }

        if (updatedInquiry.getRespondedBy() != null) {

            existingInquiry.setRespondedBy(
                    updatedInquiry.getRespondedBy().trim()
            );
        }

        return inquiryRepository.save(
                existingInquiry
        );
    }

    // =========================================================
    // RESPOND TO INQUIRY - ADMIN
    // =========================================================

    public Inquiry respondToInquiry(
            Long id,
            String response,
            String respondedBy) {

        if (response == null ||
                response.trim().isEmpty()) {

            throw new RuntimeException(
                    "Response is required"
            );
        }

        Inquiry inquiry =
                getInquiryById(id);

        inquiry.setResponse(
                response.trim()
        );

        if (respondedBy != null &&
                !respondedBy.trim().isEmpty()) {

            inquiry.setRespondedBy(
                    respondedBy.trim()
            );
        }

        inquiry.setStatus(
                "RESPONDED"
        );

        Inquiry savedInquiry =
                inquiryRepository.save(
                        inquiry
                );

        // =====================================================
        // SEND ADMIN RESPONSE TO PATIENT
        // =====================================================

        try {

            emailService.sendAdminResponse(
                    savedInquiry.getEmail(),
                    savedInquiry.getResponse(),
                    savedInquiry.getRespondedBy()
            );

        } catch (Exception exception) {

            /*
             * Inquiry response is already saved.
             * Email failure should not undo the admin response.
             */

            System.err.println(
                    "Failed to send admin response email "
                            + "for inquiry "
                            + savedInquiry.getInquiryCode()
                            + ": "
                            + exception.getMessage()
            );
        }

        return savedInquiry;
    }

    // =========================================================
    // CLOSE INQUIRY
    // =========================================================

    public Inquiry closeInquiry(Long id) {

        Inquiry inquiry =
                getInquiryById(id);

        inquiry.setStatus(
                "CLOSED"
        );

        return inquiryRepository.save(
                inquiry
        );
    }

    // =========================================================
    // REOPEN INQUIRY
    // =========================================================

    public Inquiry reopenInquiry(Long id) {

        Inquiry inquiry =
                getInquiryById(id);

        inquiry.setStatus(
                "OPEN"
        );

        return inquiryRepository.save(
                inquiry
        );
    }

    // =========================================================
    // UPDATE INQUIRY STATUS
    // =========================================================

    public Inquiry updateStatus(Long id, String status) {
        if (status == null || status.trim().isEmpty()) {
            throw new RuntimeException("Status is required");
        }
        String normStatus = status.trim().toUpperCase();
        java.util.List<String> validStatuses = java.util.List.of("OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED", "RESPONDED");
        if (!validStatuses.contains(normStatus)) {
            throw new RuntimeException("Invalid inquiry status: " + status);
        }
        Inquiry inquiry = getInquiryById(id);
        inquiry.setStatus(normStatus);
        return inquiryRepository.save(inquiry);
    }

    // =========================================================
    // DELETE INQUIRY
    // =========================================================

    public void deleteInquiry(Long id) {

        Inquiry inquiry =
                getInquiryById(id);

        inquiryRepository.delete(
                inquiry
        );
    }
}