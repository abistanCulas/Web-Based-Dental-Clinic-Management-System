package com.dentaflow.backend.service;

import com.dentaflow.backend.entity.Dentist;
import com.dentaflow.backend.entity.Role;
import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class DentistService {

    private static final String EMAIL_REGEX = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$";
    private static final String PHONE_REGEX = "^[0-9+\\-\\s()]{7,20}$";

    private final DentistRepository dentistRepository;
    private final UserRepository userRepository;
    private final StaffScheduleService staffScheduleService;
    private final AppointmentRepository appointmentRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final TreatmentRepository treatmentRepository;
    private final TreatmentPlanRepository treatmentPlanRepository;
    private final DentistAvailabilityRepository dentistAvailabilityRepository;
    private final ReviewRepository reviewRepository;
    private final PasswordEncoder passwordEncoder;
    private final RoleRepository roleRepository;
    private final AuditLogRepository auditLogRepository;
    private final NotificationRepository notificationRepository;
    private final FeedbackRepository feedbackRepository;
    private final ComplaintRepository complaintRepository;
    private final InquiryRepository inquiryRepository;
    private final PurchaseRequestRepository purchaseRequestRepository;

    public DentistService(
            DentistRepository dentistRepository,
            UserRepository userRepository,
            StaffScheduleService staffScheduleService,
            AppointmentRepository appointmentRepository,
            PrescriptionRepository prescriptionRepository,
            MedicalRecordRepository medicalRecordRepository,
            TreatmentRepository treatmentRepository,
            TreatmentPlanRepository treatmentPlanRepository,
            DentistAvailabilityRepository dentistAvailabilityRepository,
            ReviewRepository reviewRepository,
            PasswordEncoder passwordEncoder,
            RoleRepository roleRepository) {

        this(dentistRepository, userRepository, staffScheduleService, appointmentRepository,
                prescriptionRepository, medicalRecordRepository, treatmentRepository,
                treatmentPlanRepository, dentistAvailabilityRepository, reviewRepository,
                passwordEncoder, roleRepository, null, null, null, null, null, null);
    }

    @Autowired
    public DentistService(
            DentistRepository dentistRepository,
            UserRepository userRepository,
            StaffScheduleService staffScheduleService,
            AppointmentRepository appointmentRepository,
            PrescriptionRepository prescriptionRepository,
            MedicalRecordRepository medicalRecordRepository,
            TreatmentRepository treatmentRepository,
            TreatmentPlanRepository treatmentPlanRepository,
            DentistAvailabilityRepository dentistAvailabilityRepository,
            ReviewRepository reviewRepository,
            PasswordEncoder passwordEncoder,
            RoleRepository roleRepository,
            @Autowired(required = false) AuditLogRepository auditLogRepository,
            @Autowired(required = false) NotificationRepository notificationRepository,
            @Autowired(required = false) FeedbackRepository feedbackRepository,
            @Autowired(required = false) ComplaintRepository complaintRepository,
            @Autowired(required = false) InquiryRepository inquiryRepository,
            @Autowired(required = false) PurchaseRequestRepository purchaseRequestRepository) {

        this.dentistRepository = dentistRepository;
        this.userRepository = userRepository;
        this.staffScheduleService = staffScheduleService;
        this.appointmentRepository = appointmentRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.medicalRecordRepository = medicalRecordRepository;
        this.treatmentRepository = treatmentRepository;
        this.treatmentPlanRepository = treatmentPlanRepository;
        this.dentistAvailabilityRepository = dentistAvailabilityRepository;
        this.reviewRepository = reviewRepository;
        this.passwordEncoder = passwordEncoder;
        this.roleRepository = roleRepository;
        this.auditLogRepository = auditLogRepository;
        this.notificationRepository = notificationRepository;
        this.feedbackRepository = feedbackRepository;
        this.complaintRepository = complaintRepository;
        this.inquiryRepository = inquiryRepository;
        this.purchaseRequestRepository = purchaseRequestRepository;
    }

    // =========================================================
    // CREATE DENTIST
    // =========================================================

    public Dentist createDentist(
            Dentist dentist,
            Long userId) {

        return createDentist(dentist, userId, null);
    }

    public Dentist createDentist(
            Dentist dentist,
            Long userId,
            String password) {

        if (dentist == null) {
            throw new RuntimeException(
                    "Dentist data is required"
            );
        }

        // =====================================================
        // FIRST NAME
        // =====================================================

        if (dentist.getFirstName() == null ||
                dentist.getFirstName().trim().isEmpty()) {

            throw new RuntimeException(
                    "First name is required"
            );
        }

        // =====================================================
        // LAST NAME
        // =====================================================

        if (dentist.getLastName() == null ||
                dentist.getLastName().trim().isEmpty()) {

            throw new RuntimeException(
                    "Last name is required"
            );
        }

        // =====================================================
        // EMAIL
        // =====================================================

        if (dentist.getEmail() == null ||
                dentist.getEmail().trim().isEmpty()) {

            throw new RuntimeException(
                    "Email is required"
            );
        }

        String email =
                dentist.getEmail()
                        .trim()
                        .toLowerCase();

        if (!email.matches(EMAIL_REGEX)) {
            throw new RuntimeException(
                    "Invalid email format"
            );
        }

        if (dentistRepository.existsByEmail(email)) {

            throw new RuntimeException(
                    "Dentist with this email already exists"
            );
        }

        // =====================================================
        // PHONE VALIDATION
        // =====================================================

        if (dentist.getPhone() != null && !dentist.getPhone().trim().isEmpty()) {
            if (!dentist.getPhone().trim().matches(PHONE_REGEX)) {
                throw new RuntimeException(
                        "Invalid phone number format"
                );
            }
        }

        // =====================================================
        // SPECIALIZATION REQUIRED
        // =====================================================

        if (dentist.getSpecialization() == null ||
                dentist.getSpecialization().trim().isEmpty()) {

            throw new RuntimeException(
                    "Specialization is required"
            );
        }

        // =====================================================
        // LINK OR CREATE USER ACCOUNT
        // =====================================================

        if (userId != null) {

            User user =
                    userRepository.findById(userId)
                            .orElseThrow(() ->
                                    new RuntimeException(
                                            "User not found with id: "
                                                    + userId
                                    )
                            );

            if (dentistRepository
                    .findByUserId(userId)
                    .isPresent()) {

                throw new RuntimeException(
                        "A dentist profile already exists "
                                + "for this user"
                );
            }

            dentist.setUser(user);
        } else if (password != null && !password.trim().isEmpty()) {

            if (userRepository.existsByEmail(email)) {
                throw new RuntimeException(
                        "Email is already registered: " + email
                );
            }

            if (password.length() < 6) {
                throw new RuntimeException(
                        "Password must be at least 6 characters"
                );
            }

            Role doctorRole = roleRepository.findByName("DOCTOR")
                    .orElseGet(() -> roleRepository.findByName("DENTIST")
                            .orElseThrow(() ->
                                    new RuntimeException("Role DOCTOR not found")
                            ));

            User newUser = new User();
            newUser.setFirstName(dentist.getFirstName().trim());
            newUser.setLastName(dentist.getLastName().trim());
            newUser.setEmail(email);
            newUser.setPhone(dentist.getPhone() != null && !dentist.getPhone().trim().isEmpty()
                    ? dentist.getPhone().trim()
                    : "0771234567");
            newUser.setPassword(passwordEncoder.encode(password));
            newUser.setRole(doctorRole);
            newUser.setStatus("ACTIVE");
            newUser.setEmailVerified("YES");
            newUser.setAuthProvider("LOCAL");
            newUser.setPreferredLanguage("EN");

            User savedUser = userRepository.save(newUser);
            dentist.setUser(savedUser);

        } else {
            // Auto-link existing user if found by email and unlinked
            userRepository.findByEmail(email).ifPresent(u -> {
                if (dentistRepository.findByUserId(u.getId()).isEmpty()) {
                    dentist.setUser(u);
                }
            });
        }

        // =====================================================
        // BASIC DATA
        // =====================================================

        dentist.setEmail(email);

        dentist.setFirstName(
                dentist.getFirstName()
                        .trim()
        );

        dentist.setLastName(
                dentist.getLastName()
                        .trim()
        );

        // =====================================================
        // AUTOMATIC DENTIST CODE
        //
        // D-001
        // D-002
        // D-003
        // =====================================================

        dentist.setDentistCode(
                generateDentistCode()
        );

        // =====================================================
        // DEFAULT STATUS
        // =====================================================

        if (dentist.getStatus() == null ||
                dentist.getStatus()
                        .trim()
                        .isEmpty()) {

            dentist.setStatus("ACTIVE");

        } else {

            dentist.setStatus(
                    dentist.getStatus()
                            .trim()
                            .toUpperCase()
            );
        }

        // =====================================================
        // SPECIALIZATION
        // =====================================================

        if (dentist.getSpecialization() != null) {

            dentist.setSpecialization(
                    dentist.getSpecialization()
                            .trim()
            );
        }

        // =====================================================
        // QUALIFICATION
        // =====================================================

        if (dentist.getQualification() != null) {

            dentist.setQualification(
                    dentist.getQualification()
                            .trim()
            );
        }

        // =====================================================
        // EXPERIENCE VALIDATION
        // =====================================================

        if (dentist.getExperienceYears() != null &&
                dentist.getExperienceYears() < 0) {

            throw new RuntimeException(
                    "Experience years cannot be negative"
            );
        }

        // =====================================================
        // ABOUT
        // =====================================================

        if (dentist.getAbout() != null) {

            dentist.setAbout(
                    dentist.getAbout()
                            .trim()
            );
        }

        // =====================================================
        // SAVE DENTIST FIRST
        // =====================================================

        Dentist savedDentist =
                dentistRepository.save(dentist);

        // =====================================================
        // AUTOMATIC WEEKLY SCHEDULE
        //
        // Only ACTIVE dentists receive an automatic schedule.
        // =====================================================

        if ("ACTIVE".equalsIgnoreCase(
                savedDentist.getStatus())) {

            LocalDate currentWeekMonday =
                    LocalDate.now()
                            .with(
                                    TemporalAdjusters
                                            .previousOrSame(
                                                    DayOfWeek.MONDAY
                                            )
                            );

            staffScheduleService
                    .generateDentistWeeklySchedule(
                            savedDentist.getId(),
                            currentWeekMonday
                    );
        }

        return savedDentist;
    }

    // =========================================================
    // GENERATE DENTIST CODE
    // =========================================================

    private String generateDentistCode() {

        long nextNumber =
                dentistRepository.count() + 1;

        String code;

        do {

            code =
                    String.format(
                            "D-%03d",
                            nextNumber
                    );

            nextNumber++;

        } while (
                dentistRepository
                        .existsByDentistCode(code)
        );

        return code;
    }

    // =========================================================
    // GET ALL ACTIVE DENTISTS (PUBLIC)
    // =========================================================

    @Transactional(readOnly = true)
    public List<Dentist> getAllActiveDentists() {
        return dentistRepository.findByStatusIgnoreCase("ACTIVE");
    }

    // =========================================================
    // GET ALL DENTISTS FOR ADMIN (ADMIN ONLY)
    // =========================================================

    @Transactional(readOnly = true)
    public List<Dentist> getAllDentistsAdmin() {
        return dentistRepository.findAll().stream()
                .filter(d -> !"DELETED".equalsIgnoreCase(d.getStatus()))
                .collect(Collectors.toList());
    }

    // =========================================================
    // GET ALL DENTISTS (DEFAULT ACTIVE)
    // =========================================================

    @Transactional(readOnly = true)
    public List<Dentist> getAllDentists() {
        return dentistRepository.findByStatusIgnoreCase("ACTIVE");
    }

    // =========================================================
    // GET DENTIST BY ID
    // =========================================================

    @Transactional(readOnly = true)
    public Dentist getDentistById(
            Long id) {

        Dentist dentist = dentistRepository.findById(id)
                .or(() -> dentistRepository.findByUserId(id))
                .orElseThrow(() ->
                        new RuntimeException(
                                "Dentist not found with id: "
                                        + id
                        )
                );

        if ("DELETED".equalsIgnoreCase(dentist.getStatus())) {
            throw new RuntimeException("Dentist not found with id: " + id);
        }

        return dentist;
    }

    // =========================================================
    // GET DENTIST BY CODE
    // =========================================================

    @Transactional(readOnly = true)
    public Dentist getDentistByCode(
            String dentistCode) {

        if (dentistCode == null ||
                dentistCode.trim().isEmpty()) {

            throw new RuntimeException(
                    "Dentist code is required"
                );
        }

        Dentist dentist = dentistRepository
                .findByDentistCode(
                        dentistCode
                                .trim()
                                .toUpperCase()
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "Dentist not found: "
                                        + dentistCode
                        )
                );

        if ("DELETED".equalsIgnoreCase(dentist.getStatus())) {
            throw new RuntimeException("Dentist not found: " + dentistCode);
        }

        return dentist;
    }

    // =========================================================
    // GET DENTIST BY EMAIL
    // =========================================================

    @Transactional(readOnly = true)
    public Dentist getDentistByEmail(
            String email) {

        if (email == null ||
                email.trim().isEmpty()) {

            throw new RuntimeException(
                    "Email is required"
            );
        }

        return dentistRepository
                .findByEmail(
                        email.trim()
                                .toLowerCase()
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "Dentist not found with email: "
                                        + email
                        )
                );
    }

    // =========================================================
    // GET DENTIST BY USER ID
    // =========================================================

    @Transactional(readOnly = true)
    public Dentist getDentistByUserId(
            Long userId) {

        if (userId == null) {

            throw new RuntimeException(
                    "User ID is required"
            );
        }

        return dentistRepository
                .findByUserId(userId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Dentist profile not found "
                                        + "for user: "
                                        + userId
                        )
                );
    }

    // =========================================================
    // GET DENTISTS BY SPECIALIZATION
    // =========================================================

    @Transactional(readOnly = true)
    public List<Dentist>
    getDentistsBySpecialization(
            String specialization) {

        if (specialization == null ||
                specialization.trim().isEmpty()) {

            return dentistRepository.findByStatusIgnoreCase("ACTIVE");
        }

        return dentistRepository
                .findBySpecializationContainingIgnoreCaseAndStatusIgnoreCase(
                        specialization.trim(),
                        "ACTIVE"
                );
    }

    // =========================================================
    // GET DENTISTS BY STATUS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Dentist> getDentistsByStatus(
            String status) {

        if (status == null ||
                status.trim().isEmpty()) {

            throw new RuntimeException(
                    "Status is required"
            );
        }

        return dentistRepository.findByStatusIgnoreCase(
                status.trim()
        );
    }

    // =========================================================
    // SEARCH DENTISTS (PUBLIC - ACTIVE ONLY)
    // =========================================================

    @Transactional(readOnly = true)
    public List<Dentist> searchDentists(
            String keyword) {

        if (keyword == null ||
                keyword.trim().isEmpty()) {

            return dentistRepository.findByStatusIgnoreCase("ACTIVE");
        }

        return dentistRepository.searchAcrossFieldsAndStatus(keyword.trim(), "ACTIVE");
    }

    // =========================================================
    // SEARCH DENTISTS FOR ADMIN (ALL STATUSES)
    // =========================================================

    @Transactional(readOnly = true)
    public List<Dentist> searchDentistsAdmin(
            String keyword) {

        if (keyword == null ||
                keyword.trim().isEmpty()) {

            return dentistRepository.findAll();
        }

        return dentistRepository.searchAcrossFields(keyword.trim());
    }

    // =========================================================
    // UPDATE DENTIST
    // =========================================================

    public Dentist updateDentist(
            Long id,
            Dentist updatedDentist) {

        Dentist existingDentist =
                getDentistById(id);

        if (updatedDentist == null) {

            throw new RuntimeException(
                    "Dentist data is required"
            );
        }

        // =====================================================
        // FIRST NAME
        // =====================================================

        if (updatedDentist.getFirstName() != null &&
                !updatedDentist.getFirstName()
                        .trim()
                        .isEmpty()) {

            existingDentist.setFirstName(
                    updatedDentist
                            .getFirstName()
                            .trim()
            );
        }

        // =====================================================
        // LAST NAME
        // =====================================================

        if (updatedDentist.getLastName() != null &&
                !updatedDentist.getLastName()
                        .trim()
                        .isEmpty()) {

            existingDentist.setLastName(
                    updatedDentist
                            .getLastName()
                            .trim()
            );
        }

        // =====================================================
        // EMAIL
        // =====================================================

        if (updatedDentist.getEmail() != null &&
                !updatedDentist.getEmail()
                        .trim()
                        .isEmpty()) {

            String newEmail =
                    updatedDentist.getEmail()
                            .trim()
                            .toLowerCase();

            if (!newEmail.matches(EMAIL_REGEX)) {
                throw new RuntimeException(
                        "Invalid email format"
                );
            }

            if (!newEmail.equalsIgnoreCase(
                    existingDentist.getEmail())) {

                if (dentistRepository
                        .existsByEmail(newEmail)) {

                    throw new RuntimeException(
                            "Another dentist already "
                                    + "uses this email"
                    );
                }
            }

            existingDentist.setEmail(
                    newEmail
            );
        }

        // =====================================================
        // PHONE
        // =====================================================

        if (updatedDentist.getPhone() != null) {

            String newPhone = updatedDentist.getPhone().trim();
            if (!newPhone.isEmpty() && !newPhone.matches(PHONE_REGEX)) {
                throw new RuntimeException(
                        "Invalid phone number format"
                );
            }

            existingDentist.setPhone(
                    newPhone
            );
        }

        // =====================================================
        // SPECIALIZATION
        // =====================================================

        if (updatedDentist
                .getSpecialization() != null) {

            String newSpec = updatedDentist.getSpecialization().trim();
            if (newSpec.isEmpty()) {
                throw new RuntimeException(
                        "Specialization cannot be empty"
                );
            }

            existingDentist.setSpecialization(
                    newSpec
            );
        }

        // =====================================================
        // QUALIFICATION
        // =====================================================

        if (updatedDentist
                .getQualification() != null) {

            existingDentist.setQualification(
                    updatedDentist
                            .getQualification()
                            .trim()
            );
        }

        // =====================================================
        // EXPERIENCE
        // =====================================================

        if (updatedDentist
                .getExperienceYears() != null) {

            if (updatedDentist
                    .getExperienceYears() < 0) {

                throw new RuntimeException(
                        "Experience years cannot be negative"
                );
            }

            existingDentist.setExperienceYears(
                    updatedDentist
                            .getExperienceYears()
            );
        }

        // =====================================================
        // ABOUT & BIO
        // =====================================================

        if (updatedDentist.getAbout() != null) {
            String aboutVal = updatedDentist.getAbout().trim();
            existingDentist.setAbout(aboutVal);
            existingDentist.setBio(aboutVal);
        } else if (updatedDentist.getBio() != null) {
            String bioVal = updatedDentist.getBio().trim();
            existingDentist.setAbout(bioVal);
            existingDentist.setBio(bioVal);
        }

        // =====================================================
        // LICENSE NUMBER
        // =====================================================

        if (updatedDentist.getLicenseNumber() != null) {
            existingDentist.setLicenseNumber(
                    updatedDentist.getLicenseNumber().trim()
            );
        }

        // =====================================================
        // CONSULTATION FEE
        // =====================================================

        if (updatedDentist.getConsultationFee() != null) {
            existingDentist.setConsultationFee(
                    updatedDentist.getConsultationFee()
            );
        }

        // =====================================================
        // IMAGE URL
        // =====================================================

        if (updatedDentist.getImageUrl() != null) {

            existingDentist.setImageUrl(
                    updatedDentist
                            .getImageUrl()
                            .trim()
            );
        }

        // =====================================================
        // STATUS
        // =====================================================

        if (updatedDentist.getStatus() != null &&
                !updatedDentist.getStatus()
                        .trim()
                        .isEmpty()) {

            String newStatus =
                    updatedDentist
                            .getStatus()
                            .trim()
                            .toUpperCase();

            existingDentist.setStatus(
                    newStatus
            );

            if (existingDentist.getUser() != null) {
                existingDentist.getUser().setStatus(newStatus);
            }

            // -------------------------------------------------
            // If dentist becomes ACTIVE and has no current
            // weekly schedule, create one automatically.
            // -------------------------------------------------

            if ("ACTIVE".equals(newStatus)) {

                LocalDate currentWeekMonday =
                        LocalDate.now()
                                .with(
                                        TemporalAdjusters
                                                .previousOrSame(
                                                        DayOfWeek.MONDAY
                                                )
                                );

                if (!hasCurrentWeekSchedule(
                        existingDentist.getId(),
                        currentWeekMonday
                )) {

                    staffScheduleService
                            .generateDentistWeeklySchedule(
                                    existingDentist.getId(),
                                    currentWeekMonday
                            );
                }
            }
        }

        // =====================================================
        // SYNC USER ENTITY
        // =====================================================

        if (existingDentist.getUser() != null) {
            User linkedUser = existingDentist.getUser();
            linkedUser.setFirstName(existingDentist.getFirstName());
            linkedUser.setLastName(existingDentist.getLastName());
            linkedUser.setEmail(existingDentist.getEmail());
            if (existingDentist.getPhone() != null && !existingDentist.getPhone().isBlank()) {
                linkedUser.setPhone(existingDentist.getPhone());
            }
            if (existingDentist.getImageUrl() != null) {
                linkedUser.setProfileImage(existingDentist.getImageUrl());
            }
            userRepository.save(linkedUser);
        }

        return dentistRepository.save(
                existingDentist
        );
    }

    // =========================================================
    // CHECK CURRENT WEEK SCHEDULE
    // =========================================================

    private boolean hasCurrentWeekSchedule(
            Long dentistId,
            LocalDate weekStartDate) {

        try {

            staffScheduleService
                    .getDentistWeeklySchedule(
                            dentistId,
                            weekStartDate
                    );

            return true;

        } catch (RuntimeException e) {

            return false;
        }
    }

    // =========================================================
    // ACTIVATE DENTIST
    // =========================================================

    public Dentist activateDentist(
            Long id) {

        Dentist dentist =
                getDentistById(id);

        dentist.setStatus("ACTIVE");
        if (dentist.getUser() != null) {
            dentist.getUser().setStatus("ACTIVE");
            userRepository.save(dentist.getUser());
        }

        Dentist saved =
                dentistRepository.save(
                        dentist
                );

        LocalDate currentWeekMonday =
                LocalDate.now()
                        .with(
                                TemporalAdjusters
                                        .previousOrSame(
                                                DayOfWeek.MONDAY
                                        )
                        );

        if (!hasCurrentWeekSchedule(
                saved.getId(),
                currentWeekMonday
        )) {

            staffScheduleService
                    .generateDentistWeeklySchedule(
                            saved.getId(),
                            currentWeekMonday
                    );
        }

        return saved;
    }

    // =========================================================
    // DEACTIVATE DENTIST
    // =========================================================

    public Dentist deactivateDentist(
            Long id) {

        Dentist dentist =
                getDentistById(id);

        dentist.setStatus("INACTIVE");
        if (dentist.getUser() != null) {
            dentist.getUser().setStatus("INACTIVE");
            userRepository.save(dentist.getUser());
        }

        return dentistRepository.save(
                dentist
        );
    }

    // =========================================================
    // DELETE DENTIST
    // =========================================================

    public void deleteDentist(
            Long id) {

        Dentist dentist = dentistRepository.findById(id)
                .or(() -> dentistRepository.findByUserId(id))
                .orElse(null);

        if (dentist == null) {
            User orphanUser = userRepository.findById(id).orElse(null);
            if (orphanUser != null) {
                cleanupProfileImage(orphanUser.getProfileImage());
                if (auditLogRepository != null) {
                    auditLogRepository.unlinkUser(orphanUser.getId());
                }
                if (notificationRepository != null) {
                    notificationRepository.deleteByUserId(orphanUser.getId());
                }
                if (feedbackRepository != null) {
                    feedbackRepository.unlinkUser(orphanUser.getId());
                }
                if (complaintRepository != null) {
                    complaintRepository.unlinkUser(orphanUser.getId());
                }
                if (inquiryRepository != null) {
                    inquiryRepository.unlinkUser(orphanUser.getId());
                }
                if (purchaseRequestRepository != null) {
                    purchaseRequestRepository.unlinkPharmacist(orphanUser.getId());
                    purchaseRequestRepository.unlinkProcessedBy(orphanUser.getId());
                }
                userRepository.delete(orphanUser);
                userRepository.flush();
                return;
            }
            throw new RuntimeException("Dentist not found with id: " + id);
        }

        dentistAvailabilityRepository.deleteByDentistId(id);
        staffScheduleService.deleteDentistSchedules(id);

        // Safely unlink dentist from historical clinical and financial records to preserve data integrity
        appointmentRepository.unlinkDentist(id);
        prescriptionRepository.unlinkDentist(id);
        medicalRecordRepository.unlinkDentist(id);
        treatmentRepository.unlinkDentist(id);
        treatmentPlanRepository.unlinkDentist(id);
        reviewRepository.unlinkDentist(id);

        cleanupProfileImage(dentist.getImageUrl());

        User user = dentist.getUser();
        dentist.setUser(null);
        dentistRepository.saveAndFlush(dentist);
        dentistRepository.delete(dentist);
        dentistRepository.flush();

        if (user != null) {
            cleanupProfileImage(user.getProfileImage());
            if (auditLogRepository != null) {
                auditLogRepository.unlinkUser(user.getId());
            }
            if (notificationRepository != null) {
                notificationRepository.deleteByUserId(user.getId());
            }
            if (feedbackRepository != null) {
                feedbackRepository.unlinkUser(user.getId());
            }
            if (complaintRepository != null) {
                complaintRepository.unlinkUser(user.getId());
            }
            if (inquiryRepository != null) {
                inquiryRepository.unlinkUser(user.getId());
            }
            if (purchaseRequestRepository != null) {
                purchaseRequestRepository.unlinkPharmacist(user.getId());
                purchaseRequestRepository.unlinkProcessedBy(user.getId());
            }
            userRepository.delete(user);
            userRepository.flush();
        }
    }

    private void cleanupProfileImage(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return;
        }
        try {
            String clean = imageUrl.trim();
            if (clean.contains("/uploads/")) {
                clean = clean.substring(clean.lastIndexOf("/uploads/") + "/uploads/".length());
            } else if (clean.startsWith("uploads/")) {
                clean = clean.substring("uploads/".length());
            } else {
                return;
            }
            int qIdx = clean.indexOf('?');
            if (qIdx != -1) {
                clean = clean.substring(0, qIdx);
            }
            Path uploadPath = Paths.get("uploads").toAbsolutePath().normalize();
            Path filePath = uploadPath.resolve(clean).normalize();
            if (filePath.startsWith(uploadPath)) {
                Files.deleteIfExists(filePath);
            }
        } catch (Exception ignored) {
        }
    }
}