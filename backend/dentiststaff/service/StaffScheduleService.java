package com.dentalclinic.dentiststaff.service;

import com.dentalclinic.dentiststaff.dto.StaffScheduleDTO;
import com.dentalclinic.dentiststaff.exception.ResourceNotFoundException;
import com.dentalclinic.dentiststaff.model.Staff;
import com.dentalclinic.dentiststaff.model.StaffSchedule;
import com.dentalclinic.dentiststaff.repository.StaffRepository;
import com.dentalclinic.dentiststaff.repository.StaffScheduleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class StaffScheduleService {

    private final StaffScheduleRepository staffScheduleRepository;
    private final StaffRepository staffRepository;

    public StaffScheduleService(StaffScheduleRepository staffScheduleRepository,
                                 StaffRepository staffRepository) {
        this.staffScheduleRepository = staffScheduleRepository;
        this.staffRepository = staffRepository;
    }

    @Transactional
    public StaffScheduleDTO addSchedule(Long staffId, StaffScheduleDTO dto) {
        Staff staff = staffRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Staff member not found with id: " + staffId));

        StaffSchedule schedule = new StaffSchedule();
        schedule.setStaff(staff);
        applyDtoToEntity(dto, schedule);

        return toDTO(staffScheduleRepository.save(schedule));
    }

    @Transactional(readOnly = true)
    public List<StaffScheduleDTO> getScheduleForStaff(Long staffId) {
        if (!staffRepository.existsById(staffId)) {
            throw new ResourceNotFoundException("Staff member not found with id: " + staffId);
        }
        return staffScheduleRepository.findByStaffId(staffId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public StaffScheduleDTO updateSchedule(Long staffId, Long scheduleId, StaffScheduleDTO dto) {
        StaffSchedule schedule = staffScheduleRepository.findById(scheduleId)
                .orElseThrow(() -> new ResourceNotFoundException("Schedule slot not found with id: " + scheduleId));

        if (!schedule.getStaff().getId().equals(staffId)) {
            throw new ResourceNotFoundException("This schedule slot does not belong to staff member " + staffId);
        }

        applyDtoToEntity(dto, schedule);
        return toDTO(staffScheduleRepository.save(schedule));
    }

    @Transactional
    public void deleteSchedule(Long staffId, Long scheduleId) {
        staffScheduleRepository.deleteByIdAndStaffId(scheduleId, staffId);
    }

    private void applyDtoToEntity(StaffScheduleDTO dto, StaffSchedule schedule) {
        schedule.setDayOfWeek(dto.getDayOfWeek());
        schedule.setShiftStart(dto.getShiftStart());
        schedule.setShiftEnd(dto.getShiftEnd());
    }

    private StaffScheduleDTO toDTO(StaffSchedule schedule) {
        StaffScheduleDTO dto = new StaffScheduleDTO();
        dto.setId(schedule.getId());
        dto.setDayOfWeek(schedule.getDayOfWeek());
        dto.setShiftStart(schedule.getShiftStart());
        dto.setShiftEnd(schedule.getShiftEnd());
        return dto;
    }
}
