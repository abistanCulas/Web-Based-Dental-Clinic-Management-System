package com.dentaflow.backend.entity;

import jakarta.persistence.*;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(
        name = "staff_schedules",
        uniqueConstraints = {
                @UniqueConstraint(
                        columnNames = {
                                "staff_id",
                                "week_start_date",
                                "day_of_week",
                                "shift"
                        }
                ),
                @UniqueConstraint(
                        columnNames = {
                                "dentist_id",
                                "week_start_date",
                                "day_of_week",
                                "shift"
                        }
                )
        }
)
public class StaffSchedule extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // =========================================================
    // STAFF
    // =========================================================

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_id")
    private Staff staff;

    // =========================================================
    // DENTIST
    // =========================================================

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dentist_id")
    private Dentist dentist;

    // =========================================================
    // WEEK
    // =========================================================

    @Column(
            name = "week_start_date",
            nullable = false
    )
    private LocalDate weekStartDate;

    // =========================================================
    // DAY
    // =========================================================

    @Enumerated(EnumType.STRING)
    @Column(
            name = "day_of_week",
            nullable = false,
            length = 15
    )
    private DayOfWeek dayOfWeek;

    // =========================================================
    // SHIFT
    // MORNING / EVENING
    // =========================================================

    @Column(
            nullable = false,
            length = 20
    )
    private String shift;

    // =========================================================
    // WORKING
    // =========================================================

    @Column(nullable = false)
    private Boolean working = true;

    // =========================================================
    // START TIME
    // =========================================================

    @Column
    private LocalTime startTime;

    // =========================================================
    // END TIME
    // =========================================================

    @Column
    private LocalTime endTime;

    // =========================================================
    // SOURCE
    // AUTO / MANUAL
    // =========================================================

    @Column(
            nullable = false,
            length = 20
    )
    private String scheduleSource = "AUTO";

    // =========================================================
    // NOTES
    // =========================================================

    @Column(length = 500)
    private String notes;

    // =========================================================
    // CONSTRUCTOR
    // =========================================================

    public StaffSchedule() {
    }

    // =========================================================
    // ID
    // =========================================================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    // =========================================================
    // STAFF
    // =========================================================

    public Staff getStaff() {
        return staff;
    }

    public void setStaff(Staff staff) {
        this.staff = staff;
    }

    // =========================================================
    // DENTIST
    // =========================================================

    public Dentist getDentist() {
        return dentist;
    }

    public void setDentist(Dentist dentist) {
        this.dentist = dentist;
    }

    // =========================================================
    // WEEK START DATE
    // =========================================================

    public LocalDate getWeekStartDate() {
        return weekStartDate;
    }

    public void setWeekStartDate(
            LocalDate weekStartDate) {

        this.weekStartDate = weekStartDate;
    }

    // =========================================================
    // DAY OF WEEK
    // =========================================================

    public DayOfWeek getDayOfWeek() {
        return dayOfWeek;
    }

    public void setDayOfWeek(
            DayOfWeek dayOfWeek) {

        this.dayOfWeek = dayOfWeek;
    }

    // =========================================================
    // SHIFT
    // =========================================================

    public String getShift() {
        return shift;
    }

    public void setShift(String shift) {
        this.shift = shift;
    }

    // =========================================================
    // WORKING
    // =========================================================

    public Boolean getWorking() {
        return working;
    }

    public void setWorking(Boolean working) {
        this.working = working;
    }

    // =========================================================
    // START TIME
    // =========================================================

    public LocalTime getStartTime() {
        return startTime;
    }

    public void setStartTime(
            LocalTime startTime) {

        this.startTime = startTime;
    }

    // =========================================================
    // END TIME
    // =========================================================

    public LocalTime getEndTime() {
        return endTime;
    }

    public void setEndTime(
            LocalTime endTime) {

        this.endTime = endTime;
    }

    // =========================================================
    // SCHEDULE SOURCE
    // =========================================================

    public String getScheduleSource() {
        return scheduleSource;
    }

    public void setScheduleSource(
            String scheduleSource) {

        this.scheduleSource = scheduleSource;
    }

    // =========================================================
    // NOTES
    // =========================================================

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}