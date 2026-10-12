package com.dentaflow.backend.mapper;

import com.dentaflow.backend.dto.NotificationDTO;
import com.dentaflow.backend.entity.Notification;
import org.springframework.stereotype.Component;

@Component
public class NotificationMapper {

    // =========================================================
    // ENTITY → DTO
    // =========================================================

    public NotificationDTO toDTO(
            Notification notification) {

        if (notification == null) {
            return null;
        }

        return NotificationDTO.builder()
                .id(notification.getId())
                .notificationCode(
                        notification.getNotificationCode()
                )
                .userId(
                        notification.getUser() != null
                                ? notification.getUser().getId()
                                : null
                )
                .title(
                        notification.getTitle()
                )
                .message(
                        notification.getMessage()
                )
                .type(
                        notification.getType()
                )
                .status(
                        notification.getStatus()
                )
                .emailSent(
                        notification.getEmailSent()
                )
                .pushSent(
                        notification.getPushSent()
                )
                .readAt(
                        notification.getReadAt()
                )
                .referenceType(
                        notification.getReferenceType()
                )
                .referenceId(
                        notification.getReferenceId()
                )
                .build();
    }

    // =========================================================
    // DTO → ENTITY
    // =========================================================

    public Notification toEntity(
            NotificationDTO dto) {

        if (dto == null) {
            return null;
        }

        Notification notification =
                new Notification();

        notification.setId(dto.getId());

        notification.setNotificationCode(
                dto.getNotificationCode()
        );

        notification.setTitle(
                dto.getTitle()
        );

        notification.setMessage(
                dto.getMessage()
        );

        notification.setType(
                dto.getType()
        );

        notification.setStatus(
                dto.getStatus()
        );

        notification.setEmailSent(
                dto.getEmailSent()
        );

        notification.setPushSent(
                dto.getPushSent()
        );

        notification.setReadAt(
                dto.getReadAt()
        );

        notification.setReferenceType(
                dto.getReferenceType()
        );

        notification.setReferenceId(
                dto.getReferenceId()
        );

        return notification;
    }
}