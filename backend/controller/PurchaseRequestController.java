package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.PurchaseRequestDTO;
import com.dentaflow.backend.entity.PurchaseRequest;
import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.mapper.PurchaseRequestMapper;
import com.dentaflow.backend.security.CustomUserDetails;
import com.dentaflow.backend.service.PurchaseRequestService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping({"/api/purchase-requests", "/api/medicine-requests"})
public class PurchaseRequestController {

    private final PurchaseRequestService purchaseRequestService;
    private final PurchaseRequestMapper purchaseRequestMapper;

    public PurchaseRequestController(
            PurchaseRequestService purchaseRequestService,
            PurchaseRequestMapper purchaseRequestMapper) {
        this.purchaseRequestService = purchaseRequestService;
        this.purchaseRequestMapper = purchaseRequestMapper;
    }

    private User getCurrentUser(Authentication authentication) {
        if (authentication == null) {
            authentication = SecurityContextHolder.getContext().getAuthentication();
        }
        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails)) {
            return null;
        }
        return ((CustomUserDetails) authentication.getPrincipal()).getUser();
    }

    private boolean isAdmin(Authentication authentication) {
        if (authentication == null) {
            authentication = SecurityContextHolder.getContext().getAuthentication();
        }
        if (authentication == null) return false;
        return authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    // =========================================================
    // 1. CREATE PURCHASE REQUEST (Pharmacist / Staff)
    // =========================================================
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'STAFF')")
    public ResponseEntity<?> createPurchaseRequest(
            @RequestBody PurchaseRequestDTO dto,
            Authentication authentication) {
        User currentUser = getCurrentUser(authentication);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Authentication required");
        }

        try {
            PurchaseRequest created = purchaseRequestService.createPurchaseRequest(dto, currentUser.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(purchaseRequestMapper.toDTO(created));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // =========================================================
    // 2. GET MY PURCHASE REQUESTS (Pharmacist view)
    // =========================================================
    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'STAFF')")
    public ResponseEntity<?> getMyPurchaseRequests(
            @RequestParam(required = false) String status,
            Authentication authentication) {
        User currentUser = getCurrentUser(authentication);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Authentication required");
        }

        List<PurchaseRequestDTO> list = purchaseRequestService.getMyRequests(currentUser.getId(), status)
                .stream()
                .map(purchaseRequestMapper::toDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(list);
    }

    // =========================================================
    // 3. GET ALL PURCHASE REQUESTS (Admin view)
    // =========================================================
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllPurchaseRequests(
            @RequestParam(required = false) String status) {
        List<PurchaseRequestDTO> list = purchaseRequestService.getAllRequests(status)
                .stream()
                .map(purchaseRequestMapper::toDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(list);
    }

    // =========================================================
    // 4. GET PURCHASE REQUEST BY ID
    // =========================================================
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'STAFF')")
    public ResponseEntity<?> getPurchaseRequestById(
            @PathVariable Long id,
            Authentication authentication) {
        User currentUser = getCurrentUser(authentication);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Authentication required");
        }

        try {
            PurchaseRequest request = purchaseRequestService.getRequestById(id);
            if (!isAdmin(authentication) && (request.getPharmacist() == null || !request.getPharmacist().getId().equals(currentUser.getId()))) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access denied");
            }
            return ResponseEntity.ok(purchaseRequestMapper.toDTO(request));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    // =========================================================
    // 5. APPROVE PURCHASE REQUEST (Admin action)
    // =========================================================
    @PutMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> approvePurchaseRequest(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication authentication) {
        User currentUser = getCurrentUser(authentication);
        Long adminId = currentUser != null ? currentUser.getId() : null;
        String note = body != null ? (body.get("adminNote") != null ? body.get("adminNote") : body.get("note")) : null;

        try {
            PurchaseRequest approved = purchaseRequestService.approveRequest(id, adminId, note);
            return ResponseEntity.ok(purchaseRequestMapper.toDTO(approved));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // =========================================================
    // 6. REJECT PURCHASE REQUEST (Admin action)
    // =========================================================
    @PutMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> rejectPurchaseRequest(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication authentication) {
        User currentUser = getCurrentUser(authentication);
        Long adminId = currentUser != null ? currentUser.getId() : null;
        String reason = body != null ? (body.get("reason") != null ? body.get("reason") : body.get("adminNote")) : null;

        try {
            PurchaseRequest rejected = purchaseRequestService.rejectRequest(id, adminId, reason);
            return ResponseEntity.ok(purchaseRequestMapper.toDTO(rejected));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // =========================================================
    // 7. UPDATE STATUS (General admin transition, e.g. ORDERED)
    // =========================================================
    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication authentication) {
        if (body == null || body.get("status") == null || body.get("status").trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Status is required");
        }

        User currentUser = getCurrentUser(authentication);
        Long adminId = currentUser != null ? currentUser.getId() : null;
        String note = body.get("adminNote") != null ? body.get("adminNote") : body.get("note");

        try {
            PurchaseRequest updated = purchaseRequestService.updateRequestStatus(id, body.get("status"), adminId, note);
            return ResponseEntity.ok(purchaseRequestMapper.toDTO(updated));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
