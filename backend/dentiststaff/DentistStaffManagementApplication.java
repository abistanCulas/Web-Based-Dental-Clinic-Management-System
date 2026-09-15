package com.dentalclinic.dentiststaff;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Entry point for the Dentist & Staff Management module.
 * This module can be run standalone during development, and later merged
 * into the main Dental Clinic Management System project (or kept as a
 * separate microservice, depending on the team's final architecture).
 */
@SpringBootApplication
public class DentistStaffManagementApplication {

    public static void main(String[] args) {
        SpringApplication.run(DentistStaffManagementApplication.class, args);
    }
}
