package com.dentaflow.backend.mapper;

import com.dentaflow.backend.dto.DentistAvailabilityDTO;
import com.dentaflow.backend.entity.DentistAvailability;
import org.springframework.stereotype.Component;

@Component
public class DentistAvailabilityMapper {

    // =========================================================
    // ENTITY → DTO
    // =========================================================

    public DentistAvailabilityDTO toDTO(
            DentistAvailability availability) {

        if (availability == null) {
            return null;
        }

        return DentistAvailabilityDTO.builder()
                .id(availability.getId())
                .dentistId(
                        availability.getDentist() != null
                                ? availability.getDentist().getId()
                                : null
                )
                .dayOfWeek(
                        availability.getDayOfWeek()
                )
                .available(
                        availability.isAvailable()
                )
                .startTime(
                        availability.getStartTime()
                )
                .endTime(
                        availability.getEndTime()
                )
                .status(
                        availability.getStatus()
                )
                .build();
    }

    // =========================================================
    // DTO → ENTITY
    //
    // Dentist relationship is set in the service layer.
    // =========================================================

    public DentistAvailability toEntity(
            DentistAvailabilityDTO dto) {

        if (dto == null) {
            return null;
        }

        DentistAvailability availability =
                new DentistAvailability();

        availability.setId(
                dto.getId()
        );

        availability.setDayOfWeek(
                dto.getDayOfWeek()
        );

        availability.setAvailable(
                dto.isAvailable()
        );

        availability.setStartTime(
                dto.getStartTime()
        );

        availability.setEndTime(
                dto.getEndTime()
        );

        availability.setStatus(
                dto.getStatus()
        );

        return availability;
    }
}