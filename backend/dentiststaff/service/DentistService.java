package com.dentalclinic.dentiststaff.service;

import com.dentalclinic.dentiststaff.dto.DentistRequestDTO;
import com.dentalclinic.dentiststaff.dto.DentistResponseDTO;
import com.dentalclinic.dentiststaff.exception.DuplicateResourceException;
import com.dentalclinic.dentiststaff.exception.ResourceNotFoundException;
import com.dentalclinic.dentiststaff.model.Dentist;
import com.dentalclinic.dentiststaff.model.Specialization;
import com.dentalclinic.dentiststaff.model.enums.DentistStatus;
import com.dentalclinic.dentiststaff.repository.DentistRepository;
import com.dentalclinic.dentiststaff.repository.SpecializationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class DentistService {

    private final DentistRepository dentistRepository;
    private final SpecializationRepository specializationRepository;

    public DentistService(DentistRepository dentistRepository,
                           SpecializationRepository specializationRepository) {
        this.dentistRepository = dentistRepository;
        this.specializationRepository = specializationRepository;
    }

    // ----- Add Dentist -----
    @Transactional
    public DentistResponseDTO addDentist(DentistRequestDTO request) {
        if (dentistRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("A dentist with this email already exists");
        }
        if (dentistRepository.existsByLicenseNumber(request.getLicenseNumber())) {
            throw new DuplicateResourceException("A dentist with this license number already exists");
        }

        Dentist dentist = new Dentist();
        applyRequestToEntity(request, dentist);
        dentist.setStatus(DentistStatus.ACTIVE);

        Dentist saved = dentistRepository.save(dentist);
        return toResponseDTO(saved);
    }

    // ----- Update Dentist Details -----
    @Transactional
    public DentistResponseDTO updateDentist(Long id, DentistRequestDTO request) {
        Dentist dentist = getDentistOrThrow(id);

        // if email/license changed, make sure the new values aren't already taken by someone else
        dentistRepository.findByEmail(request.getEmail()).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new DuplicateResourceException("A dentist with this email already exists");
            }
        });
        dentistRepository.findByLicenseNumber(request.getLicenseNumber()).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new DuplicateResourceException("A dentist with this license number already exists");
            }
        });

        applyRequestToEntity(request, dentist);

        Dentist updated = dentistRepository.save(dentist);
        return toResponseDTO(updated);
    }

    // ----- View Dentist Profile (single) -----
    @Transactional(readOnly = true)
    public DentistResponseDTO getDentistById(Long id) {
        return toResponseDTO(getDentistOrThrow(id));
    }

    // ----- View Dentist Profile (all) -----
    @Transactional(readOnly = true)
    public List<DentistResponseDTO> getAllDentists() {
        return dentistRepository.findAll().stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteDentist(Long id) {
        Dentist dentist = getDentistOrThrow(id);
        dentistRepository.delete(dentist);
    }

    @Transactional
    public DentistResponseDTO updateStatus(Long id, DentistStatus status) {
        Dentist dentist = getDentistOrThrow(id);
        dentist.setStatus(status);
        return toResponseDTO(dentistRepository.save(dentist));
    }

    // ----- Manage Specializations: assign / remove on a dentist -----
    @Transactional
    public DentistResponseDTO addSpecializationToDentist(Long dentistId, Long specializationId) {
        Dentist dentist = getDentistOrThrow(dentistId);
        Specialization specialization = specializationRepository.findById(specializationId)
                .orElseThrow(() -> new ResourceNotFoundException("Specialization not found with id: " + specializationId));

        dentist.getSpecializations().add(specialization);
        return toResponseDTO(dentistRepository.save(dentist));
    }

    @Transactional
    public DentistResponseDTO removeSpecializationFromDentist(Long dentistId, Long specializationId) {
        Dentist dentist = getDentistOrThrow(dentistId);
        dentist.getSpecializations().removeIf(s -> s.getId().equals(specializationId));
        return toResponseDTO(dentistRepository.save(dentist));
    }

    // ----- Helpers -----

    private Dentist getDentistOrThrow(Long id) {
        return dentistRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Dentist not found with id: " + id));
    }

    private void applyRequestToEntity(DentistRequestDTO request, Dentist dentist) {
        dentist.setFirstName(request.getFirstName());
        dentist.setLastName(request.getLastName());
        dentist.setEmail(request.getEmail());
        dentist.setPhone(request.getPhone());
        dentist.setLicenseNumber(request.getLicenseNumber());
        dentist.setQualifications(request.getQualifications());
        dentist.setDateJoined(request.getDateJoined());

        if (request.getSpecializationIds() != null) {
            Set<Specialization> specializations = request.getSpecializationIds().stream()
                    .map(specId -> specializationRepository.findById(specId)
                            .orElseThrow(() -> new ResourceNotFoundException("Specialization not found with id: " + specId)))
                    .collect(Collectors.toCollection(HashSet::new));
            dentist.setSpecializations(specializations);
        }
    }

    private DentistResponseDTO toResponseDTO(Dentist dentist) {
        DentistResponseDTO dto = new DentistResponseDTO();
        dto.setId(dentist.getId());
        dto.setFirstName(dentist.getFirstName());
        dto.setLastName(dentist.getLastName());
        dto.setEmail(dentist.getEmail());
        dto.setPhone(dentist.getPhone());
        dto.setLicenseNumber(dentist.getLicenseNumber());
        dto.setQualifications(dentist.getQualifications());
        dto.setDateJoined(dentist.getDateJoined());
        dto.setStatus(dentist.getStatus());
        dto.setSpecializations(
                dentist.getSpecializations().stream()
                        .map(Specialization::getName)
                        .collect(Collectors.toSet())
        );
        return dto;
    }
}
