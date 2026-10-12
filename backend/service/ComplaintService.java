package com.dentaflow.backend.service;

import com.dentaflow.backend.entity.Complaint;
import com.dentaflow.backend.entity.Patient;
import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.repository.ComplaintRepository;
import com.dentaflow.backend.repository.PatientRepository;
import com.dentaflow.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;

@Service
@Transactional
public class ComplaintService {

    private final ComplaintRepository complaintRepository;
    private final UserRepository userRepository;
    private final PatientRepository patientRepository;

    public ComplaintService(
            ComplaintRepository complaintRepository,
            UserRepository userRepository,
            PatientRepository patientRepository) {

        this.complaintRepository = complaintRepository;
        this.userRepository = userRepository;
        this.patientRepository = patientRepository;
    }

    // =========================================================
    // CREATE COMPLAINT
    // =========================================================

    public Complaint createComplaint(
            Complaint complaint,
            Long userId,
            Long patientId) {

        if (complaint == null) {
            throw new RuntimeException(
                    "Complaint data is required"
            );
        }

        if (complaint.getSubject() == null ||
                complaint.getSubject()
                        .trim()
                        .isEmpty()) {

            throw new RuntimeException(
                    "Complaint subject is required"
            );
        }

        if (complaint.getDescription() == null ||
                complaint.getDescription()
                        .trim()
                        .isEmpty()) {

            throw new RuntimeException(
                    "Complaint description is required"
            );
        }

        // Link user
        if (userId != null) {

            User user = userRepository.findById(userId)
                    .orElseThrow(() ->
                            new RuntimeException(
                                    "User not found with id: "
                                            + userId
                            ));

            complaint.setUser(user);
        }

        // Link patient
        if (patientId != null) {

            Patient patient = patientRepository.findById(patientId)
                    .orElseThrow(() ->
                            new RuntimeException(
                                    "Patient not found with id: "
                                            + patientId
                            ));

            complaint.setPatient(patient);
        }

        complaint.setComplaintCode(
                generateComplaintCode()
        );

        complaint.setSubject(
                complaint.getSubject().trim()
        );

        complaint.setDescription(
                complaint.getDescription().trim()
        );

        if (complaint.getPriority() == null ||
                complaint.getPriority()
                        .trim()
                        .isEmpty()) {

            complaint.setPriority("MEDIUM");

        } else {

            complaint.setPriority(
                    complaint.getPriority()
                            .trim()
                            .toUpperCase()
            );
        }

        if (complaint.getStatus() == null ||
                complaint.getStatus()
                        .trim()
                        .isEmpty()) {

            complaint.setStatus("OPEN");

        } else {

            complaint.setStatus(
                    complaint.getStatus()
                            .trim()
                            .toUpperCase()
            );
        }

        if (complaint.getResolution() != null) {
            complaint.setResolution(
                    complaint.getResolution().trim()
            );
        }

        if (complaint.getHandledBy() != null) {
            complaint.setHandledBy(
                    complaint.getHandledBy().trim()
            );
        }

        return complaintRepository.save(complaint);
    }

    // =========================================================
    // GENERATE COMPLAINT CODE
    // =========================================================

    private String generateComplaintCode() {

        long nextNumber =
                complaintRepository.count() + 1;

        String code;

        do {

            code = String.format(
                    "CMP%05d",
                    nextNumber
            );

            nextNumber++;

        } while (
                complaintRepository
                        .existsByComplaintCode(code)
        );

        return code;
    }

    // =========================================================
    // GET ALL COMPLAINTS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Complaint> getAllComplaints() {

        return complaintRepository.findAll();
    }

    // =========================================================
    // GET COMPLAINT BY ID
    // =========================================================

    @Transactional(readOnly = true)
    public Complaint getComplaintById(Long id) {

        return complaintRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Complaint not found with id: "
                                        + id
                        ));
    }

    // =========================================================
    // GET COMPLAINT BY CODE
    // =========================================================

    @Transactional(readOnly = true)
    public Complaint getComplaintByCode(
            String complaintCode) {

        if (complaintCode == null ||
                complaintCode.trim().isEmpty()) {

            throw new RuntimeException(
                    "Complaint code is required"
            );
        }

        return complaintRepository
                .findByComplaintCode(
                        complaintCode.trim().toUpperCase()
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "Complaint not found: "
                                        + complaintCode
                        ));
    }

    // =========================================================
    // GET USER COMPLAINTS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Complaint> getUserComplaints(
            Long userId) {

        userRepository.findById(userId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "User not found with id: "
                                        + userId
                        ));

        return complaintRepository
                .findByUserIdOrderByCreatedAtDesc(
                        userId
                );
    }

    // =========================================================
    // GET PATIENT COMPLAINTS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Complaint> getPatientComplaints(
            Long patientId) {

        patientRepository.findById(patientId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Patient not found with id: "
                                        + patientId
                        ));

        return complaintRepository
                .findByPatientIdOrderByCreatedAtDesc(
                        patientId
                );
    }

    // =========================================================
    // GET BY STATUS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Complaint> getComplaintsByStatus(
            String status) {

        if (status == null ||
                status.trim().isEmpty()) {

            throw new RuntimeException(
                    "Status is required"
            );
        }

        return complaintRepository
                .findByStatusIgnoreCaseOrderByCreatedAtDesc(
                        status.trim()
                );
    }

    // =========================================================
    // GET BY PRIORITY
    // =========================================================

    @Transactional(readOnly = true)
    public List<Complaint> getComplaintsByPriority(
            String priority) {

        if (priority == null ||
                priority.trim().isEmpty()) {

            throw new RuntimeException(
                    "Priority is required"
            );
        }

        return complaintRepository
                .findByPriorityIgnoreCaseOrderByCreatedAtDesc(
                        priority.trim()
                );
    }

    // =========================================================
    // GET USER COMPLAINTS BY STATUS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Complaint> getUserComplaintsByStatus(
            Long userId,
            String status) {

        if (status == null ||
                status.trim().isEmpty()) {

            throw new RuntimeException(
                    "Status is required"
            );
        }

        return complaintRepository
                .findByUserIdAndStatusIgnoreCaseOrderByCreatedAtDesc(
                        userId,
                        status.trim()
                );
    }

    // =========================================================
    // GET PATIENT COMPLAINTS BY STATUS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Complaint> getPatientComplaintsByStatus(
            Long patientId,
            String status) {

        if (status == null ||
                status.trim().isEmpty()) {

            throw new RuntimeException(
                    "Status is required"
            );
        }

        return complaintRepository
                .findByPatientIdAndStatusIgnoreCaseOrderByCreatedAtDesc(
                        patientId,
                        status.trim()
                );
    }

    // =========================================================
    // SEARCH BY SUBJECT
    // =========================================================

    @Transactional(readOnly = true)
    public List<Complaint> searchComplaints(
            String subject) {

        if (subject == null ||
                subject.trim().isEmpty()) {

            return complaintRepository.findAll();
        }

        return complaintRepository
                .findBySubjectContainingIgnoreCaseOrderByCreatedAtDesc(
                        subject.trim()
                );
    }

    // =========================================================
    // GET COMPLAINTS NEEDING ATTENTION
    // =========================================================

    @Transactional(readOnly = true)
    public List<Complaint> getComplaintsNeedingAttention() {

        return complaintRepository
                .findByStatusInOrderByCreatedAtDesc(
                        Arrays.asList(
                                "OPEN",
                                "IN_PROGRESS"
                        )
                );
    }

    // =========================================================
    // UPDATE COMPLAINT
    // =========================================================

    public Complaint updateComplaint(
            Long id,
            Complaint updatedComplaint) {

        Complaint existingComplaint =
                getComplaintById(id);

        if (updatedComplaint == null) {
            throw new RuntimeException(
                    "Complaint data is required"
            );
        }

        if (updatedComplaint.getSubject() != null &&
                !updatedComplaint.getSubject()
                        .trim()
                        .isEmpty()) {

            existingComplaint.setSubject(
                    updatedComplaint
                            .getSubject()
                            .trim()
            );
        }

        if (updatedComplaint.getDescription() != null &&
                !updatedComplaint.getDescription()
                        .trim()
                        .isEmpty()) {

            existingComplaint.setDescription(
                    updatedComplaint
                            .getDescription()
                            .trim()
            );
        }

        if (updatedComplaint.getPriority() != null &&
                !updatedComplaint.getPriority()
                        .trim()
                        .isEmpty()) {

            existingComplaint.setPriority(
                    updatedComplaint
                            .getPriority()
                            .trim()
                            .toUpperCase()
            );
        }

        if (updatedComplaint.getStatus() != null &&
                !updatedComplaint.getStatus()
                        .trim()
                        .isEmpty()) {

            existingComplaint.setStatus(
                    updatedComplaint
                            .getStatus()
                            .trim()
                            .toUpperCase()
            );
        }

        if (updatedComplaint.getResolution() != null) {

            existingComplaint.setResolution(
                    updatedComplaint
                            .getResolution()
                            .trim()
            );
        }

        if (updatedComplaint.getHandledBy() != null) {

            existingComplaint.setHandledBy(
                    updatedComplaint
                            .getHandledBy()
                            .trim()
            );
        }

        return complaintRepository.save(
                existingComplaint
        );
    }

    // =========================================================
    // RESOLVE COMPLAINT
    // =========================================================

    public Complaint resolveComplaint(
            Long id,
            String resolution,
            String handledBy) {

        if (resolution == null ||
                resolution.trim().isEmpty()) {

            throw new RuntimeException(
                    "Resolution is required"
            );
        }

        Complaint complaint =
                getComplaintById(id);

        complaint.setResolution(
                resolution.trim()
        );

        if (handledBy != null &&
                !handledBy.trim().isEmpty()) {

            complaint.setHandledBy(
                    handledBy.trim()
            );
        }

        complaint.setStatus("RESOLVED");

        return complaintRepository.save(
                complaint
        );
    }

    // =========================================================
    // CLOSE COMPLAINT
    // =========================================================

    public Complaint closeComplaint(Long id) {

        Complaint complaint =
                getComplaintById(id);

        complaint.setStatus("CLOSED");

        return complaintRepository.save(
                complaint
        );
    }

    // =========================================================
    // REOPEN COMPLAINT
    // =========================================================

    public Complaint reopenComplaint(Long id) {

        Complaint complaint =
                getComplaintById(id);

        complaint.setStatus("OPEN");

        return complaintRepository.save(
                complaint
        );
    }

    // =========================================================
    // DELETE COMPLAINT
    // =========================================================

    public void deleteComplaint(Long id) {

        Complaint complaint =
                getComplaintById(id);

        complaintRepository.delete(
                complaint
        );
    }
}