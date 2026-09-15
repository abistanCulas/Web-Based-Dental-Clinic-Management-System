package com.dentalclinic.dentiststaff.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;

import java.time.DayOfWeek;
import java.time.LocalTime;

@Entity
@Table(name = "staff_schedule")
public class StaffSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_id", nullable = false)
    private Staff staff;

    @NotNull(message = "Day of week is required")
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DayOfWeek dayOfWeek;

    @NotNull(message = "Shift start time is required")
    @Column(nullable = false)
    private LocalTime shiftStart;

    @NotNull(message = "Shift end time is required")
    @Column(nullable = false)
    private LocalTime shiftEnd;

    public StaffSchedule() {
    }

    // ----- Getters and Setters -----

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Staff getStaff() {
        return staff;
    }

    public void setStaff(Staff staff) {
        this.staff = staff;
    }

    public DayOfWeek getDayOfWeek() {
        return dayOfWeek;
    }

    public void setDayOfWeek(DayOfWeek dayOfWeek) {
        this.dayOfWeek = dayOfWeek;
    }

    public LocalTime getShiftStart() {
        return shiftStart;
    }

    public void setShiftStart(LocalTime shiftStart) {
        this.shiftStart = shiftStart;
    }

    public LocalTime getShiftEnd() {
        return shiftEnd;
    }

    public void setShiftEnd(LocalTime shiftEnd) {
        this.shiftEnd = shiftEnd;
    }
}
