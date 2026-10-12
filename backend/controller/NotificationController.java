package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.NotificationDTO;
import com.dentaflow.backend.entity.Notification;
import com.dentaflow.backend.mapper.NotificationMapper;
import com.dentaflow.backend.security.AccessControlService;
import com.dentaflow.backend.service.NotificationService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final NotificationMapper notificationMapper;
    private final AccessControlService accessControlService;

    public NotificationController(
            NotificationService notificationService,
            NotificationMapper notificationMapper,
            AccessControlService accessControlService) {

        this.notificationService = notificationService;
        this.notificationMapper = notificationMapper;
        this.accessControlService = accessControlService;
    }

    // =========================================================
    // HELPER METHODS
    // =========================================================

    private ResponseEntity<?> checkAdminAccess() {
        if (accessControlService != null) {
            if (accessControlService.getCurrentUserId() == null && !accessControlService.isAdmin()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Authentication required");
            }
            if (!accessControlService.isAdmin()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("Access denied: Administrator role required");
            }
        }
        return null;
    }

    private ResponseEntity<?> checkNotificationAccess(Long notificationId) {
        if (accessControlService != null) {
            if (accessControlService.getCurrentUserId() == null && !accessControlService.isAdmin()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Authentication required");
            }
            if (!accessControlService.canAccessNotification(notificationId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("Access denied");
            }
        }
        return null;
    }

    private ResponseEntity<?> checkUserAccess(Long userId) {
        if (accessControlService != null) {
            if (accessControlService.getCurrentUserId() == null && !accessControlService.isAdmin()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body("Authentication required");
            }
            if (!accessControlService.isAdmin() && !accessControlService.isSelf(userId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("Access denied: You cannot access notifications for another user");
            }
        }
        return null;
    }

    private Long resolveEffectiveUserId(Long requestedUserId) {
        if (accessControlService != null && !accessControlService.isAdmin()) {
            return accessControlService.getCurrentUserId();
        }
        return requestedUserId;
    }

    // =========================================================
    // CREATE NOTIFICATION
    // =========================================================

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or @accessControl.isStaff()")
    public ResponseEntity<?> createNotification(
            @RequestBody NotificationDTO dto) {

        try {
            if (accessControlService != null) {
                if (accessControlService.getCurrentUserId() == null && !accessControlService.isAdmin()) {
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                            .body("Authentication required");
                }
                if (!accessControlService.isAdmin() && !accessControlService.isStaff()) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body("Access denied: Administrative privileges required");
                }
            }

            if (dto == null) {
                return ResponseEntity.badRequest()
                        .body("Notification data is required");
            }

            Notification notification =
                    notificationMapper.toEntity(dto);

            Notification saved =
                    notificationService.createNotification(
                            notification,
                            dto.getUserId()
                    );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(notificationMapper.toDTO(saved));

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET ALL NOTIFICATIONS
    // =========================================================

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllNotifications() {

        try {
            ResponseEntity<?> authCheck = checkAdminAccess();
            if (authCheck != null) {
                return authCheck;
            }

            List<NotificationDTO> result =
                    notificationService
                            .getAllNotifications()
                            .stream()
                            .map(notificationMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET NOTIFICATION BY ID
    // =========================================================

    @GetMapping("/{id}")
    @PreAuthorize("@accessControl.canAccessNotification(#id)")
    public ResponseEntity<?> getNotificationById(
            @PathVariable Long id) {

        try {
            ResponseEntity<?> authCheck = checkNotificationAccess(id);
            if (authCheck != null) {
                return authCheck;
            }

            Notification notification =
                    notificationService
                            .getNotificationById(id);

            return ResponseEntity.ok(
                    notificationMapper.toDTO(notification)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET NOTIFICATION BY CODE
    // =========================================================

    @GetMapping("/code/{notificationCode}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getNotificationByCode(
            @PathVariable String notificationCode) {

        try {
            ResponseEntity<?> authCheck = checkAdminAccess();
            if (authCheck != null) {
                return authCheck;
            }

            Notification notification =
                    notificationService
                            .getNotificationByCode(
                                    notificationCode
                            );

            return ResponseEntity.ok(
                    notificationMapper.toDTO(notification)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET USER NOTIFICATIONS
    // =========================================================

    @GetMapping("/user/{userId}")
    @PreAuthorize("@accessControl.isSelfOrAdmin(#userId)")
    public ResponseEntity<?> getUserNotifications(
            @PathVariable Long userId) {

        try {
            ResponseEntity<?> authCheck = checkUserAccess(userId);
            if (authCheck != null) {
                return authCheck;
            }

            Long effectiveUserId = resolveEffectiveUserId(userId);

            List<NotificationDTO> result =
                    notificationService
                            .getUserNotifications(effectiveUserId)
                            .stream()
                            .map(notificationMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET USER NOTIFICATIONS BY STATUS
    // =========================================================

    @GetMapping("/user/{userId}/status/{status}")
    @PreAuthorize("@accessControl.isSelfOrAdmin(#userId)")
    public ResponseEntity<?> getUserNotificationsByStatus(
            @PathVariable Long userId,
            @PathVariable String status) {

        try {
            ResponseEntity<?> authCheck = checkUserAccess(userId);
            if (authCheck != null) {
                return authCheck;
            }

            Long effectiveUserId = resolveEffectiveUserId(userId);

            List<NotificationDTO> result =
                    notificationService
                            .getUserNotificationsByStatus(
                                    effectiveUserId,
                                    status
                            )
                            .stream()
                            .map(notificationMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET UNREAD NOTIFICATIONS
    // =========================================================

    @GetMapping("/user/{userId}/unread")
    @PreAuthorize("@accessControl.isSelfOrAdmin(#userId)")
    public ResponseEntity<?> getUnreadNotifications(
            @PathVariable Long userId) {

        try {
            ResponseEntity<?> authCheck = checkUserAccess(userId);
            if (authCheck != null) {
                return authCheck;
            }

            Long effectiveUserId = resolveEffectiveUserId(userId);

            List<NotificationDTO> result =
                    notificationService
                            .getUnreadNotifications(effectiveUserId)
                            .stream()
                            .map(notificationMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // COUNT UNREAD NOTIFICATIONS
    // =========================================================

    @GetMapping("/user/{userId}/unread/count")
    @PreAuthorize("@accessControl.isSelfOrAdmin(#userId)")
    public ResponseEntity<?> countUnreadNotifications(
            @PathVariable Long userId) {

        try {
            ResponseEntity<?> authCheck = checkUserAccess(userId);
            if (authCheck != null) {
                return authCheck;
            }

            Long effectiveUserId = resolveEffectiveUserId(userId);

            long count =
                    notificationService
                            .countUnreadNotifications(effectiveUserId);

            return ResponseEntity.ok(count);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET NOTIFICATIONS BY TYPE
    // =========================================================

    @GetMapping("/type/{type}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getNotificationsByType(
            @PathVariable String type) {

        try {
            ResponseEntity<?> authCheck = checkAdminAccess();
            if (authCheck != null) {
                return authCheck;
            }

            List<NotificationDTO> result =
                    notificationService
                            .getNotificationsByType(type)
                            .stream()
                            .map(notificationMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // EMAIL PENDING NOTIFICATIONS
    // =========================================================

    @GetMapping("/email/pending")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getEmailPendingNotifications() {

        try {
            ResponseEntity<?> authCheck = checkAdminAccess();
            if (authCheck != null) {
                return authCheck;
            }

            List<NotificationDTO> result =
                    notificationService
                            .getEmailPendingNotifications()
                            .stream()
                            .map(notificationMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // PUSH PENDING NOTIFICATIONS
    // =========================================================

    @GetMapping("/push/pending")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getPushPendingNotifications() {

        try {
            ResponseEntity<?> authCheck = checkAdminAccess();
            if (authCheck != null) {
                return authCheck;
            }

            List<NotificationDTO> result =
                    notificationService
                            .getPushPendingNotifications()
                            .stream()
                            .map(notificationMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // GET NOTIFICATIONS BY REFERENCE
    // =========================================================

    @GetMapping("/reference/{referenceType}/{referenceId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getNotificationsByReference(
            @PathVariable String referenceType,
            @PathVariable Long referenceId) {

        try {
            ResponseEntity<?> authCheck = checkAdminAccess();
            if (authCheck != null) {
                return authCheck;
            }

            List<NotificationDTO> result =
                    notificationService
                            .getNotificationsByReference(
                                    referenceType,
                                    referenceId
                            )
                            .stream()
                            .map(notificationMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // MARK AS READ
    // =========================================================

    @PutMapping("/{id}/read")
    @PreAuthorize("@accessControl.canAccessNotification(#id)")
    public ResponseEntity<?> markAsRead(
            @PathVariable Long id) {

        try {
            ResponseEntity<?> authCheck = checkNotificationAccess(id);
            if (authCheck != null) {
                return authCheck;
            }

            Notification notification =
                    notificationService.markAsRead(id);

            return ResponseEntity.ok(
                    notificationMapper.toDTO(notification)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // MARK AS UNREAD
    // =========================================================

    @PutMapping("/{id}/unread")
    @PreAuthorize("@accessControl.canAccessNotification(#id)")
    public ResponseEntity<?> markAsUnread(
            @PathVariable Long id) {

        try {
            ResponseEntity<?> authCheck = checkNotificationAccess(id);
            if (authCheck != null) {
                return authCheck;
            }

            Notification notification =
                    notificationService.markAsUnread(id);

            return ResponseEntity.ok(
                    notificationMapper.toDTO(notification)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // MARK EMAIL SENT
    // =========================================================

    @PutMapping("/{id}/email-sent")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> markEmailSent(
            @PathVariable Long id) {

        try {
            ResponseEntity<?> authCheck = checkAdminAccess();
            if (authCheck != null) {
                return authCheck;
            }

            Notification notification =
                    notificationService.markEmailSent(id);

            return ResponseEntity.ok(
                    notificationMapper.toDTO(notification)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // MARK PUSH SENT
    // =========================================================

    @PutMapping("/{id}/push-sent")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> markPushSent(
            @PathVariable Long id) {

        try {
            ResponseEntity<?> authCheck = checkAdminAccess();
            if (authCheck != null) {
                return authCheck;
            }

            Notification notification =
                    notificationService.markPushSent(id);

            return ResponseEntity.ok(
                    notificationMapper.toDTO(notification)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // UPDATE NOTIFICATION
    // =========================================================

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateNotification(
            @PathVariable Long id,
            @RequestBody NotificationDTO dto) {

        try {
            ResponseEntity<?> authCheck = checkAdminAccess();
            if (authCheck != null) {
                return authCheck;
            }

            if (dto == null) {
                return ResponseEntity.badRequest()
                        .body("Notification data is required");
            }

            Notification notification =
                    notificationMapper.toEntity(dto);

            Notification updated =
                    notificationService.updateNotification(
                            id,
                            notification
                    );

            return ResponseEntity.ok(
                    notificationMapper.toDTO(updated)
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }

    // =========================================================
    // CLEAR ALL NOTIFICATIONS (ADMIN)
    // =========================================================

    @DeleteMapping("/clear-all")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> clearAllNotifications() {

        try {
            Long currentUserId = accessControlService.getCurrentUserId();
            if (currentUserId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not authenticated"));
            }

            notificationService.deleteAllNotifications(currentUserId);

            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "message", "All notifications cleared successfully"
                    )
            );

        } catch (RuntimeException e) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("@accessControl.canAccessNotification(#id)")
    public ResponseEntity<?> deleteNotification(
            @PathVariable Long id) {

        try {
            ResponseEntity<?> authCheck = checkNotificationAccess(id);
            if (authCheck != null) {
                return authCheck;
            }

            notificationService.deleteNotification(id);

            return ResponseEntity.ok(
                    "Notification deleted successfully"
            );

        } catch (RuntimeException e) {

            return ResponseEntity
                    .badRequest()
                    .body(e.getMessage());
        }
    }
}