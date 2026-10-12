package com.dentaflow.backend.service;

import com.dentaflow.backend.entity.Patient;
import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

@Service
@Transactional
public class PatientService {

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    private static final Pattern PHONE_PATTERN =
            Pattern.compile("^[+]?[0-9\\s()-]{7,20}$");

    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final AppointmentRepository appointmentRepository;
    private final BillRepository billRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final TreatmentRepository treatmentRepository;
    private final TreatmentPlanRepository treatmentPlanRepository;

    public PatientService(
            PatientRepository patientRepository,
            UserRepository userRepository,
            AppointmentRepository appointmentRepository,
            BillRepository billRepository,
            PrescriptionRepository prescriptionRepository,
            MedicalRecordRepository medicalRecordRepository,
            TreatmentRepository treatmentRepository,
            TreatmentPlanRepository treatmentPlanRepository) {

        this.patientRepository = patientRepository;
        this.userRepository = userRepository;
        this.appointmentRepository = appointmentRepository;
        this.billRepository = billRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.medicalRecordRepository = medicalRecordRepository;
        this.treatmentRepository = treatmentRepository;
        this.treatmentPlanRepository = treatmentPlanRepository;
    }

    // =========================================================
    // CREATE PATIENT
    // =========================================================

    public Patient createPatient(Patient patient, Long userId) {

        if (patient == null) {
            throw new RuntimeException("Patient data is required");
        }

        if (patient.getFirstName() == null ||
                patient.getFirstName().trim().isEmpty()) {
            throw new RuntimeException("First name is required");
        }

        if (patient.getLastName() == null ||
                patient.getLastName().trim().isEmpty()) {
            throw new RuntimeException("Last name is required");
        }

        if (patient.getDateOfBirth() == null) {
            throw new RuntimeException("Date of birth is required");
        }

        if (patient.getDateOfBirth().isAfter(java.time.LocalDate.now())) {
            throw new RuntimeException("Date of birth cannot be in the future");
        }

        // Validate & normalize email
        if (patient.getEmail() != null && !patient.getEmail().trim().isEmpty()) {
            String email = patient.getEmail().trim().toLowerCase();
            if (!EMAIL_PATTERN.matcher(email).matches()) {
                throw new RuntimeException("Invalid email format");
            }
            if (patientRepository.existsByEmailIgnoreCase(email)) {
                throw new RuntimeException("Patient with this email already exists");
            }
            patient.setEmail(email);
        } else {
            patient.setEmail(null);
        }

        // Validate & normalize phone
        if (patient.getPhone() != null && !patient.getPhone().trim().isEmpty()) {
            String phone = patient.getPhone().trim();
            if (!PHONE_PATTERN.matcher(phone).matches()) {
                throw new RuntimeException("Invalid phone number format");
            }
            patient.setPhone(phone);
        } else {
            patient.setPhone(null);
        }

        // Check NIC only when provided
        if (patient.getNic() != null && !patient.getNic().trim().isEmpty()) {
            String nic = patient.getNic().trim();
            if (patientRepository.existsByNic(nic)) {
                throw new RuntimeException("Patient with this NIC already exists");
            }
            patient.setNic(nic);
        } else {
            patient.setNic(null);
        }

        // Validate gender
        if (patient.getGender() != null && !patient.getGender().trim().isEmpty()) {
            String gender = patient.getGender().trim().toUpperCase();
            if (!gender.equals("MALE") && !gender.equals("FEMALE") && !gender.equals("OTHER")) {
                throw new RuntimeException("Gender must be MALE, FEMALE, or OTHER");
            }
            patient.setGender(gender);
        }

        // Link existing user account
        if (userId != null) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() ->
                            new RuntimeException("User not found with id: " + userId));

            if (patientRepository.findByUserId(userId).isPresent()) {
                throw new RuntimeException("A patient profile already exists for this user");
            }

            patient.setUser(user);
        }

        // Generate patient code
        patient.setPatientCode(generatePatientCode());
        patient.setFirstName(patient.getFirstName().trim());
        patient.setLastName(patient.getLastName().trim());

        if (patient.getStatus() == null || patient.getStatus().trim().isEmpty()) {
            patient.setStatus("ACTIVE");
        } else {
            String status = patient.getStatus().trim().toUpperCase();
            if (!status.equals("ACTIVE") && !status.equals("INACTIVE")) {
                throw new RuntimeException("Status must be ACTIVE or INACTIVE");
            }
            patient.setStatus(status);
        }

        return patientRepository.save(patient);
    }

    // Generate unique patient code
    private String generatePatientCode() {

        long nextNumber = patientRepository.count() + 1;

        String code;

        do {
            code = String.format("P%04d", nextNumber);
            nextNumber++;
        } while (patientRepository.existsByPatientCode(code));

        return code;
    }

    // =========================================================
    // READ PATIENTS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Patient> getAllPatients() {
        return patientRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Patient getPatientById(Long id) {
        return patientRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Patient not found with id: " + id));
    }

    @Transactional(readOnly = true)
    public Patient getPatientByCode(String patientCode) {
        if (patientCode == null || patientCode.trim().isEmpty()) {
            throw new RuntimeException("Patient code is required");
        }

        return patientRepository.findByPatientCode(patientCode.trim().toUpperCase())
                .orElseThrow(() ->
                        new RuntimeException("Patient not found: " + patientCode));
    }

    @Transactional(readOnly = true)
    public Patient getPatientByNic(String nic) {
        if (nic == null || nic.trim().isEmpty()) {
            throw new RuntimeException("NIC is required");
        }

        return patientRepository.findByNic(nic.trim())
                .orElseThrow(() ->
                        new RuntimeException("Patient not found with NIC: " + nic));
    }

    public Patient getPatientByUserId(Long userId) {
        if (userId == null) {
            throw new RuntimeException("User ID is required");
        }

        return patientRepository.findByUserId(userId)
                .orElseGet(() -> {
                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));

                    Patient patient = new Patient();
                    patient.setUser(user);
                    patient.setFirstName(user.getFirstName() != null && !user.getFirstName().trim().isEmpty() ? user.getFirstName().trim() : "Patient");
                    patient.setLastName(user.getLastName() != null && !user.getLastName().trim().isEmpty() ? user.getLastName().trim() : "User");
                    patient.setEmail(user.getEmail());
                    patient.setPhone(user.getPhone() != null ? user.getPhone() : "");
                    patient.setDateOfBirth(java.time.LocalDate.of(2000, 1, 1));
                    patient.setGender("OTHER");
                    patient.setStatus("ACTIVE");
                    patient.setPatientCode(generatePatientCode());

                    return patientRepository.save(patient);
                });
    }

    @Transactional(readOnly = true)
    public List<Patient> getPatientsByStatus(String status) {
        if (status == null || status.trim().isEmpty()) {
            throw new RuntimeException("Status is required");
        }

        return patientRepository.findByStatus(status.trim().toUpperCase());
    }

    @Transactional(readOnly = true)
    public List<Patient> searchPatients(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return patientRepository.findAll();
        }

        String search = keyword.trim();
        return patientRepository.searchAcrossFields(search);
    }

    @Transactional(readOnly = true)
    public List<Patient> searchByPhone(String phone) {
        if (phone == null || phone.trim().isEmpty()) {
            return patientRepository.findAll();
        }

        return patientRepository.findByPhoneContaining(phone.trim());
    }

    @Transactional(readOnly = true)
    public List<Patient> searchByEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            return patientRepository.findAll();
        }

        return patientRepository.findByEmailContainingIgnoreCase(email.trim());
    }

    // =========================================================
    // UPDATE PATIENT
    // =========================================================

    public Patient updatePatient(Long id, Patient updatedPatient) {

        Patient existingPatient = getPatientById(id);

        if (updatedPatient == null) {
            throw new RuntimeException("Patient data is required");
        }

        if (updatedPatient.getFirstName() != null) {
            if (updatedPatient.getFirstName().trim().isEmpty()) {
                throw new RuntimeException("First name cannot be empty");
            }
            existingPatient.setFirstName(updatedPatient.getFirstName().trim());
        }

        if (updatedPatient.getLastName() != null) {
            if (updatedPatient.getLastName().trim().isEmpty()) {
                throw new RuntimeException("Last name cannot be empty");
            }
            existingPatient.setLastName(updatedPatient.getLastName().trim());
        }

        if (updatedPatient.getDateOfBirth() != null) {
            if (updatedPatient.getDateOfBirth().isAfter(java.time.LocalDate.now())) {
                throw new RuntimeException("Date of birth cannot be in the future");
            }
            existingPatient.setDateOfBirth(updatedPatient.getDateOfBirth());
        }

        if (updatedPatient.getEmail() != null) {
            String email = updatedPatient.getEmail().trim().toLowerCase();
            if (!email.isEmpty()) {
                if (!EMAIL_PATTERN.matcher(email).matches()) {
                    throw new RuntimeException("Invalid email format");
                }
                Optional<Patient> other = patientRepository.findByEmailIgnoreCase(email);
                if (other.isPresent() && !other.get().getId().equals(id)) {
                    throw new RuntimeException("Another patient already uses this email");
                }
                existingPatient.setEmail(email);
            } else {
                existingPatient.setEmail(null);
            }
        }

        if (updatedPatient.getPhone() != null) {
            String phone = updatedPatient.getPhone().trim();
            if (!phone.isEmpty()) {
                if (!PHONE_PATTERN.matcher(phone).matches()) {
                    throw new RuntimeException("Invalid phone number format");
                }
                existingPatient.setPhone(phone);
            } else {
                existingPatient.setPhone(null);
            }
        }

        if (updatedPatient.getNic() != null) {
            String newNic = updatedPatient.getNic().trim();
            if (!newNic.isEmpty()) {
                Optional<Patient> otherNic = patientRepository.findByNic(newNic);
                if (otherNic.isPresent() && !otherNic.get().getId().equals(id)) {
                    throw new RuntimeException("Another patient already uses this NIC");
                }
                existingPatient.setNic(newNic);
            } else {
                existingPatient.setNic(null);
            }
        }

        if (updatedPatient.getGender() != null) {
            String gender = updatedPatient.getGender().trim().toUpperCase();
            if (!gender.isEmpty()) {
                if (!gender.equals("MALE") && !gender.equals("FEMALE") && !gender.equals("OTHER")) {
                    throw new RuntimeException("Gender must be MALE, FEMALE, or OTHER");
                }
                existingPatient.setGender(gender);
            }
        }

        if (updatedPatient.getBloodGroup() != null) {
            existingPatient.setBloodGroup(updatedPatient.getBloodGroup().trim());
        }

        if (updatedPatient.getAddress() != null) {
            existingPatient.setAddress(updatedPatient.getAddress().trim());
        }

        if (updatedPatient.getCity() != null) {
            existingPatient.setCity(updatedPatient.getCity().trim());
        }

        if (updatedPatient.getEmergencyContactName() != null) {
            existingPatient.setEmergencyContactName(updatedPatient.getEmergencyContactName().trim());
        }

        if (updatedPatient.getEmergencyContactPhone() != null) {
            existingPatient.setEmergencyContactPhone(updatedPatient.getEmergencyContactPhone().trim());
        }

        if (updatedPatient.getAllergies() != null) {
            existingPatient.setAllergies(updatedPatient.getAllergies().trim());
        }

        if (updatedPatient.getMedicalConditions() != null) {
            existingPatient.setMedicalConditions(updatedPatient.getMedicalConditions().trim());
        }

        if (updatedPatient.getCurrentMedications() != null) {
            existingPatient.setCurrentMedications(updatedPatient.getCurrentMedications().trim());
        }

        if (updatedPatient.getStatus() != null && !updatedPatient.getStatus().trim().isEmpty()) {
            String status = updatedPatient.getStatus().trim().toUpperCase();
            if (!status.equals("ACTIVE") && !status.equals("INACTIVE")) {
                throw new RuntimeException("Status must be ACTIVE or INACTIVE");
            }
            existingPatient.setStatus(status);
        }

        return patientRepository.save(existingPatient);
    }

    // =========================================================
    // STATUS MUTATIONS
    // =========================================================

    public Patient activatePatient(Long id) {
        Patient patient = getPatientById(id);
        patient.setStatus("ACTIVE");
        return patientRepository.save(patient);
    }

    public Patient deactivatePatient(Long id) {
        Patient patient = getPatientById(id);
        patient.setStatus("INACTIVE");
        return patientRepository.save(patient);
    }

    // =========================================================
    // DELETE PATIENT (RELATIONAL INTEGRITY CHECK)
    // =========================================================

    public void deletePatient(Long id) {
        Patient patient = getPatientById(id);

        boolean hasDependencies = appointmentRepository.existsByPatientId(id)
                || prescriptionRepository.existsByPatientId(id)
                || billRepository.existsByPatientId(id)
                || medicalRecordRepository.existsByPatientId(id)
                || treatmentRepository.existsByPatientId(id)
                || treatmentPlanRepository.existsByPatientId(id);

        if (hasDependencies) {
            throw new RuntimeException(
                    "Cannot delete patient: active clinical, appointment, prescription, or billing records exist. Deactivate the patient profile instead."
            );
        }

        patientRepository.delete(patient);
    }
}