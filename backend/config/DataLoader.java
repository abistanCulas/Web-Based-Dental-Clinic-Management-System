package com.dentaflow.backend.config;

import com.dentaflow.backend.entity.Appointment;
import com.dentaflow.backend.entity.Dentist;
import com.dentaflow.backend.entity.DentistAvailability;
import com.dentaflow.backend.entity.Message;
import com.dentaflow.backend.entity.Patient;
import com.dentaflow.backend.entity.Role;
import com.dentaflow.backend.entity.Staff;
import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.repository.AppointmentRepository;
import com.dentaflow.backend.repository.DentistAvailabilityRepository;
import com.dentaflow.backend.repository.DentistRepository;
import com.dentaflow.backend.repository.MessageRepository;
import com.dentaflow.backend.repository.PatientRepository;
import com.dentaflow.backend.repository.RoleRepository;
import com.dentaflow.backend.repository.StaffRepository;
import com.dentaflow.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Configuration
public class DataLoader {

    @Value("${app.seed-demo-data:true}")
    private boolean seedDemoData;

    @Value("${app.demo.default-password:pw-demo123}")
    private String demoDefaultPassword;

    @Value("${app.demo.admin-password:pw-demo123}")
    private String demoAdminPassword;

    private String resolvePassword(String configuredPassword, String defaultFallback) {
        if (configuredPassword == null || configuredPassword.isBlank()
                || "YOUR_DEMO_PASSWORD".equalsIgnoreCase(configuredPassword)
                || "YOUR_DEMO_ADMIN_PASSWORD".equalsIgnoreCase(configuredPassword)) {
            return defaultFallback;
        }
        return configuredPassword;
    }

    @Bean
    CommandLineRunner loadInitialData(
            RoleRepository roleRepository,
            UserRepository userRepository,
            DentistRepository dentistRepository,
            DentistAvailabilityRepository dentistAvailabilityRepository,
            PatientRepository patientRepository,
            StaffRepository staffRepository,
            MessageRepository messageRepository,
            AppointmentRepository appointmentRepository,
            PasswordEncoder passwordEncoder) {

        return args -> {
            final String adminPwd = resolvePassword(demoAdminPassword, "pw-demo123");
            final String defaultPwd = resolvePassword(demoDefaultPassword, "pw-demo123");

            // =====================================================
            // 1. ENSURE STANDARD SYSTEM ROLES EXIST
            // =====================================================
            createRole(roleRepository, "ADMIN", "System administrator");
            createRole(roleRepository, "DENTIST", "Dental doctor");
            createRole(roleRepository, "PATIENT", "Dental clinic patient");
            createRole(roleRepository, "STAFF", "Clinic staff member");
            createRole(roleRepository, "DOCTOR", "Dental doctor");
            createRole(roleRepository, "RECEPTIONIST", "Front desk receptionist");
            createRole(roleRepository, "PHARMACIST", "Pharmacy specialist");
            createRole(roleRepository, "CASHIER", "Clinic cashier");

            // =====================================================
            // 2. ADMIN DEMO ACCOUNT (admin@dentaflow.com)
            // =====================================================
            Role adminRole = roleRepository.findByName("ADMIN")
                    .orElseThrow(() -> new RuntimeException("ADMIN role not found"));

            User admin = userRepository.findByEmail("admin@dentaflow.com").orElse(null);
            if (admin == null) {
                admin = new User();
                admin.setFirstName("System");
                admin.setLastName("Administrator");
                admin.setEmail("admin@dentaflow.com");
                admin.setPhone("0770000000");
                admin.setPassword(passwordEncoder.encode(adminPwd));
                admin.setRole(adminRole);
                admin.setStatus("ACTIVE");
                admin.setPreferredLanguage("EN");
                admin.setAuthProvider("LOCAL");
                admin.setEmailVerified("YES");
                userRepository.save(admin);
                System.out.println("Default admin account created: admin@dentaflow.com");
            } else {
                admin.setPassword(passwordEncoder.encode(adminPwd));
                admin.setRole(adminRole);
                admin.setStatus("ACTIVE");
                userRepository.save(admin);
            }

            // Only seed demo login accounts if enabled
            if (!seedDemoData) {
                System.out.println("Demo data seeding disabled (app.seed-demo-data=false). Skipping demo accounts.");
                return;
            }

            // =====================================================
            // 3. FIVE DEMO LOGIN ACCOUNTS & MINIMAL PROFILES
            // =====================================================

            // 3.1 Patient (patient@dentaflow.com - Role: PATIENT)
            Role patientRole = roleRepository.findByName("PATIENT")
                    .orElseThrow(() -> new RuntimeException("PATIENT role not found"));
            User patientUser = userRepository.findByEmail("patient@dentaflow.com").orElse(null);
            if (patientUser == null) {
                patientUser = new User();
                patientUser.setFirstName("Sarah");
                patientUser.setLastName("Mitchell");
                patientUser.setEmail("patient@dentaflow.com");
                patientUser.setPhone("0771234567");
                patientUser.setPassword(passwordEncoder.encode(defaultPwd));
                patientUser.setRole(patientRole);
                patientUser.setStatus("ACTIVE");
                patientUser.setPreferredLanguage("EN");
                patientUser.setAuthProvider("LOCAL");
                patientUser.setEmailVerified("YES");
                patientUser = userRepository.save(patientUser);
                System.out.println("Demo patient account created: patient@dentaflow.com");
            } else {
                patientUser.setPassword(passwordEncoder.encode(defaultPwd));
                patientUser.setRole(patientRole);
                patientUser.setStatus("ACTIVE");
                patientUser = userRepository.save(patientUser);
            }

            if (patientRepository.findByUserId(patientUser.getId()).isEmpty()) {
                Patient patient = new Patient();
                patient.setUser(patientUser);
                patient.setFirstName("Sarah");
                patient.setLastName("Mitchell");
                patient.setEmail("patient@dentaflow.com");
                patient.setPhone("0771234567");
                patient.setDateOfBirth(LocalDate.of(1995, 5, 14));
                patient.setGender("FEMALE");
                patient.setStatus("ACTIVE");
                patient.setPatientCode("P0001");
                patientRepository.save(patient);
                System.out.println("Demo patient profile created: Sarah Mitchell");
            }

            // 3.2 Dentist (dentist@dentaflow.com - Role: DENTIST)
            Role dentistRole = roleRepository.findByName("DENTIST")
                    .orElseThrow(() -> new RuntimeException("DENTIST role not found"));
            User dentistUser = userRepository.findByEmail("dentist@dentaflow.com").orElse(null);
            if (dentistUser == null) {
                dentistUser = new User();
                dentistUser.setFirstName("Dr. James");
                dentistUser.setLastName("Wilson");
                dentistUser.setEmail("dentist@dentaflow.com");
                dentistUser.setPhone("0772345678");
                dentistUser.setPassword(passwordEncoder.encode(defaultPwd));
                dentistUser.setRole(dentistRole);
                dentistUser.setStatus("ACTIVE");
                dentistUser.setPreferredLanguage("EN");
                dentistUser.setAuthProvider("LOCAL");
                dentistUser.setEmailVerified("YES");
                dentistUser = userRepository.save(dentistUser);
                System.out.println("Demo dentist account created: dentist@dentaflow.com");
            } else {
                dentistUser.setPassword(passwordEncoder.encode(defaultPwd));
                dentistUser.setRole(dentistRole);
                dentistUser.setStatus("ACTIVE");
                dentistUser = userRepository.save(dentistUser);
            }

            if (dentistRepository.findByUserId(dentistUser.getId()).isEmpty()) {
                Dentist dentist = new Dentist();
                dentist.setUser(dentistUser);
                dentist.setFirstName("Dr. James");
                dentist.setLastName("Wilson");
                dentist.setEmail("dentist@dentaflow.com");
                dentist.setPhone("0772345678");
                dentist.setSpecialization("General Dentistry");
                dentist.setQualification("BDS, FAGE (Dental Surgery)");
                dentist.setExperienceYears(10);
                dentist.setStatus("ACTIVE");
                dentist.setAbout("Senior Dental Surgeon with 10 years of clinical experience in general and preventive dentistry.");
                dentist.setDentistCode("D-001");
                dentistRepository.save(dentist);
                System.out.println("Demo dentist profile created: Dr. James Wilson");
            }

            // Create default dentist availability (Mon-Sat, 09:00-17:00)
            Dentist demoDentist = dentistRepository.findByUserId(dentistUser.getId()).orElse(null);
            if (demoDentist != null &&
                    dentistAvailabilityRepository.findByDentistId(demoDentist.getId()).isEmpty()) {
                for (DayOfWeek day : DayOfWeek.values()) {
                    if (day == DayOfWeek.SUNDAY) continue;
                    DentistAvailability av = new DentistAvailability();
                    av.setDentist(demoDentist);
                    av.setDayOfWeek(day);
                    av.setAvailable(true);
                    av.setStartTime(LocalTime.of(9, 0));
                    av.setEndTime(LocalTime.of(17, 0));
                    av.setStatus("ACTIVE");
                    dentistAvailabilityRepository.save(av);
                }
                System.out.println("Demo dentist availability created: Mon-Sat 09:00-17:00");
            }

            // 3.3 Receptionist (receptionist@dentaflow.com - Role: RECEPTIONIST)
            Role receptionistRole = roleRepository.findByName("RECEPTIONIST")
                    .orElseGet(() -> roleRepository.findByName("STAFF")
                            .orElseThrow(() -> new RuntimeException("RECEPTIONIST/STAFF role not found")));
            User receptionistUser = userRepository.findByEmail("receptionist@dentaflow.com").orElse(null);
            if (receptionistUser == null) {
                receptionistUser = new User();
                receptionistUser.setFirstName("Emma");
                receptionistUser.setLastName("Rodriguez");
                receptionistUser.setEmail("receptionist@dentaflow.com");
                receptionistUser.setPhone("0773456789");
                receptionistUser.setPassword(passwordEncoder.encode(defaultPwd));
                receptionistUser.setRole(receptionistRole);
                receptionistUser.setStatus("ACTIVE");
                receptionistUser.setPreferredLanguage("EN");
                receptionistUser.setAuthProvider("LOCAL");
                receptionistUser.setEmailVerified("YES");
                receptionistUser = userRepository.save(receptionistUser);
                System.out.println("Demo receptionist account created: receptionist@dentaflow.com");
            } else {
                receptionistUser.setPassword(passwordEncoder.encode(defaultPwd));
                receptionistUser.setRole(receptionistRole);
                receptionistUser.setStatus("ACTIVE");
                receptionistUser = userRepository.save(receptionistUser);
            }

            if (staffRepository.findByUserId(receptionistUser.getId()).isEmpty()) {
                Staff receptionistStaff = new Staff();
                receptionistStaff.setUser(receptionistUser);
                receptionistStaff.setFirstName("Emma");
                receptionistStaff.setLastName("Rodriguez");
                receptionistStaff.setEmail("receptionist@dentaflow.com");
                receptionistStaff.setPhone("0773456789");
                receptionistStaff.setRole("RECEPTIONIST");
                receptionistStaff.setStaffCode("STF-REC01");
                receptionistStaff.setStatus("ACTIVE");
                staffRepository.save(receptionistStaff);
                System.out.println("Demo receptionist profile created: Emma Rodriguez");
            }

            // 3.4 Cashier (cashier@dentaflow.com - Role: CASHIER)
            Role cashierRole = roleRepository.findByName("CASHIER")
                    .orElseGet(() -> roleRepository.findByName("STAFF")
                            .orElseThrow(() -> new RuntimeException("CASHIER/STAFF role not found")));
            User cashierUser = userRepository.findByEmail("cashier@dentaflow.com").orElse(null);
            if (cashierUser == null) {
                cashierUser = new User();
                cashierUser.setFirstName("Michael");
                cashierUser.setLastName("Chen");
                cashierUser.setEmail("cashier@dentaflow.com");
                cashierUser.setPhone("0774567890");
                cashierUser.setPassword(passwordEncoder.encode(defaultPwd));
                cashierUser.setRole(cashierRole);
                cashierUser.setStatus("ACTIVE");
                cashierUser.setPreferredLanguage("EN");
                cashierUser.setAuthProvider("LOCAL");
                cashierUser.setEmailVerified("YES");
                cashierUser = userRepository.save(cashierUser);
                System.out.println("Demo cashier account created: cashier@dentaflow.com");
            } else {
                cashierUser.setPassword(passwordEncoder.encode(defaultPwd));
                cashierUser.setRole(cashierRole);
                cashierUser.setStatus("ACTIVE");
                cashierUser = userRepository.save(cashierUser);
            }

            if (staffRepository.findByUserId(cashierUser.getId()).isEmpty()) {
                Staff cashierStaff = new Staff();
                cashierStaff.setUser(cashierUser);
                cashierStaff.setFirstName("Michael");
                cashierStaff.setLastName("Chen");
                cashierStaff.setEmail("cashier@dentaflow.com");
                cashierStaff.setPhone("0774567890");
                cashierStaff.setRole("CASHIER");
                cashierStaff.setStaffCode("STF-CSH01");
                cashierStaff.setStatus("ACTIVE");
                staffRepository.save(cashierStaff);
                System.out.println("Demo cashier profile created: Michael Chen");
            }

            // 3.5 Pharmacist (pharmacist@dentaflow.com - Role: PHARMACIST)
            Role pharmacistRole = roleRepository.findByName("PHARMACIST")
                    .orElseGet(() -> roleRepository.findByName("STAFF")
                            .orElseThrow(() -> new RuntimeException("PHARMACIST/STAFF role not found")));
            User pharmacistUser = userRepository.findByEmail("pharmacist@dentaflow.com").orElse(null);
            if (pharmacistUser == null) {
                pharmacistUser = new User();
                pharmacistUser.setFirstName("Lisa");
                pharmacistUser.setLastName("Thompson");
                pharmacistUser.setEmail("pharmacist@dentaflow.com");
                pharmacistUser.setPhone("0775678901");
                pharmacistUser.setPassword(passwordEncoder.encode(defaultPwd));
                pharmacistUser.setRole(pharmacistRole);
                pharmacistUser.setStatus("ACTIVE");
                pharmacistUser.setPreferredLanguage("EN");
                pharmacistUser.setAuthProvider("LOCAL");
                pharmacistUser.setEmailVerified("YES");
                pharmacistUser = userRepository.save(pharmacistUser);
                System.out.println("Demo pharmacist account created: pharmacist@dentaflow.com");
            } else {
                pharmacistUser.setPassword(passwordEncoder.encode(defaultPwd));
                pharmacistUser.setRole(pharmacistRole);
                pharmacistUser.setStatus("ACTIVE");
                pharmacistUser = userRepository.save(pharmacistUser);
            }

            if (staffRepository.findByUserId(pharmacistUser.getId()).isEmpty()) {
                Staff pharmacistStaff = new Staff();
                pharmacistStaff.setUser(pharmacistUser);
                pharmacistStaff.setFirstName("Lisa");
                pharmacistStaff.setLastName("Thompson");
                pharmacistStaff.setEmail("pharmacist@dentaflow.com");
                pharmacistStaff.setPhone("0775678901");
                pharmacistStaff.setRole("PHARMACIST");
                pharmacistStaff.setStaffCode("STF-PHM01");
                pharmacistStaff.setStatus("ACTIVE");
                staffRepository.save(pharmacistStaff);
                System.out.println("Demo pharmacist profile created: Lisa Thompson");
            }

            // =====================================================
            // 4. SEED INITIAL CLINICAL MESSAGES (IF NONE EXIST)
            // =====================================================
            if (messageRepository.count() == 0 && dentistUser != null && receptionistUser != null) {
                Patient demoPatient = patientRepository.findByUserId(patientUser.getId()).orElse(null);

                // Message 1: Emma Rodriguez (Receptionist) -> Dr. James Wilson
                Message msg1 = new Message();
                msg1.setSender(receptionistUser);
                msg1.setReceiver(dentistUser);
                msg1.setSubject("Patient Arrival Notice");
                msg1.setContent("Patient Sarah Mitchell has arrived at reception for her consultation.");
                msg1.setPriority("IMPORTANT");
                msg1.setStatus("READ");
                msg1.setSentAt(LocalDateTime.now().minusMinutes(25));
                msg1.setReadAt(LocalDateTime.now().minusMinutes(20));
                msg1.setPatient(demoPatient);
                messageRepository.save(msg1);

                // Message 2: Dr. James Wilson -> Emma Rodriguez
                Message msg2 = new Message();
                msg2.setSender(dentistUser);
                msg2.setReceiver(receptionistUser);
                msg2.setSubject("Patient Arrival Notice");
                msg2.setContent("Thank you Emma. Please ask her to take a seat in waiting room 2, I will be ready in 5 minutes.");
                msg2.setPriority("NORMAL");
                msg2.setStatus("READ");
                msg2.setSentAt(LocalDateTime.now().minusMinutes(18));
                msg2.setReadAt(LocalDateTime.now().minusMinutes(16));
                msg2.setPatient(demoPatient);
                messageRepository.save(msg2);

                // Message 3: Lisa Thompson (Pharmacist) -> Dr. James Wilson
                if (pharmacistUser != null) {
                    Message msg3 = new Message();
                    msg3.setSender(pharmacistUser);
                    msg3.setReceiver(dentistUser);
                    msg3.setSubject("Prescription Clarification");
                    msg3.setContent("Hi Dr. Wilson, regarding the Amoxicillin dosage for Sarah Mitchell, please confirm if 500mg TID is required.");
                    msg3.setPriority("NORMAL");
                    msg3.setStatus("SENT");
                    msg3.setSentAt(LocalDateTime.now().minusHours(2));
                    msg3.setPatient(demoPatient);
                    messageRepository.save(msg3);
                }
                System.out.println("Demo clinical messages seeded successfully.");
            }

            // Ensure Dr. Emily Carter has demo password set if exists
            User emilyUser = userRepository.findByEmail("emily.carter@dentaflow.com").orElse(null);
            if (emilyUser != null) {
                emilyUser.setPassword(passwordEncoder.encode(defaultPwd));
                userRepository.save(emilyUser);
            }

            // =====================================================
            // 5. SEED INITIAL DEMO APPOINTMENTS (IF NONE EXIST)
            // =====================================================
            if (appointmentRepository.count() == 0 && demoDentist != null) {
                Patient demoPatient = patientRepository.findByUserId(patientUser.getId()).orElse(null);
                if (demoPatient != null) {
                    LocalDate today = LocalDate.now();

                    // Appointment 1: Waiting in Lounge (Today 10:00 - 10:30)
                    Appointment a1 = new Appointment();
                    a1.setAppointmentCode("APT-" + today.toString().replace("-", "") + "-001");
                    a1.setDentist(demoDentist);
                    a1.setPatient(demoPatient);
                    a1.setAppointmentDate(today);
                    a1.setStartTime(LocalTime.of(10, 0));
                    a1.setEndTime(LocalTime.of(10, 30));
                    a1.setAppointmentType("Routine Checkup & Prophylaxis");
                    a1.setStatus("WAITING");
                    a1.setReason("Annual oral hygiene check and routine scaling");
                    a1.setNotes("Checked in at reception desk, currently seated in waiting lounge");
                    a1.setBookingSource("ONLINE");
                    a1.setReminderSent(true);
                    appointmentRepository.save(a1);

                    // Appointment 2: In Dental Chair (Today 11:00 - 11:30)
                    Appointment a2 = new Appointment();
                    a2.setAppointmentCode("APT-" + today.toString().replace("-", "") + "-002");
                    a2.setDentist(demoDentist);
                    a2.setPatient(demoPatient);
                    a2.setAppointmentDate(today);
                    a2.setStartTime(LocalTime.of(11, 0));
                    a2.setEndTime(LocalTime.of(11, 30));
                    a2.setAppointmentType("Dental Restoration / Composite Filling");
                    a2.setStatus("IN_CONSULTATION");
                    a2.setReason("Tooth 16 composite restoration and cavity preparation");
                    a2.setNotes("In operatory chair, procedure in progress");
                    a2.setBookingSource("ONLINE");
                    a2.setReminderSent(true);
                    appointmentRepository.save(a2);

                    // Appointment 3: Completed Today (Today 09:00 - 09:30)
                    Appointment a3 = new Appointment();
                    a3.setAppointmentCode("APT-" + today.toString().replace("-", "") + "-003");
                    a3.setDentist(demoDentist);
                    a3.setPatient(demoPatient);
                    a3.setAppointmentDate(today);
                    a3.setStartTime(LocalTime.of(9, 0));
                    a3.setEndTime(LocalTime.of(9, 30));
                    a3.setAppointmentType("Initial Assessment & Radiograph Review");
                    a3.setStatus("COMPLETED");
                    a3.setReason("Follow-up evaluation and periapical X-Ray review");
                    a3.setNotes("Completed successfully, clinical notes recorded and prescription issued");
                    a3.setBookingSource("ONLINE");
                    a3.setReminderSent(true);
                    appointmentRepository.save(a3);

                    // Appointment 4: Upcoming Confirmed (Day after tomorrow 14:00 - 14:30)
                    LocalDate futureDate = today.plusDays(2);
                    Appointment a4 = new Appointment();
                    a4.setAppointmentCode("APT-" + futureDate.toString().replace("-", "") + "-001");
                    a4.setDentist(demoDentist);
                    a4.setPatient(demoPatient);
                    a4.setAppointmentDate(futureDate);
                    a4.setStartTime(LocalTime.of(14, 0));
                    a4.setEndTime(LocalTime.of(14, 30));
                    a4.setAppointmentType("Orthodontic Follow-up");
                    a4.setStatus("CONFIRMED");
                    a4.setReason("Bracket check and archwire tension adjustment");
                    a4.setNotes("Confirmed consultation");
                    a4.setBookingSource("ONLINE");
                    a4.setReminderSent(false);
                    appointmentRepository.save(a4);

                    System.out.println("Demo appointments seeded successfully.");
                }
            }
        };
    }

    private void createRole(RoleRepository roleRepository, String name, String description) {
        if (!roleRepository.existsByName(name)) {
            Role role = new Role(name, description);
            roleRepository.save(role);
            System.out.println("Role created: " + name);
        }
    }
}