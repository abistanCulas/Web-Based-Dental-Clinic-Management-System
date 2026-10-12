package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.BillingDTO;
import com.dentaflow.backend.dto.PatientCheckoutSummaryDTO;
import com.dentaflow.backend.entity.Bill;
import com.dentaflow.backend.entity.BillItem;
import com.dentaflow.backend.entity.Patient;
import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.mapper.BillingMapper;
import com.dentaflow.backend.security.AccessControlService;
import com.dentaflow.backend.security.CustomUserDetails;
import com.dentaflow.backend.service.BillService;
import com.dentaflow.backend.service.PatientService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.dentaflow.backend.repository.AppointmentRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping({"/api/billing", "/api/bills"})
public class BillingController {

    private final BillService billService;
    private final BillingMapper billingMapper;
    private final PatientService patientService;
    private final AppointmentRepository appointmentRepository;
    private final AccessControlService accessControlService;

    @Autowired
    public BillingController(
            BillService billService,
            BillingMapper billingMapper,
            PatientService patientService,
            AppointmentRepository appointmentRepository,
            AccessControlService accessControlService) {

        this.billService = billService;
        this.billingMapper = billingMapper;
        this.patientService = patientService;
        this.appointmentRepository = appointmentRepository;
        this.accessControlService = accessControlService;
    }

    public BillingController(
            BillService billService,
            BillingMapper billingMapper,
            PatientService patientService,
            AppointmentRepository appointmentRepository) {

        this(billService, billingMapper, patientService, appointmentRepository, null);
    }

    private User getCurrentUser(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails)) {
            return null;
        }
        return ((CustomUserDetails) authentication.getPrincipal()).getUser();
    }

    private boolean isPatientRole(Authentication authentication) {
        if (authentication == null) return false;
        return authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_PATIENT"));
    }

    private boolean isPatientAuthorizedForPatientId(Authentication authentication, Long patientId) {
        if (patientId == null) return false;
        if (accessControlService != null && accessControlService.hasRole("PATIENT")) {
            return accessControlService.isSelfPatientOrAdmin(patientId);
        }
        if (isPatientRole(authentication)) {
            User currentUser = getCurrentUser(authentication);
            if (currentUser == null) return false;
            try {
                Patient p = patientService.getPatientByUserId(currentUser.getId());
                return p != null && p.getId().equals(patientId);
            } catch (Exception e) {
                return false;
            }
        }
        return true;
    }

    private boolean isUnauthenticated() {
        return accessControlService != null && accessControlService.getCurrentUserId() == null && !accessControlService.isAdmin();
    }

    private boolean isUnauthenticated(Authentication authentication) {
        if (authentication != null && !authentication.isAuthenticated()) {
            return true;
        }
        return isUnauthenticated();
    }

    private boolean canManageBills() {
        if (accessControlService == null) return true;
        return accessControlService.isAdmin()
                || accessControlService.hasRole("CASHIER")
                || accessControlService.hasRole("RECEPTIONIST");
    }

    private boolean canViewAllBills() {
        if (accessControlService == null) return true;
        return accessControlService.isAdmin()
                || accessControlService.hasRole("CASHIER")
                || accessControlService.hasRole("RECEPTIONIST")
                || accessControlService.hasRole("STAFF");
    }

    private boolean canViewBill() {
        if (accessControlService == null) return true;
        return accessControlService.isAdmin()
                || accessControlService.hasRole("CASHIER")
                || accessControlService.hasRole("RECEPTIONIST")
                || accessControlService.hasRole("STAFF")
                || accessControlService.hasRole("DENTIST")
                || accessControlService.hasRole("DOCTOR")
                || accessControlService.hasRole("PATIENT");
    }

    private boolean isDentistAuthorizedForBill(Bill bill) {
        if (accessControlService == null) return true;
        if (!accessControlService.hasRole("DENTIST") && !accessControlService.hasRole("DOCTOR")) {
            return true;
        }
        if (accessControlService.isAdmin()
                || accessControlService.hasRole("CASHIER")
                || accessControlService.hasRole("RECEPTIONIST")
                || accessControlService.hasRole("STAFF")) {
            return true;
        }
        if (bill == null) return false;
        if (bill.getAppointment() != null && bill.getAppointment().getDentist() != null) {
            if (accessControlService.canAccessDentistRecords(bill.getAppointment().getDentist().getId())) {
                return true;
            }
        }
        if (bill.getTreatment() != null && bill.getTreatment().getDentist() != null) {
            if (accessControlService.canAccessDentistRecords(bill.getTreatment().getDentist().getId())) {
                return true;
            }
        }
        if (bill.getPatient() != null && bill.getPatient().getId() != null) {
            if (accessControlService.canAccessPatientRecords(bill.getPatient().getId())) {
                return true;
            }
        }
        return false;
    }

    private boolean isPatientAuthorizedForBill(Bill bill, Authentication authentication) {
        if (bill == null || bill.getPatient() == null) return false;
        Long patientId = bill.getPatient().getId();
        if (accessControlService != null && accessControlService.hasRole("PATIENT")) {
            return accessControlService.isSelfPatientOrAdmin(patientId);
        }
        if (isPatientRole(authentication)) {
            return isPatientAuthorizedForPatientId(authentication, patientId);
        }
        return true;
    }

    private boolean canViewPatientBills(Long patientId, Authentication authentication) {
        if (accessControlService != null) {
            if (accessControlService.isAdmin()
                    || accessControlService.hasRole("CASHIER")
                    || accessControlService.hasRole("RECEPTIONIST")
                    || accessControlService.hasRole("STAFF")) {
                return true;
            }
            if (accessControlService.hasRole("PATIENT")) {
                return accessControlService.isSelfPatientOrAdmin(patientId);
            }
            if (accessControlService.hasRole("DENTIST") || accessControlService.hasRole("DOCTOR")) {
                return accessControlService.canAccessPatientRecords(patientId);
            }
            return false;
        }
        if (isPatientRole(authentication)) {
            return isPatientAuthorizedForPatientId(authentication, patientId);
        }
        return true;
    }

    // =========================================================
    // CREATE BILL
    // =========================================================

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'RECEPTIONIST')")
    public ResponseEntity<?> createBill(
            @RequestBody BillingDTO dto) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canManageBills()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            if (dto == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Bill data is required"));
            }

            if (dto.getPatientId() == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Patient ID is required"));
            }

            Bill bill =
                    billingMapper.toEntity(dto);

            if (dto.getAppointmentId() != null) {
                appointmentRepository.findById(dto.getAppointmentId()).ifPresent(bill::setAppointment);
            }

            Bill saved;
            if (dto.getItems() != null && !dto.getItems().isEmpty()) {
                saved = billService.createBillWithItems(dto.getPatientId(), bill, dto.getItems());
            } else {
                saved = billService.createBill(dto.getPatientId(), bill);
            }

            List<BillItem> savedItems = billService.getBillItems(saved.getId());

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(billingMapper.toDTO(saved, savedItems));

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // ADD BILL ITEM
    // =========================================================

    @PostMapping("/{id}/items")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'RECEPTIONIST')")
    public ResponseEntity<?> addBillItem(
            @PathVariable Long id,
            @RequestBody BillItem item) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canManageBills()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            BillItem saved =
                    billService.addBillItem(id, item);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(saved);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET BILL ITEMS
    // =========================================================

    @GetMapping("/{id}/items")
    @PreAuthorize("(hasAnyRole('ADMIN', 'CASHIER', 'RECEPTIONIST', 'DENTIST', 'DOCTOR', 'STAFF') and !hasRole('PHARMACIST')) or hasRole('PATIENT')")
    public ResponseEntity<?> getBillItems(
            @PathVariable Long id,
            Authentication authentication) {

        if (isUnauthenticated(authentication)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canViewBill()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            Bill bill = billService.getBillById(id);

            boolean isPatient = (accessControlService != null && accessControlService.hasRole("PATIENT"))
                    || isPatientRole(authentication);
            if (isPatient && !isPatientAuthorizedForBill(bill, authentication)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: Patients may only view their own bills"));
            }

            if (!isDentistAuthorizedForBill(bill)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: Dentists may only view bills for their own patients"));
            }

            List<BillItem> items =
                    billService.getBillItems(id);
            if (items != null) {
                items.forEach(it -> it.setBill(null));
            }

            return ResponseEntity.ok(items);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // REMOVE BILL ITEM
    // =========================================================

    @DeleteMapping("/items/{itemId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'RECEPTIONIST')")
    public ResponseEntity<?> removeBillItem(
            @PathVariable Long itemId) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canManageBills()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            billService.removeBillItem(itemId);

            return ResponseEntity.ok(
                    Map.of("message", "Bill item removed successfully", "success", true)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET ALL BILLS
    // =========================================================

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'RECEPTIONIST', 'STAFF')")
    public ResponseEntity<?> getAllBills() {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canViewAllBills()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        List<BillingDTO> bills =
                billService
                        .getAllBills()
                        .stream()
                        .map(billingMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(bills);
    }

    // =========================================================
    // GET BILL BY ID
    // =========================================================

    @GetMapping("/{id}")
    @PreAuthorize("(hasAnyRole('ADMIN', 'CASHIER', 'RECEPTIONIST', 'DENTIST', 'DOCTOR', 'STAFF') and !hasRole('PHARMACIST')) or hasRole('PATIENT')")
    public ResponseEntity<?> getBillById(
            @PathVariable Long id,
            Authentication authentication) {

        if (isUnauthenticated(authentication)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canViewBill()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            Bill bill =
                    billService.getBillById(id);

            boolean isPatient = (accessControlService != null && accessControlService.hasRole("PATIENT"))
                    || isPatientRole(authentication);
            if (isPatient && !isPatientAuthorizedForBill(bill, authentication)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: Patients may only view their own bills"));
            }

            if (!isDentistAuthorizedForBill(bill)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: Dentists may only view bills for their own patients"));
            }

            List<BillItem> items = billService.getBillItems(id);
            return ResponseEntity.ok(billingMapper.toDTO(bill, items));

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET BILL BY NUMBER
    // =========================================================

    @GetMapping("/number/{billNumber}")
    @PreAuthorize("(hasAnyRole('ADMIN', 'CASHIER', 'RECEPTIONIST', 'DENTIST', 'DOCTOR', 'STAFF') and !hasRole('PHARMACIST')) or hasRole('PATIENT')")
    public ResponseEntity<?> getBillByNumber(
            @PathVariable String billNumber,
            Authentication authentication) {

        if (isUnauthenticated(authentication)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canViewBill()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            Bill bill =
                    billService.getBillByNumber(billNumber);

            boolean isPatient = (accessControlService != null && accessControlService.hasRole("PATIENT"))
                    || isPatientRole(authentication);
            if (isPatient && !isPatientAuthorizedForBill(bill, authentication)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: Patients may only view their own bills"));
            }

            if (!isDentistAuthorizedForBill(bill)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: Dentists may only view bills for their own patients"));
            }

            return ResponseEntity.ok(billingMapper.toDTO(bill));

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET PATIENT BILLS
    // =========================================================

    @GetMapping("/patient/{patientId}")
    @PreAuthorize("(hasAnyRole('ADMIN', 'CASHIER', 'RECEPTIONIST', 'DENTIST', 'DOCTOR', 'STAFF') and !hasRole('PHARMACIST')) or hasRole('PATIENT')")
    public ResponseEntity<?> getPatientBills(
            @PathVariable Long patientId,
            Authentication authentication) {

        if (isUnauthenticated(authentication)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canViewPatientBills(patientId, authentication)) {
            boolean isPatient = (accessControlService != null && accessControlService.hasRole("PATIENT"))
                    || isPatientRole(authentication);
            String errMsg = isPatient
                    ? "Access denied: Patients may only view their own bills"
                    : "Access denied: Unauthorized to view bills for this patient";
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", errMsg));
        }

        try {

            List<BillingDTO> bills =
                    billService
                            .getPatientBills(patientId)
                            .stream()
                            .map(billingMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(bills);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET BILLS BY STATUS
    // =========================================================

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'RECEPTIONIST', 'STAFF')")
    public ResponseEntity<?> getBillsByStatus(
            @PathVariable String status) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canViewAllBills()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            List<BillingDTO> bills =
                    billService
                            .getBillsByStatus(status)
                            .stream()
                            .map(billingMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(bills);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // UPDATE BILL
    // =========================================================

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'RECEPTIONIST')")
    public ResponseEntity<?> updateBill(
            @PathVariable Long id,
            @RequestBody BillingDTO dto) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canManageBills()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            if (dto == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Bill data is required"));
            }

            Bill existing = billService.getBillById(id);

            // Prevent non-admin users from reassigning the bill to another patient (IDOR)
            if (accessControlService != null && !accessControlService.isAdmin()) {
                if (dto.getPatientId() != null && existing.getPatient() != null
                        && !dto.getPatientId().equals(existing.getPatient().getId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: Cannot reassign bill to a different patient"));
                }
            }

            Bill bill =
                    billingMapper.toEntity(dto);

            if (dto.getPatientId() != null) {
                try {
                    bill.setPatient(patientService.getPatientById(dto.getPatientId()));
                } catch (Exception ignored) {}
            }

            if (dto.getAppointmentId() != null) {
                appointmentRepository.findById(dto.getAppointmentId()).ifPresent(bill::setAppointment);
            }

            Bill updated;
            if (dto.getItems() != null) {
                updated = billService.updateBill(id, bill, dto.getItems());
            } else {
                updated = billService.updateBill(id, bill);
            }

            List<BillItem> items = billService.getBillItems(updated.getId());
            return ResponseEntity.ok(billingMapper.toDTO(updated, items));

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // ADD PAYMENT
    // =========================================================

    @PostMapping("/{id}/payment")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'RECEPTIONIST')")
    public ResponseEntity<?> addPayment(
            @PathVariable Long id,
            @RequestParam BigDecimal amount) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canManageBills()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            Bill updated =
                    billService.addPaymentAmount(
                            id,
                            amount
                    );

            return ResponseEntity.ok(billingMapper.toDTO(updated));

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // CANCEL BILL
    // =========================================================

    @PutMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'RECEPTIONIST')")
    public ResponseEntity<?> cancelBill(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canManageBills()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            Bill cancelled =
                    billService.cancelBill(id);

            return ResponseEntity.ok(billingMapper.toDTO(cancelled));

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // DELETE BILL
    // =========================================================

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'RECEPTIONIST')")
    public ResponseEntity<?> deleteBill(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canManageBills()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            billService.deleteBill(id);

            return ResponseEntity.ok(
                    Map.of("message", "Bill deleted successfully", "success", true)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET PATIENT CHECKOUT SUMMARY (CASHIER CORE FLOW)
    // =========================================================

    @GetMapping("/patient/{patientId}/checkout-summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'RECEPTIONIST', 'STAFF', 'DENTIST', 'DOCTOR', 'PATIENT')")
    public ResponseEntity<?> getPatientCheckoutSummary(
            @PathVariable Long patientId,
            Authentication authentication) {

        if (isUnauthenticated(authentication)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (isPatientRole(authentication)) {
            if (!isPatientAuthorizedForPatientId(authentication, patientId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: You can only view your own billing summary"));
            }
        }

        try {
            PatientCheckoutSummaryDTO summary = billService.getPatientCheckoutSummary(patientId);
            return ResponseEntity.ok(summary);

        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    // =========================================================
    // LOOKUP PATIENTS FOR CASHIER (BY ID, CODE, PHONE, NAME)
    // =========================================================

    @GetMapping("/patient/lookup")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'RECEPTIONIST')")
    public ResponseEntity<?> lookupPatientsForCheckout(
            @RequestParam(required = false, defaultValue = "") String query,
            Authentication authentication) {

        if (isUnauthenticated(authentication)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        try {
            List<PatientCheckoutSummaryDTO> summaries = billService.lookupPatient(query);
            return ResponseEntity.ok(summaries);

        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    // =========================================================
    // GENERATE OR UPDATE COMBINED BILL (ONE AUTHORITATIVE INVOICE)
    // =========================================================

    @PostMapping("/patient/{patientId}/generate-bill")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'RECEPTIONIST')")
    public ResponseEntity<?> generateCombinedBill(
            @PathVariable Long patientId,
            Authentication authentication) {

        if (isUnauthenticated(authentication)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        try {
            Bill bill = billService.generateOrUpdateCombinedBill(patientId);
            return ResponseEntity.ok(billingMapper.toDTO(bill));

        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    // =========================================================
    // PAY CASH FOR PATIENT COMBINED BILL
    // =========================================================

    @PostMapping("/patient/{patientId}/pay-cash")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'RECEPTIONIST')")
    public ResponseEntity<?> payCashForPatient(
            @PathVariable Long patientId,
            @RequestParam(required = false) BigDecimal amount,
            @RequestParam(required = false) String notes,
            @RequestBody(required = false) Map<String, Object> body,
            Authentication authentication) {

        if (isUnauthenticated(authentication)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        try {
            BigDecimal effectiveAmount = amount;
            String effectiveNotes = notes;
            if (body != null) {
                if (effectiveAmount == null && body.containsKey("amount") && body.get("amount") != null) {
                    effectiveAmount = new BigDecimal(body.get("amount").toString());
                }
                if (effectiveNotes == null && body.containsKey("notes") && body.get("notes") != null) {
                    effectiveNotes = body.get("notes").toString();
                }
            }

            Bill bill = billService.payCashForPatient(patientId, effectiveAmount, effectiveNotes);
            return ResponseEntity.ok(billingMapper.toDTO(bill));

        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }
}