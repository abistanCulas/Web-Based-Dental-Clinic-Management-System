package com.dentalclinic.dentiststaff.dto;

import com.dentalclinic.dentiststaff.model.enums.StaffRole;
import com.dentalclinic.dentiststaff.model.enums.StaffStatus;

import java.time.LocalDate;

public class StaffResponseDTO {

    private Long id;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private StaffRole role;
    private LocalDate dateJoined;
    private StaffStatus status;

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

    public StaffRole getRole() {
        return role;
    }

    public void setRole(StaffRole role) {
        this.role = role;
    }

    public LocalDate getDateJoined() {
        return dateJoined;
    }

    public void setDateJoined(LocalDate dateJoined) {
        this.dateJoined = dateJoined;
    }

    public StaffStatus getStatus() {
        return status;
    }

    public void setStatus(StaffStatus status) {
        this.status = status;
    }
}
