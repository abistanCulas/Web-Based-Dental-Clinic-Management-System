package com.dentaflow.backend.mapper;

import com.dentaflow.backend.dto.PatientDTO;
import com.dentaflow.backend.entity.Patient;
import org.springframework.stereotype.Component;

@Component
public class PatientMapper {

    // Entity → DTO
    public PatientDTO toDTO(Patient patient) {

        if (patient == null) {
            return null;
        }

        return PatientDTO.builder()
                .id(patient.getId())
                .patientCode(patient.getPatientCode())
                .userId(
                        patient.getUser() != null
                                ? patient.getUser().getId()
                                : null
                )
                .firstName(patient.getFirstName())
                .lastName(patient.getLastName())
                .nic(patient.getNic())
                .dateOfBirth(patient.getDateOfBirth())
                .gender(patient.getGender())
                .bloodGroup(patient.getBloodGroup())
                .phone(patient.getPhone())
                .email(patient.getEmail())
                .address(patient.getAddress())
                .city(patient.getCity())
                .emergencyContactName(
                        patient.getEmergencyContactName()
                )
                .emergencyContactPhone(
                        patient.getEmergencyContactPhone()
                )
                .allergies(patient.getAllergies())
                .medicalConditions(
                        patient.getMedicalConditions()
                )
                .currentMedications(
                        patient.getCurrentMedications()
                )
                .status(patient.getStatus())
                .build();
    }

    // DTO → Entity
    public Patient toEntity(PatientDTO dto) {

        if (dto == null) {
            return null;
        }

        Patient patient = new Patient();

        patient.setId(dto.getId());
        patient.setPatientCode(dto.getPatientCode());

        patient.setFirstName(dto.getFirstName());
        patient.setLastName(dto.getLastName());
        patient.setNic(dto.getNic());
        patient.setDateOfBirth(dto.getDateOfBirth());
        patient.setGender(dto.getGender());
        patient.setBloodGroup(dto.getBloodGroup());
        patient.setPhone(dto.getPhone());
        patient.setEmail(dto.getEmail());
        patient.setAddress(dto.getAddress());
        patient.setCity(dto.getCity());

        patient.setEmergencyContactName(
                dto.getEmergencyContactName()
        );

        patient.setEmergencyContactPhone(
                dto.getEmergencyContactPhone()
        );

        patient.setAllergies(dto.getAllergies());

        patient.setMedicalConditions(
                dto.getMedicalConditions()
        );

        patient.setCurrentMedications(
                dto.getCurrentMedications()
        );

        patient.setStatus(dto.getStatus());

        return patient;
    }
}