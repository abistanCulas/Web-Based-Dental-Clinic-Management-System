package com.dentaflow.backend.entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(
        name = "appointments",
        indexes = {
                @Index(
                        name = "idx_appointment_date",
                        columnList = "appointment_date"
                ),
                @Index(
                        name = "idx_appointment_status",
                        columnList = "status"
                ),
                @Index(
                        name = "idx_appointment_patient",
                        columnList = "patient_id"
                ),
                @Index(
                        name = "idx_appointment_dentist",
                        columnList = "dentist_id"
                )
        }
)
public class Appointment extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /*
     * Unique appointment reference shown to the patient.
     * Example: AP-20260824-001
     */
    @Column(
            name = "appointment_code",
            unique = true,
            nullable = false,
            length = 20
    )
    private String appointmentCode;

    /*
     * Patient who booked the appointment.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "patient_id",
            nullable = false,
            foreignKey = @ForeignKey(
                    name = "fk_appointment_patient"
            )
    )
    private Patient patient;

    /*
     * Dentist assigned to the appointment.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "dentist_id",
            nullable = false,
            foreignKey = @ForeignKey(
                    name = "fk_appointment_dentist"
            )
    )
    private Dentist dentist;

    /*
     * Appointment date.
     *
     * Business rule:
     * Patient can book from tomorrow
     * up to the next 15 days.
     *
     * This validation is handled in AppointmentService.
     */
    @Column(
            name = "appointment_date",
            nullable = false
    )
    private LocalDate appointmentDate;

    /*
     * Appointment starting time.
     */
    @Column(
            name = "start_time",
            nullable = false
    )
    private LocalTime startTime;

    /*
     * Appointment ending time.
     */
    @Column(
            name = "end_time",
            nullable = false
    )
    private LocalTime endTime;

    /*
     * Type of dental appointment.
     *
     * Examples:
     * - General Consultation
     * - Cleaning
     * - Filling
     * - Root Canal
     * - Extraction
     */
    @Column(
            name = "appointment_type",
            nullable = false,
            length = 50
    )
    private String appointmentType;

    /*
     * Appointment lifecycle.
     *
     * Possible values:
     * PENDING
     * CONFIRMED
     * COMPLETED
     * CANCELLED
     * RESCHEDULED
     * NO_SHOW
     */
    @Column(
            name = "status",
            nullable = false,
            length = 30
    )
    private String status = "PENDING";

    /*
     * Reason provided by the patient.
     */
    @Column(
            name = "reason",
            length = 500
    )
    private String reason;

    /*
     * Additional notes related to the appointment.
     */
    @Column(
            name = "notes",
            length = 1000
    )
    private String notes;

    /*
     * How the appointment was created.
     *
     * Examples:
     * ONLINE
     * ADMIN
     * RECEPTIONIST
     */
    @Column(
            name = "booking_source",
            length = 20
    )
    private String bookingSource = "ONLINE";

    /*
     * Used by the reminder process.
     *
     * false = reminder not sent
     * true  = reminder already sent
     *
     * The system sends a reminder one day
     * before the appointment.
     */
    @Column(
            name = "reminder_sent",
            nullable = false
    )
    private Boolean reminderSent = false;

    public Appointment() {
    }

    // =========================================================
    // GETTERS & SETTERS
    // =========================================================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getAppointmentCode() {
        return appointmentCode;
    }

    public void setAppointmentCode(String appointmentCode) {
        this.appointmentCode = appointmentCode;
    }

    public Patient getPatient() {
        return patient;
    }

    public void setPatient(Patient patient) {
        this.patient = patient;
    }

    public Dentist getDentist() {
        return dentist;
    }

    public void setDentist(Dentist dentist) {
        this.dentist = dentist;
    }

    public LocalDate getAppointmentDate() {
        return appointmentDate;
    }

    public void setAppointmentDate(LocalDate appointmentDate) {
        this.appointmentDate = appointmentDate;
    }

    public LocalTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalTime startTime) {
        this.startTime = startTime;
    }

    public LocalTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalTime endTime) {
        this.endTime = endTime;
    }

    public String getAppointmentType() {
        return appointmentType;
    }

    public void setAppointmentType(String appointmentType) {
        this.appointmentType = appointmentType;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getBookingSource() {
        return bookingSource;
    }

    public void setBookingSource(String bookingSource) {
        this.bookingSource = bookingSource;
    }

    public Boolean getReminderSent() {
        return reminderSent;
    }

    public void setReminderSent(Boolean reminderSent) {
        this.reminderSent = reminderSent;
    }
}