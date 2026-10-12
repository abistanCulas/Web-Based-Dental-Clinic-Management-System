package com.dentaflow.backend.scheduler;

import com.dentaflow.backend.entity.Notification;
import com.dentaflow.backend.repository.NotificationRepository;
import com.dentaflow.backend.service.StaffScheduleService;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class WeeklyScheduleScheduler {

    private static final Logger log = LoggerFactory.getLogger(WeeklyScheduleScheduler.class);

    private final StaffScheduleService staffScheduleService;
    private final NotificationRepository notificationRepository;

    @Value("${app.schedule.weekly-cron:0 0 20 * * SUN}")
    private String weeklyCron = "0 0 20 * * SUN";

    private volatile boolean enabled = true;
    private volatile LocalDateTime lastRunTime = null;
    private volatile String lastRunStatus = "IDLE";
    private volatile Map<String, Object> lastRunDetails = null;

    public WeeklyScheduleScheduler(StaffScheduleService staffScheduleService) {
        this(staffScheduleService, null);
    }

    @Autowired
    public WeeklyScheduleScheduler(
            StaffScheduleService staffScheduleService,
            @Autowired(required = false) NotificationRepository notificationRepository) {
        this.staffScheduleService = staffScheduleService;
        this.notificationRepository = notificationRepository;
    }

    @PostConstruct
    public void init() {
        try {
            if (notificationRepository != null) {
                List<Notification> notifs = notificationRepository.findByTypeIgnoreCaseOrderByCreatedAtDesc("SCHEDULE");
                if (notifs != null && !notifs.isEmpty()) {
                    Notification latest = notifs.get(0);
                    if (latest.getCreatedAt() != null) {
                        this.lastRunTime = latest.getCreatedAt();
                        this.lastRunStatus = "SUCCESS";
                        log.info("Initialized weekly schedule automation last run from DB: {}", this.lastRunTime);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Could not inspect existing notifications for last schedule run: {}", e.getMessage());
        }
    }

    // =========================================================
    // AUTOMATIC WEEKLY SCHEDULE EMAIL BROADCAST
    //
    // Runs every Sunday at 20:00 (8:00 PM) by default.
    // Generates upcoming week's schedules if not present, and
    // broadcasts the authoritative schedule to every active doctor & staff.
    // =========================================================
    @Scheduled(cron = "${app.schedule.weekly-cron:0 0 20 * * SUN}")
    public void runWeeklyScheduleBroadcast() {
        if (!enabled) {
            log.info("Weekly schedule broadcast is currently disabled/inactive. Skipping scheduled execution.");
            return;
        }

        LocalDate upcomingMonday = LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.MONDAY));
        log.info("Starting scheduled weekly schedule email broadcast for upcoming week: {}", upcomingMonday);

        try {
            Map<String, Object> result = staffScheduleService.sendWeeklySchedulesToEveryone(upcomingMonday, false);
            this.lastRunTime = LocalDateTime.now();
            this.lastRunStatus = "SUCCESS";
            this.lastRunDetails = result;
            log.info("Scheduled weekly schedule email broadcast completed: {}", result);
        } catch (Exception e) {
            this.lastRunTime = LocalDateTime.now();
            this.lastRunStatus = "FAILED";
            log.error("Error running weekly schedule email broadcast: {}", e.getMessage(), e);
        }
    }

    // =========================================================
    // MANUAL / ADMIN TRIGGERABLE BROADCAST
    // =========================================================
    public Map<String, Object> triggerBroadcast(LocalDate weekStartDate, boolean force) {
        LocalDate targetMonday = weekStartDate != null
                ? weekStartDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                : LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.MONDAY));

        log.info("Triggering weekly schedule broadcast for week {} (force={})", targetMonday, force);
        try {
            Map<String, Object> result = staffScheduleService.sendWeeklySchedulesToEveryone(targetMonday, force);
            this.lastRunTime = LocalDateTime.now();
            this.lastRunStatus = "SUCCESS";
            this.lastRunDetails = result;
            return result;
        } catch (Exception e) {
            this.lastRunTime = LocalDateTime.now();
            this.lastRunStatus = "FAILED";
            throw e;
        }
    }

    // =========================================================
    // AUTOMATION MANAGEMENT & STATUS
    // =========================================================

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
        log.info("Doctor & Staff weekly schedule automation enabled status set to: {}", enabled);
    }

    public LocalDateTime getNextRunTime() {
        try {
            CronExpression cron = CronExpression.parse(weeklyCron);
            return cron.next(LocalDateTime.now());
        } catch (Exception e) {
            LocalDateTime now = LocalDateTime.now();
            LocalDate nextSunday = now.toLocalDate();
            if (nextSunday.getDayOfWeek() == DayOfWeek.SUNDAY) {
                if (now.toLocalTime().isBefore(LocalTime.of(20, 0))) {
                    return nextSunday.atTime(20, 0);
                }
                nextSunday = nextSunday.plusWeeks(1);
            } else {
                nextSunday = nextSunday.with(TemporalAdjusters.next(DayOfWeek.SUNDAY));
            }
            return nextSunday.atTime(20, 0);
        }
    }

    public String formatLastRun(LocalDateTime dt) {
        if (dt == null) return "Never";
        LocalDate today = LocalDate.now();
        LocalDate dtDate = dt.toLocalDate();
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("hh:mm a");

        if (dtDate.equals(today)) {
            return "Today — " + dt.format(timeFmt);
        } else if (dtDate.equals(today.minusDays(1))) {
            return "Yesterday — " + dt.format(timeFmt);
        } else {
            DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("MMM dd — hh:mm a");
            return dt.format(dateFmt);
        }
    }

    public String formatNextRun(LocalDateTime dt) {
        if (dt == null) return "None";
        LocalDate today = LocalDate.now();
        LocalDate dtDate = dt.toLocalDate();
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("hh:mm a");

        if (dtDate.equals(today)) {
            return "Today — " + dt.format(timeFmt);
        } else if (dtDate.equals(today.plusDays(1))) {
            return "Tomorrow — " + dt.format(timeFmt);
        } else {
            String dayName = dtDate.getDayOfWeek().name();
            dayName = dayName.substring(0, 1).toUpperCase() + dayName.substring(1).toLowerCase();
            return dayName + " — " + dt.format(timeFmt);
        }
    }

    public Map<String, Object> getAutomationStatus() {
        LocalDateTime next = getNextRunTime();
        String nextRunFormatted;
        if (enabled && next != null) {
            nextRunFormatted = formatNextRun(next);
        } else if (!enabled && next != null) {
            nextRunFormatted = "Paused";
        } else {
            nextRunFormatted = "None";
        }

        Map<String, Object> status = new LinkedHashMap<>();
        status.put("id", "doctor-staff-weekly-schedule");
        status.put("title", "Doctor & Staff Weekly Schedule");
        status.put("name", "Doctor & Staff Weekly Schedule");
        status.put("description", "Automatically generates the upcoming weekly schedule and sends it to active Doctors and Staff.");
        status.put("type", "Weekly — Sunday");
        status.put("schedule", "Weekly — Sunday");
        status.put("cron", weeklyCron);
        status.put("enabled", enabled);
        status.put("status", enabled ? "active" : "inactive");
        status.put("lastRun", formatLastRun(lastRunTime));
        status.put("lastRunTimestamp", lastRunTime != null ? lastRunTime.toString() : null);
        status.put("lastRunStatus", lastRunStatus != null ? lastRunStatus : "IDLE");
        status.put("lastRunDetails", lastRunDetails);
        status.put("nextRun", nextRunFormatted);
        status.put("nextRunTimestamp", next != null ? next.toString() : null);
        return status;
    }
}
