package com.dentalclinic.dentiststaff.service;

import com.dentalclinic.dentiststaff.dto.StaffRequestDTO;
import com.dentalclinic.dentiststaff.dto.StaffResponseDTO;
import com.dentalclinic.dentiststaff.exception.DuplicateResourceException;
import com.dentalclinic.dentiststaff.exception.ResourceNotFoundException;
import com.dentalclinic.dentiststaff.model.Staff;
import com.dentalclinic.dentiststaff.model.enums.StaffRole;
import com.dentalclinic.dentiststaff.model.enums.StaffStatus;
import com.dentalclinic.dentiststaff.repository.StaffRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class StaffService {

    private final StaffRepository staffRepository;

    public StaffService(StaffRepository staffRepository) {
        this.staffRepository = staffRepository;
    }

    @Transactional
    public StaffResponseDTO addStaff(StaffRequestDTO request) {
        if (staffRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("A staff member with this email already exists");
        }

        Staff staff = new Staff();
        applyRequestToEntity(request, staff);
        staff.setStatus(StaffStatus.ACTIVE);

        return toResponseDTO(staffRepository.save(staff));
    }

    @Transactional
    public StaffResponseDTO updateStaff(Long id, StaffRequestDTO request) {
        Staff staff = getStaffOrThrow(id);

        staffRepository.findByEmail(request.getEmail()).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new DuplicateResourceException("A staff member with this email already exists");
            }
        });

        applyRequestToEntity(request, staff);
        return toResponseDTO(staffRepository.save(staff));
    }

    @Transactional(readOnly = true)
    public StaffResponseDTO getStaffById(Long id) {
        return toResponseDTO(getStaffOrThrow(id));
    }

    @Transactional(readOnly = true)
    public List<StaffResponseDTO> getAllStaff() {
        return staffRepository.findAll().stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<StaffResponseDTO> getStaffByRole(StaffRole role) {
        return staffRepository.findByRole(role).stream()
                .map(this::toResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteStaff(Long id) {
        Staff staff = getStaffOrThrow(id);
        staffRepository.delete(staff);
    }

    @Transactional
    public StaffResponseDTO updateStatus(Long id, StaffStatus status) {
        Staff staff = getStaffOrThrow(id);
        staff.setStatus(status);
        return toResponseDTO(staffRepository.save(staff));
    }

    private Staff getStaffOrThrow(Long id) {
        return staffRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Staff member not found with id: " + id));
    }

    private void applyRequestToEntity(StaffRequestDTO request, Staff staff) {
        staff.setFirstName(request.getFirstName());
        staff.setLastName(request.getLastName());
        staff.setEmail(request.getEmail());
        staff.setPhone(request.getPhone());
        staff.setRole(request.getRole());
        staff.setDateJoined(request.getDateJoined());
    }

    private StaffResponseDTO toResponseDTO(Staff staff) {
        StaffResponseDTO dto = new StaffResponseDTO();
        dto.setId(staff.getId());
        dto.setFirstName(staff.getFirstName());
        dto.setLastName(staff.getLastName());
        dto.setEmail(staff.getEmail());
        dto.setPhone(staff.getPhone());
        dto.setRole(staff.getRole());
        dto.setDateJoined(staff.getDateJoined());
        dto.setStatus(staff.getStatus());
        return dto;
    }
}
