package com.dentaflow.backend.mapper;

import com.dentaflow.backend.dto.DentistDTO;
import com.dentaflow.backend.entity.Dentist;
import org.springframework.stereotype.Component;

@Component
public class DentistMapper {

    // =========================================================
    // ENTITY → DTO
    // =========================================================

    public DentistDTO toDTO(Dentist dentist) {

        if (dentist == null) {
            return null;
        }

        return DentistDTO.builder()
                .id(dentist.getId())
                .dentistCode(
                        dentist.getDentistCode()
                )
                .userId(
                        dentist.getUser() != null
                                ? dentist.getUser().getId()
                                : null
                )
                .firstName(
                        dentist.getFirstName()
                )
                .lastName(
                        dentist.getLastName()
                )
                .email(
                        dentist.getEmail()
                )
                .phone(
                        dentist.getPhone()
                )
                .specialization(
                        dentist.getSpecialization()
                )
                .qualification(
                        dentist.getQualification()
                )
                .experienceYears(
                        dentist.getExperienceYears()
                )
                .status(
                        dentist.getStatus()
                )
                .about(
                        dentist.getAbout() != null && !dentist.getAbout().isBlank()
                                ? dentist.getAbout()
                                : dentist.getBio()
                )
                .licenseNumber(
                        dentist.getLicenseNumber()
                )
                .consultationFee(
                        dentist.getConsultationFee()
                )
                .imageUrl(
                        dentist.getImageUrl()
                )
                .build();
    }

    // =========================================================
    // DTO → ENTITY
    //
    // User relationship is intentionally not set here.
    // DentistService resolves the actual User entity.
    // =========================================================

    public Dentist toEntity(DentistDTO dto) {

        if (dto == null) {
            return null;
        }

        Dentist dentist =
                new Dentist();

        dentist.setId(
                dto.getId()
        );

        dentist.setDentistCode(
                dto.getDentistCode()
        );

        dentist.setFirstName(
                dto.getFirstName()
        );

        dentist.setLastName(
                dto.getLastName()
        );

        dentist.setEmail(
                dto.getEmail()
        );

        dentist.setPhone(
                dto.getPhone()
        );

        dentist.setSpecialization(
                dto.getSpecialization()
        );

        dentist.setQualification(
                dto.getQualification()
        );

        dentist.setExperienceYears(
                dto.getExperienceYears()
        );

        dentist.setStatus(
                dto.getStatus()
        );

        String aboutText = dto.getAbout();
        if (aboutText == null || aboutText.isBlank()) {
            aboutText = dto.getBio();
        }
        dentist.setAbout(aboutText);
        dentist.setBio(aboutText);

        dentist.setLicenseNumber(
                dto.getLicenseNumber()
        );

        dentist.setConsultationFee(
                dto.getConsultationFee()
        );

        String img = dto.getImageUrl();
        if (img == null || img.isBlank()) {
            img = dto.getProfileImage();
        }
        if (img == null || img.isBlank()) {
            img = dto.getImage();
        }
        dentist.setImageUrl(img);

        return dentist;
    }
}