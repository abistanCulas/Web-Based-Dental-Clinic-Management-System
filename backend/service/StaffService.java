package com.dentaflow.backend.service;

import com.dentaflow.backend.entity.Role;
import com.dentaflow.backend.entity.Staff;
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
public class StaffService {

    private static final String EMAIL_REGEX = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$";
    private static final String PHONE_REGEX = "^[0-9+\\-\\s()]{7,20}$";

    private final StaffRepository staffRepository;
    private final UserRepository userRepository;
    private final StaffScheduleService staffScheduleService;
    private final PurchaseRequestRepository purchaseRequestRepository;
    private final PasswordEncoder passwordEncoder;
    private final RoleRepository roleRepository;
    private final AuditLogRepository auditLogRepository;
    private final NotificationRepository notificationRepository;
    private final FeedbackRepository feedbackRepository;
    private final ComplaintRepository complaintRepository;
    private final InquiryRepository inquiryRepository;

    public StaffService(
            StaffRepository staffRepository,
            UserRepository userRepository,
            StaffScheduleService staffScheduleService,
            PurchaseRequestRepository purchaseRequestRepository,
            PasswordEncoder passwordEncoder,
            RoleRepository roleRepository) {

        this(staffRepository, userRepository, staffScheduleService, purchaseRequestRepository,
                passwordEncoder, roleRepository, null, null, null, null, null);
    }

    @Autowired
    public StaffService(
            StaffRepository staffRepository,
            UserRepository userRepository,
            StaffScheduleService staffScheduleService,
            PurchaseRequestRepository purchaseRequestRepository,
            PasswordEncoder passwordEncoder,
            RoleRepository roleRepository,
            @Autowired(required = false) AuditLogRepository auditLogRepository,
            @Autowired(required = false) NotificationRepository notificationRepository,
            @Autowired(required = false) FeedbackRepository feedbackRepository,
            @Autowired(required = false) ComplaintRepository complaintRepository,
            @Autowired(required = false) InquiryRepository inquiryRepository) {

        this.staffRepository = staffRepository;
        this.userRepository = userRepository;
        this.staffScheduleService = staffScheduleService;
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.passwordEncoder = passwordEncoder;
        this.roleRepository = roleRepository;
        this.auditLogRepository = auditLogRepository;
        this.notificationRepository = notificationRepository;
        this.feedbackRepository = feedbackRepository;
        this.complaintRepository = complaintRepository;
        this.inquiryRepository = inquiryRepository;
    }

    // =========================================================
    // CREATE STAFF
    // =========================================================

    public Staff createStaff(
            Staff staff,
            Long userId) {

        return createStaff(staff, userId, null);
    }

    public Staff createStaff(
            Staff staff,
            Long userId,
            String password) {

        if (staff == null) {
            throw new RuntimeException(
                    "Staff data is required"
            );
        }

        // =====================================================
        // FIRST NAME
        // =====================================================

        if (staff.getFirstName() == null ||
                staff.getFirstName().trim().isEmpty()) {

            throw new RuntimeException(
                    "First name is required"
            );
        }

        // =====================================================
        // LAST NAME
        // =====================================================

        if (staff.getLastName() == null ||
                staff.getLastName().trim().isEmpty()) {

            throw new RuntimeException(
                    "Last name is required"
            );
        }

        // =====================================================
        // EMAIL
        // =====================================================

        if (staff.getEmail() == null ||
                staff.getEmail().trim().isEmpty()) {

            throw new RuntimeException(
                    "Email is required"
            );
        }

        String email =
                staff.getEmail()
                        .trim()
                        .toLowerCase();

        if (!email.matches(EMAIL_REGEX)) {
            throw new RuntimeException(
                    "Invalid email format"
            );
        }

        if (staffRepository.existsByEmail(email)) {

            throw new RuntimeException(
                    "Staff with this email already exists"
            );
        }

        // =====================================================
        // PHONE VALIDATION
        // =====================================================

        if (staff.getPhone() != null && !staff.getPhone().trim().isEmpty()) {
            if (!staff.getPhone().trim().matches(PHONE_REGEX)) {
                throw new RuntimeException(
                        "Invalid phone number format"
                );
            }
        }

        // =====================================================
        // ROLE
        // =====================================================

        if (staff.getRole() == null ||
                staff.getRole().trim().isEmpty()) {

            throw new RuntimeException(
                    "Staff role is required"
            );
        }

        if (!isValidRole(staff.getRole())) {
            throw new RuntimeException(
                    "Invalid staff role: " + staff.getRole()
            );
        }

        String role =
                normalizeRole(
                        staff.getRole()
                );

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

            if (staffRepository
                    .findByUserId(userId)
                    .isPresent()) {

                throw new RuntimeException(
                        "A staff profile already exists for this user"
                );
            }

            staff.setUser(user);
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

            Role staffRole = roleRepository.findByName("STAFF")
                    .orElseThrow(() ->
                            new RuntimeException("Role STAFF not found")
                    );

            User newUser = new User();
            newUser.setFirstName(staff.getFirstName().trim());
            newUser.setLastName(staff.getLastName().trim());
            newUser.setEmail(email);
            newUser.setPhone(staff.getPhone() != null && !staff.getPhone().trim().isEmpty()
                    ? staff.getPhone().trim()
                    : "0771234567");
            newUser.setPassword(passwordEncoder.encode(password));
            newUser.setRole(staffRole);
            newUser.setStatus("ACTIVE");
            newUser.setEmailVerified("YES");
            newUser.setAuthProvider("LOCAL");
            newUser.setPreferredLanguage("EN");

            if (staff.getImageUrl() != null && !staff.getImageUrl().trim().isEmpty()) {
                newUser.setProfileImage(staff.getImageUrl().trim());
            }

            User savedUser = userRepository.save(newUser);
            staff.setUser(savedUser);

        } else {
            // Auto-link existing user account if email matches and unlinked
            userRepository.findByEmail(email).ifPresent(u -> {
                if (staffRepository.findByUserId(u.getId()).isEmpty()) {
                    staff.setUser(u);
                }
                if (staff.getImageUrl() != null && !staff.getImageUrl().trim().isEmpty()) {
                    u.setProfileImage(staff.getImageUrl().trim());
                    userRepository.save(u);
                }
            });
        }

        // =====================================================
        // BASIC DATA
        // =====================================================

        staff.setEmail(email);

        if (staff.getImageUrl() != null) {
            staff.setImageUrl(staff.getImageUrl().trim());
        }

        staff.setFirstName(
                staff.getFirstName()
                        .trim()
        );

        staff.setLastName(
                staff.getLastName()
                        .trim()
        );

        staff.setRole(role);

        // =====================================================
        // AUTO GENERATE STAFF CODE
        //
        // Receptionist -> R-001
        // Assistant    -> A-001
        // Pharmacist   -> P-001
        // Other        -> S-001
        // =====================================================

        staff.setStaffCode(
                generateStaffCode(role)
        );

        // =====================================================
        // DEFAULT STATUS
        // =====================================================

        if (staff.getStatus() == null ||
                staff.getStatus().trim().isEmpty()) {

            staff.setStatus("ACTIVE");

        } else {

            staff.setStatus(
                    staff.getStatus()
                            .trim()
                            .toUpperCase()
            );
        }

        // =====================================================
        // SAVE STAFF
        // =====================================================

        Staff savedStaff =
                staffRepository.save(staff);

        // =====================================================
        // AUTO GENERATE CURRENT WEEK SCHEDULE
        //
        // Only ACTIVE staff receive automatic schedules.
        // =====================================================

        if ("ACTIVE".equalsIgnoreCase(
                savedStaff.getStatus())) {

            LocalDate currentWeekMonday =
                    LocalDate.now()
                            .with(
                                    TemporalAdjusters
                                            .previousOrSame(
                                                    DayOfWeek.MONDAY
                                            )
                            );

            staffScheduleService
                    .generateWeeklySchedule(
                            savedStaff.getId(),
                            currentWeekMonday
                    );
        }

        return savedStaff;
    }

    // =========================================================
    // GENERATE ROLE-BASED STAFF CODE
    // =========================================================

    private String generateStaffCode(
            String role) {

        String prefix =
                getRolePrefix(role);

        List<Staff> allStaff =
                staffRepository.findAll();

        int highestNumber = 0;

        for (Staff existingStaff : allStaff) {

            String existingCode =
                    existingStaff.getStaffCode();

            if (existingCode == null) {
                continue;
            }

            existingCode =
                    existingCode.trim()
                            .toUpperCase();

            String expectedPrefix =
                    prefix + "-";

            if (!existingCode.startsWith(
                    expectedPrefix)) {

                continue;
            }

            String numberPart =
                    existingCode.substring(
                            expectedPrefix.length()
                    );

            try {

                int number =
                        Integer.parseInt(
                                numberPart
                        );

                if (number > highestNumber) {
                    highestNumber = number;
                }

            } catch (NumberFormatException ignored) {
                // Ignore invalid old staff codes
            }
        }

        int nextNumber =
                highestNumber + 1;

        String code;

        do {

            code =
                    String.format(
                            "%s-%03d",
                            prefix,
                            nextNumber
                    );

            nextNumber++;

        } while (
                staffRepository
                        .existsByStaffCode(code)
        );

        return code;
    }

    // =========================================================
    // ROLE → CODE PREFIX
    // =========================================================

    private String getRolePrefix(
            String role) {

        if (role == null ||
                role.trim().isEmpty()) {

            return "S";
        }

        String normalizedRole =
                role.trim()
                        .toUpperCase()
                        .replace("_", " ")
                        .replace("-", " ");

        // -----------------------------------------------------
        // RECEPTIONIST
        // -----------------------------------------------------

        if (normalizedRole.contains(
                "RECEPTIONIST")) {

            return "R";
        }

        // -----------------------------------------------------
        // ASSISTANT
        // -----------------------------------------------------

        if (normalizedRole.contains(
                "ASSISTANT")) {

            return "A";
        }

        // -----------------------------------------------------
        // PHARMACIST
        // -----------------------------------------------------

        if (normalizedRole.contains(
                "PHARMACIST")) {

            return "P";
        }

        // -----------------------------------------------------
        // CASHIER
        // -----------------------------------------------------

        if (normalizedRole.contains(
                "CASHIER")) {

            return "C";
        }

        // -----------------------------------------------------
        // OTHER STAFF
        // -----------------------------------------------------

        return "S";
    }

    // =========================================================
    // NORMALIZE ROLE
    // =========================================================

    public String normalizeRole(
            String role) {

        if (role == null) {
            return "STAFF";
        }

        String normalized =
                role.trim()
                        .toUpperCase()
                        .replace("_", " ")
                        .replace("-", " ");

        if (normalized.equals(
                "RECEPTION")) {

            return "RECEPTIONIST";
        }

        if (normalized.equals(
                "RECEPTIONIST")) {

            return "RECEPTIONIST";
        }

        if (normalized.equals(
                "ASSISTANT")) {

            return "ASSISTANT";
        }

        if (normalized.equals(
                "DENTAL ASSISTANT")) {

            return "DENTAL ASSISTANT";
        }

        if (normalized.equals(
                "PHARMACIST")) {

            return "PHARMACIST";
        }

        if (normalized.equals(
                "CASHIER")) {

            return "CASHIER";
        }

        if (normalized.equals(
                "ADMINISTRATOR") || normalized.equals("ADMIN")) {

            return "ADMINISTRATOR";
        }

        if (normalized.equals(
                "NURSE")) {

            return "NURSE";
        }

        return normalized;
    }

    // =========================================================
    // VALIDATE ROLE
    // =========================================================

    public boolean isValidRole(
            String role) {

        if (role == null || role.trim().isEmpty()) {
            return false;
        }

        String r = normalizeRole(role);

        return r.equals("RECEPTIONIST") ||
                r.equals("PHARMACIST") ||
                r.equals("CASHIER") ||
                r.equals("ASSISTANT") ||
                r.equals("DENTAL ASSISTANT") ||
                r.equals("NURSE") ||
                r.equals("ADMINISTRATOR") ||
                r.equals("STAFF");
    }

    // =========================================================
    // GET ALL STAFF
    // =========================================================

    @Transactional(readOnly = true)
    public List<Staff> getAllStaff() {

        return staffRepository.findAllExcludingDoctors().stream()
                .filter(s -> !"DELETED".equalsIgnoreCase(s.getStatus()))
                .collect(Collectors.toList());
    }

    // =========================================================
    // GET STAFF BY ID
    // =========================================================

    @Transactional(readOnly = true)
    public Staff getStaffById(
            Long id) {

        Staff staff = staffRepository.findById(id)
                .or(() -> staffRepository.findByUserId(id))
                .orElseThrow(() ->
                        new RuntimeException(
                                "Staff not found with id: "
                                        + id
                        )
                );

        if ("DELETED".equalsIgnoreCase(staff.getStatus())) {
            throw new RuntimeException("Staff not found with id: " + id);
        }

        return staff;
    }

    // =========================================================
    // GET STAFF BY STAFF CODE
    // =========================================================

    @Transactional(readOnly = true)
    public Staff getStaffByCode(
            String staffCode) {

        if (staffCode == null ||
                staffCode.trim().isEmpty()) {

            throw new RuntimeException(
                    "Staff code is required"
            );
        }

        Staff staff = staffRepository
                .findByStaffCode(
                        staffCode.trim()
                                .toUpperCase()
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "Staff not found: "
                                        + staffCode
                        )
                );

        if ("DELETED".equalsIgnoreCase(staff.getStatus())) {
            throw new RuntimeException("Staff not found: " + staffCode);
        }

        return staff;
    }

    // =========================================================
    // GET STAFF BY EMAIL
    // =========================================================

    @Transactional(readOnly = true)
    public Staff getStaffByEmail(
            String email) {

        if (email == null ||
                email.trim().isEmpty()) {

            throw new RuntimeException(
                    "Email is required"
            );
        }

        return staffRepository
                .findByEmail(
                        email.trim()
                                .toLowerCase()
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "Staff not found with email: "
                                        + email
                        )
                );
    }

    // =========================================================
    // GET STAFF BY USER
    // =========================================================

    @Transactional(readOnly = true)
    public Staff getStaffByUserId(
            Long userId) {

        if (userId == null) {

            throw new RuntimeException(
                    "User ID is required"
            );
        }

        return staffRepository
                .findByUserId(userId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Staff profile not found for user: "
                                        + userId
                        )
                );
    }

    // =========================================================
    // GET STAFF BY ROLE
    // =========================================================

    @Transactional(readOnly = true)
    public List<Staff> getStaffByRole(
            String role) {

        if (role == null ||
                role.trim().isEmpty()) {

            return staffRepository.findAllExcludingDoctors();
        }

        return staffRepository
                .findByRoleExcludingDoctors(
                        role.trim()
                );
    }

    // =========================================================
    // SEARCH STAFF
    // =========================================================

    @Transactional(readOnly = true)
    public List<Staff> searchStaff(
            String keyword) {

        if (keyword == null ||
                keyword.trim().isEmpty()) {

            return staffRepository.findAllExcludingDoctors();
        }

        return staffRepository.searchAcrossFields(keyword.trim());
    }

    // =========================================================
    // GET STAFF BY STATUS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Staff> getStaffByStatus(
            String status) {

        if (status == null ||
                status.trim().isEmpty()) {

            throw new RuntimeException(
                    "Status is required"
            );
        }

        return staffRepository.findByStatusIgnoreCase(
                status.trim()
        );
    }

    // =========================================================
    // GET STAFF BY ROLE + STATUS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Staff> getStaffByRoleAndStatus(
            String role,
            String status) {

        if (role == null ||
                role.trim().isEmpty()) {

            throw new RuntimeException(
                    "Role is required"
            );
        }

        if (status == null ||
                status.trim().isEmpty()) {

            throw new RuntimeException(
                    "Status is required"
            );
        }

        return staffRepository
                .findByRoleContainingIgnoreCaseAndStatusIgnoreCase(
                        role.trim(),
                        status.trim()
                );
    }

    // =========================================================
    // UPDATE STAFF
    // =========================================================

    public Staff updateStaff(
            Long id,
            Staff updatedStaff) {

        Staff existingStaff =
                getStaffById(id);

        if (updatedStaff == null) {
            throw new RuntimeException(
                    "Staff data is required"
            );
        }

        // -----------------------------------------------------
        // FIRST NAME
        // -----------------------------------------------------

        if (updatedStaff.getFirstName() != null &&
                !updatedStaff.getFirstName()
                        .trim()
                        .isEmpty()) {

            existingStaff.setFirstName(
                    updatedStaff
                            .getFirstName()
                            .trim()
            );
        }

        // -----------------------------------------------------
        // LAST NAME
        // -----------------------------------------------------

        if (updatedStaff.getLastName() != null &&
                !updatedStaff.getLastName()
                        .trim()
                        .isEmpty()) {

            existingStaff.setLastName(
                    updatedStaff
                            .getLastName()
                            .trim()
            );
        }

        // -----------------------------------------------------
        // EMAIL
        // -----------------------------------------------------

        if (updatedStaff.getEmail() != null &&
                !updatedStaff.getEmail()
                        .trim()
                        .isEmpty()) {

            String newEmail =
                    updatedStaff
                            .getEmail()
                            .trim()
                            .toLowerCase();

            if (!newEmail.matches(EMAIL_REGEX)) {
                throw new RuntimeException(
                        "Invalid email format"
                );
            }

            if (!newEmail.equalsIgnoreCase(
                    existingStaff.getEmail())) {

                if (staffRepository
                        .existsByEmail(newEmail)) {

                    throw new RuntimeException(
                            "Another staff member already uses this email"
                    );
                }
            }

            existingStaff.setEmail(
                    newEmail
            );
        }

        // -----------------------------------------------------
        // PHONE
        // -----------------------------------------------------

        if (updatedStaff.getPhone() != null) {

            String newPhone = updatedStaff.getPhone().trim();
            if (!newPhone.isEmpty() && !newPhone.matches(PHONE_REGEX)) {
                throw new RuntimeException(
                        "Invalid phone number format"
                );
            }

            existingStaff.setPhone(
                    newPhone
            );
        }

        // -----------------------------------------------------
        // ROLE
        // -----------------------------------------------------

        if (updatedStaff.getRole() != null &&
                !updatedStaff.getRole()
                        .trim()
                        .isEmpty()) {

            if (!isValidRole(updatedStaff.getRole())) {
                throw new RuntimeException(
                        "Invalid staff role: " + updatedStaff.getRole()
                );
            }

            String newRole =
                    normalizeRole(
                            updatedStaff.getRole()
                    );

            String oldRole =
                    normalizeRole(
                            existingStaff.getRole()
                    );

            if (!newRole.equalsIgnoreCase(
                    oldRole)) {

                existingStaff.setStaffCode(
                        generateStaffCode(
                                newRole
                        )
                );
            }

            existingStaff.setRole(
                    newRole
            );
        }

        // -----------------------------------------------------
        // STATUS
        // -----------------------------------------------------

        if (updatedStaff.getStatus() != null &&
                !updatedStaff.getStatus()
                        .trim()
                        .isEmpty()) {

            String newStatus =
                    updatedStaff
                            .getStatus()
                            .trim()
                            .toUpperCase();

            existingStaff.setStatus(
                    newStatus
            );
        }

        // -----------------------------------------------------
        // IMAGE URL
        // -----------------------------------------------------

        if (updatedStaff.getImageUrl() != null) {
            existingStaff.setImageUrl(
                    updatedStaff.getImageUrl().trim()
            );
        }

        // -----------------------------------------------------
        // SYNC USER ENTITY
        // -----------------------------------------------------

        if (existingStaff.getUser() != null) {
            User linkedUser = existingStaff.getUser();
            linkedUser.setFirstName(existingStaff.getFirstName());
            linkedUser.setLastName(existingStaff.getLastName());
            linkedUser.setEmail(existingStaff.getEmail());
            if (existingStaff.getPhone() != null && !existingStaff.getPhone().isBlank()) {
                linkedUser.setPhone(existingStaff.getPhone());
            }
            if (existingStaff.getImageUrl() != null) {
                linkedUser.setProfileImage(existingStaff.getImageUrl());
            }
            userRepository.save(linkedUser);
        }

        Staff savedStaff =
                staffRepository.save(
                        existingStaff
                );

        // -----------------------------------------------------
        // IF STAFF BECOMES ACTIVE
        // GENERATE CURRENT WEEK SCHEDULE
        // -----------------------------------------------------

        if ("ACTIVE".equalsIgnoreCase(
                savedStaff.getStatus())) {

            LocalDate currentWeekMonday =
                    LocalDate.now()
                            .with(
                                    TemporalAdjusters
                                            .previousOrSame(
                                                    DayOfWeek.MONDAY
                                            )
                            );

            try {

                staffScheduleService
                        .getWeeklySchedule(
                                savedStaff.getId(),
                                currentWeekMonday
                        );

            } catch (RuntimeException e) {

                staffScheduleService
                        .generateWeeklySchedule(
                                savedStaff.getId(),
                                currentWeekMonday
                        );
            }
        }

        return savedStaff;
    }

    // =========================================================
    // ACTIVATE STAFF
    // =========================================================

    public Staff activateStaff(
            Long id) {

        Staff staff =
                getStaffById(id);

        staff.setStatus("ACTIVE");
        if (staff.getUser() != null) {
            staff.getUser().setStatus("ACTIVE");
            userRepository.save(staff.getUser());
        }

        Staff savedStaff =
                staffRepository.save(
                        staff
                );

        LocalDate currentWeekMonday =
                LocalDate.now()
                        .with(
                                TemporalAdjusters
                                        .previousOrSame(
                                                DayOfWeek.MONDAY
                                        )
                        );

        try {

            staffScheduleService
                    .getWeeklySchedule(
                            savedStaff.getId(),
                            currentWeekMonday
                    );

        } catch (RuntimeException e) {

            staffScheduleService
                    .generateWeeklySchedule(
                            savedStaff.getId(),
                            currentWeekMonday
                    );
        }

        return savedStaff;
    }

    // =========================================================
    // DEACTIVATE STAFF
    // =========================================================

    public Staff deactivateStaff(
            Long id) {

        Staff staff =
                getStaffById(id);

        staff.setStatus("INACTIVE");
        if (staff.getUser() != null) {
            staff.getUser().setStatus("INACTIVE");
            userRepository.save(staff.getUser());
        }

        return staffRepository.save(
                staff
        );
    }

    // =========================================================
    // DELETE STAFF
    // =========================================================

    public void deleteStaff(
            Long id) {

        Staff staff = staffRepository.findById(id)
                .or(() -> staffRepository.findByUserId(id))
                .orElse(null);

        if (staff == null) {
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
            throw new RuntimeException("Staff not found with id: " + id);
        }

        // Delete schedules first
        staffScheduleService.deleteStaffSchedules(staff.getId());

        cleanupProfileImage(staff.getImageUrl());

        User user = staff.getUser();
        staff.setUser(null);
        staffRepository.saveAndFlush(staff);
        staffRepository.delete(staff);
        staffRepository.flush();

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