package com.dentaflow.backend.controller;

import com.dentaflow.backend.ai.AIReportGeneratorService;
import com.dentaflow.backend.entity.*;
import com.dentaflow.backend.repository.*;
import com.dentaflow.backend.security.AccessControlService;
import com.dentaflow.backend.security.JwtService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.*;

@RestController
@RequestMapping("/api/admin/ai/reports")
public class AdminAIReportController {

    private final AIReportGeneratorService reportService;
    private final AppointmentRepository appointmentRepository;
    private final BillRepository billRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final PaymentRepository paymentRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final TreatmentRepository treatmentRepository;
    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final MedicineRepository medicineRepository;
    private final SupplierRepository supplierRepository;
    private final DentistRepository dentistRepository;
    private final StaffRepository staffRepository;
    private final InquiryRepository inquiryRepository;
    private final ReviewRepository reviewRepository;
    private final FeedbackRepository feedbackRepository;
    private final TreatmentPlanRepository treatmentPlanRepository;
    private final AccessControlService accessControlService;

    @Autowired
    public AdminAIReportController(
            AIReportGeneratorService reportService,
            AppointmentRepository appointmentRepository,
            BillRepository billRepository,
            MedicalRecordRepository medicalRecordRepository,
            PaymentRepository paymentRepository,
            PrescriptionRepository prescriptionRepository,
            TreatmentRepository treatmentRepository,
            PatientRepository patientRepository,
            UserRepository userRepository,
            JwtService jwtService,
            MedicineRepository medicineRepository,
            SupplierRepository supplierRepository,
            DentistRepository dentistRepository,
            StaffRepository staffRepository,
            InquiryRepository inquiryRepository,
            ReviewRepository reviewRepository,
            FeedbackRepository feedbackRepository,
            TreatmentPlanRepository treatmentPlanRepository,
            AccessControlService accessControlService) {

        this.reportService = reportService;
        this.appointmentRepository = appointmentRepository;
        this.billRepository = billRepository;
        this.medicalRecordRepository = medicalRecordRepository;
        this.paymentRepository = paymentRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.treatmentRepository = treatmentRepository;
        this.patientRepository = patientRepository;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.medicineRepository = medicineRepository;
        this.supplierRepository = supplierRepository;
        this.dentistRepository = dentistRepository;
        this.staffRepository = staffRepository;
        this.inquiryRepository = inquiryRepository;
        this.reviewRepository = reviewRepository;
        this.feedbackRepository = feedbackRepository;
        this.treatmentPlanRepository = treatmentPlanRepository;
        this.accessControlService = accessControlService;
    }

    public AdminAIReportController(
            AIReportGeneratorService reportService,
            AppointmentRepository appointmentRepository,
            BillRepository billRepository,
            MedicalRecordRepository medicalRecordRepository,
            PaymentRepository paymentRepository,
            PrescriptionRepository prescriptionRepository,
            TreatmentRepository treatmentRepository,
            PatientRepository patientRepository,
            UserRepository userRepository,
            JwtService jwtService,
            MedicineRepository medicineRepository,
            SupplierRepository supplierRepository,
            DentistRepository dentistRepository,
            StaffRepository staffRepository,
            InquiryRepository inquiryRepository,
            ReviewRepository reviewRepository,
            FeedbackRepository feedbackRepository,
            TreatmentPlanRepository treatmentPlanRepository) {

        this(reportService, appointmentRepository, billRepository, medicalRecordRepository,
                paymentRepository, prescriptionRepository, treatmentRepository, patientRepository,
                userRepository, jwtService, medicineRepository, supplierRepository, dentistRepository,
                staffRepository, inquiryRepository, reviewRepository, feedbackRepository,
                treatmentPlanRepository, null);
    }

    private User getAuthenticatedUser(String authHeader) {
        if (accessControlService != null) {
            User u = accessControlService.getCurrentUser();
            if (u != null) return u;
            Long uid = accessControlService.getCurrentUserId();
            if (uid != null) {
                return userRepository.findById(uid).orElse(null);
            }
        }
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                Long userId = jwtService.extractUserId(authHeader.substring(7).trim());
                if (userId != null) {
                    return userRepository.findById(userId).orElse(null);
                }
            } catch (Exception ignored) {
            }
        }
        return null;
    }

    private boolean isUnauthenticated(String authHeader) {
        if (accessControlService != null) {
            if (accessControlService.getCurrentUserId() != null || accessControlService.isAdmin()) {
                return false;
            }
        }
        User authUser = getAuthenticatedUser(authHeader);
        return authUser == null;
    }

    private boolean isAdmin() {
        if (accessControlService != null && accessControlService.isAdmin()) {
            return true;
        }
        User user = getAuthenticatedUser(null);
        return user != null && user.getRole() != null && "ADMIN".equalsIgnoreCase(user.getRole().getName());
    }

    private boolean hasRole(String roleName) {
        if (accessControlService != null && accessControlService.hasRole(roleName)) {
            return true;
        }
        User user = getAuthenticatedUser(null);
        if (user != null && user.getRole() != null) {
            String r = user.getRole().getName().toUpperCase();
            if (r.equalsIgnoreCase(roleName) || r.equals("ROLE_" + roleName.toUpperCase())) {
                return true;
            }
        }
        return false;
    }

    private boolean isDoctorOrDentist() {
        return hasRole("DOCTOR") || hasRole("DENTIST");
    }

    private boolean isCashier() {
        return hasRole("CASHIER");
    }

    private boolean isPharmacist() {
        return hasRole("PHARMACIST");
    }

    private boolean isReceptionist() {
        return hasRole("RECEPTIONIST");
    }

    private boolean isPatient() {
        return hasRole("PATIENT");
    }

    private Long getAuthenticatedDentistId() {
        if (accessControlService != null) {
            Long userId = accessControlService.getCurrentUserId();
            if (userId != null && dentistRepository != null) {
                Optional<Dentist> d = dentistRepository.findByUserId(userId);
                if (d.isPresent()) {
                    return d.get().getId();
                }
            }
        }
        User user = getAuthenticatedUser(null);
        if (user != null && dentistRepository != null) {
            Optional<Dentist> d = dentistRepository.findByUserId(user.getId());
            if (d.isPresent()) {
                return d.get().getId();
            }
        }
        return null;
    }

    // =========================================================
    // 1. PATIENT REPORT (Admin, Doctor, and Own Patient)
    // =========================================================

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR', 'DENTIST', 'PATIENT')")
    public ResponseEntity<?> generatePatientReport(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @PathVariable Long patientId) {

        if (isUnauthenticated(authHeader)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!isAdmin() && !isDoctorOrDentist() && !isPatient()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        if (isPatient()) {
            if (accessControlService != null) {
                if (!accessControlService.isSelfPatientOrAdmin(patientId)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "You do not have permission to access another patient's report"));
                }
            } else {
                User authUser = getAuthenticatedUser(authHeader);
                if (authUser != null) {
                    Patient p = patientRepository.findByUserId(authUser.getId()).orElse(null);
                    if (p == null || !p.getId().equals(patientId)) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body(Map.of("error", "You do not have permission to access another patient's report"));
                    }
                }
            }
        }

        if (isDoctorOrDentist() && !isAdmin()) {
            if (accessControlService != null && !accessControlService.canAccessPatientRecords(patientId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You do not have permission to access this patient's report"));
            }
        }

        try {
            Patient patient = patientRepository.findById(patientId).orElse(null);
            if (patient == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Patient not found with id: " + patientId));
            }

            List<MedicalRecord> medicalRecords =
                    medicalRecordRepository.findByPatientIdOrderByRecordDateDesc(patientId);

            List<Treatment> treatments =
                    treatmentRepository.findByPatientIdOrderByTreatmentDateDesc(patientId);

            List<Prescription> prescriptions =
                    prescriptionRepository.findByPatientIdOrderByPrescriptionDateDesc(patientId);

            List<Bill> bills =
                    billRepository.findByPatientIdOrderByBillDateDesc(patientId);

            List<Payment> payments = bills.stream()
                    .flatMap(bill -> paymentRepository.findByBillIdOrderByPaymentDateDesc(bill.getId()).stream())
                    .toList();

            AIReportGeneratorService.ReportResult aiResult = reportService.generatePatientReport(
                    patientId, medicalRecords, treatments, prescriptions, bills, payments
            );

            BigDecimal totalBilled = bills.stream().map(Bill::getTotalAmount).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalPaid = bills.stream().map(Bill::getPaidAmount).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal outstandingBalance = totalBilled.subtract(totalPaid);

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("patientId", patientId);
            resp.put("patientName", (patient.getFirstName() + " " + (patient.getLastName() != null ? patient.getLastName() : "")).trim());
            resp.put("totalBilled", totalBilled);
            resp.put("totalPaid", totalPaid);
            resp.put("outstandingBalance", outstandingBalance);
            resp.put("medicalRecordCount", medicalRecords.size());
            resp.put("treatmentCount", treatments.size());
            resp.put("prescriptionCount", prescriptions.size());
            resp.put("billCount", bills.size());
            resp.put("paymentCount", payments.size());
            resp.put("reportResult", aiResult);

            return ResponseEntity.ok(resp);

        } catch (RuntimeException exception) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // 2. PATIENT SELF-SERVICE REPORT (Logged-in Patient)
    // =========================================================

    @GetMapping("/patient/my")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<?> generateMyPatientReport(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        if (isUnauthenticated(authHeader)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
        }

        if (!isPatient()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Access denied: Unauthorized role"));
        }

        User authUser = getAuthenticatedUser(authHeader);
        if (authUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
        }

        Patient patient = patientRepository.findByUserId(authUser.getId()).orElse(null);
        if (patient == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Patient profile not found for user"));
        }

        return generatePatientReport(authHeader, patient.getId());
    }

    // =========================================================
    // 3. APPOINTMENT REPORT (Admin, Doctor, Receptionist)
    // =========================================================

    @GetMapping("/appointments")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR', 'DENTIST', 'RECEPTIONIST')")
    public ResponseEntity<?> generateAppointmentReport(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long dentistId,
            @RequestParam(required = false) Long patientId) {

        if (isUnauthenticated(authHeader)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!isAdmin() && !isDoctorOrDentist() && !isReceptionist()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {
            if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Start date cannot be after end date"));
            }

            if (dentistId != null && !dentistRepository.existsById(dentistId)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid dentist ID"));
            }

            if (patientId != null && !patientRepository.existsById(patientId)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid patient ID"));
            }

            Long filterDentistId = dentistId;
            if (isDoctorOrDentist() && !isAdmin()) {
                if (filterDentistId != null) {
                    if (accessControlService != null && !accessControlService.canAccessDentistRecords(filterDentistId)) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body(Map.of("error", "You do not have permission to access another dentist's reports"));
                    }
                } else {
                    Long ownDentistId = getAuthenticatedDentistId();
                    if (ownDentistId != null) {
                        filterDentistId = ownDentistId;
                    } else {
                        filterDentistId = -1L;
                    }
                }
                if (patientId != null && accessControlService != null) {
                    if (!accessControlService.canAccessPatientRecords(patientId)) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body(Map.of("error", "You do not have permission to access this patient's report"));
                    }
                }
            }

            List<Appointment> appointments = appointmentRepository.findAll();

            if (startDate != null) {
                appointments = appointments.stream()
                        .filter(a -> a.getAppointmentDate() != null && !a.getAppointmentDate().isBefore(startDate))
                        .toList();
            }
            if (endDate != null) {
                appointments = appointments.stream()
                        .filter(a -> a.getAppointmentDate() != null && !a.getAppointmentDate().isAfter(endDate))
                        .toList();
            }
            if (status != null && !status.trim().isEmpty()) {
                appointments = appointments.stream()
                        .filter(a -> a.getStatus() != null && a.getStatus().equalsIgnoreCase(status.trim()))
                        .toList();
            }
            if (filterDentistId != null) {
                final Long finalDentistId = filterDentistId;
                appointments = appointments.stream()
                        .filter(a -> a.getDentist() != null && a.getDentist().getId().equals(finalDentistId))
                        .toList();
            }
            if (patientId != null) {
                appointments = appointments.stream()
                        .filter(a -> a.getPatient() != null && a.getPatient().getId().equals(patientId))
                        .toList();
            }

            long totalAppointments = appointments.size();
            long completedAppointments = appointments.stream().filter(a -> "COMPLETED".equalsIgnoreCase(a.getStatus())).count();
            long cancelledAppointments = appointments.stream().filter(a -> "CANCELLED".equalsIgnoreCase(a.getStatus())).count();
            long noShowAppointments = appointments.stream().filter(a -> "NO_SHOW".equalsIgnoreCase(a.getStatus())).count();
            long confirmedAppointments = appointments.stream().filter(a -> "CONFIRMED".equalsIgnoreCase(a.getStatus())).count();
            long pendingAppointments = appointments.stream().filter(a -> "PENDING".equalsIgnoreCase(a.getStatus())).count();

            AIReportGeneratorService.ReportResult aiResult = reportService.generateAppointmentReport(appointments);

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("totalAppointments", totalAppointments);
            resp.put("completedAppointments", completedAppointments);
            resp.put("completedCount", completedAppointments);
            resp.put("cancelledAppointments", cancelledAppointments);
            resp.put("noShowAppointments", noShowAppointments);
            resp.put("confirmedAppointments", confirmedAppointments);
            resp.put("pendingAppointments", pendingAppointments);
            resp.put("reportResult", aiResult);

            return ResponseEntity.ok(resp);

        } catch (RuntimeException exception) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // 4. TREATMENT REPORT (Admin, Doctor)
    // =========================================================

    @GetMapping("/treatments")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR', 'DENTIST')")
    public ResponseEntity<?> generateTreatmentReport(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long dentistId,
            @RequestParam(required = false) Long patientId) {

        if (isUnauthenticated(authHeader)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!isAdmin() && !isDoctorOrDentist()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {
            if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Start date cannot be after end date"));
            }

            if (dentistId != null && !dentistRepository.existsById(dentistId)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid dentist ID"));
            }

            if (patientId != null && !patientRepository.existsById(patientId)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid patient ID"));
            }

            Long filterDentistId = dentistId;
            if (isDoctorOrDentist() && !isAdmin()) {
                if (filterDentistId != null) {
                    if (accessControlService != null && !accessControlService.canAccessDentistRecords(filterDentistId)) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body(Map.of("error", "You do not have permission to access another dentist's reports"));
                    }
                } else {
                    Long ownDentistId = getAuthenticatedDentistId();
                    if (ownDentistId != null) {
                        filterDentistId = ownDentistId;
                    } else {
                        filterDentistId = -1L;
                    }
                }
                if (patientId != null && accessControlService != null) {
                    if (!accessControlService.canAccessPatientRecords(patientId)) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body(Map.of("error", "You do not have permission to access this patient's report"));
                    }
                }
            }

            List<Treatment> treatments = treatmentRepository.findAll();

            if (startDate != null) {
                treatments = treatments.stream()
                        .filter(t -> t.getTreatmentDate() != null && !t.getTreatmentDate().isBefore(startDate))
                        .toList();
            }
            if (endDate != null) {
                treatments = treatments.stream()
                        .filter(t -> t.getTreatmentDate() != null && !t.getTreatmentDate().isAfter(endDate))
                        .toList();
            }
            if (status != null && !status.trim().isEmpty()) {
                treatments = treatments.stream()
                        .filter(t -> t.getStatus() != null && t.getStatus().equalsIgnoreCase(status.trim()))
                        .toList();
            }
            if (filterDentistId != null) {
                final Long finalDentistId = filterDentistId;
                treatments = treatments.stream()
                        .filter(t -> t.getDentist() != null && t.getDentist().getId().equals(finalDentistId))
                        .toList();
            }
            if (patientId != null) {
                treatments = treatments.stream()
                        .filter(t -> t.getPatient() != null && t.getPatient().getId().equals(patientId))
                        .toList();
            }

            long totalTreatments = treatments.size();
            long plannedTreatments = treatments.stream().filter(t -> "PLANNED".equalsIgnoreCase(t.getStatus())).count();
            long inProgressTreatments = treatments.stream().filter(t -> "IN_PROGRESS".equalsIgnoreCase(t.getStatus())).count();
            long completedTreatments = treatments.stream().filter(t -> "COMPLETED".equalsIgnoreCase(t.getStatus())).count();
            long cancelledTreatments = treatments.stream().filter(t -> "CANCELLED".equalsIgnoreCase(t.getStatus())).count();
            BigDecimal estimatedCost = treatments.stream().map(Treatment::getEstimatedCost).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal actualCost = treatments.stream().map(Treatment::getActualCost).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);

            AIReportGeneratorService.ReportResult aiResult = reportService.generateTreatmentReport(treatments);

            long activeTreatmentPlans = treatmentPlanRepository.findAll().stream()
                    .filter(p -> p.getStatus() != null && !"CANCELLED".equalsIgnoreCase(p.getStatus()) && !"COMPLETED".equalsIgnoreCase(p.getStatus()))
                    .count();

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("totalTreatments", totalTreatments);
            resp.put("plannedTreatments", plannedTreatments);
            resp.put("inProgressTreatments", inProgressTreatments);
            resp.put("completedTreatments", completedTreatments);
            resp.put("completedCount", completedTreatments);
            resp.put("activeTreatmentPlans", activeTreatmentPlans);
            resp.put("cancelledTreatments", cancelledTreatments);
            resp.put("estimatedCost", estimatedCost);
            resp.put("actualCost", actualCost);
            resp.put("reportResult", aiResult);

            return ResponseEntity.ok(resp);

        } catch (RuntimeException exception) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // 5. BILLING REPORT (Admin, Cashier)
    // =========================================================

    @GetMapping("/billing")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<?> generateBillingReport(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long patientId) {

        if (isUnauthenticated(authHeader)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!isAdmin() && !isCashier()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {
            if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Start date cannot be after end date"));
            }

            if (patientId != null && !patientRepository.existsById(patientId)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid patient ID"));
            }

            List<Bill> bills = billRepository.findAll();

            if (startDate != null) {
                bills = bills.stream()
                        .filter(b -> b.getBillDate() != null && !b.getBillDate().toLocalDate().isBefore(startDate))
                        .toList();
            }
            if (endDate != null) {
                bills = bills.stream()
                        .filter(b -> b.getBillDate() != null && !b.getBillDate().toLocalDate().isAfter(endDate))
                        .toList();
            }
            if (status != null && !status.trim().isEmpty()) {
                bills = bills.stream()
                        .filter(b -> b.getStatus() != null && b.getStatus().equalsIgnoreCase(status.trim()))
                        .toList();
            }
            if (patientId != null) {
                bills = bills.stream()
                        .filter(b -> b.getPatient() != null && b.getPatient().getId().equals(patientId))
                        .toList();
            }

            long totalBills = bills.size();
            BigDecimal totalAmount = bills.stream().map(Bill::getTotalAmount).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalPaid = bills.stream().map(Bill::getPaidAmount).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalBalance = bills.stream().map(Bill::getBalanceAmount).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalSubtotal = bills.stream().map(Bill::getSubtotal).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalDiscount = bills.stream().map(Bill::getDiscount).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalTax = bills.stream().map(Bill::getTax).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);

            long paidCount = bills.stream().filter(b -> "PAID".equalsIgnoreCase(b.getStatus())).count();
            long partiallyPaidCount = bills.stream().filter(b -> "PARTIALLY_PAID".equalsIgnoreCase(b.getStatus())).count();
            long unpaidCount = bills.stream().filter(b -> "UNPAID".equalsIgnoreCase(b.getStatus())).count();

            AIReportGeneratorService.ReportResult aiResult = reportService.generateBillingReport(bills);

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("totalBills", totalBills);
            resp.put("totalAmount", totalAmount);
            resp.put("totalBilled", totalAmount);
            resp.put("totalPaid", totalPaid);
            resp.put("totalBalance", totalBalance);
            resp.put("totalOutstanding", totalBalance);
            resp.put("outstandingBilling", totalBalance);
            resp.put("bills", bills);
            resp.put("totalSubtotal", totalSubtotal);
            resp.put("totalDiscount", totalDiscount);
            resp.put("totalTax", totalTax);
            resp.put("paidCount", paidCount);
            resp.put("partiallyPaidCount", partiallyPaidCount);
            resp.put("unpaidCount", unpaidCount);
            resp.put("reportResult", aiResult);

            return ResponseEntity.ok(resp);

        } catch (RuntimeException exception) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // 6. PAYMENT REPORT (Admin, Cashier)
    // =========================================================

    @GetMapping("/payments")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<?> generatePaymentReport(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String paymentMethod) {

        if (isUnauthenticated(authHeader)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!isAdmin() && !isCashier()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {
            if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Start date cannot be after end date"));
            }

            List<Payment> payments = paymentRepository.findAll();

            if (startDate != null) {
                payments = payments.stream()
                        .filter(p -> p.getPaymentDate() != null && !p.getPaymentDate().toLocalDate().isBefore(startDate))
                        .toList();
            }
            if (endDate != null) {
                payments = payments.stream()
                        .filter(p -> p.getPaymentDate() != null && !p.getPaymentDate().toLocalDate().isAfter(endDate))
                        .toList();
            }
            if (status != null && !status.trim().isEmpty()) {
                payments = payments.stream()
                        .filter(p -> p.getStatus() != null && p.getStatus().equalsIgnoreCase(status.trim()))
                        .toList();
            }
            if (paymentMethod != null && !paymentMethod.trim().isEmpty()) {
                payments = payments.stream()
                        .filter(p -> p.getPaymentMethod() != null && p.getPaymentMethod().equalsIgnoreCase(paymentMethod.trim()))
                        .toList();
            }

            long totalPayments = payments.size();
            BigDecimal totalRevenue = payments.stream().filter(p -> "SUCCESS".equalsIgnoreCase(p.getStatus())).map(Payment::getAmount).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalAmount = payments.stream().map(Payment::getAmount).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalRefundAmount = payments.stream().filter(p -> "REFUNDED".equalsIgnoreCase(p.getStatus())).map(Payment::getAmount).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);

            long successfulPayments = payments.stream().filter(p -> "SUCCESS".equalsIgnoreCase(p.getStatus())).count();
            long pendingPayments = payments.stream().filter(p -> "PENDING".equalsIgnoreCase(p.getStatus())).count();
            long failedPayments = payments.stream().filter(p -> "FAILED".equalsIgnoreCase(p.getStatus())).count();
            long refundedPayments = payments.stream().filter(p -> "REFUNDED".equalsIgnoreCase(p.getStatus())).count();

            AIReportGeneratorService.ReportResult aiResult = reportService.generatePaymentReport(payments);

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("totalPayments", totalPayments);
            resp.put("totalAmount", totalAmount);
            resp.put("totalRevenue", totalRevenue);
            resp.put("successfulPayments", successfulPayments);
            resp.put("pendingPayments", pendingPayments);
            resp.put("failedPayments", failedPayments);
            resp.put("refundedPayments", refundedPayments);
            resp.put("refundTotals", totalRefundAmount);
            resp.put("totalRefundAmount", totalRefundAmount);
            resp.put("reportResult", aiResult);

            return ResponseEntity.ok(resp);

        } catch (RuntimeException exception) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // 7. REVENUE REPORT (Admin, Cashier)
    // =========================================================

    @GetMapping("/revenue")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<?> generateRevenueReport(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        if (isUnauthenticated(authHeader)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!isAdmin() && !isCashier()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {
            if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Start date cannot be after end date"));
            }

            List<Payment> payments = paymentRepository.findAll();
            List<Bill> bills = billRepository.findAll();

            if (startDate != null) {
                payments = payments.stream().filter(p -> p.getPaymentDate() != null && !p.getPaymentDate().toLocalDate().isBefore(startDate)).toList();
                bills = bills.stream().filter(b -> b.getBillDate() != null && !b.getBillDate().toLocalDate().isBefore(startDate)).toList();
            }
            if (endDate != null) {
                payments = payments.stream().filter(p -> p.getPaymentDate() != null && !p.getPaymentDate().toLocalDate().isAfter(endDate)).toList();
                bills = bills.stream().filter(b -> b.getBillDate() != null && !b.getBillDate().toLocalDate().isAfter(endDate)).toList();
            }

            BigDecimal totalRevenue = payments.stream().filter(p -> "SUCCESS".equalsIgnoreCase(p.getStatus())).map(Payment::getAmount).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal refundTotals = payments.stream().filter(p -> "REFUNDED".equalsIgnoreCase(p.getStatus())).map(Payment::getAmount).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalBilled = bills.stream().map(Bill::getTotalAmount).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal totalCollected = bills.stream().map(Bill::getPaidAmount).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal outstandingBilling = bills.stream().map(Bill::getBalanceAmount).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal netRevenue = totalRevenue.subtract(refundTotals);

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("totalRevenue", totalRevenue);
            resp.put("totalBilled", totalBilled);
            resp.put("totalCollected", totalCollected);
            resp.put("outstandingBilling", outstandingBilling);
            resp.put("refundTotals", refundTotals);
            resp.put("netRevenue", netRevenue);
            resp.put("totalInvoices", bills.size());
            resp.put("totalTransactions", payments.size());

            return ResponseEntity.ok(resp);

        } catch (RuntimeException exception) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // 8. OUTSTANDING INVOICES REPORT (Admin, Cashier)
    // =========================================================

    @GetMapping("/outstanding")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<?> generateOutstandingReport(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long patientId) {

        if (isUnauthenticated(authHeader)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!isAdmin() && !isCashier()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {
            if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Start date cannot be after end date"));
            }

            if (patientId != null && !patientRepository.existsById(patientId)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid patient ID"));
            }

            List<Bill> bills = billRepository.findAll().stream()
                    .filter(b -> b.getBalanceAmount() != null && b.getBalanceAmount().compareTo(BigDecimal.ZERO) > 0)
                    .toList();

            if (startDate != null) {
                bills = bills.stream().filter(b -> b.getBillDate() != null && !b.getBillDate().toLocalDate().isBefore(startDate)).toList();
            }
            if (endDate != null) {
                bills = bills.stream().filter(b -> b.getBillDate() != null && !b.getBillDate().toLocalDate().isAfter(endDate)).toList();
            }
            if (patientId != null) {
                bills = bills.stream().filter(b -> b.getPatient() != null && b.getPatient().getId().equals(patientId)).toList();
            }

            BigDecimal totalOutstandingAmount = bills.stream().map(Bill::getBalanceAmount).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("outstandingCount", bills.size());
            resp.put("totalOutstandingBills", bills.size());
            resp.put("totalOutstandingAmount", totalOutstandingAmount);
            resp.put("totalOutstanding", totalOutstandingAmount);
            resp.put("outstandingBilling", totalOutstandingAmount);
            resp.put("outstandingBills", bills);

            return ResponseEntity.ok(resp);

        } catch (RuntimeException exception) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // 9. REFUNDS REPORT (Admin, Cashier)
    // =========================================================

    @GetMapping("/refunds")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<?> generateRefundsReport(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        if (isUnauthenticated(authHeader)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!isAdmin() && !isCashier()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {
            if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Start date cannot be after end date"));
            }

            List<Payment> refundedPayments = paymentRepository.findAll().stream()
                    .filter(p -> "REFUNDED".equalsIgnoreCase(p.getStatus()))
                    .toList();

            if (startDate != null) {
                refundedPayments = refundedPayments.stream().filter(p -> p.getPaymentDate() != null && !p.getPaymentDate().toLocalDate().isBefore(startDate)).toList();
            }
            if (endDate != null) {
                refundedPayments = refundedPayments.stream().filter(p -> p.getPaymentDate() != null && !p.getPaymentDate().toLocalDate().isAfter(endDate)).toList();
            }

            BigDecimal totalRefundAmount = refundedPayments.stream().map(Payment::getAmount).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("refundCount", refundedPayments.size());
            resp.put("totalRefundAmount", totalRefundAmount);
            resp.put("totalRefunded", totalRefundAmount);
            resp.put("refundTotals", totalRefundAmount);
            resp.put("refunds", refundedPayments);

            return ResponseEntity.ok(resp);

        } catch (RuntimeException exception) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // 10. INVENTORY REPORT (Admin, Pharmacist)
    // =========================================================

    @GetMapping("/inventory")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> generateInventoryReport(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status) {

        if (isUnauthenticated(authHeader)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!isAdmin() && !isPharmacist()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {
            List<Medicine> medicines = medicineRepository.findAll();

            if (category != null && !category.trim().isEmpty()) {
                medicines = medicines.stream()
                        .filter(m -> m.getCategory() != null && m.getCategory().equalsIgnoreCase(category.trim()))
                        .toList();
            }
            if (status != null && !status.trim().isEmpty()) {
                medicines = medicines.stream()
                        .filter(m -> m.getStatus() != null && m.getStatus().equalsIgnoreCase(status.trim()))
                        .toList();
            }

            long totalMedicines = medicines.size();
            long totalStockQuantity = medicines.stream().mapToLong(m -> m.getStockQuantity() != null ? m.getStockQuantity() : 0).sum();
            BigDecimal totalInventoryValue = medicines.stream().map(m -> {
                int qty = m.getStockQuantity() != null ? m.getStockQuantity() : 0;
                BigDecimal price = m.getUnitPrice() != null ? m.getUnitPrice() : BigDecimal.ZERO;
                return price.multiply(BigDecimal.valueOf(qty));
            }).reduce(BigDecimal.ZERO, BigDecimal::add);

            long lowStockCount = medicines.stream().filter(m -> {
                int qty = m.getStockQuantity() != null ? m.getStockQuantity() : 0;
                int threshold = m.getReorderLevel() != null ? m.getReorderLevel() : 20;
                return qty <= threshold;
            }).count();

            long outOfStockCount = medicines.stream().filter(m -> (m.getStockQuantity() != null ? m.getStockQuantity() : 0) <= 0).count();

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("totalMedicines", totalMedicines);
            resp.put("totalStockQuantity", totalStockQuantity);
            resp.put("totalInventoryValue", totalInventoryValue);
            resp.put("inventoryValue", totalInventoryValue);
            resp.put("lowStockCount", lowStockCount);
            resp.put("outOfStockCount", outOfStockCount);

            return ResponseEntity.ok(resp);

        } catch (RuntimeException exception) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // 11. LOW-STOCK REPORT (Admin, Pharmacist)
    // =========================================================

    @GetMapping("/low-stock")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> generateLowStockReport(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        if (isUnauthenticated(authHeader)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!isAdmin() && !isPharmacist()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {
            List<Medicine> medicines = medicineRepository.findAll().stream().filter(m -> {
                int qty = m.getStockQuantity() != null ? m.getStockQuantity() : 0;
                int threshold = m.getReorderLevel() != null ? m.getReorderLevel() : 20;
                return qty <= threshold;
            }).toList();

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("lowStockCount", medicines.size());
            List<?> itemsList = medicines.stream().map(m -> Map.of(
                    "id", m.getId(),
                    "name", m.getName(),
                    "medicineCode", m.getMedicineCode(),
                    "stockQuantity", m.getStockQuantity() != null ? m.getStockQuantity() : 0,
                    "reorderLevel", m.getReorderLevel() != null ? m.getReorderLevel() : 20,
                    "unitPrice", m.getUnitPrice() != null ? m.getUnitPrice() : BigDecimal.ZERO
            )).toList();
            resp.put("items", itemsList);
            resp.put("lowStockMedicines", itemsList);

            return ResponseEntity.ok(resp);

        } catch (RuntimeException exception) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // 12. DISPENSING / PRESCRIPTION REPORT (Admin, Pharmacist, Doctor)
    // =========================================================

    @GetMapping("/dispensing")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'DOCTOR', 'DENTIST')")
    public ResponseEntity<?> generateDispensingReport(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String status) {

        if (isUnauthenticated(authHeader)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!isAdmin() && !isPharmacist() && !isDoctorOrDentist()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {
            if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Start date cannot be after end date"));
            }

            List<Prescription> prescriptions = prescriptionRepository.findAll();

            if (startDate != null) {
                prescriptions = prescriptions.stream().filter(p -> p.getPrescriptionDate() != null && !p.getPrescriptionDate().isBefore(startDate)).toList();
            }
            if (endDate != null) {
                prescriptions = prescriptions.stream().filter(p -> p.getPrescriptionDate() != null && !p.getPrescriptionDate().isAfter(endDate)).toList();
            }
            if (status != null && !status.trim().isEmpty()) {
                prescriptions = prescriptions.stream().filter(p -> p.getStatus() != null && p.getStatus().equalsIgnoreCase(status.trim())).toList();
            }

            if (isDoctorOrDentist() && !isAdmin()) {
                Long ownDentistId = getAuthenticatedDentistId();
                if (ownDentistId != null) {
                    prescriptions = prescriptions.stream().filter(p -> p.getDentist() != null && p.getDentist().getId().equals(ownDentistId)).toList();
                } else {
                    prescriptions = List.of();
                }
            }

            long totalPrescriptions = prescriptions.size();
            long dispensedCount = prescriptions.stream().filter(p -> "COMPLETED".equalsIgnoreCase(p.getStatus()) || "DISPENSED".equalsIgnoreCase(p.getStatus())).count();
            long pendingDispensing = prescriptions.stream().filter(p -> "PENDING".equalsIgnoreCase(p.getStatus()) || "ACTIVE".equalsIgnoreCase(p.getStatus())).count();
            long cancelledCount = prescriptions.stream().filter(p -> "CANCELLED".equalsIgnoreCase(p.getStatus())).count();

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("totalPrescriptions", totalPrescriptions);
            resp.put("prescriptionCounts", totalPrescriptions);
            resp.put("dispensedCount", dispensedCount);
            resp.put("dispensedPrescriptions", dispensedCount);
            resp.put("dispensingCounts", dispensedCount);
            resp.put("completedDispensing", dispensedCount);
            resp.put("pendingDispensing", pendingDispensing);
            resp.put("cancelledCount", cancelledCount);

            return ResponseEntity.ok(resp);

        } catch (RuntimeException exception) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // 13. SUPPLIER REPORT (Admin, Pharmacist)
    // =========================================================

    @GetMapping("/suppliers")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<?> generateSuppliersReport(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        if (isUnauthenticated(authHeader)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!isAdmin() && !isPharmacist()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {
            List<Supplier> suppliers = supplierRepository.findAll();
            long totalSuppliers = suppliers.size();
            long activeSuppliers = suppliers.stream().filter(s -> "ACTIVE".equalsIgnoreCase(s.getStatus())).count();

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("totalSuppliers", totalSuppliers);
            resp.put("activeSuppliers", activeSuppliers);
            resp.put("inactiveSuppliers", totalSuppliers - activeSuppliers);

            return ResponseEntity.ok(resp);

        } catch (RuntimeException exception) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // 14. PATIENTS REPORT (Admin, Receptionist, Doctor)
    // =========================================================

    @GetMapping("/patients")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'DOCTOR', 'DENTIST')")
    public ResponseEntity<?> generatePatientsReport(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String status) {

        if (isUnauthenticated(authHeader)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!isAdmin() && !isReceptionist() && !isDoctorOrDentist()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {
            if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Start date cannot be after end date"));
            }

            List<Patient> patients = patientRepository.findAll();

            if (startDate != null) {
                patients = patients.stream().filter(p -> p.getCreatedAt() != null && !p.getCreatedAt().toLocalDate().isBefore(startDate)).toList();
            }
            if (endDate != null) {
                patients = patients.stream().filter(p -> p.getCreatedAt() != null && !p.getCreatedAt().toLocalDate().isAfter(endDate)).toList();
            }
            if (status != null && !status.trim().isEmpty()) {
                patients = patients.stream().filter(p -> p.getStatus() != null && p.getStatus().equalsIgnoreCase(status.trim())).toList();
            }

            long totalPatients = patients.size();
            long activePatients = patients.stream().filter(p -> "ACTIVE".equalsIgnoreCase(p.getStatus())).count();

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("totalPatients", totalPatients);
            resp.put("activePatients", activePatients);
            resp.put("inactivePatients", totalPatients - activePatients);

            return ResponseEntity.ok(resp);

        } catch (RuntimeException exception) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // 15. DENTIST REPORT (Admin only)
    // =========================================================

    @GetMapping("/dentists")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> generateDentistsReport(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        if (isUnauthenticated(authHeader)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {
            List<Dentist> dentists = dentistRepository.findAll();
            long totalDentists = dentists.size();
            long activeDentists = dentists.stream().filter(d -> "ACTIVE".equalsIgnoreCase(d.getStatus())).count();

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("totalDentists", totalDentists);
            resp.put("activeDentists", activeDentists);
            resp.put("inactiveDentists", totalDentists - activeDentists);

            return ResponseEntity.ok(resp);

        } catch (RuntimeException exception) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // 16. STAFF REPORT (Admin only)
    // =========================================================

    @GetMapping("/staff")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> generateStaffReport(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        if (isUnauthenticated(authHeader)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {
            List<Staff> staffList = staffRepository.findAll();
            long totalStaff = staffList.size();
            long activeStaff = staffList.stream().filter(s -> "ACTIVE".equalsIgnoreCase(s.getStatus())).count();

            Map<String, Long> roleCounts = new LinkedHashMap<>();
            for (Staff s : staffList) {
                String r = s.getRole() != null ? s.getRole().toUpperCase() : "GENERAL";
                roleCounts.put(r, roleCounts.getOrDefault(r, 0L) + 1);
            }

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("totalStaff", totalStaff);
            resp.put("activeStaff", activeStaff);
            resp.put("inactiveStaff", totalStaff - activeStaff);
            resp.put("roleBreakdown", roleCounts);

            return ResponseEntity.ok(resp);

        } catch (RuntimeException exception) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // 17. INQUIRY REPORT (Admin, Receptionist)
    // =========================================================

    @GetMapping("/inquiries")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<?> generateInquiriesReport(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String inquiryType) {

        if (isUnauthenticated(authHeader)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!isAdmin() && !isReceptionist()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {
            if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Start date cannot be after end date"));
            }

            List<Inquiry> inquiries = inquiryRepository.findAll();

            if (startDate != null) {
                inquiries = inquiries.stream().filter(i -> i.getCreatedAt() != null && !i.getCreatedAt().toLocalDate().isBefore(startDate)).toList();
            }
            if (endDate != null) {
                inquiries = inquiries.stream().filter(i -> i.getCreatedAt() != null && !i.getCreatedAt().toLocalDate().isAfter(endDate)).toList();
            }
            if (status != null && !status.trim().isEmpty()) {
                inquiries = inquiries.stream().filter(i -> i.getStatus() != null && i.getStatus().equalsIgnoreCase(status.trim())).toList();
            }
            if (inquiryType != null && !inquiryType.trim().isEmpty()) {
                inquiries = inquiries.stream().filter(i -> i.getInquiryType() != null && i.getInquiryType().equalsIgnoreCase(inquiryType.trim())).toList();
            }

            long totalInquiries = inquiries.size();
            long openInquiries = inquiries.stream().filter(i -> "OPEN".equalsIgnoreCase(i.getStatus())).count();
            long inProgressInquiries = inquiries.stream().filter(i -> "IN_PROGRESS".equalsIgnoreCase(i.getStatus())).count();
            long resolvedInquiries = inquiries.stream().filter(i -> "RESOLVED".equalsIgnoreCase(i.getStatus())).count();
            long closedInquiries = inquiries.stream().filter(i -> "CLOSED".equalsIgnoreCase(i.getStatus())).count();
            long respondedInquiries = inquiries.stream().filter(i -> "RESPONDED".equalsIgnoreCase(i.getStatus())).count();

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("totalInquiries", totalInquiries);
            resp.put("openInquiries", openInquiries);
            resp.put("inProgressInquiries", inProgressInquiries);
            resp.put("resolvedInquiries", resolvedInquiries);
            resp.put("closedInquiries", closedInquiries);
            resp.put("respondedInquiries", respondedInquiries);
            resp.put("statusBreakdown", Map.of(
                    "OPEN", openInquiries,
                    "IN_PROGRESS", inProgressInquiries,
                    "RESOLVED", resolvedInquiries,
                    "CLOSED", closedInquiries,
                    "RESPONDED", respondedInquiries
            ));

            return ResponseEntity.ok(resp);

        } catch (RuntimeException exception) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // 18. FEEDBACK REPORT (Admin, Receptionist)
    // =========================================================

    @GetMapping("/feedback")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST', 'DOCTOR', 'DENTIST')")
    public ResponseEntity<?> generateFeedbackReport(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Integer rating,
            @RequestParam(required = false) Long dentistId) {

        if (isUnauthenticated(authHeader)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!isAdmin() && !isReceptionist() && !isDoctorOrDentist()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {
            if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Start date cannot be after end date"));
            }

            if (dentistId != null && !dentistRepository.existsById(dentistId)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid dentist ID"));
            }

            Long filterDentistId = dentistId;
            if (isDoctorOrDentist() && !isAdmin()) {
                if (filterDentistId != null) {
                    if (accessControlService != null && !accessControlService.canAccessDentistRecords(filterDentistId)) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body(Map.of("error", "You do not have permission to access another dentist's reports"));
                    }
                } else {
                    Long ownDentistId = getAuthenticatedDentistId();
                    if (ownDentistId != null) {
                        filterDentistId = ownDentistId;
                    } else {
                        filterDentistId = -1L;
                    }
                }
            }

            List<Review> reviews = reviewRepository.findAll();

            if (startDate != null) {
                reviews = reviews.stream().filter(r -> r.getCreatedAt() != null && !r.getCreatedAt().toLocalDate().isBefore(startDate)).toList();
            }
            if (endDate != null) {
                reviews = reviews.stream().filter(r -> r.getCreatedAt() != null && !r.getCreatedAt().toLocalDate().isAfter(endDate)).toList();
            }
            if (rating != null) {
                reviews = reviews.stream().filter(r -> r.getRating() != null && r.getRating().equals(rating)).toList();
            }
            if (filterDentistId != null) {
                final Long finalDentistId = filterDentistId;
                reviews = reviews.stream().filter(r -> r.getDentist() != null && r.getDentist().getId().equals(finalDentistId)).toList();
            }

            long totalReviews = reviews.size();
            double avgRating = reviews.isEmpty() ? 0.0 : reviews.stream().mapToInt(r -> r.getRating() != null ? r.getRating() : 0).average().orElse(0.0);
            BigDecimal avgFormatted = BigDecimal.valueOf(avgRating).setScale(1, RoundingMode.HALF_UP);

            long fiveStarCount = reviews.stream().filter(r -> r.getRating() != null && r.getRating() == 5).count();
            long fourStarCount = reviews.stream().filter(r -> r.getRating() != null && r.getRating() == 4).count();
            long threeStarCount = reviews.stream().filter(r -> r.getRating() != null && r.getRating() == 3).count();
            long twoStarCount = reviews.stream().filter(r -> r.getRating() != null && r.getRating() == 2).count();
            long oneStarCount = reviews.stream().filter(r -> r.getRating() != null && r.getRating() == 1).count();
            long activeReviewsCount = reviews.stream().filter(r -> "ACTIVE".equalsIgnoreCase(r.getStatus())).count();
            long hiddenReviewsCount = reviews.stream().filter(r -> "HIDDEN".equalsIgnoreCase(r.getStatus())).count();

            Map<String, Object> resp = new LinkedHashMap<>();
            resp.put("totalReviews", totalReviews);
            resp.put("feedbackCounts", totalReviews);
            resp.put("averageRating", avgFormatted);
            resp.put("fiveStarCount", fiveStarCount);
            resp.put("fourStarCount", fourStarCount);
            resp.put("threeStarCount", threeStarCount);
            resp.put("twoStarCount", twoStarCount);
            resp.put("oneStarCount", oneStarCount);
            resp.put("activeReviewsCount", activeReviewsCount);
            resp.put("hiddenReviewsCount", hiddenReviewsCount);

            return ResponseEntity.ok(resp);

        } catch (RuntimeException exception) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // 19. ALL REPORTS (Admin only)
    // =========================================================

    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> generateAllReports(
            @RequestHeader(value = "Authorization", required = false) String authHeader) {

        if (isUnauthenticated(authHeader)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!isAdmin()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {
            List<Appointment> appointments = appointmentRepository.findAll();
            List<Treatment> treatments = treatmentRepository.findAll();
            List<Bill> bills = billRepository.findAll();
            List<Payment> payments = paymentRepository.findAll();

            return ResponseEntity.ok(
                    new AllReportsResponse(
                            reportService.generateAppointmentReport(appointments),
                            reportService.generateTreatmentReport(treatments),
                            reportService.generateBillingReport(bills),
                            reportService.generatePaymentReport(payments)
                    )
            );

        } catch (RuntimeException exception) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // 20. EXPORT REPORT TO CSV (Role-authorized per report type)
    // =========================================================

    @GetMapping("/export/csv")
    @PreAuthorize("hasAnyRole('ADMIN', 'DOCTOR', 'DENTIST', 'RECEPTIONIST', 'PHARMACIST', 'CASHIER')")
    public ResponseEntity<?> exportReportCSV(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam String type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        if (isUnauthenticated(authHeader)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        try {
            if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Start date cannot be after end date"));
            }

            String normType = type != null ? type.trim().toLowerCase() : "";

            // Check role authorization for the report type
            boolean isAuthorized = false;
            if (isAdmin()) {
                isAuthorized = true;
            } else if (isCashier()) {
                isAuthorized = List.of("billing", "payments", "revenue", "outstanding", "refunds").contains(normType);
            } else if (isPharmacist()) {
                isAuthorized = List.of("inventory", "low-stock", "dispensing", "suppliers").contains(normType);
            } else if (isDoctorOrDentist()) {
                isAuthorized = List.of("appointments", "treatments", "dispensing", "feedback").contains(normType);
            } else if (isReceptionist()) {
                isAuthorized = List.of("appointments", "patients", "inquiries", "feedback").contains(normType);
            }

            if (!isAuthorized) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You do not have permission to export " + type + " reports"));
            }

            StringBuilder csv = new StringBuilder();

            switch (normType) {
                case "billing":
                    csv.append("Bill Code,Patient,Bill Date,Total Amount,Paid Amount,Balance Amount,Status\n");
                    List<Bill> bills = billRepository.findAll();
                    if (startDate != null) bills = bills.stream().filter(b -> b.getBillDate() != null && !b.getBillDate().toLocalDate().isBefore(startDate)).toList();
                    if (endDate != null) bills = bills.stream().filter(b -> b.getBillDate() != null && !b.getBillDate().toLocalDate().isAfter(endDate)).toList();
                    for (Bill b : bills) {
                        String patientName = b.getPatient() != null ? (b.getPatient().getFirstName() + " " + (b.getPatient().getLastName() != null ? b.getPatient().getLastName() : "")).trim() : "Unknown";
                        csv.append(String.format("\"%s\",\"%s\",\"%s\",%s,%s,%s,\"%s\"\n",
                                b.getBillNumber() != null ? b.getBillNumber() : b.getId(),
                                patientName,
                                b.getBillDate() != null ? b.getBillDate().toLocalDate() : "",
                                b.getTotalAmount(), b.getPaidAmount(), b.getBalanceAmount(), b.getStatus()));
                    }
                    break;

                case "payments":
                    csv.append("Payment Code,Payment Date,Amount,Payment Method,Status\n");
                    List<Payment> payments = paymentRepository.findAll();
                    if (startDate != null) payments = payments.stream().filter(p -> p.getPaymentDate() != null && !p.getPaymentDate().toLocalDate().isBefore(startDate)).toList();
                    if (endDate != null) payments = payments.stream().filter(p -> p.getPaymentDate() != null && !p.getPaymentDate().toLocalDate().isAfter(endDate)).toList();
                    for (Payment p : payments) {
                        csv.append(String.format("\"%s\",\"%s\",%s,\"%s\",\"%s\"\n",
                                p.getPaymentReference() != null ? p.getPaymentReference() : p.getId(),
                                p.getPaymentDate() != null ? p.getPaymentDate().toLocalDate() : "",
                                p.getAmount(), p.getPaymentMethod(), p.getStatus()));
                    }
                    break;

                case "appointments":
                    csv.append("Appointment Code,Patient,Dentist,Appointment Date,Status\n");
                    List<Appointment> appointments = appointmentRepository.findAll();
                    if (startDate != null) appointments = appointments.stream().filter(a -> a.getAppointmentDate() != null && !a.getAppointmentDate().isBefore(startDate)).toList();
                    if (endDate != null) appointments = appointments.stream().filter(a -> a.getAppointmentDate() != null && !a.getAppointmentDate().isAfter(endDate)).toList();
                    if (isDoctorOrDentist() && !isAdmin()) {
                        Long ownDentistId = getAuthenticatedDentistId();
                        if (ownDentistId != null) {
                            appointments = appointments.stream().filter(a -> a.getDentist() != null && a.getDentist().getId().equals(ownDentistId)).toList();
                        } else {
                            appointments = List.of();
                        }
                    }
                    for (Appointment a : appointments) {
                        String patientName = a.getPatient() != null ? (a.getPatient().getFirstName() + " " + (a.getPatient().getLastName() != null ? a.getPatient().getLastName() : "")).trim() : "Unknown";
                        String dentistName = a.getDentist() != null ? (a.getDentist().getFirstName() + " " + (a.getDentist().getLastName() != null ? a.getDentist().getLastName() : "")).trim() : "Unknown";
                        csv.append(String.format("\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"\n",
                                a.getAppointmentCode() != null ? a.getAppointmentCode() : a.getId(),
                                patientName, dentistName, a.getAppointmentDate(), a.getStatus()));
                    }
                    break;

                case "inventory":
                    csv.append("Medicine Code,Name,Category,Stock Quantity,Unit Price,Status\n");
                    List<Medicine> medicines = medicineRepository.findAll();
                    for (Medicine m : medicines) {
                        csv.append(String.format("\"%s\",\"%s\",\"%s\",%s,%s,\"%s\"\n",
                                m.getMedicineCode() != null ? m.getMedicineCode() : m.getId(),
                                m.getName(), m.getCategory() != null ? m.getCategory() : "",
                                m.getStockQuantity(), m.getUnitPrice(), m.getStatus()));
                    }
                    break;

                case "treatments":
                    csv.append("Treatment Code,Patient,Dentist,Treatment Date,Estimated Cost,Actual Cost,Status\n");
                    List<Treatment> treatments = treatmentRepository.findAll();
                    if (startDate != null) treatments = treatments.stream().filter(t -> t.getTreatmentDate() != null && !t.getTreatmentDate().isBefore(startDate)).toList();
                    if (endDate != null) treatments = treatments.stream().filter(t -> t.getTreatmentDate() != null && !t.getTreatmentDate().isAfter(endDate)).toList();
                    if (isDoctorOrDentist() && !isAdmin()) {
                        Long ownDentistId = getAuthenticatedDentistId();
                        if (ownDentistId != null) {
                            treatments = treatments.stream().filter(t -> t.getDentist() != null && t.getDentist().getId().equals(ownDentistId)).toList();
                        } else {
                            treatments = List.of();
                        }
                    }
                    for (Treatment t : treatments) {
                        String patientName = t.getPatient() != null ? (t.getPatient().getFirstName() + " " + (t.getPatient().getLastName() != null ? t.getPatient().getLastName() : "")).trim() : "Unknown";
                        String dentistName = t.getDentist() != null ? (t.getDentist().getFirstName() + " " + (t.getDentist().getLastName() != null ? t.getDentist().getLastName() : "")).trim() : "Unknown";
                        csv.append(String.format("\"%s\",\"%s\",\"%s\",\"%s\",%s,%s,\"%s\"\n",
                                t.getTreatmentCode() != null ? t.getTreatmentCode() : t.getId(),
                                patientName, dentistName, t.getTreatmentDate(),
                                t.getEstimatedCost(), t.getActualCost(), t.getStatus()));
                    }
                    break;

                case "feedback":
                    csv.append("Review ID,Dentist,Rating,Comment,Status,Date\n");
                    List<Review> reviews = reviewRepository.findAll();
                    if (isDoctorOrDentist() && !isAdmin()) {
                        Long ownDentistId = getAuthenticatedDentistId();
                        if (ownDentistId != null) {
                            reviews = reviews.stream().filter(r -> r.getDentist() != null && r.getDentist().getId().equals(ownDentistId)).toList();
                        } else {
                            reviews = List.of();
                        }
                    }
                    for (Review r : reviews) {
                        String dentistName = r.getDentist() != null ? (r.getDentist().getFirstName() + " " + (r.getDentist().getLastName() != null ? r.getDentist().getLastName() : "")).trim() : "Unknown";
                        csv.append(String.format("%s,\"%s\",%s,\"%s\",\"%s\",\"%s\"\n",
                                r.getId(), dentistName, r.getRating(),
                                r.getComment() != null ? r.getComment().replace("\"", "'") : "",
                                r.getStatus(), r.getCreatedAt() != null ? r.getCreatedAt().toLocalDate() : ""));
                    }
                    break;

                case "inquiries":
                    csv.append("Inquiry Code,Name,Email,Type,Subject,Status,Date\n");
                    List<Inquiry> inquiries = inquiryRepository.findAll();
                    for (Inquiry i : inquiries) {
                        csv.append(String.format("\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"\n",
                                i.getInquiryCode() != null ? i.getInquiryCode() : i.getId(),
                                i.getName(), i.getEmail(), i.getInquiryType(),
                                i.getSubject() != null ? i.getSubject().replace("\"", "'") : "",
                                i.getStatus(), i.getCreatedAt() != null ? i.getCreatedAt().toLocalDate() : ""));
                    }
                    break;

                case "revenue":
                    csv.append("Metric,Amount (LKR)\n");
                    BigDecimal revTotal = paymentRepository.findAll().stream()
                            .filter(p -> "SUCCESS".equalsIgnoreCase(p.getStatus()) || "COMPLETED".equalsIgnoreCase(p.getStatus()))
                            .map(Payment::getAmount).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
                    BigDecimal revRefunds = paymentRepository.findAll().stream()
                            .filter(p -> "REFUNDED".equalsIgnoreCase(p.getStatus()))
                            .map(Payment::getAmount).filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
                    csv.append(String.format("\"Total Revenue\",%s\n", revTotal));
                    csv.append(String.format("\"Total Refunds\",%s\n", revRefunds));
                    csv.append(String.format("\"Net Revenue\",%s\n", revTotal.subtract(revRefunds)));
                    break;

                case "outstanding":
                    csv.append("Bill Number,Bill Date,Patient ID,Patient Name,Total Amount,Paid Amount,Outstanding Balance\n");
                    List<Bill> outBills = billRepository.findAll().stream()
                            .filter(b -> b.getBalanceAmount() != null && b.getBalanceAmount().compareTo(BigDecimal.ZERO) > 0)
                            .toList();
                    for (Bill b : outBills) {
                        String patientName = b.getPatient() != null ? (b.getPatient().getFirstName() + " " + (b.getPatient().getLastName() != null ? b.getPatient().getLastName() : "")).trim() : "Unknown";
                        Long patId = b.getPatient() != null ? b.getPatient().getId() : null;
                        csv.append(String.format("\"%s\",\"%s\",%s,\"%s\",%s,%s,%s\n",
                                b.getBillNumber() != null ? b.getBillNumber() : b.getId(),
                                b.getBillDate() != null ? b.getBillDate().toLocalDate() : "",
                                patId, patientName, b.getTotalAmount(), b.getPaidAmount(), b.getBalanceAmount()));
                    }
                    break;

                case "refunds":
                    csv.append("Payment ID,Payment Reference,Date,Patient ID,Patient Name,Amount\n");
                    List<Payment> refList = paymentRepository.findAll().stream()
                            .filter(p -> "REFUNDED".equalsIgnoreCase(p.getStatus()))
                            .toList();
                    for (Payment p : refList) {
                        String patientName = (p.getBill() != null && p.getBill().getPatient() != null)
                                ? (p.getBill().getPatient().getFirstName() + " " + (p.getBill().getPatient().getLastName() != null ? p.getBill().getPatient().getLastName() : "")).trim()
                                : "Unknown";
                        Long patId = (p.getBill() != null && p.getBill().getPatient() != null) ? p.getBill().getPatient().getId() : null;
                        csv.append(String.format("%s,\"%s\",\"%s\",%s,\"%s\",%s\n",
                                p.getId(),
                                p.getPaymentReference() != null ? p.getPaymentReference() : p.getId(),
                                p.getPaymentDate() != null ? p.getPaymentDate().toLocalDate() : "",
                                patId, patientName, p.getAmount()));
                    }
                    break;

                case "low-stock":
                    csv.append("Medicine Code,Name,Generic Name,Category,Current Stock,Reorder Level,Unit Price\n");
                    List<Medicine> lowMeds = medicineRepository.findAll().stream().filter(m -> {
                        int qty = m.getStockQuantity() != null ? m.getStockQuantity() : 0;
                        int threshold = m.getReorderLevel() != null ? m.getReorderLevel() : 20;
                        return qty <= threshold;
                    }).toList();
                    for (Medicine m : lowMeds) {
                        csv.append(String.format("\"%s\",\"%s\",\"%s\",\"%s\",%s,%s,%s\n",
                                m.getMedicineCode() != null ? m.getMedicineCode() : m.getId(),
                                m.getName(),
                                m.getGenericName() != null ? m.getGenericName() : "",
                                m.getCategory() != null ? m.getCategory() : "",
                                m.getStockQuantity() != null ? m.getStockQuantity() : 0,
                                m.getReorderLevel() != null ? m.getReorderLevel() : 20,
                                m.getUnitPrice()));
                    }
                    break;

                case "dispensing":
                    csv.append("Prescription Number,Date,Patient ID,Patient Name,Dentist Name,Status\n");
                    List<Prescription> rxList = prescriptionRepository.findAll();
                    if (isDoctorOrDentist() && !isAdmin()) {
                        Long ownDentistId = getAuthenticatedDentistId();
                        if (ownDentistId != null) {
                            rxList = rxList.stream().filter(p -> p.getDentist() != null && p.getDentist().getId().equals(ownDentistId)).toList();
                        } else {
                            rxList = List.of();
                        }
                    }
                    for (Prescription p : rxList) {
                        String patName = p.getPatient() != null ? (p.getPatient().getFirstName() + " " + (p.getPatient().getLastName() != null ? p.getPatient().getLastName() : "")).trim() : "Unknown";
                        String docName = p.getDentist() != null ? (p.getDentist().getFirstName() + " " + (p.getDentist().getLastName() != null ? p.getDentist().getLastName() : "")).trim() : "Unknown";
                        Long patId = p.getPatient() != null ? p.getPatient().getId() : null;
                        csv.append(String.format("\"%s\",\"%s\",%s,\"%s\",\"%s\",\"%s\"\n",
                                p.getPrescriptionCode() != null ? p.getPrescriptionCode() : p.getId(),
                                p.getPrescriptionDate() != null ? p.getPrescriptionDate() : "",
                                patId, patName, docName, p.getStatus()));
                    }
                    break;

                case "patients":
                    csv.append("Patient Code,First Name,Last Name,Email,Phone,Gender,Status\n");
                    List<Patient> patList = patientRepository.findAll();
                    for (Patient p : patList) {
                        csv.append(String.format("\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"\n",
                                p.getPatientCode() != null ? p.getPatientCode() : p.getId(),
                                p.getFirstName(), p.getLastName() != null ? p.getLastName() : "",
                                p.getEmail() != null ? p.getEmail() : "",
                                p.getPhone() != null ? p.getPhone() : "",
                                p.getGender() != null ? p.getGender() : "",
                                p.getStatus()));
                    }
                    break;

                case "dentists":
                    csv.append("Dentist Code,Full Name,Specialization,License Number,Phone,Email,Status\n");
                    List<Dentist> dentList = dentistRepository.findAll();
                    for (Dentist d : dentList) {
                        String fullName = (d.getFirstName() + " " + (d.getLastName() != null ? d.getLastName() : "")).trim();
                        csv.append(String.format("\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"\n",
                                d.getDentistCode() != null ? d.getDentistCode() : d.getId(),
                                fullName,
                                d.getSpecialization() != null ? d.getSpecialization() : "",
                                d.getQualification() != null ? d.getQualification() : "",
                                d.getPhone() != null ? d.getPhone() : "",
                                d.getEmail() != null ? d.getEmail() : "",
                                d.getStatus()));
                    }
                    break;

                case "staff":
                    csv.append("User ID,First Name,Last Name,Email,Phone,Role,Status\n");
                    List<Staff> stList = staffRepository.findAll();
                    for (Staff s : stList) {
                        csv.append(String.format("%s,\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"\n",
                                s.getId(),
                                s.getFirstName(), s.getLastName() != null ? s.getLastName() : "",
                                s.getEmail() != null ? s.getEmail() : "",
                                s.getPhone() != null ? s.getPhone() : "",
                                s.getRole() != null ? s.getRole() : "STAFF",
                                s.getStatus()));
                    }
                    break;

                case "suppliers":
                    csv.append("Supplier ID,Supplier Code,Supplier Name,Contact Person,Phone,Email,Status\n");
                    List<Supplier> supList = supplierRepository.findAll();
                    for (Supplier s : supList) {
                        csv.append(String.format("%s,\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"\n",
                                s.getId(),
                                s.getSupplierCode() != null ? s.getSupplierCode() : s.getId(),
                                s.getSupplierName() != null ? s.getSupplierName() : "",
                                s.getContactPerson() != null ? s.getContactPerson() : "",
                                s.getPhone() != null ? s.getPhone() : "",
                                s.getEmail() != null ? s.getEmail() : "",
                                s.getStatus()));
                    }
                    break;

                default:
                    return ResponseEntity.badRequest().body(Map.of("error", "Unsupported report export type: " + type));
            }

            byte[] csvBytes = csv.toString().getBytes(StandardCharsets.UTF_8);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(new MediaType("text", "csv", StandardCharsets.UTF_8));
            headers.set(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"report_" + normType + "_" + LocalDate.now() + ".csv\"");

            return ResponseEntity.ok().headers(headers).body(csvBytes);

        } catch (RuntimeException exception) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // ALL REPORTS RESPONSE DTO
    // =========================================================

    public static class AllReportsResponse {

        private final Object appointmentReport;
        private final Object treatmentReport;
        private final Object billingReport;
        private final Object paymentReport;

        public AllReportsResponse(
                Object appointmentReport,
                Object treatmentReport,
                Object billingReport,
                Object paymentReport) {

            this.appointmentReport = appointmentReport;
            this.treatmentReport = treatmentReport;
            this.billingReport = billingReport;
            this.paymentReport = paymentReport;
        }

        public Object getAppointmentReport() {
            return appointmentReport;
        }

        public Object getTreatmentReport() {
            return treatmentReport;
        }

        public Object getBillingReport() {
            return billingReport;
        }

        public Object getPaymentReport() {
            return paymentReport;
        }
    }
}