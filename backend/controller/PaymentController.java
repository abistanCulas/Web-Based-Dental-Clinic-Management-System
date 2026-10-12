package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.PaymentDTO;
import com.dentaflow.backend.dto.PayHereCheckoutDTO;
import com.dentaflow.backend.dto.PayHerePaymentRequest;
import com.dentaflow.backend.entity.Bill;
import com.dentaflow.backend.entity.Patient;
import com.dentaflow.backend.entity.Payment;
import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.mapper.PaymentMapper;
import com.dentaflow.backend.security.AccessControlService;
import com.dentaflow.backend.security.CustomUserDetails;
import com.dentaflow.backend.service.BillService;
import com.dentaflow.backend.service.PatientService;
import com.dentaflow.backend.service.PaymentService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;
    private final PaymentMapper paymentMapper;
    private final BillService billService;
    private final PatientService patientService;
    private final AccessControlService accessControlService;

    @Autowired
    public PaymentController(
            PaymentService paymentService,
            PaymentMapper paymentMapper,
            BillService billService,
            PatientService patientService,
            AccessControlService accessControlService) {

        this.paymentService = paymentService;
        this.paymentMapper = paymentMapper;
        this.billService = billService;
        this.patientService = patientService;
        this.accessControlService = accessControlService;
    }

    public PaymentController(
            PaymentService paymentService,
            PaymentMapper paymentMapper,
            BillService billService,
            PatientService patientService) {

        this(paymentService, paymentMapper, billService, patientService, null);
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

    private boolean isUnauthenticated() {
        return accessControlService != null && accessControlService.getCurrentUserId() == null && !accessControlService.isAdmin();
    }

    private boolean isUnauthenticated(Authentication authentication) {
        if (authentication != null && !authentication.isAuthenticated()) {
            return true;
        }
        return isUnauthenticated();
    }

    private boolean canManagePayments() {
        if (accessControlService == null) return true;
        return accessControlService.isAdmin() || accessControlService.hasRole("CASHIER");
    }

    private boolean canProcessPayments() {
        if (accessControlService == null) return true;
        return accessControlService.isAdmin()
                || accessControlService.hasRole("CASHIER")
                || accessControlService.hasRole("RECEPTIONIST");
    }

    private boolean canCreatePayment() {
        if (accessControlService == null) return true;
        return accessControlService.isAdmin()
                || accessControlService.hasRole("CASHIER")
                || accessControlService.hasRole("RECEPTIONIST")
                || accessControlService.hasRole("PATIENT");
    }

    private boolean canViewAllPayments() {
        if (accessControlService == null) return true;
        return accessControlService.isAdmin()
                || accessControlService.hasRole("CASHIER")
                || accessControlService.hasRole("RECEPTIONIST")
                || accessControlService.hasRole("STAFF");
    }

    private boolean canViewSpecificPayment() {
        if (accessControlService == null) return true;
        return accessControlService.isAdmin()
                || accessControlService.hasRole("CASHIER")
                || accessControlService.hasRole("RECEPTIONIST")
                || accessControlService.hasRole("STAFF")
                || accessControlService.hasRole("PATIENT");
    }

    private boolean isPatientAuthorizedForBill(Authentication authentication, Bill bill) {
        if (bill == null || bill.getPatient() == null) return false;
        Long patientId = bill.getPatient().getId();
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

    // =========================================================
    // CREATE PAYMENT
    // =========================================================

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'RECEPTIONIST', 'PATIENT')")
    public ResponseEntity<?> createPayment(
            @RequestBody PaymentDTO dto,
            Authentication authentication) {

        if (isUnauthenticated(authentication)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canCreatePayment()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            if (dto == null) {
                return ResponseEntity
                        .badRequest()
                        .body(Map.of("error", "Payment data is required"));
            }

            if (dto.getBillId() == null) {
                return ResponseEntity
                        .badRequest()
                        .body(Map.of("error", "Bill ID is required"));
            }

            Bill bill = billService.getBillById(dto.getBillId());

            boolean isPatient = (accessControlService != null && accessControlService.hasRole("PATIENT"))
                    || isPatientRole(authentication);
            if (isPatient && !isPatientAuthorizedForBill(authentication, bill)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: Patients may only pay for their own bills"));
            }

            Payment payment =
                    paymentMapper.toEntity(dto);

            Payment saved =
                    paymentService.createPayment(
                            dto.getBillId(),
                            payment
                    );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(paymentMapper.toDTO(saved));

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET ALL PAYMENTS
    // =========================================================

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'RECEPTIONIST', 'STAFF')")
    public ResponseEntity<?> getAllPayments() {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canViewAllPayments()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        List<PaymentDTO> payments =
                paymentService
                        .getAllPayments()
                        .stream()
                        .map(paymentMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(payments);
    }

    // =========================================================
    // GET PAYMENT BY ID
    // =========================================================

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'RECEPTIONIST', 'STAFF', 'PATIENT')")
    public ResponseEntity<?> getPaymentById(
            @PathVariable Long id,
            Authentication authentication) {

        if (isUnauthenticated(authentication)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canViewSpecificPayment()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            Payment payment =
                    paymentService.getPaymentById(id);

            boolean isPatient = (accessControlService != null && accessControlService.hasRole("PATIENT"))
                    || isPatientRole(authentication);
            if (isPatient && !isPatientAuthorizedForBill(authentication, payment.getBill())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: Patients may only view their own payments"));
            }

            return ResponseEntity.ok(paymentMapper.toDTO(payment));

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET PAYMENT BY REFERENCE
    // =========================================================

    @GetMapping("/reference/{paymentReference}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'RECEPTIONIST', 'STAFF', 'PATIENT')")
    public ResponseEntity<?> getPaymentByReference(
            @PathVariable String paymentReference,
            Authentication authentication) {

        if (isUnauthenticated(authentication)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canViewSpecificPayment()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            Payment payment =
                    paymentService.getPaymentByReference(
                            paymentReference
                    );

            boolean isPatient = (accessControlService != null && accessControlService.hasRole("PATIENT"))
                    || isPatientRole(authentication);
            if (isPatient && !isPatientAuthorizedForBill(authentication, payment.getBill())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: Patients may only view their own payments"));
            }

            return ResponseEntity.ok(paymentMapper.toDTO(payment));

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET PAYMENTS FOR BILL
    // =========================================================

    @GetMapping("/bill/{billId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'RECEPTIONIST', 'STAFF', 'PATIENT')")
    public ResponseEntity<?> getPaymentsForBill(
            @PathVariable Long billId,
            Authentication authentication) {

        if (isUnauthenticated(authentication)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canViewSpecificPayment()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            Bill bill = billService.getBillById(billId);

            boolean isPatient = (accessControlService != null && accessControlService.hasRole("PATIENT"))
                    || isPatientRole(authentication);
            if (isPatient && !isPatientAuthorizedForBill(authentication, bill)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: Patients may only view their own payments"));
            }

            List<PaymentDTO> payments =
                    paymentService
                            .getPaymentsForBill(billId)
                            .stream()
                            .map(paymentMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(payments);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET PAYMENTS BY STATUS
    // =========================================================

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'RECEPTIONIST', 'STAFF')")
    public ResponseEntity<?> getPaymentsByStatus(
            @PathVariable String status) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canViewAllPayments()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            List<PaymentDTO> payments =
                    paymentService
                            .getPaymentsByStatus(status)
                            .stream()
                            .map(paymentMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(payments);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET PAYMENTS BY METHOD
    // =========================================================

    @GetMapping("/method/{paymentMethod}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'RECEPTIONIST', 'STAFF')")
    public ResponseEntity<?> getPaymentsByMethod(
            @PathVariable String paymentMethod) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canViewAllPayments()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            List<PaymentDTO> payments =
                    paymentService
                            .getPaymentsByMethod(paymentMethod)
                            .stream()
                            .map(paymentMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(payments);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET SUCCESSFUL PAYMENTS FOR BILL
    // =========================================================

    @GetMapping("/bill/{billId}/successful")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'RECEPTIONIST', 'STAFF', 'PATIENT')")
    public ResponseEntity<?> getSuccessfulPaymentsForBill(
            @PathVariable Long billId,
            Authentication authentication) {

        if (isUnauthenticated(authentication)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canViewSpecificPayment()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            Bill bill = billService.getBillById(billId);

            boolean isPatient = (accessControlService != null && accessControlService.hasRole("PATIENT"))
                    || isPatientRole(authentication);
            if (isPatient && !isPatientAuthorizedForBill(authentication, bill)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: Patients may only view their own payments"));
            }

            List<PaymentDTO> payments =
                    paymentService
                            .getSuccessfulPaymentsForBill(
                                    billId
                            )
                            .stream()
                            .map(paymentMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(payments);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // GET PAYMENT BY TRANSACTION ID
    // =========================================================

    @GetMapping("/transaction/{transactionId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'RECEPTIONIST', 'STAFF', 'PATIENT')")
    public ResponseEntity<?> getPaymentByTransactionId(
            @PathVariable String transactionId,
            Authentication authentication) {

        if (isUnauthenticated(authentication)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canViewSpecificPayment()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            Payment payment =
                    paymentService
                            .getPaymentByTransactionId(
                                    transactionId
                            );

            boolean isPatient = (accessControlService != null && accessControlService.hasRole("PATIENT"))
                    || isPatientRole(authentication);
            if (isPatient && !isPatientAuthorizedForBill(authentication, payment.getBill())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "Access denied: Patients may only view their own payments"));
            }

            return ResponseEntity.ok(paymentMapper.toDTO(payment));

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // UPDATE PAYMENT
    // =========================================================

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<?> updatePayment(
            @PathVariable Long id,
            @RequestBody PaymentDTO dto) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canManagePayments()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            if (dto == null) {
                return ResponseEntity
                        .badRequest()
                        .body(Map.of("error", "Payment data is required"));
            }

            Payment payment =
                    paymentMapper.toEntity(dto);

            Payment updated =
                    paymentService.updatePayment(
                            id,
                            payment
                    );

            return ResponseEntity.ok(paymentMapper.toDTO(updated));

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // VERIFY / MARK PAYMENT SUCCESSFUL
    // =========================================================

    @PostMapping("/{id}/verify")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'RECEPTIONIST')")
    public ResponseEntity<?> verifyPayment(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canProcessPayments()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            Payment payment =
                    paymentService
                            .markPaymentSuccessful(id);

            return ResponseEntity.ok(paymentMapper.toDTO(payment));

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // MARK PAYMENT FAILED
    // =========================================================

    @PostMapping("/{id}/fail")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'RECEPTIONIST')")
    public ResponseEntity<?> markPaymentFailed(
            @PathVariable Long id,
            @RequestParam(required = false)
            String gatewayResponse) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canProcessPayments()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            Payment payment =
                    paymentService.markPaymentFailed(
                            id,
                            gatewayResponse
                    );

            return ResponseEntity.ok(paymentMapper.toDTO(payment));

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // CANCEL PAYMENT
    // =========================================================

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'RECEPTIONIST')")
    public ResponseEntity<?> cancelPayment(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canProcessPayments()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            Payment payment =
                    paymentService.cancelPayment(id);

            return ResponseEntity.ok(paymentMapper.toDTO(payment));

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // REFUND PAYMENT
    // =========================================================

    @PostMapping("/{id}/refund")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<?> refundPayment(
            @PathVariable Long id,
            @RequestParam BigDecimal amount,
            @RequestParam(required = false)
            String reason) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canManagePayments()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            Payment payment =
                    paymentService.refundPayment(
                            id,
                            amount,
                            reason
                    );

            return ResponseEntity.ok(paymentMapper.toDTO(payment));

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // CREATE PENDING REFUND REQUEST
    // =========================================================

    @PostMapping("/{id}/refund/request")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<?> requestRefund(
            @PathVariable Long id,
            @RequestParam BigDecimal amount,
            @RequestParam(required = false) String reason) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canManagePayments()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {
            Payment payment = paymentService.requestRefund(id, amount, reason);
            return ResponseEntity.ok(paymentMapper.toDTO(payment));
        } catch (RuntimeException exception) {
            return ResponseEntity.badRequest().body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // APPROVE PENDING REFUND REQUEST
    // =========================================================

    @PostMapping("/{id}/refund/approve")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<?> approveRefund(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canManagePayments()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {
            Payment payment = paymentService.approveRefund(id);
            return ResponseEntity.ok(paymentMapper.toDTO(payment));
        } catch (RuntimeException exception) {
            return ResponseEntity.badRequest().body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // CANCEL PENDING REFUND REQUEST
    // =========================================================

    @PostMapping("/{id}/refund/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<?> cancelRefund(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canManagePayments()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {
            Payment payment = paymentService.cancelRefund(id);
            return ResponseEntity.ok(paymentMapper.toDTO(payment));
        } catch (RuntimeException exception) {
            return ResponseEntity.badRequest().body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // DELETE PENDING REFUND REQUEST (DRAFT / UNPROCESSED)
    // =========================================================

    @DeleteMapping("/{id}/refund")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<?> deleteRefund(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canManagePayments()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {
            Payment payment = paymentService.deleteRefund(id);
            return ResponseEntity.ok(paymentMapper.toDTO(payment));
        } catch (RuntimeException exception) {
            return ResponseEntity.badRequest().body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // DELETE PAYMENT
    // =========================================================

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER')")
    public ResponseEntity<?> deletePayment(
            @PathVariable Long id) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canManagePayments()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {

            paymentService.deletePayment(id);

            return ResponseEntity.ok(
                    Map.of("message", "Payment deleted successfully", "success", true)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", exception.getMessage()));
        }
    }

    // =========================================================
    // STRATEGY PATTERN: GET REGISTERED STRATEGIES METADATA
    // =========================================================

    @GetMapping("/strategies")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getRegisteredStrategies() {
        try {
            return ResponseEntity.ok(paymentService.getRegisteredStrategiesMetadata());
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    // =========================================================
    // STRATEGY PATTERN: GET AVAILABLE TRANSITIONS FOR PAYMENT
    // =========================================================

    @GetMapping("/{id}/available-transitions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getAvailableTransitions(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(paymentService.getAvailableTransitions(id));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    // =========================================================
    // STRATEGY PATTERN: UNIFIED STATUS TRANSITION
    // =========================================================

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'RECEPTIONIST')")
    public ResponseEntity<?> transitionPaymentStatus(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body,
            @RequestParam(required = false) String targetStatus) {

        if (isUnauthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (!canProcessPayments()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Access denied: Unauthorized role"));
        }

        try {
            String status = null;
            if (body != null && body.containsKey("status") && body.get("status") != null) {
                status = String.valueOf(body.get("status")).trim();
            } else if (body != null && body.containsKey("targetStatus") && body.get("targetStatus") != null) {
                status = String.valueOf(body.get("targetStatus")).trim();
            } else if (targetStatus != null && !targetStatus.trim().isEmpty()) {
                status = targetStatus.trim();
            }

            if (status == null || status.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Target status is required"));
            }

            Map<String, Object> context = body != null ? body : Map.of();
            Payment updated = paymentService.transitionPaymentStatus(id, status, context);
            return ResponseEntity.ok(paymentMapper.toDTO(updated));

        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // PAYHERE - INITIATE ONLINE CHECKOUT
    // =========================================================

    @PostMapping("/payhere/initiate")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'RECEPTIONIST', 'PATIENT')")
    public ResponseEntity<?> initiatePayHereCheckout(
            @RequestBody PayHerePaymentRequest request,
            Authentication authentication) {

        if (isUnauthenticated(authentication)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        if (request == null || request.getBillId() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Bill ID is required to initiate PayHere checkout"));
        }

        try {
            Bill bill = billService.getBillById(request.getBillId());
            if (isPatientRole(authentication)) {
                if (!isPatientAuthorizedForBill(authentication, bill)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("error", "Access denied: You can only initiate payment for your own invoices"));
                }
            }

            PayHereCheckoutDTO checkoutDTO = paymentService.initiatePayHereCheckout(request.getBillId(), request.getAmount());
            return ResponseEntity.ok(checkoutDTO);

        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    // =========================================================
    // PAYHERE - PUBLIC WEBHOOK / IPN CALLBACK NOTIFICATION
    // =========================================================

    @PostMapping(value = "/payhere/notify")
    public ResponseEntity<?> handlePayHereNotification(
            @RequestParam(required = false) Map<String, String> formParams,
            @RequestBody(required = false) Map<String, String> bodyParams) {

        try {
            Map<String, String> combinedParams = new java.util.HashMap<>();
            if (formParams != null) combinedParams.putAll(formParams);
            if (bodyParams != null) combinedParams.putAll(bodyParams);

            Payment updatedPayment = paymentService.processPayHereNotification(combinedParams);
            return ResponseEntity.ok("OK - PayHere Payment Processed (" + updatedPayment.getPaymentReference() + ")");

        } catch (RuntimeException ex) {
            System.err.println("PayHere notification processing error: " + ex.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", ex.getMessage()));
        }
    }

    // =========================================================
    // PAYHERE - SIMULATE SUCCESSFUL ONLINE PAYMENT (SANDBOX/DEV)
    // =========================================================

    @PostMapping("/payhere/simulate-success/{paymentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CASHIER', 'RECEPTIONIST', 'PATIENT')")
    public ResponseEntity<?> simulatePayHereSuccess(
            @PathVariable Long paymentId,
            Authentication authentication) {

        if (isUnauthenticated(authentication)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        try {
            Payment verified = paymentService.simulatePayHereSuccess(paymentId);
            return ResponseEntity.ok(paymentMapper.toDTO(verified));

        } catch (RuntimeException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }
}