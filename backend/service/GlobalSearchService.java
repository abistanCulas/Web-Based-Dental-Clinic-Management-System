package com.dentaflow.backend.service;

import com.dentaflow.backend.dto.GlobalSearchResponseDTO;
import com.dentaflow.backend.dto.SearchCategoryDTO;
import com.dentaflow.backend.dto.SearchItemDTO;
import com.dentaflow.backend.entity.Appointment;
import com.dentaflow.backend.entity.Dentist;
import com.dentaflow.backend.entity.MedicalRecord;
import com.dentaflow.backend.entity.Medicine;
import com.dentaflow.backend.entity.Patient;
import com.dentaflow.backend.entity.Prescription;
import com.dentaflow.backend.entity.Staff;
import com.dentaflow.backend.entity.TreatmentPlan;
import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.repository.AppointmentRepository;
import com.dentaflow.backend.repository.DentistRepository;
import com.dentaflow.backend.repository.MedicalRecordRepository;
import com.dentaflow.backend.repository.MedicineRepository;
import com.dentaflow.backend.repository.PatientRepository;
import com.dentaflow.backend.repository.PrescriptionRepository;
import com.dentaflow.backend.repository.StaffRepository;
import com.dentaflow.backend.repository.TreatmentPlanRepository;
import com.dentaflow.backend.security.AccessControlService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class GlobalSearchService {

    private static final int MAX_RESULTS_PER_CATEGORY = 6;

    private final AccessControlService accessControlService;
    private final PatientRepository patientRepository;
    private final DentistRepository dentistRepository;
    private final StaffRepository staffRepository;
    private final AppointmentRepository appointmentRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final TreatmentPlanRepository treatmentPlanRepository;
    private final MedicineRepository medicineRepository;

    public GlobalSearchService(
            AccessControlService accessControlService,
            PatientRepository patientRepository,
            DentistRepository dentistRepository,
            StaffRepository staffRepository,
            AppointmentRepository appointmentRepository,
            MedicalRecordRepository medicalRecordRepository,
            PrescriptionRepository prescriptionRepository,
            TreatmentPlanRepository treatmentPlanRepository,
            MedicineRepository medicineRepository) {
        this.accessControlService = accessControlService;
        this.patientRepository = patientRepository;
        this.dentistRepository = dentistRepository;
        this.staffRepository = staffRepository;
        this.appointmentRepository = appointmentRepository;
        this.medicalRecordRepository = medicalRecordRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.treatmentPlanRepository = treatmentPlanRepository;
        this.medicineRepository = medicineRepository;
    }

    @Transactional(readOnly = true)
    public GlobalSearchResponseDTO search(String rawQuery) {
        User currentUser = accessControlService.getCurrentUser();
        if (currentUser == null) {
            throw new AccessDeniedException("User is not authenticated");
        }

        String query = rawQuery != null ? rawQuery.trim() : "";
        if (query.length() < 2) {
            return GlobalSearchResponseDTO.builder()
                    .query(query)
                    .totalResults(0)
                    .categories(Collections.emptyList())
                    .build();
        }

        List<SearchCategoryDTO> categories = new ArrayList<>();

        if (accessControlService.isAdmin()) {
            searchAsAdmin(query, categories);
        } else if (accessControlService.hasRole("DOCTOR") || accessControlService.hasRole("DENTIST")) {
            searchAsDoctor(currentUser, query, categories);
        } else if (accessControlService.hasRole("RECEPTIONIST") || accessControlService.hasRole("STAFF")) {
            searchAsStaff(query, categories);
        } else if (accessControlService.hasRole("PATIENT")) {
            searchAsPatient(currentUser, query, categories);
        } else if (accessControlService.hasRole("PHARMACIST")) {
            searchAsPharmacist(query, categories);
        } else if (accessControlService.hasRole("CASHIER") || accessControlService.hasRole("USER")) {
            searchAsCashier(query, categories);
        } else {
            // Default fallback: public doctors and modules
            searchDefault(query, categories);
        }

        int totalResults = categories.stream().mapToInt(SearchCategoryDTO::getCount).sum();

        return GlobalSearchResponseDTO.builder()
                .query(query)
                .totalResults(totalResults)
                .categories(categories)
                .build();
    }

    // =========================================================
    // ADMIN SEARCH
    // =========================================================
    private void searchAsAdmin(String query, List<SearchCategoryDTO> categories) {
        // 1. Patients
        List<Patient> patients = patientRepository.searchAcrossFields(query);
        addCategory(categories, "Patients", "patients", patients.stream()
                .limit(MAX_RESULTS_PER_CATEGORY)
                .map(p -> SearchItemDTO.builder()
                        .id("patient-" + p.getId())
                        .title(p.getFirstName() + " " + p.getLastName())
                        .subtitle((p.getPatientCode() != null ? p.getPatientCode() : "") +
                                (p.getPhone() != null && !p.getPhone().isBlank() ? " • " + p.getPhone() : "") +
                                (p.getEmail() != null && !p.getEmail().isBlank() ? " • " + p.getEmail() : ""))
                        .category("Patients")
                        .url("/admin/patients")
                        .badge(p.getStatus() != null ? p.getStatus() : "ACTIVE")
                        .metadata(Map.of("patientId", p.getId(), "code", p.getPatientCode() != null ? p.getPatientCode() : ""))
                        .build())
                .toList());

        // 2. Doctors
        List<Dentist> doctors = dentistRepository.searchAcrossFields(query).stream()
                .filter(d -> !"DELETED".equalsIgnoreCase(d.getStatus()))
                .toList();
        addCategory(categories, "Doctors", "doctors", doctors.stream()
                .limit(MAX_RESULTS_PER_CATEGORY)
                .map(d -> SearchItemDTO.builder()
                        .id("doctor-" + d.getId())
                        .title("Dr. " + d.getFirstName() + " " + d.getLastName())
                        .subtitle((d.getSpecialization() != null ? d.getSpecialization() : "Dentist") +
                                (d.getDentistCode() != null ? " • " + d.getDentistCode() : ""))
                        .category("Doctors")
                        .url("/admin/doctors")
                        .badge(d.getStatus() != null ? d.getStatus() : "ACTIVE")
                        .metadata(Map.of("dentistId", d.getId(), "code", d.getDentistCode() != null ? d.getDentistCode() : ""))
                        .build())
                .toList());

        // 3. Staff
        List<Staff> staffMembers = staffRepository.searchAcrossFields(query).stream()
                .filter(s -> !"DELETED".equalsIgnoreCase(s.getStatus()))
                .filter(s -> s.getRole() == null ||
                        (!s.getRole().toLowerCase().contains("doctor") && !s.getRole().toLowerCase().contains("dentist")))
                .toList();
        addCategory(categories, "Staff", "receptionist", staffMembers.stream()
                .limit(MAX_RESULTS_PER_CATEGORY)
                .map(s -> SearchItemDTO.builder()
                        .id("staff-" + s.getId())
                        .title(s.getFirstName() + " " + s.getLastName())
                        .subtitle((s.getRole() != null ? s.getRole() : "Staff") +
                                (s.getStaffCode() != null ? " • " + s.getStaffCode() : ""))
                        .category("Staff")
                        .url("/admin/staff")
                        .badge(s.getStatus() != null ? s.getStatus() : "ACTIVE")
                        .metadata(Map.of("staffId", s.getId(), "code", s.getStaffCode() != null ? s.getStaffCode() : ""))
                        .build())
                .toList());

        // 4. Appointments
        List<Appointment> appointments = appointmentRepository.searchAcrossFields(query);
        addCategory(categories, "Appointments", "calendar", appointments.stream()
                .limit(MAX_RESULTS_PER_CATEGORY)
                .map(a -> {
                    String patName = a.getPatient() != null ? a.getPatient().getFirstName() + " " + a.getPatient().getLastName() : "Patient";
                    String docName = a.getDentist() != null ? "Dr. " + a.getDentist().getLastName() : "Dentist";
                    return SearchItemDTO.builder()
                            .id("appointment-" + a.getId())
                            .title(a.getAppointmentCode() + " • " + (a.getAppointmentType() != null ? a.getAppointmentType() : "Appointment"))
                            .subtitle(a.getAppointmentDate() + " " + (a.getStartTime() != null ? a.getStartTime() : "") +
                                    " • " + patName + " with " + docName)
                            .category("Appointments")
                            .url("/admin/appointments")
                            .badge(a.getStatus() != null ? a.getStatus() : "CONFIRMED")
                            .metadata(Map.of("appointmentId", a.getId(), "code", a.getAppointmentCode() != null ? a.getAppointmentCode() : ""))
                            .build();
                })
                .toList());

        // 5. Relevant Modules
        searchModules(query, ADMIN_MODULES, categories);
    }

    // =========================================================
    // DOCTOR SEARCH
    // =========================================================
    private void searchAsDoctor(User currentUser, String query, List<SearchCategoryDTO> categories) {
        Optional<Dentist> dentistOpt = dentistRepository.findByUserId(currentUser.getId());
        Long dentistId = dentistOpt.map(Dentist::getId).orElse(null);

        // 1. Patients (Doctor can search clinic patients)
        List<Patient> patients = patientRepository.searchAcrossFields(query);
        addCategory(categories, "Patients", "patients", patients.stream()
                .limit(MAX_RESULTS_PER_CATEGORY)
                .map(p -> SearchItemDTO.builder()
                        .id("patient-" + p.getId())
                        .title(p.getFirstName() + " " + p.getLastName())
                        .subtitle((p.getPatientCode() != null ? p.getPatientCode() : "") +
                                (p.getPhone() != null && !p.getPhone().isBlank() ? " • " + p.getPhone() : ""))
                        .category("Patients")
                        .url("/doctor/patients")
                        .badge(p.getStatus() != null ? p.getStatus() : "ACTIVE")
                        .metadata(Map.of("patientId", p.getId(), "code", p.getPatientCode() != null ? p.getPatientCode() : ""))
                        .build())
                .toList());

        // 2. Appointments (Doctor-scoped)
        List<Appointment> appointments = dentistId != null
                ? appointmentRepository.searchByDentistAndKeyword(dentistId, query)
                : Collections.emptyList();
        addCategory(categories, "Appointments", "calendar", appointments.stream()
                .limit(MAX_RESULTS_PER_CATEGORY)
                .map(a -> {
                    String patName = a.getPatient() != null ? a.getPatient().getFirstName() + " " + a.getPatient().getLastName() : "Patient";
                    return SearchItemDTO.builder()
                            .id("appointment-" + a.getId())
                            .title(a.getAppointmentCode() + " • " + patName)
                            .subtitle(a.getAppointmentDate() + " " + (a.getStartTime() != null ? a.getStartTime() : "") +
                                    " • " + (a.getAppointmentType() != null ? a.getAppointmentType() : ""))
                            .category("Appointments")
                            .url("/doctor/appointments")
                            .badge(a.getStatus() != null ? a.getStatus() : "CONFIRMED")
                            .metadata(Map.of("appointmentId", a.getId(), "code", a.getAppointmentCode() != null ? a.getAppointmentCode() : ""))
                            .build();
                })
                .toList());

        // 3. Clinical Records (Doctor-scoped)
        List<MedicalRecord> records = dentistId != null
                ? medicalRecordRepository.searchByDentistAndKeyword(dentistId, query)
                : Collections.emptyList();
        addCategory(categories, "Clinical Records", "records", records.stream()
                .limit(MAX_RESULTS_PER_CATEGORY)
                .map(m -> {
                    String patName = m.getPatient() != null ? m.getPatient().getFirstName() + " " + m.getPatient().getLastName() : "Patient";
                    return SearchItemDTO.builder()
                            .id("record-" + m.getId())
                            .title((m.getRecordType() != null ? m.getRecordType() : "Clinical") + " Record • " + patName)
                            .subtitle(m.getRecordDate() + (m.getDiagnosis() != null && !m.getDiagnosis().isBlank() ? " • " + m.getDiagnosis() : ""))
                            .category("Clinical Records")
                            .url("/doctor/records")
                            .badge(m.getStatus() != null ? m.getStatus() : "ACTIVE")
                            .metadata(Map.of("recordId", m.getId()))
                            .build();
                })
                .toList());

        // 4. Prescriptions (Doctor-scoped)
        List<Prescription> prescriptions = dentistId != null
                ? prescriptionRepository.searchByDentistAndKeyword(dentistId, query)
                : Collections.emptyList();
        addCategory(categories, "Prescriptions", "prescription", prescriptions.stream()
                .limit(MAX_RESULTS_PER_CATEGORY)
                .map(p -> {
                    String patName = p.getPatient() != null ? p.getPatient().getFirstName() + " " + p.getPatient().getLastName() : "Patient";
                    return SearchItemDTO.builder()
                            .id("prescription-" + p.getId())
                            .title(p.getPrescriptionCode() + " • " + patName)
                            .subtitle(p.getPrescriptionDate() + (p.getDiagnosis() != null && !p.getDiagnosis().isBlank() ? " • " + p.getDiagnosis() : ""))
                            .category("Prescriptions")
                            .url("/doctor/prescriptions")
                            .badge(p.getStatus() != null ? p.getStatus() : "ACTIVE")
                            .metadata(Map.of("prescriptionId", p.getId(), "code", p.getPrescriptionCode() != null ? p.getPrescriptionCode() : ""))
                            .build();
                })
                .toList());

        // 5. Treatment Plans (Doctor-scoped)
        List<TreatmentPlan> plans = dentistId != null
                ? treatmentPlanRepository.searchByDentistAndKeyword(dentistId, query)
                : Collections.emptyList();
        addCategory(categories, "Treatment Plans", "plan", plans.stream()
                .limit(MAX_RESULTS_PER_CATEGORY)
                .map(t -> {
                    String patName = t.getPatient() != null ? t.getPatient().getFirstName() + " " + t.getPatient().getLastName() : "Patient";
                    return SearchItemDTO.builder()
                            .id("plan-" + t.getId())
                            .title(t.getPlanName() + " (" + t.getPlanCode() + ")")
                            .subtitle(patName + (t.getEstimatedTotalCost() != null ? " • LKR " + t.getEstimatedTotalCost() : ""))
                            .category("Treatment Plans")
                            .url("/doctor/treatment-plans")
                            .badge(t.getStatus() != null ? t.getStatus() : "PROPOSED")
                            .metadata(Map.of("planId", t.getId(), "code", t.getPlanCode() != null ? t.getPlanCode() : ""))
                            .build();
                })
                .toList());

        // 6. Doctor Modules
        searchModules(query, DOCTOR_MODULES, categories);
    }

    // =========================================================
    // STAFF / RECEPTIONIST SEARCH
    // =========================================================
    private void searchAsStaff(String query, List<SearchCategoryDTO> categories) {
        // 1. Patients
        List<Patient> patients = patientRepository.searchAcrossFields(query);
        addCategory(categories, "Patients", "patients", patients.stream()
                .limit(MAX_RESULTS_PER_CATEGORY)
                .map(p -> SearchItemDTO.builder()
                        .id("patient-" + p.getId())
                        .title(p.getFirstName() + " " + p.getLastName())
                        .subtitle((p.getPatientCode() != null ? p.getPatientCode() : "") +
                                (p.getPhone() != null && !p.getPhone().isBlank() ? " • " + p.getPhone() : ""))
                        .category("Patients")
                        .url("/receptionist/patients")
                        .badge(p.getStatus() != null ? p.getStatus() : "ACTIVE")
                        .metadata(Map.of("patientId", p.getId(), "code", p.getPatientCode() != null ? p.getPatientCode() : ""))
                        .build())
                .toList());

        // 2. Appointments
        List<Appointment> appointments = appointmentRepository.searchAcrossFields(query);
        addCategory(categories, "Appointments", "calendar", appointments.stream()
                .limit(MAX_RESULTS_PER_CATEGORY)
                .map(a -> {
                    String patName = a.getPatient() != null ? a.getPatient().getFirstName() + " " + a.getPatient().getLastName() : "Patient";
                    String docName = a.getDentist() != null ? "Dr. " + a.getDentist().getLastName() : "Dentist";
                    return SearchItemDTO.builder()
                            .id("appointment-" + a.getId())
                            .title(a.getAppointmentCode() + " • " + patName)
                            .subtitle(a.getAppointmentDate() + " " + (a.getStartTime() != null ? a.getStartTime() : "") +
                                    " • " + docName)
                            .category("Appointments")
                            .url("/receptionist/appointments")
                            .badge(a.getStatus() != null ? a.getStatus() : "CONFIRMED")
                            .metadata(Map.of("appointmentId", a.getId(), "code", a.getAppointmentCode() != null ? a.getAppointmentCode() : ""))
                            .build();
                })
                .toList());

        // 3. Doctors
        List<Dentist> doctors = dentistRepository.searchAcrossFields(query);
        addCategory(categories, "Doctors", "doctors", doctors.stream()
                .limit(MAX_RESULTS_PER_CATEGORY)
                .map(d -> SearchItemDTO.builder()
                        .id("doctor-" + d.getId())
                        .title("Dr. " + d.getFirstName() + " " + d.getLastName())
                        .subtitle((d.getSpecialization() != null ? d.getSpecialization() : "Dentist") +
                                (d.getDentistCode() != null ? " • " + d.getDentistCode() : ""))
                        .category("Doctors")
                        .url("/receptionist/schedule")
                        .badge(d.getStatus() != null ? d.getStatus() : "ACTIVE")
                        .metadata(Map.of("dentistId", d.getId(), "code", d.getDentistCode() != null ? d.getDentistCode() : ""))
                        .build())
                .toList());

        // 4. Staff
        List<Staff> staffMembers = staffRepository.searchAcrossFields(query).stream()
                .filter(s -> s.getRole() == null ||
                        (!s.getRole().toLowerCase().contains("doctor") && !s.getRole().toLowerCase().contains("dentist")))
                .toList();
        addCategory(categories, "Staff", "receptionist", staffMembers.stream()
                .limit(MAX_RESULTS_PER_CATEGORY)
                .map(s -> SearchItemDTO.builder()
                        .id("staff-" + s.getId())
                        .title(s.getFirstName() + " " + s.getLastName())
                        .subtitle((s.getRole() != null ? s.getRole() : "Staff") +
                                (s.getStaffCode() != null ? " • " + s.getStaffCode() : ""))
                        .category("Staff")
                        .url("/receptionist/schedule")
                        .badge(s.getStatus() != null ? s.getStatus() : "ACTIVE")
                        .metadata(Map.of("staffId", s.getId(), "code", s.getStaffCode() != null ? s.getStaffCode() : ""))
                        .build())
                .toList());

        // 5. Receptionist Modules
        searchModules(query, RECEPTIONIST_MODULES, categories);
    }

    // =========================================================
    // PATIENT SEARCH
    // =========================================================
    private void searchAsPatient(User currentUser, String query, List<SearchCategoryDTO> categories) {
        Optional<Patient> patientOpt = patientRepository.findByUserId(currentUser.getId());
        Long patientId = patientOpt.map(Patient::getId).orElse(null);

        // 1. My Appointments (Only own appointments)
        if (patientId != null) {
            List<Appointment> appointments = appointmentRepository.searchByPatientAndKeyword(patientId, query);
            addCategory(categories, "My Appointments", "calendar", appointments.stream()
                    .limit(MAX_RESULTS_PER_CATEGORY)
                    .map(a -> {
                        String docName = a.getDentist() != null ? "Dr. " + a.getDentist().getFirstName() + " " + a.getDentist().getLastName() : "Dentist";
                        return SearchItemDTO.builder()
                                .id("appointment-" + a.getId())
                                .title((a.getAppointmentType() != null ? a.getAppointmentType() : "Appointment") +
                                        " (" + a.getAppointmentCode() + ")")
                                .subtitle(a.getAppointmentDate() + " at " + (a.getStartTime() != null ? a.getStartTime() : "") +
                                        " • " + docName)
                                .category("My Appointments")
                                .url("/patient/appointments")
                                .badge(a.getStatus() != null ? a.getStatus() : "CONFIRMED")
                                .metadata(Map.of("appointmentId", a.getId(), "code", a.getAppointmentCode() != null ? a.getAppointmentCode() : ""))
                                .build();
                    })
                    .toList());
        }

        // 2. Doctors (Patient can browse active doctors to book)
        List<Dentist> doctors = dentistRepository.searchAcrossFieldsAndStatus(query, "ACTIVE");
        addCategory(categories, "Doctors", "doctors", doctors.stream()
                .limit(MAX_RESULTS_PER_CATEGORY)
                .map(d -> SearchItemDTO.builder()
                        .id("doctor-" + d.getId())
                        .title("Dr. " + d.getFirstName() + " " + d.getLastName())
                        .subtitle(d.getSpecialization() != null ? d.getSpecialization() : "Dentist")
                        .category("Doctors")
                        .url("/patient/book-appointment")
                        .badge("Available")
                        .metadata(Map.of("dentistId", d.getId(), "code", d.getDentistCode() != null ? d.getDentistCode() : ""))
                        .build())
                .toList());

        // 3. Medical Records (Only own records)
        if (patientId != null) {
            List<MedicalRecord> records = medicalRecordRepository.searchByPatientAndKeyword(patientId, query);
            addCategory(categories, "Medical Records", "records", records.stream()
                    .limit(MAX_RESULTS_PER_CATEGORY)
                    .map(m -> {
                        String docName = m.getDentist() != null ? "Dr. " + m.getDentist().getLastName() : "";
                        return SearchItemDTO.builder()
                                .id("record-" + m.getId())
                                .title((m.getRecordType() != null ? m.getRecordType() : "Clinical") + " Record")
                                .subtitle(m.getRecordDate() + (!docName.isBlank() ? " • " + docName : "") +
                                        (m.getDiagnosis() != null && !m.getDiagnosis().isBlank() ? " • " + m.getDiagnosis() : ""))
                                .category("Medical Records")
                                .url("/patient/records")
                                .badge(m.getStatus() != null ? m.getStatus() : "ACTIVE")
                                .metadata(Map.of("recordId", m.getId()))
                                .build();
                    })
                    .toList());
        }

        // 4. Prescriptions (Only own prescriptions)
        if (patientId != null) {
            List<Prescription> prescriptions = prescriptionRepository.searchByPatientAndKeyword(patientId, query);
            addCategory(categories, "Prescriptions", "prescription", prescriptions.stream()
                    .limit(MAX_RESULTS_PER_CATEGORY)
                    .map(p -> {
                        String docName = p.getDentist() != null ? "Dr. " + p.getDentist().getLastName() : "";
                        return SearchItemDTO.builder()
                                .id("prescription-" + p.getId())
                                .title(p.getPrescriptionCode())
                                .subtitle(p.getPrescriptionDate() + (!docName.isBlank() ? " • " + docName : "") +
                                        (p.getDiagnosis() != null && !p.getDiagnosis().isBlank() ? " • " + p.getDiagnosis() : ""))
                                .category("Prescriptions")
                                .url("/patient/prescriptions")
                                .badge(p.getStatus() != null ? p.getStatus() : "ACTIVE")
                                .metadata(Map.of("prescriptionId", p.getId(), "code", p.getPrescriptionCode() != null ? p.getPrescriptionCode() : ""))
                                .build();
                    })
                    .toList());
        }

        // 5. Patient Modules
        searchModules(query, PATIENT_MODULES, categories);
    }

    // =========================================================
    // PHARMACIST SEARCH
    // =========================================================
    private void searchAsPharmacist(String query, List<SearchCategoryDTO> categories) {
        // 1. Medicines
        List<Medicine> medicines = medicineRepository.findByNameContainingIgnoreCase(query);
        if (medicines.isEmpty()) {
            medicines = medicineRepository.findByGenericNameContainingIgnoreCase(query);
        }
        addCategory(categories, "Medicines", "inventory", medicines.stream()
                .limit(MAX_RESULTS_PER_CATEGORY)
                .map(m -> SearchItemDTO.builder()
                        .id("medicine-" + m.getId())
                        .title(m.getName())
                        .subtitle((m.getGenericName() != null ? m.getGenericName() : "") +
                                (m.getStrength() != null ? " • " + m.getStrength() : ""))
                        .category("Medicines")
                        .url("/pharmacist/inventory")
                        .badge(m.getStatus() != null ? m.getStatus() : "ACTIVE")
                        .metadata(Map.of("medicineId", m.getId(), "code", m.getMedicineCode() != null ? m.getMedicineCode() : ""))
                        .build())
                .toList());

        // 2. Prescriptions
        List<Prescription> prescriptions = prescriptionRepository.searchAcrossFields(query);
        addCategory(categories, "Prescriptions", "prescription", prescriptions.stream()
                .limit(MAX_RESULTS_PER_CATEGORY)
                .map(p -> {
                    String patName = p.getPatient() != null ? p.getPatient().getFirstName() + " " + p.getPatient().getLastName() : "Patient";
                    return SearchItemDTO.builder()
                            .id("prescription-" + p.getId())
                            .title(p.getPrescriptionCode() + " • " + patName)
                            .subtitle(p.getPrescriptionDate() + (p.getDiagnosis() != null && !p.getDiagnosis().isBlank() ? " • " + p.getDiagnosis() : ""))
                            .category("Prescriptions")
                            .url("/pharmacist/prescriptions")
                            .badge(p.getStatus() != null ? p.getStatus() : "ACTIVE")
                            .metadata(Map.of("prescriptionId", p.getId(), "code", p.getPrescriptionCode() != null ? p.getPrescriptionCode() : ""))
                            .build();
                })
                .toList());

        // 3. Pharmacist Modules
        searchModules(query, PHARMACIST_MODULES, categories);
    }

    // =========================================================
    // CASHIER SEARCH
    // =========================================================
    private void searchAsCashier(String query, List<SearchCategoryDTO> categories) {
        // 1. Patients
        List<Patient> patients = patientRepository.searchAcrossFields(query);
        addCategory(categories, "Patients", "patients", patients.stream()
                .limit(MAX_RESULTS_PER_CATEGORY)
                .map(p -> SearchItemDTO.builder()
                        .id("patient-" + p.getId())
                        .title(p.getFirstName() + " " + p.getLastName())
                        .subtitle((p.getPatientCode() != null ? p.getPatientCode() : "") +
                                (p.getPhone() != null && !p.getPhone().isBlank() ? " • " + p.getPhone() : ""))
                        .category("Patients")
                        .url("/user/payments")
                        .badge(p.getStatus() != null ? p.getStatus() : "ACTIVE")
                        .metadata(Map.of("patientId", p.getId(), "code", p.getPatientCode() != null ? p.getPatientCode() : ""))
                        .build())
                .toList());

        // 2. Cashier Modules
        searchModules(query, CASHIER_MODULES, categories);
    }

    // =========================================================
    // DEFAULT SEARCH
    // =========================================================
    private void searchDefault(String query, List<SearchCategoryDTO> categories) {
        List<Dentist> doctors = dentistRepository.searchAcrossFieldsAndStatus(query, "ACTIVE");
        addCategory(categories, "Doctors", "doctors", doctors.stream()
                .limit(MAX_RESULTS_PER_CATEGORY)
                .map(d -> SearchItemDTO.builder()
                        .id("doctor-" + d.getId())
                        .title("Dr. " + d.getFirstName() + " " + d.getLastName())
                        .subtitle(d.getSpecialization() != null ? d.getSpecialization() : "Dentist")
                        .category("Doctors")
                        .url("/doctors/" + d.getId())
                        .badge("Active")
                        .metadata(Map.of("dentistId", d.getId()))
                        .build())
                .toList());
    }

    // =========================================================
    // HELPERS
    // =========================================================
    private void addCategory(List<SearchCategoryDTO> categories, String name, String icon, List<SearchItemDTO> items) {
        if (items != null && !items.isEmpty()) {
            categories.add(SearchCategoryDTO.builder()
                    .name(name)
                    .icon(icon)
                    .count(items.size())
                    .items(items)
                    .build());
        }
    }

    private void searchModules(String query, List<ModuleEntry> moduleList, List<SearchCategoryDTO> categories) {
        String lowerQuery = query.toLowerCase();
        List<SearchItemDTO> matched = moduleList.stream()
                .filter(m -> m.title.toLowerCase().contains(lowerQuery) ||
                        m.subtitle.toLowerCase().contains(lowerQuery) ||
                        m.keywords.toLowerCase().contains(lowerQuery))
                .limit(MAX_RESULTS_PER_CATEGORY)
                .map(m -> SearchItemDTO.builder()
                        .id("module-" + m.url)
                        .title(m.title)
                        .subtitle(m.subtitle)
                        .category("Modules")
                        .url(m.url)
                        .badge("Page")
                        .metadata(Map.of("type", "navigation"))
                        .build())
                .toList();

        addCategory(categories, "Modules", "dashboard", matched);
    }

    private record ModuleEntry(String title, String subtitle, String url, String keywords) {}

    private static final List<ModuleEntry> ADMIN_MODULES = List.of(
            new ModuleEntry("Admin Dashboard", "Overview & Metrics", "/admin", "overview home statistics metrics"),
            new ModuleEntry("Analytics", "Practice Analytics & Graphs", "/admin/analytics", "analytics charts data trends performance"),
            new ModuleEntry("User Management", "System Users & Roles", "/admin/users", "accounts credentials access staff passwords"),
            new ModuleEntry("Patients", "Patient Directory & Profiles", "/admin/patients", "patients records directory lookup"),
            new ModuleEntry("Doctors / Dentists", "Dentist Directory & Profiles", "/admin/doctors", "dentists doctors specialists clinicians"),
            new ModuleEntry("Staff Management", "Clinic Staff Members", "/admin/staff", "receptionists nurses assistants employees"),
            new ModuleEntry("Appointments", "All Clinic Appointments", "/admin/appointments", "booking schedule calendar visits"),
            new ModuleEntry("Schedule Management", "Dentist & Staff Schedules", "/admin/schedules", "shifts rosters working hours availability"),
            new ModuleEntry("Dental Services", "Procedures & Pricing Catalog", "/admin/services", "treatments pricing dental procedure costs"),
            new ModuleEntry("Billing & Payments", "Invoices, Payments & Financials", "/admin/billing", "revenue cashier fees money receipt"),
            new ModuleEntry("Inventory Management", "Dental Supplies & Stock", "/admin/inventory", "items stock products instruments"),
            new ModuleEntry("Suppliers", "Vendors & Contacts", "/admin/suppliers", "vendors suppliers distributors companies"),
            new ModuleEntry("Purchase Requests", "Pending Item Requests", "/admin/purchase-requests", "orders procurement requests requisitions"),
            new ModuleEntry("Purchase Orders", "Official Purchase Orders", "/admin/purchase-orders", "orders procurement po tracking"),
            new ModuleEntry("Low Stock Alerts", "Depleted Items Warning", "/admin/low-stock", "reorder critical stock shortage alert"),
            new ModuleEntry("Expiry Alerts", "Expiring Batches & Medicines", "/admin/expiry-alerts", "expiration date expired warning discard"),
            new ModuleEntry("Reports", "Financial & Clinical Reports", "/admin/reports", "downloads export pdf summary analysis"),
            new ModuleEntry("AI Reports", "AI Powered Clinical Insights", "/admin/ai-reports", "artificial intelligence insights forecast ai"),
            new ModuleEntry("Feedback & Reviews", "Patient Feedback Management", "/admin/feedback", "ratings reviews stars comments satisfaction"),
            new ModuleEntry("Inquiries", "Contact & Support Inquiries", "/admin/inquiries", "questions contact messages leads"),
            new ModuleEntry("Notifications", "System Alerts & Broadcasts", "/admin/notifications", "alerts reminders notices messages"),
            new ModuleEntry("Schedule Automation", "Automated Roster Generation", "/admin/schedule-automation", "cron auto scheduling generator"),
            new ModuleEntry("Audit Logs", "Security & Activity History", "/admin/audit", "security audit trail activity compliance logs"),
            new ModuleEntry("Admin Profile", "My Account Details", "/admin/profile", "profile avatar personal password"),
            new ModuleEntry("System Settings", "Configuration & Preferences", "/admin/settings", "preferences general security settings")
    );

    private static final List<ModuleEntry> DOCTOR_MODULES = List.of(
            new ModuleEntry("Doctor Overview", "Clinical Workspace", "/doctor", "workspace summary metrics today"),
            new ModuleEntry("Today's Appointments", "Scheduled Visits For Today", "/doctor/today", "calendar appointments queue in-chair"),
            new ModuleEntry("All Appointments", "Full Appointment History", "/doctor/appointments", "calendar history schedule upcoming visits"),
            new ModuleEntry("My Patients", "Patient Directory & Records", "/doctor/patients", "patients list directory clients charts"),
            new ModuleEntry("Patient Records", "Clinical Records & Notes", "/doctor/records", "clinical notes dental charts procedures diagnosis"),
            new ModuleEntry("Treatment Plans", "Patient Treatment Courses", "/doctor/treatment-plans", "procedures plan timeline stages estimated cost"),
            new ModuleEntry("Prescriptions", "Medical Prescriptions & Drugs", "/doctor/prescriptions", "medications rx drugs dosage instructions"),
            new ModuleEntry("Medical History", "Patient Historical Timeline", "/doctor/history", "allergies chronic conditions surgeries dental history"),
            new ModuleEntry("Messages", "Patient & Staff Messages", "/doctor/messages", "chat communication inquiries inbox"),
            new ModuleEntry("Availability & Schedule", "My Working Hours & Roster", "/doctor/schedule", "shifts working hours slots duty"),
            new ModuleEntry("Doctor Notifications", "Clinical Alerts & Updates", "/doctor/notifications", "alerts reminders messages")
    );

    private static final List<ModuleEntry> RECEPTIONIST_MODULES = List.of(
            new ModuleEntry("Reception Overview", "Front Desk Dashboard", "/receptionist", "desk front counter lobby summary"),
            new ModuleEntry("Patient Registration", "Register New Patient", "/receptionist/register-patient", "new patient enrollment add form"),
            new ModuleEntry("Patients Directory", "Lookup & Edit Patients", "/receptionist/patients", "patient records directory search lookup"),
            new ModuleEntry("Appointments", "Manage All Clinic Appointments", "/receptionist/appointments", "booking schedule calendar visits"),
            new ModuleEntry("Book Appointment", "Schedule New Visit", "/receptionist/book-appointment", "booking schedule calendar slot new"),
            new ModuleEntry("Doctor Schedule", "Dentist Working Hours & Slots", "/receptionist/schedule", "doctors roster shifts duty availability"),
            new ModuleEntry("Check-in & Queue", "Patient Queue & Waiting Room", "/receptionist/queue", "waiting lobby queue check-in arrival in-chair"),
            new ModuleEntry("Billing", "Invoices & Charges", "/receptionist/billing", "invoices fees bills dental services"),
            new ModuleEntry("Payments", "Process Payments", "/receptionist/payments", "cash card payhere receipt checkout"),
            new ModuleEntry("Reception Notifications", "Front Desk Alerts", "/receptionist/notifications", "alerts reminders messages")
    );

    private static final List<ModuleEntry> PATIENT_MODULES = List.of(
            new ModuleEntry("Patient Overview", "My Health Dashboard", "/patient", "home overview summary my health"),
            new ModuleEntry("My Appointments", "Upcoming & Past Visits", "/patient/appointments", "appointments visits doctor schedule upcoming"),
            new ModuleEntry("Book Appointment", "Schedule a Dental Visit", "/patient/book-appointment", "book appointment doctor dentist consultation slot"),
            new ModuleEntry("Appointment History", "Completed Visits Log", "/patient/history", "history past appointments visits archive"),
            new ModuleEntry("Medical Records", "My Dental Charts & Records", "/patient/records", "clinical records diagnosis x-rays treatments"),
            new ModuleEntry("Prescriptions", "My Prescribed Medications", "/patient/prescriptions", "prescriptions medicines rx drugs dosages"),
            new ModuleEntry("Payments & Billing", "Invoices & Payment History", "/patient/billing", "bills invoices receipts payments payhere"),
            new ModuleEntry("Reviews & Feedback", "Rate Your Dentist", "/patient/reviews", "review dentist feedback rating stars experience"),
            new ModuleEntry("Notifications", "Appointment Reminders & Notices", "/patient/notifications", "alerts reminders updates notices")
    );

    private static final List<ModuleEntry> PHARMACIST_MODULES = List.of(
            new ModuleEntry("Pharmacy Overview", "Pharmacy Hub", "/pharmacist", "home pharmacy overview stock metrics"),
            new ModuleEntry("Prescriptions", "Patient Prescriptions Queue", "/pharmacist/prescriptions", "prescriptions rx orders dispense patient"),
            new ModuleEntry("Dispense Medicines", "Fulfill Prescriptions", "/pharmacist/dispense", "dispense fulfill checkout medications"),
            new ModuleEntry("Medicine Inventory", "Medicines & Stock Levels", "/pharmacist/inventory", "medicines inventory stock catalog items"),
            new ModuleEntry("Low Stock Alerts", "Depleted Medicines", "/pharmacist/low-stock", "shortage reorder alerts urgent stock"),
            new ModuleEntry("Suppliers", "Pharmaceutical Suppliers", "/pharmacist/suppliers", "vendors suppliers distributors"),
            new ModuleEntry("Stock Transactions", "Inventory Movements", "/pharmacist/stock-transactions", "stock transactions in out audit"),
            new ModuleEntry("Medicine History", "Usage & Dispense Log", "/pharmacist/medicine-history", "dispensed history batch logs"),
            new ModuleEntry("Reports", "Pharmacy Analytics", "/pharmacist/reports", "pharmacy reports export metrics analytics"),
            new ModuleEntry("Notifications", "Pharmacy Alerts", "/pharmacist/notifications", "alerts notices reminders")
    );

    private static final List<ModuleEntry> CASHIER_MODULES = List.of(
            new ModuleEntry("Cashier Overview", "Cash Desk Dashboard", "/user", "cashier desk overview financials"),
            new ModuleEntry("Payments", "Process Payments", "/user/payments", "payments checkout cash payhere receipts"),
            new ModuleEntry("Invoices", "Patient Invoices", "/user/invoices", "invoices billing charges balances"),
            new ModuleEntry("Pending Payments", "Unpaid Invoices", "/user/pending", "unpaid overdue pending payments outstanding"),
            new ModuleEntry("Payment History", "Transaction History", "/user/history", "receipts history ledger transactions"),
            new ModuleEntry("Refunds", "Process Refunds", "/user/refunds", "refunds returns payment reversal"),
            new ModuleEntry("Reports", "Financial Reports", "/user/reports", "daily cash financial reports revenue export"),
            new ModuleEntry("Notifications", "Billing Alerts", "/user/notifications", "alerts notifications billing")
    );
}
