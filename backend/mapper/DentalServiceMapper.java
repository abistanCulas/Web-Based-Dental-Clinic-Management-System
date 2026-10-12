package com.dentaflow.backend.mapper;

import com.dentaflow.backend.dto.DentalServiceDTO;
import com.dentaflow.backend.entity.DentalService;
import org.springframework.stereotype.Component;

@Component
public class DentalServiceMapper {

    // =========================================================
    // ENTITY -> DTO
    // =========================================================
    public DentalServiceDTO toDTO(DentalService entity) {
        if (entity == null) {
            return null;
        }

        return DentalServiceDTO.builder()
                .id(entity.getId())
                .serviceCode(entity.getServiceCode())
                .name(entity.getName())
                .category(entity.getCategory())
                .description(entity.getDescription())
                .duration(entity.getDuration())
                .price(entity.getPrice())
                .icon(entity.getIcon())
                .status(entity.getStatus())
                .imageUrl(entity.getImageUrl())
                .build();
    }

    // =========================================================
    // DTO -> ENTITY
    // =========================================================
    public DentalService toEntity(DentalServiceDTO dto) {
        if (dto == null) {
            return null;
        }

        DentalService entity = new DentalService();
        entity.setId(dto.getId());
        entity.setServiceCode(dto.getServiceCode());
        entity.setName(dto.getName());
        entity.setCategory(dto.getCategory());
        entity.setDescription(dto.getDescription() != null ? dto.getDescription() : dto.getDesc());
        entity.setDuration(dto.getDuration());
        entity.setPrice(dto.getPrice());
        entity.setIcon(dto.getIcon());
        entity.setStatus(dto.getStatus() != null ? dto.getStatus() : "ACTIVE");

        String img = dto.getImageUrl();
        if (img == null || img.isBlank()) {
            img = dto.getImage();
        }
        entity.setImageUrl(img);

        return entity;
    }
}
