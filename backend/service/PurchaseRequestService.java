package com.dentaflow.backend.service;

import com.dentaflow.backend.dto.PurchaseRequestDTO;
import com.dentaflow.backend.entity.Medicine;
import com.dentaflow.backend.entity.Notification;
import com.dentaflow.backend.entity.PurchaseRequest;
import com.dentaflow.backend.entity.Role;
import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.repository.MedicineRepository;
import com.dentaflow.backend.repository.PurchaseRequestRepository;
import com.dentaflow.backend.repository.RoleRepository;
import com.dentaflow.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@Transactional
public class PurchaseRequestService {

    private static final Logger log = LoggerFactory.getLogger(PurchaseRequestService.class);

    private final PurchaseRequestRepository purchaseRequestRepository;
    private final MedicineRepository medicineRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final NotificationService notificationService;

    public PurchaseRequestService(
            PurchaseRequestRepository purchaseRequestRepository,
            MedicineRepository medicineRepository,
            UserRepository userRepository,
            RoleRepository roleRepository,
            NotificationService notificationService) {
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.medicineRepository = medicineRepository;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.notificationService = notificationService;
    }

    // =========================================================
    // CREATE PURCHASE REQUEST
    // =========================================================
    public PurchaseRequest createPurchaseRequest(PurchaseRequestDTO dto, Long pharmacistUserId) {
        if (dto == null) {
            throw new RuntimeException("Purchase request data is required");
        }

        if (pharmacistUserId == null) {
            throw new RuntimeException("Authenticated user ID is required");
        }

        User pharmacist = userRepository.findById(pharmacistUserId)
                .orElseThrow(() -> new RuntimeException("Pharmacist user not found with id: " + pharmacistUserId));

        if (dto.getMedicineName() == null || dto.getMedicineName().trim().isEmpty()) {
            throw new RuntimeException("Medicine name is required");
        }

        if (dto.getRequestedQuantity() == null || dto.getRequestedQuantity() <= 0) {
            throw new RuntimeException("Requested quantity must be greater than zero");
        }

        if (dto.getReason() == null || dto.getReason().trim().isEmpty()) {
            throw new RuntimeException("Reason / request note is required");
        }

        Medicine medicine = null;
        if (dto.getMedicineId() != null) {
            medicine = medicineRepository.findById(dto.getMedicineId()).orElse(null);
        }

        PurchaseRequest request = new PurchaseRequest();
        request.setRequestCode(generateRequestCode());
        request.setPharmacist(pharmacist);
        request.setMedicine(medicine);
        request.setMedicineName(dto.getMedicineName().trim());
        request.setRequestedQuantity(dto.getRequestedQuantity());
        request.setReason(dto.getReason().trim());
        request.setStatus("PENDING");
        request.setRequestDate(LocalDate.now());

        PurchaseRequest saved = purchaseRequestRepository.save(request);

        // In-system notification to Admin users:
        // "New medicine purchase request from [Pharmacist Name] for [Medicine Name] – [Quantity]."
        notifyAdminsOnNewRequest(saved, pharmacist);

        return saved;
    }

    // =========================================================
    // GET ALL REQUESTS (Admin view)
    // =========================================================
    @Transactional(readOnly = true)
    public List<PurchaseRequest> getAllRequests(String status) {
        if (status == null || status.trim().isEmpty() || "all".equalsIgnoreCase(status.trim())) {
            return purchaseRequestRepository.findAllByOrderByCreatedAtDesc();
        }
        return purchaseRequestRepository.findByStatusIgnoreCaseOrderByCreatedAtDesc(status.trim());
    }

    // =========================================================
    // GET MY REQUESTS (Pharmacist view)
    // =========================================================
    @Transactional(readOnly = true)
    public List<PurchaseRequest> getMyRequests(Long pharmacistUserId, String status) {
        if (pharmacistUserId == null) {
            throw new RuntimeException("Pharmacist user ID is required");
        }

        if (status == null || status.trim().isEmpty() || "all".equalsIgnoreCase(status.trim())) {
            return purchaseRequestRepository.findByPharmacistIdOrderByCreatedAtDesc(pharmacistUserId);
        }
        return purchaseRequestRepository.findByPharmacistIdAndStatusIgnoreCaseOrderByCreatedAtDesc(
                pharmacistUserId, status.trim());
    }

    // =========================================================
    // GET REQUEST BY ID
    // =========================================================
    @Transactional(readOnly = true)
    public PurchaseRequest getRequestById(Long id) {
        return purchaseRequestRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Purchase request not found with id: " + id));
    }

    // =========================================================
    // APPROVE REQUEST (Admin action)
    // =========================================================
    public PurchaseRequest approveRequest(Long id, Long adminUserId, String adminNote) {
        PurchaseRequest request = getRequestById(id);

        if ("APPROVED".equalsIgnoreCase(request.getStatus())) {
            throw new RuntimeException("Purchase request is already approved");
        }

        User adminUser = null;
        if (adminUserId != null) {
            adminUser = userRepository.findById(adminUserId).orElse(null);
        }

        request.setStatus("APPROVED");
        request.setProcessedAt(LocalDateTime.now());
        request.setProcessedBy(adminUser);
        if (adminNote != null && !adminNote.trim().isEmpty()) {
            request.setAdminNote(adminNote.trim());
        }

        PurchaseRequest saved = purchaseRequestRepository.save(request);

        // Notify ONLY the Pharmacist who created the request
        notifyPharmacistOnDecision(saved, true, adminNote);

        return saved;
    }

    // =========================================================
    // REJECT REQUEST (Admin action)
    // =========================================================
    public PurchaseRequest rejectRequest(Long id, Long adminUserId, String rejectionReason) {
        PurchaseRequest request = getRequestById(id);

        if ("REJECTED".equalsIgnoreCase(request.getStatus())) {
            throw new RuntimeException("Purchase request is already rejected");
        }

        User adminUser = null;
        if (adminUserId != null) {
            adminUser = userRepository.findById(adminUserId).orElse(null);
        }

        request.setStatus("REJECTED");
        request.setProcessedAt(LocalDateTime.now());
        request.setProcessedBy(adminUser);
        if (rejectionReason != null && !rejectionReason.trim().isEmpty()) {
            request.setAdminNote(rejectionReason.trim());
        }

        PurchaseRequest saved = purchaseRequestRepository.save(request);

        // Notify ONLY the Pharmacist who created the request
        notifyPharmacistOnDecision(saved, false, rejectionReason);

        return saved;
    }

    // =========================================================
    // UPDATE STATUS (General Admin transition, e.g. ORDERED)
    // =========================================================
    public PurchaseRequest updateRequestStatus(Long id, String newStatus, Long adminUserId, String note) {
        PurchaseRequest request = getRequestById(id);
        request.setStatus(newStatus.trim().toUpperCase());
        request.setProcessedAt(LocalDateTime.now());
        if (adminUserId != null) {
            userRepository.findById(adminUserId).ifPresent(request::setProcessedBy);
        }
        if (note != null && !note.trim().isEmpty()) {
            request.setAdminNote(note.trim());
        }
        return purchaseRequestRepository.save(request);
    }

    // =========================================================
    // GENERATE UNIQUE REQUEST CODE
    // =========================================================
    private String generateRequestCode() {
        long nextNumber = purchaseRequestRepository.count() + 1;
        String code;
        do {
            code = String.format("PR%05d", nextNumber);
            nextNumber++;
        } while (purchaseRequestRepository.existsByRequestCode(code));
        return code;
    }

    // =========================================================
    // NOTIFICATIONS
    // =========================================================
    private void notifyAdminsOnNewRequest(PurchaseRequest request, User pharmacist) {
        try {
            String pharmacistName = (pharmacist.getFirstName() != null ? pharmacist.getFirstName() : "")
                    + " " + (pharmacist.getLastName() != null ? pharmacist.getLastName() : "");
            pharmacistName = pharmacistName.trim();
            if (pharmacistName.isEmpty()) {
                pharmacistName = pharmacist.getEmail();
            }

            List<User> admins = new ArrayList<>();
            roleRepository.findByName("ADMIN").ifPresent(r -> admins.addAll(userRepository.findByRole(r)));
            roleRepository.findByName("ROLE_ADMIN").ifPresent(r -> {
                for (User u : userRepository.findByRole(r)) {
                    if (!admins.contains(u)) admins.add(u);
                }
            });

            String message = String.format(
                    "New medicine purchase request from %s for %s – %d.",
                    pharmacistName,
                    request.getMedicineName(),
                    request.getRequestedQuantity()
            );

            for (User admin : admins) {
                Notification notification = new Notification();
                notification.setTitle("New Medicine Purchase Request");
                notification.setMessage(message);
                notification.setType("PURCHASE_REQUEST");
                notification.setReferenceType("PURCHASE_REQUEST");
                notification.setReferenceId(request.getId());
                notificationService.createNotification(notification, admin.getId());
            }
        } catch (Exception e) {
            log.warn("Failed to notify admins of purchase request {}: {}", request.getRequestCode(), e.getMessage());
        }
    }

    private void notifyPharmacistOnDecision(PurchaseRequest request, boolean approved, String reason) {
        try {
            if (request.getPharmacist() == null) return;

            String title = approved ? "Purchase Request Approved" : "Purchase Request Rejected";
            String message;
            if (approved) {
                message = String.format("Your request for %s has been approved.", request.getMedicineName());
                if (reason != null && !reason.trim().isEmpty()) {
                    message += " Note: " + reason.trim();
                }
            } else {
                message = String.format("Your request for %s was rejected.", request.getMedicineName());
                if (reason != null && !reason.trim().isEmpty()) {
                    message += " Reason: " + reason.trim();
                }
            }

            Notification notification = new Notification();
            notification.setTitle(title);
            notification.setMessage(message);
            notification.setType("PURCHASE_REQUEST");
            notification.setReferenceType("PURCHASE_REQUEST");
            notification.setReferenceId(request.getId());

            notificationService.createNotification(notification, request.getPharmacist().getId());
        } catch (Exception e) {
            log.warn("Failed to notify pharmacist of purchase request decision {}: {}", request.getRequestCode(), e.getMessage());
        }
    }
}
