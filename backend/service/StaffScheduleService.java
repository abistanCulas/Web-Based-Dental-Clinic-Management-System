package com.dentaflow.backend.service;

import com.dentaflow.backend.dto.ScheduleOperationResult;
import com.dentaflow.backend.dto.StaffScheduleDTO;
import com.dentaflow.backend.entity.Dentist;
import com.dentaflow.backend.entity.DentistAvailability;
import com.dentaflow.backend.entity.Notification;
import com.dentaflow.backend.entity.Staff;
import com.dentaflow.backend.entity.StaffSchedule;
import com.dentaflow.backend.repository.DentistAvailabilityRepository;
import com.dentaflow.backend.repository.DentistRepository;
import com.dentaflow.backend.repository.NotificationRepository;
import com.dentaflow.backend.repository.StaffRepository;
import com.dentaflow.backend.repository.StaffScheduleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class StaffScheduleService {

    private final StaffScheduleRepository staffScheduleRepository;
    private final StaffRepository staffRepository;
    private final DentistRepository dentistRepository;
    private final DentistAvailabilityRepository dentistAvailabilityRepository;
    private final EmailService emailService;
    private final NotificationRepository notificationRepository;
    private final com.dentaflow.backend.mapper.StaffScheduleMapper staffScheduleMapper;

    // Sentinel week start date for recurring weekly schedule template (2000-01-03 was a Monday)
    public static final LocalDate TEMPLATE_WEEK = LocalDate.of(2000, 1, 3);

    public static final String SCHEDULE_UPDATE_SUBJECT = "Your DentaFlow Schedule Has Been Updated";

    // =========================================================
    // CLINIC SHIFT CONFIGURATION
    // =========================================================

    private static final LocalTime MORNING_START =
            LocalTime.of(9, 0);

    private static final LocalTime MORNING_END =
            LocalTime.of(14, 0);

    private static final LocalTime EVENING_START =
            LocalTime.of(14, 0);

    private static final LocalTime EVENING_END =
            LocalTime.of(20, 0);

    private static final String MORNING_SHIFT =
            "MORNING";

    private static final String EVENING_SHIFT =
            "EVENING";

    private static final String AUTO =
            "AUTO";

    private static final String MANUAL =
            "MANUAL";

    // =========================================================
    // CONSTRUCTOR
    // =========================================================

    public StaffScheduleService(
            StaffScheduleRepository staffScheduleRepository,
            StaffRepository staffRepository,
            DentistRepository dentistRepository) {

        this(staffScheduleRepository, staffRepository, dentistRepository, null, null, null, null);
    }

    public StaffScheduleService(
            StaffScheduleRepository staffScheduleRepository,
            StaffRepository staffRepository,
            DentistRepository dentistRepository,
            DentistAvailabilityRepository dentistAvailabilityRepository,
            EmailService emailService,
            NotificationRepository notificationRepository) {

        this(staffScheduleRepository, staffRepository, dentistRepository, dentistAvailabilityRepository, emailService, notificationRepository, null);
    }

    @Autowired
    public StaffScheduleService(
            StaffScheduleRepository staffScheduleRepository,
            StaffRepository staffRepository,
            DentistRepository dentistRepository,
            @Autowired(required = false) DentistAvailabilityRepository dentistAvailabilityRepository,
            @Autowired(required = false) EmailService emailService,
            @Autowired(required = false) NotificationRepository notificationRepository,
            @Autowired(required = false) com.dentaflow.backend.mapper.StaffScheduleMapper staffScheduleMapper) {

        this.staffScheduleRepository =
                staffScheduleRepository;

        this.staffRepository =
                staffRepository;

        this.dentistRepository =
                dentistRepository;

        this.dentistAvailabilityRepository =
                dentistAvailabilityRepository;

        this.emailService =
                emailService;

        this.notificationRepository =
                notificationRepository;

        this.staffScheduleMapper =
                staffScheduleMapper != null ? staffScheduleMapper : new com.dentaflow.backend.mapper.StaffScheduleMapper();
    }

    // =========================================================
    // CREATE SINGLE MANUAL STAFF SCHEDULE
    // =========================================================

    public StaffSchedule createStaffSchedule(
            Long staffId,
            StaffSchedule schedule) {

        if (schedule == null) {
            throw new RuntimeException(
                    "Schedule data is required"
            );
        }

        Staff staff = getStaff(staffId);

        LocalDate weekStartDate =
                getMonday(schedule.getWeekStartDate());

        validateDay(schedule.getDayOfWeek());

        String shift =
                normalizeShift(schedule.getShift());

        if (shift == null) {
            throw new RuntimeException(
                    "Shift is required. Use MORNING or EVENING"
            );
        }

        prepareSchedule(
                schedule,
                weekStartDate,
                shift
        );

        if (staffScheduleRepository
                .existsByStaffIdAndWeekStartDateAndDayOfWeekAndShift(
                        staffId,
                        weekStartDate,
                        schedule.getDayOfWeek(),
                        shift
                )) {

            throw new RuntimeException(
                    "A schedule already exists for this staff member, day and shift"
            );
        }

        schedule.setStaff(staff);
        schedule.setDentist(null);
        schedule.setScheduleSource(MANUAL);

        return staffScheduleRepository.save(schedule);
    }

    // =========================================================
    // CREATE SINGLE MANUAL DENTIST SCHEDULE
    // =========================================================

    public StaffSchedule createDentistSchedule(
            Long dentistId,
            StaffSchedule schedule) {

        if (schedule == null) {
            throw new RuntimeException(
                    "Schedule data is required"
            );
        }

        Dentist dentist = getDentist(dentistId);

        LocalDate weekStartDate =
                getMonday(schedule.getWeekStartDate());

        validateDay(schedule.getDayOfWeek());

        String shift =
                normalizeShift(schedule.getShift());

        if (shift == null) {
            throw new RuntimeException(
                    "Shift is required. Use MORNING or EVENING"
            );
        }

        prepareSchedule(
                schedule,
                weekStartDate,
                shift
        );

        if (staffScheduleRepository
                .existsByDentistIdAndWeekStartDateAndDayOfWeekAndShift(
                        dentistId,
                        weekStartDate,
                        schedule.getDayOfWeek(),
                        shift
                )) {

            throw new RuntimeException(
                    "A schedule already exists for this dentist, day and shift"
            );
        }

        schedule.setDentist(dentist);
        schedule.setStaff(null);
        schedule.setScheduleSource(MANUAL);

        return staffScheduleRepository.save(schedule);
    }

    // =========================================================
    // GENERATE WEEKLY STAFF SCHEDULE
    //
    // 6 WORKING DAYS
    // 1 ROTATING OFF DAY
    // MORNING / EVENING ROTATION
    // =========================================================

    public List<StaffSchedule> generateWeeklySchedule(
            Long staffId,
            LocalDate weekStartDate) {

        Staff staff = getStaff(staffId);

        LocalDate monday =
                getMonday(weekStartDate);

        if (staffScheduleRepository
                .existsByStaffIdAndWeekStartDate(
                        staffId,
                        monday
                )) {

            throw new RuntimeException(
                    "Weekly schedule already exists for this staff member"
            );
        }

        int staffIndex =
                getStaffIndex(
                        getActiveStaff(),
                        staffId
                );

        List<StaffSchedule> schedules =
                generateScheduleForStaffOrDentist(
                        staff,
                        null,
                        staffIndex,
                        monday
                );

        return staffScheduleRepository.saveAll(schedules);
    }

    // =========================================================
    // GENERATE WEEKLY DENTIST SCHEDULE
    // =========================================================

    public List<StaffSchedule> generateDentistWeeklySchedule(
            Long dentistId,
            LocalDate weekStartDate) {

        Dentist dentist = getDentist(dentistId);

        LocalDate monday =
                getMonday(weekStartDate);

        if (staffScheduleRepository
                .existsByDentistIdAndWeekStartDate(
                        dentistId,
                        monday
                )) {

            throw new RuntimeException(
                    "Weekly schedule already exists for this dentist"
            );
        }

        int dentistIndex =
                getDentistIndex(
                        getActiveDentists(),
                        dentistId
                );

        List<StaffSchedule> schedules =
                generateScheduleForStaffOrDentist(
                        null,
                        dentist,
                        dentistIndex,
                        monday
                );

        return staffScheduleRepository.saveAll(schedules);
    }

    // =========================================================
    // GENERATE WEEKLY SCHEDULES FOR ALL STAFF
    // =========================================================

    public List<StaffSchedule>
    generateWeeklySchedulesForAllStaff(
            LocalDate weekStartDate) {

        LocalDate monday =
                getMonday(weekStartDate);

        List<Staff> activeStaff =
                getActiveStaff();

        List<StaffSchedule> allSchedules =
                new ArrayList<>();

        for (Staff staff : activeStaff) {

            if (staffScheduleRepository
                    .existsByStaffIdAndWeekStartDate(
                            staff.getId(),
                            monday
                    )) {

                continue;
            }

            int index =
                    getStaffIndex(
                            activeStaff,
                            staff.getId()
                    );

            allSchedules.addAll(
                    generateScheduleForStaffOrDentist(
                            staff,
                            null,
                            index,
                            monday
                    )
            );
        }

        return staffScheduleRepository.saveAll(
                allSchedules
        );
    }

    // =========================================================
    // GENERATE WEEKLY SCHEDULES FOR ALL DENTISTS
    // =========================================================

    public List<StaffSchedule>
    generateWeeklySchedulesForAllDentists(
            LocalDate weekStartDate) {

        LocalDate monday =
                getMonday(weekStartDate);

        List<Dentist> activeDentists =
                getActiveDentists();

        List<StaffSchedule> allSchedules =
                new ArrayList<>();

        for (Dentist dentist : activeDentists) {

            if (staffScheduleRepository
                    .existsByDentistIdAndWeekStartDate(
                            dentist.getId(),
                            monday
                    )) {

                continue;
            }

            int index =
                    getDentistIndex(
                            activeDentists,
                            dentist.getId()
                    );

            allSchedules.addAll(
                    generateScheduleForStaffOrDentist(
                            null,
                            dentist,
                            index,
                            monday
                    )
            );
        }

        return staffScheduleRepository.saveAll(
                allSchedules
        );
    }

    // =========================================================
    // GENERATE ALL STAFF + DENTISTS
    // =========================================================

    public List<StaffSchedule>
    generateWeeklySchedulesForEveryone(
            LocalDate weekStartDate) {

        LocalDate monday =
                getMonday(weekStartDate);

        List<StaffSchedule> allSchedules =
                new ArrayList<>();

        allSchedules.addAll(
                generateWeeklySchedulesForAllStaff(
                        monday
                )
        );

        allSchedules.addAll(
                generateWeeklySchedulesForAllDentists(
                        monday
                )
        );

        return allSchedules;
    }

    // =========================================================
    // CREATE MANUAL WEEKLY STAFF SCHEDULE
    // =========================================================

    public List<StaffSchedule> createWeeklyStaffSchedule(
            Long staffId,
            List<StaffSchedule> schedules) {

        if (schedules == null ||
                schedules.isEmpty()) {

            throw new RuntimeException(
                    "Weekly schedule cannot be empty"
            );
        }

        Staff staff = getStaff(staffId);

        LocalDate weekStartDate =
                getMonday(
                        schedules.get(0)
                                .getWeekStartDate()
                );

        if (staffScheduleRepository
                .existsByStaffIdAndWeekStartDate(
                        staffId,
                        weekStartDate
                )) {

            throw new RuntimeException(
                    "Weekly schedule already exists"
            );
        }

        List<StaffSchedule> prepared =
                prepareManualSchedules(
                        schedules,
                        weekStartDate
                );

        for (StaffSchedule schedule : prepared) {

            schedule.setStaff(staff);
            schedule.setDentist(null);
            schedule.setScheduleSource(MANUAL);
        }

        return staffScheduleRepository.saveAll(
                prepared
        );
    }

    // =========================================================
    // CREATE MANUAL WEEKLY DENTIST SCHEDULE
    // =========================================================

    public List<StaffSchedule> createWeeklyDentistSchedule(
            Long dentistId,
            List<StaffSchedule> schedules) {

        if (schedules == null ||
                schedules.isEmpty()) {

            throw new RuntimeException(
                    "Weekly schedule cannot be empty"
            );
        }

        Dentist dentist = getDentist(dentistId);

        LocalDate weekStartDate =
                getMonday(
                        schedules.get(0)
                                .getWeekStartDate()
                );

        if (staffScheduleRepository
                .existsByDentistIdAndWeekStartDate(
                        dentistId,
                        weekStartDate
                )) {

            throw new RuntimeException(
                    "Weekly schedule already exists"
            );
        }

        List<StaffSchedule> prepared =
                prepareManualSchedules(
                        schedules,
                        weekStartDate
                );

        for (StaffSchedule schedule : prepared) {

            schedule.setStaff(null);
            schedule.setDentist(dentist);
            schedule.setScheduleSource(MANUAL);
        }

        return staffScheduleRepository.saveAll(
                prepared
        );
    }

    // =========================================================
    // GET OR CREATE WEEKLY DENTIST SCHEDULE
    // =========================================================

    public List<StaffSchedule> getOrCreateWeeklyDentistSchedule(
            Long dentistId,
            LocalDate weekStartDate) {

        Dentist dentist = getDentist(dentistId);
        LocalDate monday = getMonday(weekStartDate);

        List<StaffSchedule> schedules = staffScheduleRepository
                .findByDentistIdAndWeekStartDate(dentistId, monday);

        if (schedules != null && !schedules.isEmpty()) {
            schedules.sort(Comparator.comparing(s -> s.getDayOfWeek().getValue()));
            return schedules;
        }

        int dentistIndex = getDentistIndex(getActiveDentists(), dentistId);
        List<StaffSchedule> newSchedules = generateScheduleForStaffOrDentist(
                null,
                dentist,
                dentistIndex,
                monday
        );
        List<StaffSchedule> saved = staffScheduleRepository.saveAll(newSchedules);
        saved.sort(Comparator.comparing(s -> s.getDayOfWeek().getValue()));
        return saved;
    }

    // =========================================================
    // GET OR CREATE WEEKLY STAFF SCHEDULE
    // =========================================================

    public List<StaffSchedule> getOrCreateWeeklyStaffSchedule(
            Long staffId,
            LocalDate weekStartDate) {

        Staff staff = getStaff(staffId);
        LocalDate monday = getMonday(weekStartDate);

        List<StaffSchedule> schedules = staffScheduleRepository
                .findByStaffIdAndWeekStartDate(staffId, monday);

        if (schedules != null && !schedules.isEmpty()) {
            schedules.sort(Comparator.comparing(s -> s.getDayOfWeek().getValue()));
            return schedules;
        }

        int staffIndex = getStaffIndex(getActiveStaff(), staffId);
        List<StaffSchedule> newSchedules = generateScheduleForStaffOrDentist(
                staff,
                null,
                staffIndex,
                monday
        );
        List<StaffSchedule> saved = staffScheduleRepository.saveAll(newSchedules);
        saved.sort(Comparator.comparing(s -> s.getDayOfWeek().getValue()));
        return saved;
    }

    // =========================================================
    // SAVE OR UPDATE WEEKLY DENTIST SCHEDULE (AUTHORITATIVE)
    // =========================================================

    public List<StaffSchedule> saveOrUpdateWeeklyDentistSchedule(
            Long dentistId,
            LocalDate weekStartDate,
            List<StaffSchedule> incoming) {

        if (incoming == null || incoming.isEmpty()) {
            throw new RuntimeException("Weekly schedule cannot be empty");
        }

        Dentist dentist = getDentist(dentistId);
        LocalDate monday = getMonday(weekStartDate != null ? weekStartDate : incoming.get(0).getWeekStartDate());

        List<StaffSchedule> existingList = staffScheduleRepository
                .findByDentistIdAndWeekStartDate(dentistId, monday);
        Map<DayOfWeek, StaffSchedule> existingByDay = existingList.stream()
                .collect(Collectors.toMap(StaffSchedule::getDayOfWeek, s -> s, (s1, s2) -> s1));

        List<StaffSchedule> toSave = new ArrayList<>();

        for (StaffSchedule item : incoming) {
            if (item == null || item.getDayOfWeek() == null) continue;

            DayOfWeek dow = item.getDayOfWeek();
            StaffSchedule target = existingByDay.get(dow);
            if (target == null) {
                target = new StaffSchedule();
                target.setDentist(dentist);
                target.setStaff(null);
                target.setWeekStartDate(monday);
                target.setDayOfWeek(dow);
            }

            target.setScheduleSource(MANUAL);
            String shift = item.getShift() != null ? normalizeShift(item.getShift()) : null;
            target.setShift(shift != null ? shift : MORNING_SHIFT);
            target.setNotes(item.getNotes());

            boolean isWorking = Boolean.TRUE.equals(item.getWorking());
            target.setWorking(isWorking);

            if (isWorking) {
                if (item.getStartTime() == null || item.getEndTime() == null) {
                    throw new RuntimeException("Start time and end time are required for " + dow);
                }
                if (!item.getStartTime().isBefore(item.getEndTime())) {
                    throw new RuntimeException("Start time must be before end time for " + dow);
                }
                target.setStartTime(item.getStartTime());
                target.setEndTime(item.getEndTime());
            } else {
                target.setStartTime(null);
                target.setEndTime(null);
            }

            toSave.add(target);
        }

        List<StaffSchedule> saved = staffScheduleRepository.saveAll(toSave);
        saved.sort(Comparator.comparing(s -> s.getDayOfWeek().getValue()));
        return saved;
    }

    // =========================================================
    // SAVE OR UPDATE WEEKLY STAFF SCHEDULE (AUTHORITATIVE)
    // =========================================================

    public List<StaffSchedule> saveOrUpdateWeeklyStaffSchedule(
            Long staffId,
            LocalDate weekStartDate,
            List<StaffSchedule> incoming) {

        if (incoming == null || incoming.isEmpty()) {
            throw new RuntimeException("Weekly schedule cannot be empty");
        }

        Staff staff = getStaff(staffId);
        LocalDate monday = getMonday(weekStartDate != null ? weekStartDate : incoming.get(0).getWeekStartDate());

        List<StaffSchedule> existingList = staffScheduleRepository
                .findByStaffIdAndWeekStartDate(staffId, monday);
        Map<DayOfWeek, StaffSchedule> existingByDay = existingList.stream()
                .collect(Collectors.toMap(StaffSchedule::getDayOfWeek, s -> s, (s1, s2) -> s1));

        List<StaffSchedule> toSave = new ArrayList<>();

        for (StaffSchedule item : incoming) {
            if (item == null || item.getDayOfWeek() == null) continue;

            DayOfWeek dow = item.getDayOfWeek();
            StaffSchedule target = existingByDay.get(dow);
            if (target == null) {
                target = new StaffSchedule();
                target.setStaff(staff);
                target.setDentist(null);
                target.setWeekStartDate(monday);
                target.setDayOfWeek(dow);
            }

            target.setScheduleSource(MANUAL);
            String shift = item.getShift() != null ? normalizeShift(item.getShift()) : null;
            target.setShift(shift != null ? shift : MORNING_SHIFT);
            target.setNotes(item.getNotes());

            boolean isWorking = Boolean.TRUE.equals(item.getWorking());
            target.setWorking(isWorking);

            if (isWorking) {
                if (item.getStartTime() == null || item.getEndTime() == null) {
                    throw new RuntimeException("Start time and end time are required for " + dow);
                }
                if (!item.getStartTime().isBefore(item.getEndTime())) {
                    throw new RuntimeException("Start time must be before end time for " + dow);
                }
                target.setStartTime(item.getStartTime());
                target.setEndTime(item.getEndTime());
            } else {
                target.setStartTime(null);
                target.setEndTime(null);
            }

            toSave.add(target);
        }

        List<StaffSchedule> saved = staffScheduleRepository.saveAll(toSave);
        saved.sort(Comparator.comparing(s -> s.getDayOfWeek().getValue()));
        syncStaffWeeklyTemplate(staff, saved);
        return saved;
    }

    // =========================================================
    // STAFF SCHEDULE MANAGEMENT: WEEKLY & DATE-SPECIFIC OVERRIDE
    // =========================================================

    /**
     * Save staff weekly schedule with notification email to the affected staff member only.
     */
    public ScheduleOperationResult saveStaffWeeklyScheduleWithNotification(
            Long staffId,
            LocalDate weekStartDate,
            List<StaffScheduleDTO> dtoList) {

        if (dtoList == null || dtoList.isEmpty()) {
            throw new RuntimeException("Weekly schedule cannot be empty");
        }

        Staff staff = getStaff(staffId);
        LocalDate monday = getMonday(weekStartDate != null ? weekStartDate : dtoList.get(0).getWeekStartDate());
        LocalDate sunday = monday.plusDays(6);

        // Fetch previous weekly schedule text for email summary
        List<StaffSchedule> previousList = staffScheduleRepository.findByStaffIdAndWeekStartDate(staffId, monday);
        String previousSummary = buildWeeklySummaryText(previousList);

        // Convert DTOs to entities
        List<StaffSchedule> incoming = dtoList.stream()
                .map(staffScheduleMapper::toEntity)
                .collect(Collectors.toList());

        // Save to target week and sync template
        List<StaffSchedule> saved = saveOrUpdateWeeklyStaffSchedule(staffId, monday, incoming);
        staffScheduleRepository.flush();

        // Build new schedule summary text
        String newSummary = buildWeeklySummaryText(saved);

        String staffName = (staff.getFirstName() != null ? staff.getFirstName() : "")
                + " " + (staff.getLastName() != null ? staff.getLastName() : "");
        staffName = staffName.trim();

        StringBuilder emailBody = new StringBuilder();
        emailBody.append("Dear ").append(staffName).append(",\n\n")
                .append("Your weekly working schedule has been updated by the clinic administrator.\n\n")
                .append("Schedule Period: ").append(monday).append(" to ").append(sunday).append("\n\n")
                .append("--- PREVIOUS SCHEDULE ---\n")
                .append(previousSummary).append("\n\n")
                .append("--- NEW SCHEDULE ---\n")
                .append(newSummary).append("\n\n")
                .append("If you have any questions regarding your schedule, please contact clinic administration.\n\n")
                .append("Best regards,\n")
                .append("DentaFlow Clinic Administration");

        String recipientEmail = getStaffEmail(staff);
        boolean emailSent = sendScheduleNotificationEmail(recipientEmail, SCHEDULE_UPDATE_SUBJECT, emailBody.toString());

        String message = emailSent
                ? "Schedule updated successfully and notification email sent to " + staffName + "."
                : "Schedule updated, but the notification email could not be sent.";

        List<StaffScheduleDTO> resultDtos = saved.stream()
                .map(staffScheduleMapper::toDTO)
                .collect(Collectors.toList());

        return ScheduleOperationResult.builder()
                .success(true)
                .emailSent(emailSent)
                .message(message)
                .schedules(resultDtos)
                .build();
    }

    /**
     * Get effective schedule for a specific date following priority:
     * 1. Admin-created date-specific override
     * 2. Normal weekly schedule
     * 3. Automatically generated schedule
     */
    @Transactional(readOnly = true)
    public StaffScheduleDTO getEffectiveStaffSchedule(Long staffId, LocalDate targetDate) {
        if (staffId == null) {
            throw new RuntimeException("Staff ID is required");
        }
        if (targetDate == null) {
            targetDate = LocalDate.now();
        }

        Staff staff = getStaff(staffId);
        LocalDate monday = getMonday(targetDate);
        DayOfWeek dow = targetDate.getDayOfWeek();

        // Priority 1: Admin-created date-specific override
        Optional<StaffSchedule> overrideOpt = staffScheduleRepository
                .findFirstByStaffIdAndScheduleDateAndShiftAndDeletedByAdminFalse(staffId, targetDate, "OVERRIDE");

        if (overrideOpt.isPresent()) {
            StaffSchedule override = overrideOpt.get();
            StaffScheduleDTO dto = staffScheduleMapper.toDTO(override);
            dto.setScheduleDate(targetDate);
            dto.setWeekStartDate(monday);
            dto.setDayOfWeek(dow);
            dto.setEffectiveSource("OVERRIDE");
            dto.setEffectiveBadge("[Admin Date Override]");
            dto.setIsOverride(true);
            enrichStaffScheduleDTO(dto, staff, null);
            return dto;
        }

        // Priority 2: Normal weekly schedule
        // 2a. Check target week schedule
        List<StaffSchedule> weeklySchedules = staffScheduleRepository
                .findByStaffIdAndWeekStartDate(staffId, monday);
        Optional<StaffSchedule> weeklyDayOpt = weeklySchedules.stream()
                .filter(s -> s.getDayOfWeek() == dow && !"OVERRIDE".equalsIgnoreCase(s.getShift()) && !Boolean.TRUE.equals(s.getDeletedByAdmin()))
                .findFirst();

        if (weeklyDayOpt.isPresent()) {
            StaffSchedule weekly = weeklyDayOpt.get();
            StaffScheduleDTO dto = staffScheduleMapper.toDTO(weekly);
            dto.setScheduleDate(targetDate);
            boolean isAdminModified = Boolean.TRUE.equals(weekly.getModifiedByAdmin()) || "MANUAL".equalsIgnoreCase(weekly.getScheduleSource());
            dto.setEffectiveSource(isAdminModified ? "WEEKLY" : "AUTO");
            dto.setEffectiveBadge(isAdminModified ? "[Weekly Schedule]" : "[Auto Generated]");
            dto.setIsOverride(false);
            enrichStaffScheduleDTO(dto, staff, null);
            return dto;
        }

        // 2b. Check recurring template week (TEMPLATE_WEEK)
        List<StaffSchedule> templateSchedules = staffScheduleRepository
                .findByStaffIdAndWeekStartDate(staffId, TEMPLATE_WEEK);
        Optional<StaffSchedule> templateDayOpt = templateSchedules.stream()
                .filter(s -> s.getDayOfWeek() == dow && !"OVERRIDE".equalsIgnoreCase(s.getShift()) && !Boolean.TRUE.equals(s.getDeletedByAdmin()))
                .findFirst();

        if (templateDayOpt.isPresent()) {
            StaffSchedule template = templateDayOpt.get();
            StaffScheduleDTO dto = staffScheduleMapper.toDTO(template);
            dto.setScheduleDate(targetDate);
            dto.setWeekStartDate(monday);
            dto.setEffectiveSource("WEEKLY");
            dto.setEffectiveBadge("[Weekly Schedule]");
            dto.setIsOverride(false);
            enrichStaffScheduleDTO(dto, staff, null);
            return dto;
        }

        // Priority 3: Automatically generated schedule
        List<StaffSchedule> autoGenerated = getOrCreateWeeklyStaffSchedule(staffId, monday);
        Optional<StaffSchedule> autoDayOpt = autoGenerated.stream()
                .filter(s -> s.getDayOfWeek() == dow && !"OVERRIDE".equalsIgnoreCase(s.getShift()) && !Boolean.TRUE.equals(s.getDeletedByAdmin()))
                .findFirst();

        if (autoDayOpt.isPresent()) {
            StaffSchedule auto = autoDayOpt.get();
            StaffScheduleDTO dto = staffScheduleMapper.toDTO(auto);
            dto.setScheduleDate(targetDate);
            dto.setEffectiveSource("AUTO");
            dto.setEffectiveBadge("[Auto Generated]");
            dto.setIsOverride(false);
            enrichStaffScheduleDTO(dto, staff, null);
            return dto;
        }

        StaffScheduleDTO fallback = new StaffScheduleDTO();
        fallback.setStaffId(staffId);
        fallback.setScheduleDate(targetDate);
        fallback.setWeekStartDate(monday);
        fallback.setDayOfWeek(dow);
        fallback.setWorking(false);
        fallback.setStatus("OFF");
        fallback.setEffectiveSource("AUTO");
        fallback.setEffectiveBadge("[Auto Generated]");
        fallback.setIsOverride(false);
        enrichStaffScheduleDTO(fallback, staff, null);
        return fallback;
    }

    /**
     * Get effective schedule for an entire week (Monday to Sunday).
     */
    @Transactional(readOnly = true)
    public List<StaffScheduleDTO> getEffectiveStaffWeekSchedule(Long staffId, LocalDate weekStartDate) {
        LocalDate monday = getMonday(weekStartDate);
        List<StaffScheduleDTO> week = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            LocalDate date = monday.plusDays(i);
            week.add(getEffectiveStaffSchedule(staffId, date));
        }
        return week;
    }

    /**
     * Create or edit a date-specific schedule override for a staff member.
     */
    public ScheduleOperationResult createOrUpdateDateOverride(Long staffId, StaffScheduleDTO dto) {
        if (dto == null) {
            throw new RuntimeException("Schedule override data is required");
        }
        Staff staff = getStaff(staffId);

        LocalDate targetDate = dto.getScheduleDate();
        if (targetDate == null && dto.getWeekStartDate() != null && dto.getDayOfWeek() != null) {
            targetDate = dto.getWeekStartDate().plusDays(dto.getDayOfWeek().getValue() - 1);
        }
        if (targetDate == null) {
            throw new RuntimeException("Valid schedule date is required");
        }

        LocalDate monday = getMonday(targetDate);
        DayOfWeek dow = targetDate.getDayOfWeek();
        boolean isWorking = dto.getWorking() == null || Boolean.TRUE.equals(dto.getWorking());
        LocalTime startTime = dto.getStartTime();
        LocalTime endTime = dto.getEndTime();

        if (isWorking) {
            if (startTime == null || endTime == null) {
                throw new RuntimeException("Start time and end time are required for working shifts");
            }
            if (!startTime.isBefore(endTime)) {
                throw new RuntimeException("Start time must be before end time");
            }
        } else {
            startTime = null;
            endTime = null;
        }

        // Previous effective schedule on this date
        StaffScheduleDTO previousEffective = getEffectiveStaffSchedule(staffId, targetDate);
        String previousScheduleText = formatScheduleText(previousEffective) + " (" + previousEffective.getEffectiveBadge() + ")";

        // Find existing override or create new
        Optional<StaffSchedule> existingOverrideOpt = staffScheduleRepository
                .findFirstByStaffIdAndScheduleDateAndShiftAndDeletedByAdminFalse(staffId, targetDate, "OVERRIDE");

        StaffSchedule override = existingOverrideOpt.orElseGet(StaffSchedule::new);
        override.setStaff(staff);
        override.setDentist(null);
        override.setScheduleDate(targetDate);
        override.setWeekStartDate(monday);
        override.setDayOfWeek(dow);
        override.setShift("OVERRIDE");
        override.setWorking(isWorking);
        override.setStartTime(startTime);
        override.setEndTime(endTime);
        override.setStatus(isWorking ? (dto.getStatus() != null && !dto.getStatus().isBlank() ? dto.getStatus().trim().toUpperCase() : "ACTIVE") : "OFF");
        override.setScheduleSource(MANUAL);
        override.setGeneratedAutomatically(false);
        override.setModifiedByAdmin(true);
        override.setDeletedByAdmin(false);
        override.setNotes(dto.getNotes() != null && !dto.getNotes().isBlank()
                ? dto.getNotes()
                : "Admin date-specific override for " + targetDate);

        StaffSchedule saved = staffScheduleRepository.saveAndFlush(override);

        StaffScheduleDTO savedDto = staffScheduleMapper.toDTO(saved);
        savedDto.setScheduleDate(targetDate);
        savedDto.setWeekStartDate(monday);
        savedDto.setDayOfWeek(dow);
        savedDto.setEffectiveSource("OVERRIDE");
        savedDto.setEffectiveBadge("[Admin Date Override]");
        savedDto.setIsOverride(true);
        enrichStaffScheduleDTO(savedDto, staff, null);

        String newScheduleText = formatScheduleText(savedDto) + " ([Admin Date Override])";

        String staffName = (staff.getFirstName() != null ? staff.getFirstName() : "")
                + " " + (staff.getLastName() != null ? staff.getLastName() : "");
        staffName = staffName.trim();

        String dayName = dow.name().charAt(0) + dow.name().substring(1).toLowerCase();

        StringBuilder emailBody = new StringBuilder();
        emailBody.append("Dear ").append(staffName).append(",\n\n")
                .append("A date-specific schedule override has been applied to your schedule by the clinic administrator.\n\n")
                .append("Date: ").append(targetDate).append(" (").append(dayName).append(")\n\n")
                .append("Previous Schedule:\n")
                .append(previousScheduleText).append("\n\n")
                .append("New Schedule:\n")
                .append(newScheduleText).append("\n\n")
                .append("Note: This override applies ONLY to ").append(targetDate)
                .append(". Your normal weekly schedule remains unchanged for other weeks.\n\n")
                .append("If you have any questions, please contact clinic administration.\n\n")
                .append("Best regards,\n")
                .append("DentaFlow Clinic Administration");

        String recipientEmail = getStaffEmail(staff);
        boolean emailSent = sendScheduleNotificationEmail(recipientEmail, SCHEDULE_UPDATE_SUBJECT, emailBody.toString());

        String message = emailSent
                ? "Schedule updated successfully and notification email sent to " + staffName + "."
                : "Schedule updated, but the notification email could not be sent.";

        return ScheduleOperationResult.builder()
                .success(true)
                .emailSent(emailSent)
                .message(message)
                .schedule(savedDto)
                .build();
    }

    /**
     * Delete date-specific schedule override and restore normal weekly schedule for that date.
     */
    public ScheduleOperationResult deleteDateOverride(Long staffId, LocalDate targetDate) {
        if (staffId == null) {
            throw new RuntimeException("Staff ID is required");
        }
        if (targetDate == null) {
            throw new RuntimeException("Target date is required");
        }

        Staff staff = getStaff(staffId);

        Optional<StaffSchedule> overrideOpt = staffScheduleRepository
                .findFirstByStaffIdAndScheduleDateAndShiftAndDeletedByAdminFalse(staffId, targetDate, "OVERRIDE");

        if (overrideOpt.isEmpty()) {
            throw new RuntimeException("No active schedule override found for date: " + targetDate);
        }

        StaffSchedule override = overrideOpt.get();
        String previousScheduleText = formatScheduleText(override) + " ([Admin Date Override])";

        override.setDeletedByAdmin(true);
        override.setStatus("DELETED");
        override.setWorking(false);
        staffScheduleRepository.saveAndFlush(override);

        // Fetch fallback schedule
        StaffScheduleDTO fallback = getEffectiveStaffSchedule(staffId, targetDate);
        String fallbackScheduleText = formatScheduleText(fallback) + " (" + fallback.getEffectiveBadge() + ")";

        String staffName = (staff.getFirstName() != null ? staff.getFirstName() : "")
                + " " + (staff.getLastName() != null ? staff.getLastName() : "");
        staffName = staffName.trim();

        DayOfWeek dow = targetDate.getDayOfWeek();
        String dayName = dow.name().charAt(0) + dow.name().substring(1).toLowerCase();

        StringBuilder emailBody = new StringBuilder();
        emailBody.append("Dear ").append(staffName).append(",\n\n")
                .append("A date-specific schedule override on ").append(targetDate).append(" (").append(dayName)
                .append(") has been removed by the clinic administrator.\n\n")
                .append("Date: ").append(targetDate).append(" (").append(dayName).append(")\n\n")
                .append("Previous Schedule:\n")
                .append(previousScheduleText).append("\n\n")
                .append("New Schedule:\n")
                .append("Your normal weekly schedule has been restored for this date: ")
                .append(fallbackScheduleText).append("\n\n")
                .append("If you have any questions, please contact clinic administration.\n\n")
                .append("Best regards,\n")
                .append("DentaFlow Clinic Administration");

        String recipientEmail = getStaffEmail(staff);
        boolean emailSent = sendScheduleNotificationEmail(recipientEmail, SCHEDULE_UPDATE_SUBJECT, emailBody.toString());

        String message = emailSent
                ? "Schedule updated successfully and notification email sent to " + staffName + "."
                : "Schedule updated, but the notification email could not be sent.";

        return ScheduleOperationResult.builder()
                .success(true)
                .emailSent(emailSent)
                .message(message)
                .fallbackSchedule(fallback)
                .build();
    }

    /**
     * Synchronize weekly schedule template for recurring pattern.
     */
    private void syncStaffWeeklyTemplate(Staff staff, List<StaffSchedule> incoming) {
        if (staff == null || incoming == null) return;
        List<StaffSchedule> existingTemplate = staffScheduleRepository
                .findByStaffIdAndWeekStartDate(staff.getId(), TEMPLATE_WEEK);
        Map<DayOfWeek, StaffSchedule> templateByDay = existingTemplate.stream()
                .collect(Collectors.toMap(StaffSchedule::getDayOfWeek, s -> s, (s1, s2) -> s1));

        List<StaffSchedule> toSave = new ArrayList<>();
        for (StaffSchedule item : incoming) {
            if (item == null || item.getDayOfWeek() == null || "OVERRIDE".equalsIgnoreCase(item.getShift())) continue;
            DayOfWeek dow = item.getDayOfWeek();
            StaffSchedule target = templateByDay.get(dow);
            if (target == null) {
                target = new StaffSchedule();
                target.setStaff(staff);
                target.setWeekStartDate(TEMPLATE_WEEK);
                target.setDayOfWeek(dow);
            }
            target.setScheduleSource(MANUAL);
            target.setShift(item.getShift() != null ? normalizeShift(item.getShift()) : MORNING_SHIFT);
            target.setWorking(item.getWorking());
            target.setStartTime(item.getStartTime());
            target.setEndTime(item.getEndTime());
            target.setStatus(Boolean.TRUE.equals(item.getWorking()) ? "ACTIVE" : "OFF");
            target.setModifiedByAdmin(true);
            target.setDeletedByAdmin(false);
            toSave.add(target);
        }
        if (!toSave.isEmpty()) {
            staffScheduleRepository.saveAll(toSave);
        }
    }

    private String buildWeeklySummaryText(List<StaffSchedule> schedules) {
        if (schedules == null || schedules.isEmpty()) {
            return "No schedule configured";
        }
        List<StaffSchedule> sorted = new ArrayList<>(schedules);
        sorted.sort(Comparator.comparing(s -> s.getDayOfWeek() != null ? s.getDayOfWeek().getValue() : 0));
        StringBuilder sb = new StringBuilder();
        for (StaffSchedule s : sorted) {
            if ("OVERRIDE".equalsIgnoreCase(s.getShift())) continue;
            DayOfWeek dow = s.getDayOfWeek();
            String dayName = dow != null ? dow.name().charAt(0) + dow.name().substring(1).toLowerCase() : "Day";
            sb.append("• ").append(dayName).append(": ");
            if (Boolean.TRUE.equals(s.getWorking()) && s.getStartTime() != null && s.getEndTime() != null) {
                sb.append(s.getStartTime()).append(" - ").append(s.getEndTime());
            } else {
                sb.append("OFF");
            }
            sb.append("\n");
        }
        return sb.toString().trim();
    }

    private String formatScheduleText(StaffScheduleDTO dto) {
        if (dto == null) {
            return "No scheduled hours";
        }
        if (!Boolean.TRUE.equals(dto.getWorking()) || "OFF".equalsIgnoreCase(dto.getStatus())) {
            return "OFF";
        }
        if (dto.getStartTime() != null && dto.getEndTime() != null) {
            return dto.getStartTime() + " - " + dto.getEndTime();
        }
        return "Active shift";
    }

    private String formatScheduleText(StaffSchedule s) {
        if (s == null) {
            return "No scheduled hours";
        }
        if (!Boolean.TRUE.equals(s.getWorking()) || "OFF".equalsIgnoreCase(s.getStatus())) {
            return "OFF";
        }
        if (s.getStartTime() != null && s.getEndTime() != null) {
            return s.getStartTime() + " - " + s.getEndTime();
        }
        return "Active shift";
    }

    private String getStaffEmail(Staff staff) {
        if (staff == null) return null;
        if (staff.getEmail() != null && !staff.getEmail().isBlank()) {
            return staff.getEmail().trim();
        }
        if (staff.getUser() != null && staff.getUser().getEmail() != null && !staff.getUser().getEmail().isBlank()) {
            return staff.getUser().getEmail().trim();
        }
        return null;
    }

    private boolean sendScheduleNotificationEmail(String recipientEmail, String subject, String body) {
        if (emailService == null || recipientEmail == null || recipientEmail.isBlank()) {
            return false;
        }
        try {
            emailService.sendEmail(recipientEmail, subject, body);
            return true;
        } catch (Exception ex) {
            System.err.println("WARN: Failed to deliver schedule notification email to " + recipientEmail + ": " + ex.getMessage());
            return false;
        }
    }

    private void enrichStaffScheduleDTO(StaffScheduleDTO dto, Staff staff, Dentist dentist) {
        if (dto == null) return;
        if (staff != null) {
            String fName = staff.getFirstName() != null ? staff.getFirstName() : "";
            String lName = staff.getLastName() != null ? staff.getLastName() : "";
            dto.setName((fName + " " + lName).trim());
            dto.setRole(staff.getRole() != null ? staff.getRole().toUpperCase() : "STAFF");
            dto.setStaffId(staff.getId());
        } else if (dentist != null) {
            String fName = dentist.getFirstName() != null ? dentist.getFirstName() : "";
            String lName = dentist.getLastName() != null ? dentist.getLastName() : "";
            String full = ("Dr. " + fName + " " + lName).trim();
            dto.setName(full);
            dto.setRole("DENTIST");
            dto.setSpecialization(dentist.getSpecialization());
            dto.setDentistId(dentist.getId());
        }
    }

    // =========================================================
    // BUILD SCHEDULE EMAIL BODY
    // =========================================================

    public String buildScheduleEmailBody(
            String recipientName,
            LocalDate monday,
            List<StaffSchedule> schedules) {

        LocalDate sunday = monday.plusDays(6);
        StringBuilder sb = new StringBuilder();
        sb.append("Dear ").append(recipientName).append(",\n\n");
        sb.append("Here is your official weekly schedule for (")
                .append(monday).append(" to ").append(sunday).append("):\n\n");

        List<StaffSchedule> sorted = new ArrayList<>(schedules);
        sorted.sort(Comparator.comparing(s -> s.getDayOfWeek().getValue()));

        for (StaffSchedule s : sorted) {
            String dayName = s.getDayOfWeek().name();
            dayName = dayName.substring(0, 1).toUpperCase() + dayName.substring(1).toLowerCase();
            sb.append("• ").append(dayName).append(": ");
            if (Boolean.TRUE.equals(s.getWorking()) && s.getStartTime() != null && s.getEndTime() != null) {
                sb.append(s.getStartTime()).append(" - ").append(s.getEndTime())
                        .append(" (").append(s.getShift() != null ? s.getShift() : "ACTIVE").append(")");
            } else {
                sb.append("OFF");
            }
            if (s.getNotes() != null && !s.getNotes().isBlank()) {
                sb.append(" [").append(s.getNotes().trim()).append("]");
            }
            sb.append("\n");
        }

        sb.append("\nIf you have any questions or require scheduling adjustments, please contact clinic administration.\n\n");
        sb.append("Best regards,\n");
        sb.append("DentaFlow Clinic Administration");
        return sb.toString();
    }

    // =========================================================
    // SEND WEEKLY SCHEDULE EMAIL FOR DENTIST
    // =========================================================

    public boolean sendWeeklyScheduleEmailForDentist(
            Long dentistId,
            LocalDate weekStartDate,
            boolean force) {

        Dentist dentist = getDentist(dentistId);
        if (!"ACTIVE".equalsIgnoreCase(dentist.getStatus())) {
            return false;
        }

        String email = dentist.getEmail();
        if (email == null || email.isBlank()) {
            if (dentist.getUser() != null) {
                email = dentist.getUser().getEmail();
            }
        }
        if (email == null || email.isBlank()) {
            return false;
        }

        LocalDate monday = getMonday(weekStartDate);
        LocalDate sunday = monday.plusDays(6);
        String refType = "WEEKLY_SCHEDULE_" + monday;

        if (!force && notificationRepository != null) {
            List<Notification> existing = notificationRepository
                    .findByReferenceTypeAndReferenceIdOrderByCreatedAtDesc(refType, dentist.getId());
            if (!existing.isEmpty() && existing.stream().anyMatch(n -> Boolean.TRUE.equals(n.getEmailSent()))) {
                return false; // Already sent for this week
            }
        }

        List<StaffSchedule> schedules = getOrCreateWeeklyDentistSchedule(dentistId, monday);
        String doctorName = "Dr. " + (dentist.getFirstName() != null ? dentist.getFirstName() : "")
                + " " + (dentist.getLastName() != null ? dentist.getLastName() : "");
        String subject = "DentaFlow - Your Weekly Schedule (" + monday + " to " + sunday + ")";
        String body = buildScheduleEmailBody(doctorName.trim(), monday, schedules);

        boolean emailSent = false;
        if (emailService != null) {
            try {
                emailService.sendEmail(email.trim(), subject, body);
                emailSent = true;
            } catch (Exception e) {
                System.err.println("Failed to send schedule email to doctor " + email + ": " + e.getMessage());
            }
        }

        if (notificationRepository != null) {
            try {
                Notification notif = new Notification();
                notif.setUser(dentist.getUser());
                notif.setTitle("Weekly Schedule (" + monday + " to " + sunday + ")");
                notif.setMessage(body);
                notif.setType("SCHEDULE");
                notif.setStatus("UNREAD");
                notif.setEmailSent(emailSent);
                notif.setReferenceType(refType);
                notif.setReferenceId(dentist.getId());
                notif.setNotificationCode("SCH-D" + dentist.getId() + "-" + UUID.randomUUID().toString().substring(0, 8));
                notificationRepository.save(notif);
            } catch (Exception ne) {
                System.err.println("Failed to save schedule notification: " + ne.getMessage());
            }
        }

        return emailSent;
    }

    // =========================================================
    // SEND WEEKLY SCHEDULE EMAIL FOR STAFF
    // =========================================================

    public boolean sendWeeklyScheduleEmailForStaff(
            Long staffId,
            LocalDate weekStartDate,
            boolean force) {

        Staff staff = getStaff(staffId);
        if (!"ACTIVE".equalsIgnoreCase(staff.getStatus())) {
            return false;
        }

        String email = staff.getEmail();
        if (email == null || email.isBlank()) {
            if (staff.getUser() != null) {
                email = staff.getUser().getEmail();
            }
        }
        if (email == null || email.isBlank()) {
            return false;
        }

        LocalDate monday = getMonday(weekStartDate);
        LocalDate sunday = monday.plusDays(6);
        String refType = "WEEKLY_SCHEDULE_" + monday;

        if (!force && notificationRepository != null) {
            List<Notification> existing = notificationRepository
                    .findByReferenceTypeAndReferenceIdOrderByCreatedAtDesc(refType, staff.getId());
            if (!existing.isEmpty() && existing.stream().anyMatch(n -> Boolean.TRUE.equals(n.getEmailSent()))) {
                return false; // Already sent for this week
            }
        }

        List<StaffSchedule> schedules = getOrCreateWeeklyStaffSchedule(staffId, monday);
        String staffName = (staff.getFirstName() != null ? staff.getFirstName() : "")
                + " " + (staff.getLastName() != null ? staff.getLastName() : "");
        String subject = "DentaFlow - Your Weekly Schedule (" + monday + " to " + sunday + ")";
        String body = buildScheduleEmailBody(staffName.trim(), monday, schedules);

        boolean emailSent = false;
        if (emailService != null) {
            try {
                emailService.sendEmail(email.trim(), subject, body);
                emailSent = true;
            } catch (Exception e) {
                System.err.println("Failed to send schedule email to staff " + email + ": " + e.getMessage());
            }
        }

        if (notificationRepository != null) {
            try {
                Notification notif = new Notification();
                notif.setUser(staff.getUser());
                notif.setTitle("Weekly Schedule (" + monday + " to " + sunday + ")");
                notif.setMessage(body);
                notif.setType("SCHEDULE");
                notif.setStatus("UNREAD");
                notif.setEmailSent(emailSent);
                notif.setReferenceType(refType);
                notif.setReferenceId(staff.getId());
                notif.setNotificationCode("SCH-S" + staff.getId() + "-" + UUID.randomUUID().toString().substring(0, 8));
                notificationRepository.save(notif);
            } catch (Exception ne) {
                System.err.println("Failed to save schedule notification: " + ne.getMessage());
            }
        }

        return emailSent;
    }

    // =========================================================
    // SEND WEEKLY SCHEDULES TO EVERYONE
    // =========================================================

    public Map<String, Object> sendWeeklySchedulesToEveryone(
            LocalDate weekStartDate,
            boolean force) {

        LocalDate monday = getMonday(weekStartDate);
        List<Dentist> dentists = getActiveDentists();
        List<Staff> staffMembers = getActiveStaff();

        int doctorsSent = 0;
        int doctorsSkippedOrFailed = 0;
        for (Dentist d : dentists) {
            try {
                boolean sent = sendWeeklyScheduleEmailForDentist(d.getId(), monday, force);
                if (sent) doctorsSent++;
                else doctorsSkippedOrFailed++;
            } catch (Exception e) {
                doctorsSkippedOrFailed++;
            }
        }

        int staffSent = 0;
        int staffSkippedOrFailed = 0;
        for (Staff s : staffMembers) {
            try {
                boolean sent = sendWeeklyScheduleEmailForStaff(s.getId(), monday, force);
                if (sent) staffSent++;
                else staffSkippedOrFailed++;
            } catch (Exception e) {
                staffSkippedOrFailed++;
            }
        }

        return Map.of(
                "weekStartDate", monday.toString(),
                "doctorsSent", doctorsSent,
                "doctorsSkippedOrFailed", doctorsSkippedOrFailed,
                "staffSent", staffSent,
                "staffSkippedOrFailed", staffSkippedOrFailed
        );
    }

    // =========================================================
    // GET SCHEDULE BY ID
    // =========================================================

    @Transactional(readOnly = true)
    public StaffSchedule getScheduleById(
            Long id) {

        return staffScheduleRepository
                .findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Schedule not found with id: "
                                        + id
                        )
                );
    }

    // =========================================================
    // GET ALL SCHEDULES
    // =========================================================

    @Transactional(readOnly = true)
    public List<StaffSchedule>
    getAllSchedules() {

        return staffScheduleRepository
                .findByDeletedByAdminFalseOrderByScheduleDateAscStartTimeAsc();
    }

    // =========================================================
    // GET STAFF SCHEDULES
    // =========================================================

    @Transactional(readOnly = true)
    public List<StaffSchedule>
    getStaffSchedules(
            Long staffId) {

        getStaff(staffId);

        return staffScheduleRepository
                .findByStaffIdAndDeletedByAdminFalse(staffId);
    }

    // =========================================================
    // GET DENTIST SCHEDULES
    // =========================================================

    @Transactional(readOnly = true)
    public List<StaffSchedule>
    getDentistSchedules(
            Long dentistId) {

        getDentist(dentistId);

        return staffScheduleRepository
                .findByDentistIdAndDeletedByAdminFalse(dentistId);
    }

    // =========================================================
    // GET STAFF WEEKLY SCHEDULE
    // =========================================================

    @Transactional(readOnly = true)
    public List<StaffSchedule>
    getWeeklySchedule(
            Long staffId,
            LocalDate weekStartDate) {

        getStaff(staffId);

        LocalDate monday =
                getMonday(weekStartDate);

        return staffScheduleRepository
                .findByStaffIdAndWeekStartDate(
                        staffId,
                        monday
                )
                .stream()
                .filter(s -> !Boolean.TRUE.equals(s.getDeletedByAdmin()))
                .collect(Collectors.toList());
    }

    // =========================================================
    // GET DENTIST WEEKLY SCHEDULE
    // =========================================================

    @Transactional(readOnly = true)
    public List<StaffSchedule>
    getDentistWeeklySchedule(
            Long dentistId,
            LocalDate weekStartDate) {

        getDentist(dentistId);

        LocalDate monday =
                getMonday(weekStartDate);

        return staffScheduleRepository
                .findByDentistIdAndWeekStartDate(
                        dentistId,
                        monday
                )
                .stream()
                .filter(s -> !Boolean.TRUE.equals(s.getDeletedByAdmin()))
                .collect(Collectors.toList());
    }

    // =========================================================
    // ADMIN - AUTOMATIC WEEKLY SCHEDULE GENERATION
    // =========================================================

    public List<StaffSchedule> autoGenerateSchedulesForWeek(
            LocalDate targetDate,
            boolean force) {

        LocalDate monday = getMonday(targetDate);
        List<StaffSchedule> toSave = new ArrayList<>();

        // 1. Generate for Dentists (from availability rules)
        List<Dentist> dentists = getActiveDentists();
        for (Dentist dentist : dentists) {
            List<StaffSchedule> existing = staffScheduleRepository
                    .findByDentistIdAndWeekStartDate(dentist.getId(), monday);
            Map<DayOfWeek, StaffSchedule> byDay = existing.stream()
                    .collect(Collectors.toMap(StaffSchedule::getDayOfWeek, s -> s, (s1, s2) -> s1));

            List<StaffSchedule> candidateSchedules =
                    generateDentistScheduleFromAvailability(dentist, monday);

            for (StaffSchedule candidate : candidateSchedules) {
                StaffSchedule existingDay = byDay.get(candidate.getDayOfWeek());
                if (existingDay != null) {
                    // Admin overrides: Never overwrite Admin-modified or Admin-deleted schedules!
                    if (Boolean.TRUE.equals(existingDay.getModifiedByAdmin()) ||
                            Boolean.TRUE.equals(existingDay.getDeletedByAdmin())) {
                        continue;
                    }
                    if (force) {
                        existingDay.setStartTime(candidate.getStartTime());
                        existingDay.setEndTime(candidate.getEndTime());
                        existingDay.setWorking(candidate.getWorking());
                        existingDay.setShift(candidate.getShift());
                        existingDay.setStatus(candidate.getStatus());
                        existingDay.setNotes(candidate.getNotes());
                        existingDay.setScheduleDate(candidate.getScheduleDate());
                        toSave.add(existingDay);
                    }
                } else {
                    toSave.add(candidate);
                }
            }
        }

        // 2. Generate for Staff (from clinic working hours & rotating shifts)
        List<Staff> staffMembers = getActiveStaff();
        for (int i = 0; i < staffMembers.size(); i++) {
            Staff staff = staffMembers.get(i);
            List<StaffSchedule> existing = staffScheduleRepository
                    .findByStaffIdAndWeekStartDate(staff.getId(), monday);
            Map<DayOfWeek, StaffSchedule> byDay = existing.stream()
                    .collect(Collectors.toMap(StaffSchedule::getDayOfWeek, s -> s, (s1, s2) -> s1));

            List<StaffSchedule> candidateSchedules =
                    generateScheduleForStaffOrDentist(staff, null, i, monday);

            for (StaffSchedule candidate : candidateSchedules) {
                LocalDate candidateDate = candidate.getScheduleDate();
                if (candidateDate == null && candidate.getDayOfWeek() != null) {
                    candidateDate = monday.plusDays(candidate.getDayOfWeek().getValue() - 1);
                }

                // Admin date-specific overrides must NEVER be overwritten by automatic generation
                boolean hasDateOverride = staffScheduleRepository
                        .findFirstByStaffIdAndScheduleDateAndShiftAndDeletedByAdminFalse(staff.getId(), candidateDate, "OVERRIDE")
                        .isPresent();
                if (hasDateOverride) {
                    continue;
                }

                StaffSchedule existingDay = byDay.get(candidate.getDayOfWeek());
                if (existingDay != null) {
                    // Admin overrides: Never overwrite Admin-modified, Admin-deleted, or OVERRIDE schedules!
                    if (Boolean.TRUE.equals(existingDay.getModifiedByAdmin()) ||
                            Boolean.TRUE.equals(existingDay.getDeletedByAdmin()) ||
                            "OVERRIDE".equalsIgnoreCase(existingDay.getShift())) {
                        continue;
                    }
                    if (force) {
                        existingDay.setStartTime(candidate.getStartTime());
                        existingDay.setEndTime(candidate.getEndTime());
                        existingDay.setWorking(candidate.getWorking());
                        existingDay.setShift(candidate.getShift());
                        existingDay.setStatus(candidate.getStatus());
                        existingDay.setNotes(candidate.getNotes());
                        existingDay.setScheduleDate(candidate.getScheduleDate());
                        toSave.add(existingDay);
                    }
                } else {
                    toSave.add(candidate);
                }
            }
        }

        if (!toSave.isEmpty()) {
            return staffScheduleRepository.saveAll(toSave);
        }
        return List.of();
    }

    // =========================================================
    // ADMIN - GET FILTERED SCHEDULES
    // =========================================================

    public List<StaffSchedule> getAdminSchedules(
            LocalDate date,
            LocalDate startDate,
            LocalDate endDate,
            Long dentistId,
            Long staffId,
            String role,
            String status,
            String search) {

        // Auto-seed current week if table has no schedules yet
        LocalDate today = LocalDate.now();
        LocalDate monday = getMonday(date != null ? date : (startDate != null ? startDate : today));
        List<StaffSchedule> weekCheck = staffScheduleRepository.findByWeekStartDate(monday);
        if (weekCheck.isEmpty()) {
            autoGenerateSchedulesForWeek(monday, false);
        }

        List<StaffSchedule> all = staffScheduleRepository
                .findByDeletedByAdminFalseOrderByScheduleDateAscStartTimeAsc();

        return all.stream()
                .filter(s -> {
                    LocalDate sDate = s.getScheduleDate() != null
                            ? s.getScheduleDate()
                            : (s.getWeekStartDate() != null && s.getDayOfWeek() != null
                                    ? s.getWeekStartDate().plusDays(s.getDayOfWeek().getValue() - 1)
                                    : null);

                    if (date != null) {
                        if (sDate == null || !sDate.equals(date)) return false;
                    }
                    if (startDate != null && endDate != null) {
                        if (sDate == null || sDate.isBefore(startDate) || sDate.isAfter(endDate)) return false;
                    } else if (startDate != null) {
                        if (sDate == null || sDate.isBefore(startDate)) return false;
                    } else if (endDate != null) {
                        if (sDate == null || sDate.isAfter(endDate)) return false;
                    }

                    if (dentistId != null) {
                        if (s.getDentist() == null || !dentistId.equals(s.getDentist().getId())) return false;
                    }
                    if (staffId != null) {
                        if (s.getStaff() == null || !staffId.equals(s.getStaff().getId())) return false;
                    }

                    if (role != null && !role.isBlank() && !"ALL".equalsIgnoreCase(role)) {
                        String r = role.trim().toUpperCase();
                        if ("DENTIST".equals(r) || "DOCTOR".equals(r)) {
                            if (s.getDentist() == null) return false;
                        } else {
                            if (s.getStaff() == null) return false;
                            if (!"STAFF".equals(r)) {
                                String staffRole = s.getStaff().getRole() != null ? s.getStaff().getRole().toUpperCase() : "";
                                if (!staffRole.contains(r)) return false;
                            }
                        }
                    }

                    if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
                        String sStatus = s.getStatus() != null ? s.getStatus() : (Boolean.TRUE.equals(s.getWorking()) ? "ACTIVE" : "OFF");
                        if (!sStatus.equalsIgnoreCase(status.trim())) return false;
                    }

                    if (search != null && !search.isBlank()) {
                        String q = search.trim().toLowerCase();
                        String dentistName = s.getDentist() != null
                                ? ((s.getDentist().getFirstName() != null ? s.getDentist().getFirstName() : "") + " " +
                                   (s.getDentist().getLastName() != null ? s.getDentist().getLastName() : "")).trim()
                                : "";
                        String staffName = s.getStaff() != null
                                ? ((s.getStaff().getFirstName() != null ? s.getStaff().getFirstName() : "") + " " +
                                   (s.getStaff().getLastName() != null ? s.getStaff().getLastName() : "")).trim()
                                : "";
                        String notes = s.getNotes() != null ? s.getNotes() : "";
                        String shift = s.getShift() != null ? s.getShift() : "";
                        String spec = s.getDentist() != null ? s.getDentist().getSpecialization() : "";
                        if (!(dentistName.toLowerCase().contains(q) ||
                                staffName.toLowerCase().contains(q) ||
                                notes.toLowerCase().contains(q) ||
                                shift.toLowerCase().contains(q) ||
                                (spec != null && spec.toLowerCase().contains(q)))) {
                            return false;
                        }
                    }

                    return true;
                })
                .sorted(Comparator.comparing((StaffSchedule s) -> {
                    LocalDate d = s.getScheduleDate();
                    if (d == null && s.getWeekStartDate() != null && s.getDayOfWeek() != null) {
                        d = s.getWeekStartDate().plusDays(s.getDayOfWeek().getValue() - 1);
                    }
                    return d != null ? d : LocalDate.MIN;
                }).thenComparing(s -> s.getStartTime() != null ? s.getStartTime() : LocalTime.MIN))
                .collect(Collectors.toList());
    }

    // =========================================================
    // ADMIN - CREATE SCHEDULE MANUALLY
    // =========================================================

    public StaffSchedule createAdminSchedule(StaffScheduleDTO dto) {
        if (dto == null) {
            throw new RuntimeException("Schedule data is required");
        }

        if (dto.getDentistId() == null && dto.getStaffId() == null) {
            throw new RuntimeException("Either Dentist or Staff assignment is required");
        }

        LocalDate scheduleDate = dto.getScheduleDate();
        if (scheduleDate == null && dto.getWeekStartDate() != null && dto.getDayOfWeek() != null) {
            scheduleDate = dto.getWeekStartDate().plusDays(dto.getDayOfWeek().getValue() - 1);
        }
        if (scheduleDate == null) {
            throw new RuntimeException("Valid schedule date is required");
        }

        LocalDate monday = getMonday(scheduleDate);
        DayOfWeek dow = scheduleDate.getDayOfWeek();
        boolean isWorking = dto.getWorking() == null || Boolean.TRUE.equals(dto.getWorking());

        LocalTime startTime = dto.getStartTime();
        LocalTime endTime = dto.getEndTime();

        if (isWorking) {
            if (startTime == null || endTime == null) {
                throw new RuntimeException("Start time and end time are required for working shifts");
            }
            if (!startTime.isBefore(endTime)) {
                throw new RuntimeException("Start time (" + startTime + ") must be before end time (" + endTime + ")");
            }

            // Overlap check
            if (dto.getDentistId() != null) {
                List<StaffSchedule> overlaps = staffScheduleRepository.findOverlappingDentistSchedules(
                        dto.getDentistId(), scheduleDate, monday, dow, startTime, endTime, null
                );
                if (!overlaps.isEmpty()) {
                    StaffSchedule conf = overlaps.get(0);
                    throw new RuntimeException("Schedule conflicts with existing shift (" +
                            conf.getStartTime() + " - " + conf.getEndTime() + ") for this dentist on " + scheduleDate);
                }
            } else {
                List<StaffSchedule> overlaps = staffScheduleRepository.findOverlappingStaffSchedules(
                        dto.getStaffId(), scheduleDate, monday, dow, startTime, endTime, null
                );
                if (!overlaps.isEmpty()) {
                    StaffSchedule conf = overlaps.get(0);
                    throw new RuntimeException("Schedule conflicts with existing shift (" +
                            conf.getStartTime() + " - " + conf.getEndTime() + ") for this staff member on " + scheduleDate);
                }
            }
        }

        String shift = dto.getShift() != null && !dto.getShift().isBlank()
                ? dto.getShift().trim().toUpperCase()
                : (startTime != null && startTime.isAfter(LocalTime.of(13, 0)) ? EVENING_SHIFT : MORNING_SHIFT);

        // Revive soft-deleted or reuse inactive slot if duplicate key constraint applies
        if (dto.getDentistId() != null) {
            Dentist dentist = getDentist(dto.getDentistId());
            Optional<StaffSchedule> existingSlot = staffScheduleRepository
                    .findFirstByDentistIdAndWeekStartDateAndDayOfWeekAndShift(
                            dentist.getId(), monday, dow, shift
                    );

            if (existingSlot.isPresent()) {
                StaffSchedule slot = existingSlot.get();
                if (Boolean.TRUE.equals(slot.getDeletedByAdmin())) {
                    slot.setDeletedByAdmin(false);
                    slot.setModifiedByAdmin(true);
                    slot.setGeneratedAutomatically(false);
                    slot.setScheduleSource(MANUAL);
                    slot.setScheduleDate(scheduleDate);
                    slot.setWorking(isWorking);
                    slot.setStartTime(isWorking ? startTime : null);
                    slot.setEndTime(isWorking ? endTime : null);
                    slot.setStatus(dto.getStatus() != null ? dto.getStatus() : (isWorking ? "ACTIVE" : "OFF"));
                    slot.setNotes(dto.getNotes());
                    return staffScheduleRepository.save(slot);
                } else if (!isWorking || !Boolean.TRUE.equals(slot.getWorking())) {
                    slot.setModifiedByAdmin(true);
                    slot.setGeneratedAutomatically(false);
                    slot.setScheduleSource(MANUAL);
                    slot.setScheduleDate(scheduleDate);
                    slot.setWorking(isWorking);
                    slot.setStartTime(isWorking ? startTime : null);
                    slot.setEndTime(isWorking ? endTime : null);
                    slot.setStatus(dto.getStatus() != null ? dto.getStatus() : (isWorking ? "ACTIVE" : "OFF"));
                    slot.setNotes(dto.getNotes());
                    return staffScheduleRepository.save(slot);
                } else {
                    shift = shift + "_EXTRA";
                }
            }

            StaffSchedule schedule = new StaffSchedule();
            schedule.setDentist(dentist);
            schedule.setStaff(null);
            schedule.setScheduleDate(scheduleDate);
            schedule.setWeekStartDate(monday);
            schedule.setDayOfWeek(dow);
            schedule.setShift(shift);
            schedule.setWorking(isWorking);
            schedule.setStartTime(isWorking ? startTime : null);
            schedule.setEndTime(isWorking ? endTime : null);
            schedule.setStatus(dto.getStatus() != null ? dto.getStatus() : (isWorking ? "ACTIVE" : "OFF"));
            schedule.setScheduleSource(MANUAL);
            schedule.setGeneratedAutomatically(false);
            schedule.setModifiedByAdmin(true);
            schedule.setDeletedByAdmin(false);
            schedule.setNotes(dto.getNotes());
            return staffScheduleRepository.save(schedule);

        } else {
            Staff staff = getStaff(dto.getStaffId());
            Optional<StaffSchedule> existingSlot = staffScheduleRepository
                    .findFirstByStaffIdAndWeekStartDateAndDayOfWeekAndShift(
                            staff.getId(), monday, dow, shift
                    );

            if (existingSlot.isPresent()) {
                StaffSchedule slot = existingSlot.get();
                if (Boolean.TRUE.equals(slot.getDeletedByAdmin())) {
                    slot.setDeletedByAdmin(false);
                    slot.setModifiedByAdmin(true);
                    slot.setGeneratedAutomatically(false);
                    slot.setScheduleSource(MANUAL);
                    slot.setScheduleDate(scheduleDate);
                    slot.setWorking(isWorking);
                    slot.setStartTime(isWorking ? startTime : null);
                    slot.setEndTime(isWorking ? endTime : null);
                    slot.setStatus(dto.getStatus() != null ? dto.getStatus() : (isWorking ? "ACTIVE" : "OFF"));
                    slot.setNotes(dto.getNotes());
                    return staffScheduleRepository.save(slot);
                } else if (!isWorking || !Boolean.TRUE.equals(slot.getWorking())) {
                    slot.setModifiedByAdmin(true);
                    slot.setGeneratedAutomatically(false);
                    slot.setScheduleSource(MANUAL);
                    slot.setScheduleDate(scheduleDate);
                    slot.setWorking(isWorking);
                    slot.setStartTime(isWorking ? startTime : null);
                    slot.setEndTime(isWorking ? endTime : null);
                    slot.setStatus(dto.getStatus() != null ? dto.getStatus() : (isWorking ? "ACTIVE" : "OFF"));
                    slot.setNotes(dto.getNotes());
                    return staffScheduleRepository.save(slot);
                } else {
                    shift = shift + "_EXTRA";
                }
            }

            StaffSchedule schedule = new StaffSchedule();
            schedule.setStaff(staff);
            schedule.setDentist(null);
            schedule.setScheduleDate(scheduleDate);
            schedule.setWeekStartDate(monday);
            schedule.setDayOfWeek(dow);
            schedule.setShift(shift);
            schedule.setWorking(isWorking);
            schedule.setStartTime(isWorking ? startTime : null);
            schedule.setEndTime(isWorking ? endTime : null);
            schedule.setStatus(dto.getStatus() != null ? dto.getStatus() : (isWorking ? "ACTIVE" : "OFF"));
            schedule.setScheduleSource(MANUAL);
            schedule.setGeneratedAutomatically(false);
            schedule.setModifiedByAdmin(true);
            schedule.setDeletedByAdmin(false);
            schedule.setNotes(dto.getNotes());
            return staffScheduleRepository.save(schedule);
        }
    }

    // =========================================================
    // ADMIN - UPDATE SCHEDULE
    // =========================================================

    public StaffSchedule updateAdminSchedule(Long id, StaffScheduleDTO dto) {
        if (dto == null) {
            throw new RuntimeException("Schedule data is required");
        }

        StaffSchedule existing = getScheduleById(id);

        LocalDate targetDate = dto.getScheduleDate();
        if (targetDate == null && dto.getWeekStartDate() != null && dto.getDayOfWeek() != null) {
            targetDate = dto.getWeekStartDate().plusDays(dto.getDayOfWeek().getValue() - 1);
        }
        if (targetDate == null) {
            targetDate = existing.getScheduleDate();
            if (targetDate == null && existing.getWeekStartDate() != null && existing.getDayOfWeek() != null) {
                targetDate = existing.getWeekStartDate().plusDays(existing.getDayOfWeek().getValue() - 1);
            }
        }

        LocalDate monday = getMonday(targetDate);
        DayOfWeek dow = targetDate != null ? targetDate.getDayOfWeek() : existing.getDayOfWeek();

        boolean isWorking = dto.getWorking() != null ? dto.getWorking() : Boolean.TRUE.equals(existing.getWorking());
        LocalTime startTime = dto.getStartTime() != null ? dto.getStartTime() : existing.getStartTime();
        LocalTime endTime = dto.getEndTime() != null ? dto.getEndTime() : existing.getEndTime();

        if (isWorking) {
            if (startTime == null || endTime == null) {
                throw new RuntimeException("Start time and end time are required for active shifts");
            }
            if (!startTime.isBefore(endTime)) {
                throw new RuntimeException("Start time (" + startTime + ") must be before end time (" + endTime + ")");
            }

            // Overlap check excluding self
            if (existing.getDentist() != null) {
                List<StaffSchedule> overlaps = staffScheduleRepository.findOverlappingDentistSchedules(
                        existing.getDentist().getId(), targetDate, monday, dow, startTime, endTime, id
                );
                if (!overlaps.isEmpty()) {
                    StaffSchedule conf = overlaps.get(0);
                    throw new RuntimeException("Schedule conflicts with existing shift (" +
                            conf.getStartTime() + " - " + conf.getEndTime() + ") on " + targetDate);
                }
            } else if (existing.getStaff() != null) {
                List<StaffSchedule> overlaps = staffScheduleRepository.findOverlappingStaffSchedules(
                        existing.getStaff().getId(), targetDate, monday, dow, startTime, endTime, id
                );
                if (!overlaps.isEmpty()) {
                    StaffSchedule conf = overlaps.get(0);
                    throw new RuntimeException("Schedule conflicts with existing shift (" +
                            conf.getStartTime() + " - " + conf.getEndTime() + ") on " + targetDate);
                }
            }

            existing.setStartTime(startTime);
            existing.setEndTime(endTime);
        } else {
            existing.setStartTime(null);
            existing.setEndTime(null);
        }

        existing.setScheduleDate(targetDate);
        existing.setWeekStartDate(monday);
        existing.setDayOfWeek(dow);
        existing.setWorking(isWorking);

        if (dto.getShift() != null && !dto.getShift().isBlank()) {
            existing.setShift(dto.getShift().trim().toUpperCase());
        }
        if (dto.getStatus() != null && !dto.getStatus().isBlank()) {
            existing.setStatus(dto.getStatus().trim().toUpperCase());
        } else {
            existing.setStatus(isWorking ? "ACTIVE" : "OFF");
        }
        if (dto.getNotes() != null) {
            existing.setNotes(dto.getNotes());
        }

        existing.setScheduleSource(MANUAL);
        existing.setModifiedByAdmin(true);

        return staffScheduleRepository.save(existing);
    }

    // =========================================================
    // ADMIN - DELETE SCHEDULE (SOFT DELETE)
    // =========================================================

    public void deleteAdminSchedule(Long id) {
        StaffSchedule existing = getScheduleById(id);
        existing.setDeletedByAdmin(true);
        existing.setStatus("DELETED");
        existing.setWorking(false);
        existing.setModifiedByAdmin(true);
        staffScheduleRepository.save(existing);
    }

    // =========================================================
    // GET STAFF SCHEDULES FOR DAY
    // =========================================================

    @Transactional(readOnly = true)
    public List<StaffSchedule>
    getSchedulesForDay(
            Long staffId,
            LocalDate weekStartDate,
            DayOfWeek dayOfWeek) {

        getStaff(staffId);

        validateDay(dayOfWeek);

        return staffScheduleRepository
                .findByStaffIdAndWeekStartDateAndDayOfWeek(
                        staffId,
                        getMonday(weekStartDate),
                        dayOfWeek
                );
    }

    // =========================================================
    // GET DENTIST SCHEDULES FOR DAY
    // =========================================================

    @Transactional(readOnly = true)
    public List<StaffSchedule>
    getDentistSchedulesForDay(
            Long dentistId,
            LocalDate weekStartDate,
            DayOfWeek dayOfWeek) {

        getDentist(dentistId);

        validateDay(dayOfWeek);

        return staffScheduleRepository
                .findByDentistIdAndWeekStartDateAndDayOfWeek(
                        dentistId,
                        getMonday(weekStartDate),
                        dayOfWeek
                );
    }

    // =========================================================
    // GET STAFF SPECIFIC SHIFT
    // =========================================================

    @Transactional(readOnly = true)
    public StaffSchedule getScheduleForShift(
            Long staffId,
            LocalDate weekStartDate,
            DayOfWeek dayOfWeek,
            String shift) {

        getStaff(staffId);

        validateDay(dayOfWeek);

        String normalizedShift =
                requireShift(shift);

        return staffScheduleRepository
                .findByStaffIdAndWeekStartDateAndDayOfWeekAndShift(
                        staffId,
                        getMonday(weekStartDate),
                        dayOfWeek,
                        normalizedShift
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "No schedule found for "
                                        + dayOfWeek
                                        + " "
                                        + normalizedShift
                        )
                );
    }

    // =========================================================
    // GET DENTIST SPECIFIC SHIFT
    // =========================================================

    @Transactional(readOnly = true)
    public StaffSchedule getDentistScheduleForShift(
            Long dentistId,
            LocalDate weekStartDate,
            DayOfWeek dayOfWeek,
            String shift) {

        getDentist(dentistId);

        validateDay(dayOfWeek);

        String normalizedShift =
                requireShift(shift);

        return staffScheduleRepository
                .findByDentistIdAndWeekStartDateAndDayOfWeekAndShift(
                        dentistId,
                        getMonday(weekStartDate),
                        dayOfWeek,
                        normalizedShift
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "No schedule found for "
                                        + dayOfWeek
                                        + " "
                                        + normalizedShift
                        )
                );
    }

    // =========================================================
    // GET WORKING STAFF SCHEDULES
    // =========================================================

    @Transactional(readOnly = true)
    public List<StaffSchedule>
    getWorkingSchedules(
            Long staffId) {

        getStaff(staffId);

        return staffScheduleRepository
                .findByStaffIdAndWorkingTrue(
                        staffId
                );
    }

    // =========================================================
    // GET WORKING DENTIST SCHEDULES
    // =========================================================

    @Transactional(readOnly = true)
    public List<StaffSchedule>
    getWorkingDentistSchedules(
            Long dentistId) {

        getDentist(dentistId);

        return staffScheduleRepository
                .findByDentistIdAndWorkingTrue(
                        dentistId
                );
    }

    // =========================================================
    // GET SCHEDULES BY SHIFT
    // =========================================================

    @Transactional(readOnly = true)
    public List<StaffSchedule>
    getSchedulesByShift(
            String shift) {

        return staffScheduleRepository
                .findByShift(
                        requireShift(shift)
                );
    }

    // =========================================================
    // UPDATE SCHEDULE - ADMIN
    // =========================================================

    public StaffSchedule updateSchedule(
            Long id,
            StaffSchedule updatedSchedule) {

        if (updatedSchedule == null) {
            throw new RuntimeException(
                    "Schedule data is required"
            );
        }

        StaffSchedule existing =
                getScheduleById(id);

        if (updatedSchedule.getDayOfWeek() != null) {
            existing.setDayOfWeek(
                    updatedSchedule.getDayOfWeek()
            );
        }

        if (updatedSchedule.getWeekStartDate() != null) {
            existing.setWeekStartDate(
                    getMonday(
                            updatedSchedule
                                    .getWeekStartDate()
                    )
            );
        }

        if (updatedSchedule.getShift() != null) {
            existing.setShift(
                    requireShift(
                            updatedSchedule.getShift()
                    )
            );
        }

        if (updatedSchedule.getWorking() != null) {
            existing.setWorking(
                    updatedSchedule.getWorking()
            );
        }

        if (updatedSchedule.getStartTime() != null) {
            existing.setStartTime(
                    updatedSchedule.getStartTime()
            );
        }

        if (updatedSchedule.getEndTime() != null) {
            existing.setEndTime(
                    updatedSchedule.getEndTime()
            );
        }

        if (Boolean.TRUE.equals(
                existing.getWorking())) {

            validateTimeRange(
                    existing.getStartTime(),
                    existing.getEndTime()
            );

        } else {

            existing.setStartTime(null);
            existing.setEndTime(null);
        }

        existing.setScheduleSource(MANUAL);

        if (updatedSchedule.getNotes() != null) {
            existing.setNotes(
                    updatedSchedule.getNotes()
            );
        }

        return staffScheduleRepository.save(
                existing
        );
    }

    // =========================================================
    // MARK AS OFF DAY
    // =========================================================

    public StaffSchedule markAsOffDay(
            Long id) {

        StaffSchedule schedule =
                getScheduleById(id);

        schedule.setWorking(false);
        schedule.setStartTime(null);
        schedule.setEndTime(null);
        schedule.setScheduleSource(MANUAL);
        schedule.setNotes(
                "Marked as off day by admin"
        );

        return staffScheduleRepository.save(
                schedule
        );
    }

    // =========================================================
    // DELETE SCHEDULE
    // =========================================================

    public void deleteSchedule(
            Long id) {

        StaffSchedule schedule =
                getScheduleById(id);

        staffScheduleRepository.delete(
                schedule
        );
    }

    // =========================================================
    // DELETE ALL STAFF SCHEDULES
    // =========================================================

    public void deleteStaffSchedules(
            Long staffId) {

        getStaff(staffId);

        staffScheduleRepository
                .deleteByStaffId(staffId);
    }

    // =========================================================
    // DELETE ALL DENTIST SCHEDULES
    // =========================================================

    public void deleteDentistSchedules(
            Long dentistId) {

        getDentist(dentistId);

        staffScheduleRepository
                .deleteByDentistId(dentistId);
    }

    // =========================================================
    // PRIVATE - GENERATE DENTIST SCHEDULE FROM AVAILABILITY
    // =========================================================

    private List<StaffSchedule> generateDentistScheduleFromAvailability(
            Dentist dentist,
            LocalDate monday) {

        List<StaffSchedule> schedules = new ArrayList<>();
        List<DentistAvailability> availList = dentistAvailabilityRepository != null
                ? dentistAvailabilityRepository.findByDentistId(dentist.getId())
                : List.of();
        Map<DayOfWeek, DentistAvailability> availMap = availList.stream()
                .collect(Collectors.toMap(DentistAvailability::getDayOfWeek, a -> a, (a1, a2) -> a1));

        for (int dayIndex = 0; dayIndex < 7; dayIndex++) {
            DayOfWeek dayOfWeek = DayOfWeek.of(dayIndex + 1);
            DentistAvailability da = availMap.get(dayOfWeek);

            boolean isWorking;
            LocalTime startTime;
            LocalTime endTime;
            String shift;
            String status;
            String notes;

            if (da != null) {
                isWorking = da.isAvailable();
                if (isWorking) {
                    startTime = da.getStartTime() != null ? da.getStartTime() : LocalTime.of(9, 0);
                    endTime = da.getEndTime() != null ? da.getEndTime() : LocalTime.of(17, 0);
                    shift = startTime.isBefore(LocalTime.of(13, 0)) ? MORNING_SHIFT : EVENING_SHIFT;
                    status = "ACTIVE";
                    notes = "Consultation shift based on dentist availability";
                } else {
                    startTime = null;
                    endTime = null;
                    shift = MORNING_SHIFT;
                    status = "OFF";
                    notes = "Scheduled day off";
                }
            } else {
                if (dayOfWeek == DayOfWeek.SUNDAY) {
                    isWorking = false;
                    startTime = null;
                    endTime = null;
                    shift = MORNING_SHIFT;
                    status = "OFF";
                    notes = "Sunday clinic closed";
                } else {
                    isWorking = true;
                    startTime = LocalTime.of(9, 0);
                    endTime = LocalTime.of(17, 0);
                    shift = MORNING_SHIFT;
                    status = "ACTIVE";
                    notes = "Standard dental consultation hours";
                }
            }

            StaffSchedule s = buildSchedule(
                    null,
                    dentist,
                    monday,
                    dayOfWeek,
                    shift,
                    isWorking,
                    startTime,
                    endTime,
                    AUTO,
                    notes
            );
            s.setScheduleDate(monday.plusDays(dayIndex));
            s.setStatus(status);
            s.setGeneratedAutomatically(true);
            s.setModifiedByAdmin(false);
            s.setDeletedByAdmin(false);
            schedules.add(s);
        }

        return schedules;
    }

    // =========================================================
    // PRIVATE - GENERATE SCHEDULE
    // =========================================================

    private List<StaffSchedule>
    generateScheduleForStaffOrDentist(
            Staff staff,
            Dentist dentist,
            int personIndex,
            LocalDate monday) {

        if (dentist != null) {
            return generateDentistScheduleFromAvailability(dentist, monday);
        }

        List<StaffSchedule> schedules =
                new ArrayList<>();

        int rotatingOffDay =
                calculateRotatingOffDay(
                        personIndex,
                        monday
                );

        for (int dayIndex = 0;
             dayIndex < 7;
             dayIndex++) {

            DayOfWeek dayOfWeek =
                    DayOfWeek.of(dayIndex + 1);

            // =================================================
            // WEEKLY OFF DAY
            // =================================================

            if (dayIndex == rotatingOffDay) {

                schedules.add(
                        buildSchedule(
                                staff,
                                dentist,
                                monday,
                                dayOfWeek,
                                MORNING_SHIFT,
                                false,
                                null,
                                null,
                                AUTO,
                                "Weekly rotating day off"
                        )
                );

                continue;
            }

            // =================================================
            // SHIFT ROTATION
            // =================================================

            String shift =
                    calculateShift(
                            personIndex,
                            dayIndex,
                            monday
                    );

            if (MORNING_SHIFT.equals(shift)) {

                schedules.add(
                        buildSchedule(
                                staff,
                                dentist,
                                monday,
                                dayOfWeek,
                                MORNING_SHIFT,
                                true,
                                MORNING_START,
                                MORNING_END,
                                AUTO,
                                "Automatically generated morning shift"
                        )
                );

            } else {

                schedules.add(
                        buildSchedule(
                                staff,
                                dentist,
                                monday,
                                dayOfWeek,
                                EVENING_SHIFT,
                                true,
                                EVENING_START,
                                EVENING_END,
                                AUTO,
                                "Automatically generated evening shift"
                        )
                );
            }
        }

        return schedules;
    }

    // =========================================================
    // PREPARE MANUAL SCHEDULE
    // =========================================================

    private void prepareSchedule(
            StaffSchedule schedule,
            LocalDate weekStartDate,
            String shift) {

        schedule.setWeekStartDate(
                weekStartDate
        );

        schedule.setShift(shift);

        if (schedule.getWorking() == null) {
            schedule.setWorking(true);
        }

        if (Boolean.TRUE.equals(
                schedule.getWorking())) {

            validateTimeRange(
                    schedule.getStartTime(),
                    schedule.getEndTime()
            );

        } else {

            schedule.setStartTime(null);
            schedule.setEndTime(null);
        }
    }

    // =========================================================
    // PREPARE MANUAL WEEKLY SCHEDULES
    // =========================================================

    private List<StaffSchedule>
    prepareManualSchedules(
            List<StaffSchedule> schedules,
            LocalDate weekStartDate) {

        List<StaffSchedule> prepared =
                new ArrayList<>();

        for (StaffSchedule schedule :
                schedules) {

            if (schedule == null) {
                continue;
            }

            validateDay(
                    schedule.getDayOfWeek()
            );

            String shift =
                    requireShift(
                            schedule.getShift()
                    );

            prepareSchedule(
                    schedule,
                    weekStartDate,
                    shift
            );

            prepared.add(schedule);
        }

        if (prepared.isEmpty()) {
            throw new RuntimeException(
                    "No valid schedules provided"
            );
        }

        return prepared;
    }

    // =========================================================
    // GET ACTIVE STAFF
    // =========================================================

    private List<Staff> getActiveStaff() {

        return staffRepository.findAll()
                .stream()
                .filter(staff ->
                        staff.getStatus() != null &&
                                "ACTIVE".equalsIgnoreCase(
                                        staff.getStatus()
                                )
                )
                .sorted(
                        Comparator.comparing(
                                Staff::getId
                        )
                )
                .toList();
    }

    // =========================================================
    // GET ACTIVE DENTISTS
    // =========================================================

    private List<Dentist> getActiveDentists() {

        return dentistRepository.findAll()
                .stream()
                .filter(dentist ->
                        dentist.getStatus() != null &&
                                "ACTIVE".equalsIgnoreCase(
                                        dentist.getStatus()
                                )
                )
                .sorted(
                        Comparator.comparing(
                                Dentist::getId
                        )
                )
                .toList();
    }

    // =========================================================
    // GET STAFF
    // =========================================================

    private Staff getStaff(
            Long staffId) {

        if (staffId == null) {
            throw new RuntimeException(
                    "Staff ID is required"
            );
        }

        return staffRepository
                .findById(staffId)
                .or(() -> staffRepository.findByUserId(staffId))
                .orElseThrow(() ->
                        new RuntimeException(
                                "Staff not found with id: "
                                        + staffId
                        )
                );
    }

    // =========================================================
    // GET DENTIST
    // =========================================================

    private Dentist getDentist(
            Long dentistId) {

        if (dentistId == null) {
            throw new RuntimeException(
                    "Dentist ID is required"
            );
        }

        return dentistRepository
                .findById(dentistId)
                .or(() -> dentistRepository.findByUserId(dentistId))
                .orElseThrow(() ->
                        new RuntimeException(
                                "Dentist not found with id: "
                                        + dentistId
                        )
                );
    }

    // =========================================================
    // GET STAFF INDEX
    // =========================================================

    private int getStaffIndex(
            List<Staff> staffList,
            Long staffId) {

        for (int i = 0;
             i < staffList.size();
             i++) {

            if (staffList.get(i)
                    .getId()
                    .equals(staffId)) {

                return i;
            }
        }

        throw new RuntimeException(
                "Staff is not active or not found"
        );
    }

    // =========================================================
    // GET DENTIST INDEX
    // =========================================================

    private int getDentistIndex(
            List<Dentist> dentistList,
            Long dentistId) {

        for (int i = 0;
             i < dentistList.size();
             i++) {

            if (dentistList.get(i)
                    .getId()
                    .equals(dentistId)) {

                return i;
            }
        }

        throw new RuntimeException(
                "Dentist is not active or not found"
        );
    }

    // =========================================================
    // ROTATING OFF DAY
    //
    // Example:
    // Week 1 → Monday
    // Week 2 → Tuesday
    // Week 3 → Wednesday
    // ...
    // =========================================================

    private int calculateRotatingOffDay(
            int personIndex,
            LocalDate monday) {

        int weekNumber =
                monday.get(
                        WeekFields.of(
                                Locale.getDefault()
                        ).weekOfWeekBasedYear()
                );

        return Math.floorMod(
                personIndex + weekNumber - 1,
                7
        );
    }

    // =========================================================
    // SHIFT ROTATION
    // =========================================================

    private String calculateShift(
            int personIndex,
            int dayIndex,
            LocalDate monday) {

        int weekNumber =
                monday.get(
                        WeekFields.of(
                                Locale.getDefault()
                        ).weekOfWeekBasedYear()
                );

        int rotation =
                personIndex +
                        dayIndex +
                        weekNumber;

        if (rotation % 2 == 0) {
            return MORNING_SHIFT;
        }

        return EVENING_SHIFT;
    }

    // =========================================================
    // BUILD SCHEDULE
    // =========================================================

    private StaffSchedule buildSchedule(
            Staff staff,
            Dentist dentist,
            LocalDate weekStartDate,
            DayOfWeek dayOfWeek,
            String shift,
            boolean working,
            LocalTime startTime,
            LocalTime endTime,
            String source,
            String notes) {

        StaffSchedule schedule =
                new StaffSchedule();

        schedule.setStaff(staff);
        schedule.setDentist(dentist);

        schedule.setWeekStartDate(
                weekStartDate
        );

        schedule.setDayOfWeek(
                dayOfWeek
        );

        if (weekStartDate != null && dayOfWeek != null) {
            schedule.setScheduleDate(
                    weekStartDate.plusDays(dayOfWeek.getValue() - 1)
            );
        }

        schedule.setShift(
                shift != null ? shift : MORNING_SHIFT
        );

        schedule.setWorking(
                working
        );

        schedule.setStartTime(
                startTime
        );

        schedule.setEndTime(
                endTime
        );

        schedule.setStatus(
                working ? "ACTIVE" : "OFF"
        );

        schedule.setScheduleSource(
                source
        );

        schedule.setGeneratedAutomatically(
                AUTO.equalsIgnoreCase(source)
        );

        schedule.setModifiedByAdmin(
                false
        );

        schedule.setDeletedByAdmin(
                false
        );

        schedule.setNotes(
                notes
        );

        return schedule;
    }

    // =========================================================
    // NORMALIZE SHIFT
    // =========================================================

    private String normalizeShift(
            String shift) {

        if (shift == null ||
                shift.trim().isEmpty()) {

            return null;
        }

        String normalized =
                shift.trim()
                        .toUpperCase();

        return normalized;
    }

    // =========================================================
    // REQUIRE VALID SHIFT
    // =========================================================

    private String requireShift(
            String shift) {

        String normalized =
                normalizeShift(shift);

        if (normalized == null) {
            throw new RuntimeException(
                    "Shift must be MORNING or EVENING"
            );
        }

        return normalized;
    }

    // =========================================================
    // VALIDATE DAY
    // =========================================================

    private void validateDay(
            DayOfWeek dayOfWeek) {

        if (dayOfWeek == null) {
            throw new RuntimeException(
                    "Day of week is required"
            );
        }
    }

    // =========================================================
    // VALIDATE TIME RANGE
    // =========================================================

    private void validateTimeRange(
            LocalTime startTime,
            LocalTime endTime) {

        if (startTime == null ||
                endTime == null) {

            throw new RuntimeException(
                    "Start time and end time are required"
            );
        }

        if (!startTime.isBefore(endTime)) {

            throw new RuntimeException(
                    "Start time must be before end time"
            );
        }

        if (startTime.isBefore(
                LocalTime.of(9, 0))) {

            throw new RuntimeException(
                    "Schedule cannot start before 09:00"
            );
        }

        if (endTime.isAfter(
                LocalTime.of(20, 0))) {

            throw new RuntimeException(
                    "Schedule cannot end after 20:00"
            );
        }
    }

    // =========================================================
    // GET MONDAY
    // =========================================================

    private LocalDate getMonday(
            LocalDate date) {

        if (date == null) {
            date = LocalDate.now();
        }

        return date.with(
                java.time.temporal
                        .TemporalAdjusters
                        .previousOrSame(
                                DayOfWeek.MONDAY
                        )
        );
    }
}