package com.dentaflow.backend.service;

import com.dentaflow.backend.entity.Notification;
import com.dentaflow.backend.entity.User;
import com.dentaflow.backend.repository.NotificationRepository;
import com.dentaflow.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    public NotificationService(
            NotificationRepository notificationRepository,
            UserRepository userRepository) {

        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }

    // Create notification
    public Notification createNotification(
            Notification notification,
            Long userId) {

        if (notification == null) {
            throw new RuntimeException(
                    "Notification data is required"
            );
        }

        if (notification.getTitle() == null ||
                notification.getTitle().trim().isEmpty()) {

            throw new RuntimeException(
                    "Notification title is required"
            );
        }

        if (notification.getMessage() == null ||
                notification.getMessage().trim().isEmpty()) {

            throw new RuntimeException(
                    "Notification message is required"
            );
        }

        if (notification.getType() == null ||
                notification.getType().trim().isEmpty()) {

            throw new RuntimeException(
                    "Notification type is required"
            );
        }

        // Link user if user ID is provided
        if (userId != null) {

            User user = userRepository.findById(userId)
                    .orElseThrow(() ->
                            new RuntimeException(
                                    "User not found with id: "
                                            + userId
                            ));

            notification.setUser(user);
        }

        notification.setNotificationCode(
                generateNotificationCode()
        );

        notification.setTitle(
                notification.getTitle().trim()
        );

        notification.setMessage(
                notification.getMessage().trim()
        );

        notification.setType(
                notification.getType()
                        .trim()
                        .toUpperCase()
        );

        if (notification.getStatus() == null ||
                notification.getStatus()
                        .trim()
                        .isEmpty()) {

            notification.setStatus("UNREAD");

        } else {

            notification.setStatus(
                    notification.getStatus()
                            .trim()
                            .toUpperCase()
            );
        }

        if (notification.getEmailSent() == null) {
            notification.setEmailSent(false);
        }

        if (notification.getPushSent() == null) {
            notification.setPushSent(false);
        }

        if (notification.getReferenceType() != null) {
            notification.setReferenceType(
                    notification.getReferenceType().trim()
            );
        }

        return notificationRepository.save(notification);
    }

    // Generate notification code
    private String generateNotificationCode() {

        long nextNumber =
                notificationRepository.count() + 1;

        String code;

        do {

            code = String.format(
                    "NOT%05d",
                    nextNumber
            );

            nextNumber++;

        } while (
                notificationRepository
                        .existsByNotificationCode(code)
        );

        return code;
    }

    // Get all notifications
    @Transactional(readOnly = true)
    public List<Notification> getAllNotifications() {

        return notificationRepository.findAll();
    }

    // Get notification by ID
    @Transactional(readOnly = true)
    public Notification getNotificationById(
            Long id) {

        return notificationRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Notification not found with id: "
                                        + id
                        ));
    }

    // Get notification by code
    @Transactional(readOnly = true)
    public Notification getNotificationByCode(
            String notificationCode) {

        if (notificationCode == null ||
                notificationCode.trim().isEmpty()) {

            throw new RuntimeException(
                    "Notification code is required"
            );
        }

        return notificationRepository
                .findByNotificationCode(
                        notificationCode
                                .trim()
                                .toUpperCase()
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "Notification not found: "
                                        + notificationCode
                        ));
    }

    // Get all notifications of a user
    @Transactional(readOnly = true)
    public List<Notification> getUserNotifications(
            Long userId) {

        if (userId == null) {
            throw new RuntimeException(
                    "User ID is required"
            );
        }

        return notificationRepository
                .findByUserIdOrderByCreatedAtDesc(
                        userId
                );
    }

    // Get notifications by user and status
    @Transactional(readOnly = true)
    public List<Notification> getUserNotificationsByStatus(
            Long userId,
            String status) {

        if (userId == null) {
            throw new RuntimeException(
                    "User ID is required"
            );
        }

        if (status == null ||
                status.trim().isEmpty()) {

            throw new RuntimeException(
                    "Status is required"
            );
        }

        return notificationRepository
                .findByUserIdAndStatusIgnoreCaseOrderByCreatedAtDesc(
                        userId,
                        status.trim()
                );
    }

    // Get unread notifications
    @Transactional(readOnly = true)
    public List<Notification> getUnreadNotifications(
            Long userId) {

        if (userId == null) {
            throw new RuntimeException(
                    "User ID is required"
            );
        }

        return notificationRepository
                .findByUserIdAndStatusIgnoreCaseOrderByCreatedAtDesc(
                        userId,
                        "UNREAD"
                );
    }

    // Count unread notifications
    @Transactional(readOnly = true)
    public long countUnreadNotifications(
            Long userId) {

        if (userId == null) {
            throw new RuntimeException(
                    "User ID is required"
            );
        }

        return notificationRepository
                .countByUserIdAndStatusIgnoreCase(
                        userId,
                        "UNREAD"
                );
    }

    // Get notifications by type
    @Transactional(readOnly = true)
    public List<Notification> getNotificationsByType(
            String type) {

        if (type == null ||
                type.trim().isEmpty()) {

            throw new RuntimeException(
                    "Notification type is required"
            );
        }

        return notificationRepository
                .findByTypeIgnoreCaseOrderByCreatedAtDesc(
                        type.trim()
                );
    }

    // Get notifications not sent by email
    @Transactional(readOnly = true)
    public List<Notification> getEmailPendingNotifications() {

        return notificationRepository
                .findByEmailSentFalseOrderByCreatedAtAsc();
    }

    // Get notifications not sent by push
    @Transactional(readOnly = true)
    public List<Notification> getPushPendingNotifications() {

        return notificationRepository
                .findByPushSentFalseOrderByCreatedAtAsc();
    }

    // Get notifications by reference
    @Transactional(readOnly = true)
    public List<Notification> getNotificationsByReference(
            String referenceType,
            Long referenceId) {

        if (referenceType == null ||
                referenceType.trim().isEmpty()) {

            throw new RuntimeException(
                    "Reference type is required"
            );
        }

        if (referenceId == null) {
            throw new RuntimeException(
                    "Reference ID is required"
            );
        }

        return notificationRepository
                .findByReferenceTypeAndReferenceIdOrderByCreatedAtDesc(
                        referenceType.trim(),
                        referenceId
                );
    }

    // Mark notification as read
    public Notification markAsRead(Long id) {

        Notification notification =
                getNotificationById(id);

        notification.setStatus("READ");

        notification.setReadAt(
                LocalDateTime.now()
        );

        return notificationRepository.save(
                notification
        );
    }

    // Mark notification as unread
    public Notification markAsUnread(Long id) {

        Notification notification =
                getNotificationById(id);

        notification.setStatus("UNREAD");

        notification.setReadAt(null);

        return notificationRepository.save(
                notification
        );
    }

    // Mark email as sent
    public Notification markEmailSent(Long id) {

        Notification notification =
                getNotificationById(id);

        notification.setEmailSent(true);

        return notificationRepository.save(
                notification
        );
    }

    // Mark push notification as sent
    public Notification markPushSent(Long id) {

        Notification notification =
                getNotificationById(id);

        notification.setPushSent(true);

        return notificationRepository.save(
                notification
        );
    }

    // Update notification
    public Notification updateNotification(
            Long id,
            Notification updatedNotification) {

        Notification existing =
                getNotificationById(id);

        if (updatedNotification == null) {
            throw new RuntimeException(
                    "Notification data is required"
            );
        }

        if (updatedNotification.getTitle() != null &&
                !updatedNotification.getTitle()
                        .trim()
                        .isEmpty()) {

            existing.setTitle(
                    updatedNotification.getTitle().trim()
            );
        }

        if (updatedNotification.getMessage() != null &&
                !updatedNotification.getMessage()
                        .trim()
                        .isEmpty()) {

            existing.setMessage(
                    updatedNotification.getMessage().trim()
            );
        }

        if (updatedNotification.getType() != null &&
                !updatedNotification.getType()
                        .trim()
                        .isEmpty()) {

            existing.setType(
                    updatedNotification.getType()
                            .trim()
                            .toUpperCase()
            );
        }

        if (updatedNotification.getStatus() != null &&
                !updatedNotification.getStatus()
                        .trim()
                        .isEmpty()) {

            existing.setStatus(
                    updatedNotification.getStatus()
                            .trim()
                            .toUpperCase()
            );
        }

        if (updatedNotification.getEmailSent() != null) {

            existing.setEmailSent(
                    updatedNotification.getEmailSent()
            );
        }

        if (updatedNotification.getPushSent() != null) {

            existing.setPushSent(
                    updatedNotification.getPushSent()
            );
        }

        if (updatedNotification.getReadAt() != null) {

            existing.setReadAt(
                    updatedNotification.getReadAt()
            );
        }

        if (updatedNotification.getReferenceType() != null) {

            existing.setReferenceType(
                    updatedNotification
                            .getReferenceType()
                            .trim()
            );
        }

        if (updatedNotification.getReferenceId() != null) {

            existing.setReferenceId(
                    updatedNotification.getReferenceId()
            );
        }

        return notificationRepository.save(existing);
    }

    // Delete notification
    public void deleteNotification(Long id) {

        Notification notification =
                getNotificationById(id);

        notificationRepository.delete(notification);
    }

    // Delete all notifications for a specific user
    @Transactional
    public void deleteAllNotifications(Long userId) {
        notificationRepository.deleteByUserId(userId);
    }
}