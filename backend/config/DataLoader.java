package com.dentaflow.backend.config;

import com.dentaflow.backend.entity.Role;
import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.repository.RoleRepository;
import com.dentaflow.backend.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataLoader {

    @Bean
    CommandLineRunner loadInitialData(
            RoleRepository roleRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {

        return args -> {

            // =====================================================
            // CREATE ROLES
            // =====================================================

            createRole(
                    roleRepository,
                    "ADMIN",
                    "System administrator"
            );

            createRole(
                    roleRepository,
                    "DENTIST",
                    "Dental doctor"
            );

            createRole(
                    roleRepository,
                    "PATIENT",
                    "Dental clinic patient"
            );

            createRole(
                    roleRepository,
                    "STAFF",
                    "Clinic staff member"
            );

            createRole(
                    roleRepository,
                    "DOCTOR",
                    "Dental doctor"
            );

            createRole(
                    roleRepository,
                    "RECEPTIONIST",
                    "Front desk receptionist"
            );

            createRole(
                    roleRepository,
                    "PHARMACIST",
                    "Pharmacy specialist"
            );

            createRole(
                    roleRepository,
                    "CASHIER",
                    "Clinic cashier"
            );

            // =====================================================
            // CREATE DEFAULT USERS (ALL 6 DEMO ROLES)
            // =====================================================

            // 1. Admin
            if (!userRepository.existsByEmail("admin@dentaflow.com")) {
                Role adminRole = roleRepository.findByName("ADMIN")
                        .orElseThrow(() -> new RuntimeException("ADMIN role not found"));
                User admin = new User();
                admin.setFirstName("System");
                admin.setLastName("Administrator");
                admin.setEmail("admin@dentaflow.com");
                admin.setPhone("0770000000");
                admin.setPassword(passwordEncoder.encode("Admin@123"));
                admin.setRole(adminRole);
                admin.setStatus("ACTIVE");
                admin.setPreferredLanguage("EN");
                admin.setAuthProvider("LOCAL");
                admin.setEmailVerified("YES");
                userRepository.save(admin);
                System.out.println("Default admin created: admin@dentaflow.com");
            }

            // 2. Patient
            if (!userRepository.existsByEmail("patient@dentaflow.com")) {
                Role patientRole = roleRepository.findByName("PATIENT")
                        .orElseThrow(() -> new RuntimeException("PATIENT role not found"));
                User patient = new User();
                patient.setFirstName("Sarah");
                patient.setLastName("Mitchell");
                patient.setEmail("patient@dentaflow.com");
                patient.setPhone("0771234567");
                patient.setPassword(passwordEncoder.encode("demo123"));
                patient.setRole(patientRole);
                patient.setStatus("ACTIVE");
                patient.setPreferredLanguage("EN");
                patient.setAuthProvider("LOCAL");
                patient.setEmailVerified("YES");
                userRepository.save(patient);
                System.out.println("Default patient created: patient@dentaflow.com");
            }

            // 3. Dentist / Doctor
            if (!userRepository.existsByEmail("dentist@dentaflow.com")) {
                Role dentistRole = roleRepository.findByName("DENTIST")
                        .orElseThrow(() -> new RuntimeException("DENTIST role not found"));
                User dentist = new User();
                dentist.setFirstName("Dr. James");
                dentist.setLastName("Wilson");
                dentist.setEmail("dentist@dentaflow.com");
                dentist.setPhone("0772345678");
                dentist.setPassword(passwordEncoder.encode("demo123"));
                dentist.setRole(dentistRole);
                dentist.setStatus("ACTIVE");
                dentist.setPreferredLanguage("EN");
                dentist.setAuthProvider("LOCAL");
                dentist.setEmailVerified("YES");
                userRepository.save(dentist);
                System.out.println("Default dentist created: dentist@dentaflow.com");
            }

            // 4. Receptionist
            if (!userRepository.existsByEmail("receptionist@dentaflow.com")) {
                Role staffRole = roleRepository.findByName("STAFF")
                        .orElseThrow(() -> new RuntimeException("STAFF role not found"));
                User receptionist = new User();
                receptionist.setFirstName("Emma");
                receptionist.setLastName("Rodriguez");
                receptionist.setEmail("receptionist@dentaflow.com");
                receptionist.setPhone("0773456789");
                receptionist.setPassword(passwordEncoder.encode("demo123"));
                receptionist.setRole(staffRole);
                receptionist.setStatus("ACTIVE");
                receptionist.setPreferredLanguage("EN");
                receptionist.setAuthProvider("LOCAL");
                receptionist.setEmailVerified("YES");
                userRepository.save(receptionist);
                System.out.println("Default receptionist created: receptionist@dentaflow.com");
            }

            // 5. Cashier
            if (!userRepository.existsByEmail("cashier@dentaflow.com")) {
                Role staffRole = roleRepository.findByName("STAFF")
                        .orElseThrow(() -> new RuntimeException("STAFF role not found"));
                User cashier = new User();
                cashier.setFirstName("Michael");
                cashier.setLastName("Chen");
                cashier.setEmail("cashier@dentaflow.com");
                cashier.setPhone("0774567890");
                cashier.setPassword(passwordEncoder.encode("demo123"));
                cashier.setRole(staffRole);
                cashier.setStatus("ACTIVE");
                cashier.setPreferredLanguage("EN");
                cashier.setAuthProvider("LOCAL");
                cashier.setEmailVerified("YES");
                userRepository.save(cashier);
                System.out.println("Default cashier created: cashier@dentaflow.com");
            }

            // 6. Pharmacist
            if (!userRepository.existsByEmail("pharmacist@dentaflow.com")) {
                Role staffRole = roleRepository.findByName("STAFF")
                        .orElseThrow(() -> new RuntimeException("STAFF role not found"));
                User pharmacist = new User();
                pharmacist.setFirstName("Lisa");
                pharmacist.setLastName("Thompson");
                pharmacist.setEmail("pharmacist@dentaflow.com");
                pharmacist.setPhone("0775678901");
                pharmacist.setPassword(passwordEncoder.encode("demo123"));
                pharmacist.setRole(staffRole);
                pharmacist.setStatus("ACTIVE");
                pharmacist.setPreferredLanguage("EN");
                pharmacist.setAuthProvider("LOCAL");
                pharmacist.setEmailVerified("YES");
                userRepository.save(pharmacist);
                System.out.println("Default pharmacist created: pharmacist@dentaflow.com");
            }
        };
    }

    // =========================================================
    // CREATE ROLE IF NOT EXISTS
    // =========================================================

    private void createRole(
            RoleRepository roleRepository,
            String name,
            String description) {

        if (!roleRepository.existsByName(name)) {

            Role role =
                    new Role(
                            name,
                            description
                    );

            roleRepository.save(role);

            System.out.println(
                    "Role created: " + name
            );
        }
    }
}