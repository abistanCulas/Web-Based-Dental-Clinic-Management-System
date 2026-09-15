package com.dentalclinic.dentiststaff.service;

import com.dentalclinic.dentiststaff.dto.SpecializationDTO;
import com.dentalclinic.dentiststaff.exception.DuplicateResourceException;
import com.dentalclinic.dentiststaff.exception.ResourceNotFoundException;
import com.dentalclinic.dentiststaff.model.Specialization;
import com.dentalclinic.dentiststaff.repository.SpecializationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class SpecializationService {

    private final SpecializationRepository specializationRepository;

    public SpecializationService(SpecializationRepository specializationRepository) {
        this.specializationRepository = specializationRepository;
    }

    @Transactional
    public SpecializationDTO create(SpecializationDTO dto) {
        if (specializationRepository.existsByNameIgnoreCase(dto.getName())) {
            throw new DuplicateResourceException("Specialization already exists: " + dto.getName());
        }
        Specialization specialization = new Specialization(dto.getName(), dto.getDescription());
        return toDTO(specializationRepository.save(specialization));
    }

    @Transactional(readOnly = true)
    public List<SpecializationDTO> getAll() {
        return specializationRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public SpecializationDTO getById(Long id) {
        return toDTO(getOrThrow(id));
    }

    @Transactional
    public SpecializationDTO update(Long id, SpecializationDTO dto) {
        Specialization specialization = getOrThrow(id);
        specialization.setName(dto.getName());
        specialization.setDescription(dto.getDescription());
        return toDTO(specializationRepository.save(specialization));
    }

    @Transactional
    public void delete(Long id) {
        Specialization specialization = getOrThrow(id);
        specializationRepository.delete(specialization);
    }

    private Specialization getOrThrow(Long id) {
        return specializationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Specialization not found with id: " + id));
    }

    private SpecializationDTO toDTO(Specialization specialization) {
        SpecializationDTO dto = new SpecializationDTO();
        dto.setId(specialization.getId());
        dto.setName(specialization.getName());
        dto.setDescription(specialization.getDescription());
        return dto;
    }
}
