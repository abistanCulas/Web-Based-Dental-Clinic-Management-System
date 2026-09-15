package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository
        extends JpaRepository<Notification, Long> {

    // Find notification by unique notification code
    Optional<Notification> findByNotificationCode(
            String notificationCode
    );

    // Check notification code
    boolean existsByNotificationCode(
            String notificationCode
    );

    // Get all notifications of a user
    List<Notification> findByUserIdOrderByCreatedAtDesc(
            Long userId
    );

    // Get unread notifications
    List<Notification> findByUserIdAndStatusIgnoreCaseOrderByCreatedAtDesc(
            Long userId,
            String status
    );

    // Find notifications by type
    List<Notification> findByTypeIgnoreCaseOrderByCreatedAtDesc(
            String type
    );

    // Find notifications that have not been sent by email
    List<Notification> findByEmailSentFalseOrderByCreatedAtAsc();

    // Find notifications that have not been sent as push notifications
    List<Notification> findByPushSentFalseOrderByCreatedAtAsc();

    // Find notifications related to a specific record
    List<Notification> findByReferenceTypeAndReferenceIdOrderByCreatedAtDesc(
            String referenceType,
            Long referenceId
    );

    // Count unread notifications for a user
    long countByUserIdAndStatusIgnoreCase(
            Long userId,
            String status
    );
}