package com.dentalclinic.dentiststaff.service;

import com.dentalclinic.dentiststaff.dto.AvailabilityScheduleDTO;
import com.dentalclinic.dentiststaff.exception.ResourceNotFoundException;
import com.dentalclinic.dentiststaff.model.AvailabilitySchedule;
import com.dentalclinic.dentiststaff.model.Dentist;
import com.dentalclinic.dentiststaff.repository.AvailabilityScheduleRepository;
import com.dentalclinic.dentiststaff.repository.DentistRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AvailabilityService {

    private final AvailabilityScheduleRepository availabilityRepository;
    private final DentistRepository dentistRepository;

    public AvailabilityService(AvailabilityScheduleRepository availabilityRepository,
                                DentistRepository dentistRepository) {
        this.availabilityRepository = availabilityRepository;
        this.dentistRepository = dentistRepository;
    }

    @Transactional
    public AvailabilityScheduleDTO addAvailability(Long dentistId, AvailabilityScheduleDTO dto) {
        Dentist dentist = dentistRepository.findById(dentistId)
                .orElseThrow(() -> new ResourceNotFoundException("Dentist not found with id: " + dentistId));

        AvailabilitySchedule schedule = new AvailabilitySchedule();
        schedule.setDentist(dentist);
        applyDtoToEntity(dto, schedule);

        return toDTO(availabilityRepository.save(schedule));
    }

    @Transactional(readOnly = true)
    public List<AvailabilityScheduleDTO> getAvailabilityForDentist(Long dentistId) {
        if (!dentistRepository.existsById(dentistId)) {
            throw new ResourceNotFoundException("Dentist not found with id: " + dentistId);
        }
        return availabilityRepository.findByDentistId(dentistId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public AvailabilityScheduleDTO updateAvailability(Long dentistId, Long scheduleId, AvailabilityScheduleDTO dto) {
        AvailabilitySchedule schedule = availabilityRepository.findById(scheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Availability slot not found with id: " + scheduleId));

        if (!schedule.getDentist().getId().equals(dentistId)) {
            throw new ResourceNotFoundException("This availability slot does not belong to dentist " + dentistId);
        }

        applyDtoToEntity(dto, schedule);
        return toDTO(availabilityRepository.save(schedule));
    }

    @Transactional
    public void deleteAvailability(Long dentistId, Long scheduleId) {
        availabilityRepository.deleteByIdAndDentistId(scheduleId, dentistId);
    }

    private void applyDtoToEntity(AvailabilityScheduleDTO dto, AvailabilitySchedule schedule) {
        schedule.setDayOfWeek(dto.getDayOfWeek());
        schedule.setStartTime(dto.getStartTime());
        schedule.setEndTime(dto.getEndTime());
        schedule.setAvailable(dto.isAvailable());
    }

    private AvailabilityScheduleDTO toDTO(AvailabilitySchedule schedule) {
        AvailabilityScheduleDTO dto = new AvailabilityScheduleDTO();
        dto.setId(schedule.getId());
        dto.setDayOfWeek(schedule.getDayOfWeek());
        dto.setStartTime(schedule.getStartTime());
        dto.setEndTime(schedule.getEndTime());
        dto.setAvailable(schedule.isAvailable());
        return dto;
    }
}
