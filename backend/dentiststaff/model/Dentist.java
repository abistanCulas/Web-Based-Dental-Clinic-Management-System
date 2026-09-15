package com.dentalclinic.dentiststaff.model;

import com.dentalclinic.dentiststaff.model.enums.DentistStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "dentist")
public class Dentist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "First name is required")
    @Column(nullable = false)
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Column(nullable = false)
    private String lastName;

    @Email(message = "Email must be valid")
    @NotBlank(message = "Email is required")
    @Column(nullable = false, unique = true)
    private String email;

    @NotBlank(message = "Phone number is required")
    @Column(nullable = false)
    private String phone;

    @NotBlank(message = "License number is required")
    @Column(nullable = false, unique = true)
    private String licenseNumber;

    @Column(length = 1000)
    private String qualifications;

    private LocalDate dateJoined;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DentistStatus status = DentistStatus.ACTIVE;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "dentist_specialization",
        joinColumns = @JoinColumn(name = "dentist_id"),
        inverseJoinColumns = @JoinColumn(name = "specialization_id")
    )
    private Set<Specialization> specializations = new HashSet<>();

    @OneToMany(mappedBy = "dentist", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private Set<AvailabilitySchedule> availabilitySchedules = new HashSet<>();

    public Dentist() {
    }

    // ----- Getters and Setters -----

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getLicenseNumber() {
        return licenseNumber;
    }

    public void setLicenseNumber(String licenseNumber) {
        this.licenseNumber = licenseNumber;
    }

    public String getQualifications() {
        return qualifications;
    }

    public void setQualifications(String qualifications) {
        this.qualifications = qualifications;
    }

    public LocalDate getDateJoined() {
        return dateJoined;
    }

    public void setDateJoined(LocalDate dateJoined) {
        this.dateJoined = dateJoined;
    }

    public DentistStatus getStatus() {
        return status;
    }

    public void setStatus(DentistStatus status) {
        this.status = status;
    }

    public Set<Specialization> getSpecializations() {
        return specializations;
    }

    public void setSpecializations(Set<Specialization> specializations) {
        this.specializations = specializations;
    }

    public Set<AvailabilitySchedule> getAvailabilitySchedules() {
        return availabilitySchedules;
    }

    public void setAvailabilitySchedules(Set<AvailabilitySchedule> availabilitySchedules) {
        this.availabilitySchedules = availabilitySchedules;
    }
}
