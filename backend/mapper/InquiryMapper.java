package com.dentaflow.backend.mapper;

import com.dentaflow.backend.dto.InquiryDTO;
import com.dentaflow.backend.entity.Inquiry;
import org.springframework.stereotype.Component;

@Component
public class InquiryMapper {

    // =========================================================
    // ENTITY → DTO
    // =========================================================

    public InquiryDTO toDTO(Inquiry inquiry) {

        if (inquiry == null) {
            return null;
        }

        return InquiryDTO.builder()
                .id(inquiry.getId())
                .inquiryCode(inquiry.getInquiryCode())

                .userId(
                        inquiry.getUser() != null
                                ? inquiry.getUser().getId()
                                : null
                )

                .name(inquiry.getName())
                .email(inquiry.getEmail())
                .phone(inquiry.getPhone())
                .inquiryType(inquiry.getInquiryType())
                .subject(inquiry.getSubject())
                .message(inquiry.getMessage())
                .status(inquiry.getStatus())
                .response(inquiry.getResponse())
                .respondedBy(inquiry.getRespondedBy())
                .createdAt(inquiry.getCreatedAt())
                .build();
    }

    // =========================================================
    // DTO → ENTITY
    // =========================================================

    public Inquiry toEntity(InquiryDTO dto) {

        if (dto == null) {
            return null;
        }

        Inquiry inquiry = new Inquiry();

        inquiry.setId(dto.getId());
        inquiry.setInquiryCode(dto.getInquiryCode());
        inquiry.setName(dto.getName());
        inquiry.setEmail(dto.getEmail());
        inquiry.setPhone(dto.getPhone());
        inquiry.setInquiryType(dto.getInquiryType());
        inquiry.setSubject(dto.getSubject());
        inquiry.setMessage(dto.getMessage());
        inquiry.setStatus(dto.getStatus());
        inquiry.setResponse(dto.getResponse());
        inquiry.setRespondedBy(dto.getRespondedBy());

        return inquiry;
    }
}