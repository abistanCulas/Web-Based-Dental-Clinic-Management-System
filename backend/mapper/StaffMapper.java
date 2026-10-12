package com.dentaflow.backend.mapper;

import com.dentaflow.backend.dto.StaffDTO;
import com.dentaflow.backend.entity.Staff;
import org.springframework.stereotype.Component;

@Component
public class StaffMapper {

    // Entity → DTO
    public StaffDTO toDTO(Staff staff) {

        if (staff == null) {
            return null;
        }

        return StaffDTO.builder()
                .id(staff.getId())
                .staffCode(staff.getStaffCode())
                .userId(
                        staff.getUser() != null
                                ? staff.getUser().getId()
                                : null
                )
                .firstName(staff.getFirstName())
                .lastName(staff.getLastName())
                .email(staff.getEmail())
                .phone(staff.getPhone())
                .role(staff.getRole())
                .status(staff.getStatus())
                .imageUrl(
                        staff.getImageUrl() != null
                                ? staff.getImageUrl()
                                : (staff.getUser() != null ? staff.getUser().getProfileImage() : null)
                )
                .build();
    }

    // DTO → Entity
    public Staff toEntity(StaffDTO dto) {

        if (dto == null) {
            return null;
        }

        Staff staff = new Staff();

        staff.setId(dto.getId());
        staff.setStaffCode(dto.getStaffCode());
        staff.setFirstName(dto.getFirstName());
        staff.setLastName(dto.getLastName());
        staff.setEmail(dto.getEmail());
        staff.setPhone(dto.getPhone());
        staff.setRole(dto.getRole());
        staff.setStatus(dto.getStatus());
        staff.setImageUrl(dto.getImageUrl());

        return staff;
    }
}