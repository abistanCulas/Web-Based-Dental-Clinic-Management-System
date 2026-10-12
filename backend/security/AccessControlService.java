package com.dentaflow.backend.security;

import com.dentaflow.backend.entity.Dentist;
import com.dentaflow.backend.entity.DentistAvailability;
import com.dentaflow.backend.entity.MedicalRecord;
import com.dentaflow.backend.entity.Notification;
import com.dentaflow.backend.entity.Patient;
import com.dentaflow.backend.entity.Staff;
import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.repository.DentistAvailabilityRepository;
import com.dentaflow.backend.repository.DentistRepository;
import com.dentaflow.backend.repository.MedicalRecordRepository;
import com.dentaflow.backend.repository.NotificationRepository;
import com.dentaflow.backend.repository.PatientRepository;
import com.dentaflow.backend.repository.StaffRepository;
import com.dentaflow.backend.repository.UserRepository;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

/**
 * Central row-level authorization helper.
 *
 * Used from {@code @PreAuthorize("@accessControl...")} expressions to verify
 * that the authenticated principal is allowed to access a specific user's,
 * patient's or record's data (IDOR protection) without changing controller
 * signatures or API response contracts.
 *
 * ADMIN always follows the existing ADMIN authorization model (full access).
 */
@Service("accessControl")
public class AccessControlService {

    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final DentistRepository dentistRepository;
    private final NotificationRepository notificationRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final DentistAvailabilityRepository dentistAvailabilityRepository;
    private final StaffRepository staffRepository;

    public AccessControlService(
            UserRepository userRepository,
            PatientRepository patientRepository,
            DentistRepository dentistRepository,
            NotificationRepository notificationRepository,
            MedicalRecordRepository medicalRecordRepository) {
        this(userRepository, patientRepository, dentistRepository, notificationRepository, medicalRecordRepository, null, null);
    }

    public AccessControlService(
            UserRepository userRepository,
            PatientRepository patientRepository,
            DentistRepository dentistRepository,
            NotificationRepository notificationRepository,
            MedicalRecordRepository medicalRecordRepository,
            DentistAvailabilityRepository dentistAvailabilityRepository) {
        this(userRepository, patientRepository, dentistRepository, notificationRepository, medicalRecordRepository, dentistAvailabilityRepository, null);
    }

    @Autowired
    public AccessControlService(
            UserRepository userRepository,
            PatientRepository patientRepository,
            DentistRepository dentistRepository,
            NotificationRepository notificationRepository,
            MedicalRecordRepository medicalRecordRepository,
            DentistAvailabilityRepository dentistAvailabilityRepository,
            StaffRepository staffRepository) {

        this.userRepository = userRepository;
        this.patientRepository = patientRepository;
        this.dentistRepository = dentistRepository;
        this.notificationRepository = notificationRepository;
        this.medicalRecordRepository = medicalRecordRepository;
        this.dentistAvailabilityRepository = dentistAvailabilityRepository;
        this.staffRepository = staffRepository;
    }

    // =========================================================
    // CURRENT PRINCIPAL
    // =========================================================

    public User getCurrentUser() {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        Object principal = authentication.getPrincipal();

        if (principal instanceof CustomUserDetails customUserDetails) {
            return customUserDetails.getUser();
        }

        if (principal instanceof String email
                && !"anonymousUser".equalsIgnoreCase(email)) {
            return userRepository
                    .findByEmail(email.trim().toLowerCase())
                    .orElse(null);
        }

        return null;
    }

    public Long getCurrentUserId() {

        User user = getCurrentUser();
        return user != null ? user.getId() : null;
    }

    // =========================================================
    // ROLE CHECKS
    // =========================================================

    public boolean hasRole(String role) {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || role == null) {
            return false;
        }

        String target = "ROLE_" + role.trim().toUpperCase();

        for (GrantedAuthority authority : authentication.getAuthorities()) {
            if (target.equals(authority.getAuthority())) {
                return true;
            }
        }

        return false;
    }

    public boolean isAdmin() {
        return hasRole("ADMIN");
    }

    /** Any clinical/administrative staff role. */
    public boolean isStaff() {
        return isAdmin()
                || hasRole("DOCTOR")
                || hasRole("DENTIST")
                || hasRole("STAFF")
                || hasRole("RECEPTIONIST")
                || hasRole("PHARMACIST")
                || hasRole("CASHIER");
    }

    // =========================================================
    // USER-SCOPED ACCESS
    // =========================================================

    public boolean isSelf(Long userId) {

        Long currentId = getCurrentUserId();
        return currentId != null && userId != null && currentId.equals(userId);
    }

    public boolean isSelfOrAdmin(Long userId) {
        return isAdmin() || isSelf(userId);
    }

    /**
     * ADMIN or the patient whose profile is linked to the current user.
     * Used for patient-scoped resources such as complaint history.
     */
    public boolean isSelfPatientOrAdmin(Long patientId) {

        if (isAdmin()) {
            return true;
        }

        Long currentId = getCurrentUserId();

        if (currentId == null || patientId == null) {
            return false;
        }

        return patientRepository
                .findByUserId(currentId)
                .map(Patient::getId)
                .filter(patientId::equals)
                .isPresent();
    }

    // =========================================================
    // PATIENT-SCOPED ACCESS
    // =========================================================

    /**
     * Clinical access to a patient's medical data:
     * ADMIN always allowed.
     * DOCTOR/DENTIST only if they are the treating dentist for the patient's records.
     * PATIENT only their own records.
     * General staff (receptionist/pharmacist/cashier) are not granted access.
     */
    public boolean canAccessPatientRecords(Long patientId) {

        if (patientId == null) {
            return false;
        }

        if (isAdmin()) {
            return true;
        }

        Long currentId = getCurrentUserId();

        if (currentId == null) {
            return false;
        }

        if (hasRole("DOCTOR") || hasRole("DENTIST")) {
            Optional<Dentist> dentist = dentistRepository.findByUserId(currentId);
            if (dentist.isPresent()) {
                return medicalRecordRepository
                        .findByDentistIdAndPatientId(dentist.get().getId(), patientId)
                        .stream()
                        .findAny()
                        .isPresent();
            }
            return false;
        }

        return patientRepository
                .findByUserId(currentId)
                .map(Patient::getId)
                .filter(patientId::equals)
                .isPresent();
    }

    // =========================================================
    // DENTIST-SCOPED ACCESS
    // =========================================================

    public boolean canAccessDentistRecords(Long dentistId) {

        if (dentistId == null) {
            return false;
        }

        if (isAdmin()) {
            return true;
        }

        Long currentId = getCurrentUserId();

        if (currentId == null) {
            return false;
        }

        if (hasRole("DOCTOR") || hasRole("DENTIST")) {
            Optional<Dentist> dentist = dentistRepository.findByUserId(currentId);
            return dentist.map(d -> d.getId().equals(dentistId)).orElse(false);
        }

        return false;
    }

    // =========================================================
    // MEDICAL RECORD ACCESS
    // =========================================================

    public boolean canAccessMedicalRecord(Long recordId) {

        if (recordId == null) {
            return false;
        }

        if (isAdmin()) {
            return true;
        }

        Long currentId = getCurrentUserId();

        if (currentId == null) {
            return false;
        }

        MedicalRecord record =
                medicalRecordRepository.findById(recordId).orElse(null);

        if (record == null) {
            return false;
        }

        if (hasRole("DOCTOR") || hasRole("DENTIST")) {
            if (record.getDentist() == null) {
                return false;
            }
            Long recordDentistId = record.getDentist().getId();
            return (dentistRepository != null && dentistRepository.findByUserId(currentId)
                    .map(Dentist::getId)
                    .filter(recordDentistId::equals)
                    .isPresent())
                    || (record.getDentist().getUser() != null
                        && currentId.equals(record.getDentist().getUser().getId()))
                    || recordDentistId.equals(currentId);
        }

        return record.getPatient() != null
                && patientRepository
                        .findByUserId(currentId)
                        .map(Patient::getId)
                        .filter(record.getPatient().getId()::equals)
                        .isPresent();
    }

    // =========================================================
    // NOTIFICATION ACCESS
    // =========================================================

    public boolean canAccessNotification(Long notificationId) {

        if (notificationId == null) {
            return false;
        }

        if (isAdmin()) {
            return true;
        }

        Long currentId = getCurrentUserId();

        if (currentId == null) {
            return false;
        }

        Notification notification =
                notificationRepository.findById(notificationId).orElse(null);

        return notification != null
                && notification.getUser() != null
                && currentId.equals(notification.getUser().getId());
    }

    /**
     * Write access to staff schedule resources:
     * ADMIN or the staff member whose user_id matches the authenticated principal.
     */
    public boolean canManageStaff(Long staffId) {

        if (staffId == null) {
            return false;
        }

        if (isAdmin()) {
            return true;
        }

        Long currentId = getCurrentUserId();

        if (currentId == null || staffRepository == null) {
            return false;
        }

        return staffRepository
                .findById(staffId)
                .map(staff -> staff.getUser() != null && currentId.equals(staff.getUser().getId()))
                .orElse(false);
    }

    // =========================================================
    // STAFF MANAGEMENT ACCESS (existing)
    // =========================================================

    /**
     * Write access to dentist resources (such as availability):
     * ADMIN or the dentist themselves whose user_id matches the authenticated principal.
     */
    public boolean canManageDentist(Long dentistId) {

        if (dentistId == null) {
            return false;
        }

        if (isAdmin()) {
            return true;
        }

        Long currentId = getCurrentUserId();

        if (currentId == null) {
            return false;
        }

        return dentistRepository
                .findByUserId(currentId)
                .map(Dentist::getId)
                .filter(dentistId::equals)
                .isPresent();
    }

    /**
     * Write access to a specific dentist availability slot:
     * ADMIN or the dentist who owns this availability slot.
     */
    public boolean canManageDentistAvailability(Long availabilityId) {

        if (availabilityId == null) {
            return false;
        }

        if (isAdmin()) {
            return true;
        }

        if (dentistAvailabilityRepository == null) {
            return false;
        }

        DentistAvailability availability =
                dentistAvailabilityRepository.findById(availabilityId).orElse(null);

        if (availability == null || availability.getDentist() == null) {
            return false;
        }

        return canManageDentist(availability.getDentist().getId());
    }
}

