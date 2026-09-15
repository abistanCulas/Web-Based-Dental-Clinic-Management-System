package com.dentalclinic.dentiststaff.dto;

import com.dentalclinic.dentiststaff.model.enums.DentistStatus;

import java.time.LocalDate;
import java.util.Set;

/**
 * Used for returning a Dentist profile (View Dentist Profile).
 */
public class DentistResponseDTO {

    private Long id;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String licenseNumber;
    private String qualifications;
    private LocalDate dateJoined;
    private DentistStatus status;
    private Set<String> specializations;

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

    public Set<String> getSpecializations() {
        return specializations;
    }

    public void setSpecializations(Set<String> specializations) {
        this.specializations = specializations;
    }
}
