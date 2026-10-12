package com.dentaflow.backend.mapper;

import com.dentaflow.backend.dto.MessageDTO;
import com.dentaflow.backend.entity.Message;
import com.dentaflow.backend.entity.User;
import org.springframework.stereotype.Component;

@Component
public class MessageMapper {

    public MessageDTO toDTO(Message message) {
        if (message == null) {
            return null;
        }

        User sender = message.getSender();
        User receiver = message.getReceiver();

        String senderName = sender != null
                ? (sender.getFirstName() + " " + sender.getLastName()).trim()
                : "Unknown";
        String senderRole = sender != null && sender.getRole() != null
                ? sender.getRole().getName()
                : null;
        String senderEmail = sender != null ? sender.getEmail() : null;

        String receiverName = receiver != null
                ? (receiver.getFirstName() + " " + receiver.getLastName()).trim()
                : "Unknown";
        String receiverRole = receiver != null && receiver.getRole() != null
                ? receiver.getRole().getName()
                : null;
        String receiverEmail = receiver != null ? receiver.getEmail() : null;

        Long patientId = message.getPatient() != null ? message.getPatient().getId() : null;
        String patientName = message.getPatient() != null
                ? (message.getPatient().getFirstName() + " " + message.getPatient().getLastName()).trim()
                : null;
        String patientCode = message.getPatient() != null ? message.getPatient().getPatientCode() : null;

        Long appointmentId = message.getAppointment() != null ? message.getAppointment().getId() : null;
        String appointmentCode = message.getAppointment() != null ? message.getAppointment().getAppointmentCode() : null;

        return MessageDTO.builder()
                .id(message.getId())
                .senderId(sender != null ? sender.getId() : null)
                .senderName(senderName)
                .senderRole(senderRole)
                .senderEmail(senderEmail)
                .receiverId(receiver != null ? receiver.getId() : null)
                .receiverName(receiverName)
                .receiverRole(receiverRole)
                .receiverEmail(receiverEmail)
                .patientId(patientId)
                .patientName(patientName)
                .patientCode(patientCode)
                .appointmentId(appointmentId)
                .appointmentCode(appointmentCode)
                .subject(message.getSubject())
                .content(message.getContent())
                .priority(message.getPriority())
                .status(message.getStatus())
                .sentAt(message.getSentAt())
                .readAt(message.getReadAt())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
