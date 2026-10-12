package com.dentaflow.backend.mapper;

import com.dentaflow.backend.dto.StaffScheduleDTO;
import com.dentaflow.backend.entity.StaffSchedule;
import org.springframework.stereotype.Component;

@Component
public class StaffScheduleMapper {

    // =========================================================
    // ENTITY → DTO
    // =========================================================

    public StaffScheduleDTO toDTO(
            StaffSchedule schedule) {

        if (schedule == null) {
            return null;
        }

        String personName = null;
        String personRole = null;
        String specialization = null;

        if (schedule.getDentist() != null) {
            String fName = schedule.getDentist().getFirstName() != null ? schedule.getDentist().getFirstName().trim() : "";
            String lName = schedule.getDentist().getLastName() != null ? schedule.getDentist().getLastName().trim() : "";
            String fullName = (fName + " " + lName).trim();
            personName = fullName.toLowerCase().startsWith("dr.") ? fullName : ("Dr. " + fullName).trim();
            personRole = "DENTIST";
            specialization = schedule.getDentist().getSpecialization();
        } else if (schedule.getStaff() != null) {
            String fName = schedule.getStaff().getFirstName() != null ? schedule.getStaff().getFirstName() : "";
            String lName = schedule.getStaff().getLastName() != null ? schedule.getStaff().getLastName() : "";
            personName = (fName + " " + lName).trim();
            personRole = schedule.getStaff().getRole() != null ? schedule.getStaff().getRole().toUpperCase() : "STAFF";
        }

        java.time.LocalDate exactDate = schedule.getScheduleDate();
        if (exactDate == null && schedule.getWeekStartDate() != null && schedule.getDayOfWeek() != null) {
            exactDate = schedule.getWeekStartDate().plusDays(schedule.getDayOfWeek().getValue() - 1);
        }

        return StaffScheduleDTO.builder()
                .id(schedule.getId())
                .staffId(schedule.getStaff() != null ? schedule.getStaff().getId() : null)
                .dentistId(schedule.getDentist() != null ? schedule.getDentist().getId() : null)
                .dayOfWeek(schedule.getDayOfWeek())
                .weekStartDate(schedule.getWeekStartDate())
                .scheduleDate(exactDate)
                .working(schedule.getWorking())
                .startTime(schedule.getStartTime())
                .endTime(schedule.getEndTime())
                .shift(schedule.getShift())
                .status(schedule.getStatus() != null ? schedule.getStatus() : (Boolean.FALSE.equals(schedule.getWorking()) ? "OFF" : "ACTIVE"))
                .scheduleSource(schedule.getScheduleSource())
                .generatedAutomatically(schedule.getGeneratedAutomatically())
                .modifiedByAdmin(schedule.getModifiedByAdmin())
                .deletedByAdmin(schedule.getDeletedByAdmin())
                .name(personName)
                .role(personRole)
                .specialization(specialization)
                .notes(schedule.getNotes())
                .build();
    }

    // =========================================================
    // DTO → ENTITY
    // =========================================================

    public StaffSchedule toEntity(
            StaffScheduleDTO dto) {

        if (dto == null) {
            return null;
        }

        StaffSchedule schedule =
                new StaffSchedule();

        schedule.setId(
                dto.getId()
        );

        schedule.setDayOfWeek(
                dto.getDayOfWeek()
        );

        schedule.setWeekStartDate(
                dto.getWeekStartDate()
        );

        schedule.setScheduleDate(
                dto.getScheduleDate()
        );

        schedule.setWorking(
                dto.getWorking()
        );

        schedule.setStartTime(
                dto.getStartTime()
        );

        schedule.setEndTime(
                dto.getEndTime()
        );

        schedule.setShift(
                dto.getShift()
        );

        schedule.setStatus(
                dto.getStatus()
        );

        schedule.setScheduleSource(
                dto.getScheduleSource()
        );

        schedule.setGeneratedAutomatically(
                dto.getGeneratedAutomatically()
        );

        schedule.setModifiedByAdmin(
                dto.getModifiedByAdmin()
        );

        schedule.setDeletedByAdmin(
                dto.getDeletedByAdmin()
        );

        schedule.setNotes(
                dto.getNotes()
        );

        /*
         * Staff and Dentist are intentionally NOT set here.
         *
         * StaffScheduleService is responsible for setting
         * either Staff or Dentist using the corresponding ID.
         */

        return schedule;
    }
}