package com.dentaflow.backend.mapper;

import com.dentaflow.backend.dto.ComplaintDTO;
import com.dentaflow.backend.entity.Complaint;
import org.springframework.stereotype.Component;

@Component
public class ComplaintMapper {

    // =========================================================
    // ENTITY → DTO
    // =========================================================

    public ComplaintDTO toDTO(Complaint complaint) {

        if (complaint == null) {
            return null;
        }

        return ComplaintDTO.builder()
                .id(complaint.getId())
                .complaintCode(
                        complaint.getComplaintCode()
                )
                .userId(
                        complaint.getUser() != null
                                ? complaint.getUser().getId()
                                : null
                )
                .patientId(
                        complaint.getPatient() != null
                                ? complaint.getPatient().getId()
                                : null
                )
                .subject(
                        complaint.getSubject()
                )
                .description(
                        complaint.getDescription()
                )
                .priority(
                        complaint.getPriority()
                )
                .status(
                        complaint.getStatus()
                )
                .resolution(
                        complaint.getResolution()
                )
                .handledBy(
                        complaint.getHandledBy()
                )
                .build();
    }

    // =========================================================
    // DTO → ENTITY
    // =========================================================

    public Complaint toEntity(ComplaintDTO dto) {

        if (dto == null) {
            return null;
        }

        Complaint complaint = new Complaint();

        complaint.setId(dto.getId());

        complaint.setComplaintCode(
                dto.getComplaintCode()
        );

        complaint.setSubject(
                dto.getSubject()
        );

        complaint.setDescription(
                dto.getDescription()
        );

        complaint.setPriority(
                dto.getPriority()
        );

        complaint.setStatus(
                dto.getStatus()
        );

        complaint.setResolution(
                dto.getResolution()
        );

        complaint.setHandledBy(
                dto.getHandledBy()
        );

        return complaint;
    }
}