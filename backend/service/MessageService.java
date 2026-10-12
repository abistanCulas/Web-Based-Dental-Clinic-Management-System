package com.dentaflow.backend.service;

import com.dentaflow.backend.dto.MessageRecipientDTO;
import com.dentaflow.backend.dto.SendMessageRequest;
import com.dentaflow.backend.dto.UpdateMessageRequest;
import com.dentaflow.backend.entity.*;
import com.dentaflow.backend.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
@Transactional
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final PatientRepository patientRepository;
    private final AppointmentRepository appointmentRepository;
    private final StaffRepository staffRepository;
    private final DentistRepository dentistRepository;
    private final NotificationService notificationService;

    public MessageService(
            MessageRepository messageRepository,
            UserRepository userRepository,
            PatientRepository patientRepository,
            AppointmentRepository appointmentRepository,
            StaffRepository staffRepository,
            DentistRepository dentistRepository,
            NotificationService notificationService) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.patientRepository = patientRepository;
        this.appointmentRepository = appointmentRepository;
        this.staffRepository = staffRepository;
        this.dentistRepository = dentistRepository;
        this.notificationService = notificationService;
    }

    // =========================================================
    // SEND MESSAGE
    // =========================================================

    public Message sendMessage(Long senderUserId, SendMessageRequest request) {
        if (senderUserId == null) {
            throw new RuntimeException("Sender authentication required");
        }

        if (request == null) {
            throw new RuntimeException("Message request data is required");
        }

        if (request.getReceiverId() == null) {
            throw new RuntimeException("Recipient is required");
        }

        if (request.getContent() == null || request.getContent().trim().isEmpty()) {
            throw new RuntimeException("Message content cannot be empty");
        }

        User sender = userRepository.findById(senderUserId)
                .orElseThrow(() -> new RuntimeException("Sender user not found: " + senderUserId));

        User receiver = userRepository.findById(request.getReceiverId())
                .orElseThrow(() -> new RuntimeException("Recipient user not found: " + request.getReceiverId()));

        String senderRole = resolveEffectiveRole(sender);
        String receiverRole = resolveEffectiveRole(receiver);

        if (!isCommunicationAllowed(senderRole, receiverRole)) {
            throw new RuntimeException("Access denied: " + senderRole + " is not authorized to message " + receiverRole);
        }

        String priority = "NORMAL";
        if (request.getPriority() != null) {
            String p = request.getPriority().trim().toUpperCase();
            if (p.equals("URGENT") || p.equals("IMPORTANT") || p.equals("NORMAL")) {
                priority = p;
            }
        }

        String subject = request.getSubject() != null && !request.getSubject().trim().isEmpty()
                ? request.getSubject().trim()
                : "Clinical Message";

        Patient patient = null;
        if ("PATIENT".equalsIgnoreCase(senderRole) || patientRepository.findByUserId(senderUserId).isPresent()) {
            // Enforce ownership: patient must always use their own profile
            patient = patientRepository.findByUserId(senderUserId).orElse(null);
        } else if (request.getPatientId() != null) {
            patient = patientRepository.findById(request.getPatientId()).orElse(null);
        }

        Appointment appointment = null;
        if (request.getAppointmentId() != null) {
            Appointment apt = appointmentRepository.findById(request.getAppointmentId()).orElse(null);
            if (apt != null) {
                if ("PATIENT".equalsIgnoreCase(senderRole) && patient != null) {
                    if (apt.getPatient() != null && Objects.equals(apt.getPatient().getId(), patient.getId())) {
                        appointment = apt;
                    }
                } else {
                    appointment = apt;
                }
            }
        }

        Message message = new Message();
        message.setSender(sender);
        message.setReceiver(receiver);
        message.setSubject(subject);
        message.setContent(request.getContent().trim());
        message.setPriority(priority);
        message.setStatus("SENT");
        message.setSentAt(LocalDateTime.now());
        message.setPatient(patient);
        message.setAppointment(appointment);

        Message saved = messageRepository.save(message);

        // Trigger notification for the recipient
        try {
            if (notificationService != null && !Objects.equals(sender.getId(), receiver.getId())) {
                String senderName = (sender.getFirstName() + " " + sender.getLastName()).trim();
                String prefix = priority.equals("URGENT") ? "[URGENT] " : (priority.equals("IMPORTANT") ? "[IMPORTANT] " : "");
                String title = prefix + "New message from " + senderName;
                String preview = saved.getContent();
                if (preview.length() > 100) {
                    preview = preview.substring(0, 97) + "...";
                }

                Notification notification = new Notification();
                notification.setTitle(title);
                notification.setMessage(preview);
                notification.setType("MESSAGE");
                notification.setStatus("UNREAD");
                notification.setReferenceType("MESSAGE");
                notification.setReferenceId(saved.getId());
                notificationService.createNotification(notification, receiver.getId());
            }
        } catch (Exception e) {
            System.err.println("Failed to create message notification: " + e.getMessage());
        }

        return saved;
    }

    // =========================================================
    // GET USER MESSAGES
    // =========================================================

    @Transactional(readOnly = true)
    public List<Message> getMessagesForUser(Long userId) {
        if (userId == null) {
            return List.of();
        }
        return messageRepository.findAllUserMessagesOrderBySentAtDesc(userId);
    }

    // =========================================================
    // GET CONVERSATION BETWEEN USERS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Message> getConversation(Long currentUserId, Long otherUserId) {
        if (currentUserId == null || otherUserId == null) {
            return List.of();
        }
        return messageRepository.findConversationBetweenUsers(currentUserId, otherUserId);
    }

    // =========================================================
    // GET MESSAGE BY ID
    // =========================================================

    @Transactional(readOnly = true)
    public Message getMessageById(Long messageId, Long currentUserId) {
        if (messageId == null) {
            throw new RuntimeException("Message ID is required");
        }

        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found with id: " + messageId));

        boolean isSender = message.getSender() != null && Objects.equals(message.getSender().getId(), currentUserId);
        boolean isReceiver = message.getReceiver() != null && Objects.equals(message.getReceiver().getId(), currentUserId);
        if (!isSender && !isReceiver) {
            throw new RuntimeException("Access denied: You are not authorized to view this message");
        }

        return message;
    }

    @Transactional(readOnly = true)
    public Message getMessageById(Long messageId, Long currentUserId, boolean isAdmin) {
        return getMessageById(messageId, currentUserId);
    }

    // =========================================================
    // MARK MESSAGE AS READ
    // =========================================================

    public Message markAsRead(Long messageId, Long currentUserId) {
        if (messageId == null) {
            throw new RuntimeException("Message ID is required");
        }

        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found with id: " + messageId));

        if (!Objects.equals(message.getReceiver().getId(), currentUserId)) {
            throw new RuntimeException("Access denied: Only the recipient can mark a message as read");
        }

        if (!"READ".equalsIgnoreCase(message.getStatus())) {
            message.setStatus("READ");
            message.setReadAt(LocalDateTime.now());
            return messageRepository.save(message);
        }

        return message;
    }

    // =========================================================
    // MARK CONVERSATION AS READ
    // =========================================================

    public void markConversationAsRead(Long currentUserId, Long otherUserId) {
        if (currentUserId == null || otherUserId == null) {
            return;
        }

        List<Message> unread = messageRepository.findUnreadInConversation(otherUserId, currentUserId);
        LocalDateTime now = LocalDateTime.now();
        for (Message m : unread) {
            m.setStatus("READ");
            m.setReadAt(now);
        }
        if (!unread.isEmpty()) {
            messageRepository.saveAll(unread);
        }
    }

    // =========================================================
    // GET UNREAD COUNT
    // =========================================================

    @Transactional(readOnly = true)
    public long getUnreadCount(Long currentUserId) {
        if (currentUserId == null) {
            return 0;
        }
        return messageRepository.countByReceiverIdAndStatusIgnoreCase(currentUserId, "SENT");
    }

    // =========================================================
    // GET AVAILABLE RECIPIENTS
    // =========================================================

    @Transactional(readOnly = true)
    public List<MessageRecipientDTO> getAvailableRecipients(Long currentUserId) {
        User currentUser = currentUserId != null ? userRepository.findById(currentUserId).orElse(null) : null;
        String currentRole = resolveEffectiveRole(currentUser);

        List<User> users = userRepository.findAll();
        List<MessageRecipientDTO> recipients = new ArrayList<>();

        for (User u : users) {
            if (currentUserId != null && Objects.equals(u.getId(), currentUserId)) {
                continue;
            }
            if (!"ACTIVE".equalsIgnoreCase(u.getStatus())) {
                continue;
            }

            String targetRole = resolveEffectiveRole(u);
            if (!isCommunicationAllowed(currentRole, targetRole)) {
                continue;
            }

            String fullName = (u.getFirstName() + " " + u.getLastName()).trim();
            String roleName = u.getRole() != null ? u.getRole().getName() : "USER";

            // If staff member, get their specific staff role if available
            Optional<Staff> staff = staffRepository.findByUserId(u.getId());
            if (staff.isPresent() && staff.get().getRole() != null) {
                roleName = staff.get().getRole();
            }

            // If dentist, prepend Dr. if not already present
            if (dentistRepository.findByUserId(u.getId()).isPresent() && !fullName.startsWith("Dr.")) {
                fullName = "Dr. " + fullName;
            }

            recipients.add(MessageRecipientDTO.builder()
                    .userId(u.getId())
                    .name(fullName)
                    .role(roleName)
                    .email(u.getEmail())
                    .phone(u.getPhone())
                    .avatar(u.getProfileImage())
                    .build());
        }

        return recipients;
    }

    public String resolveEffectiveRole(User user) {
        if (user == null) return "USER";
        Optional<Staff> staff = staffRepository.findByUserId(user.getId());
        if (staff.isPresent() && staff.get().getRole() != null) {
            return staff.get().getRole().trim().toUpperCase();
        }
        if (user.getRole() != null && user.getRole().getName() != null) {
            return user.getRole().getName().trim().toUpperCase();
        }
        return "USER";
    }

    public boolean isCommunicationAllowed(String senderRole, String receiverRole) {
        String s = senderRole != null ? senderRole.toUpperCase() : "USER";
        String r = receiverRole != null ? receiverRole.toUpperCase() : "USER";

        if (s.equals("ADMIN")) {
            return true; // Admin can message anyone
        }
        if (s.equals("PATIENT")) {
            // Patient can only message staff, doctors, receptionists, admin (cannot message other patients)
            return !r.equals("PATIENT");
        }
        if (s.equals("CASHIER")) {
            // Cashier can message admin, doctors, receptionists, other staff, and patients
            return true;
        }
        if (s.equals("DOCTOR") || s.equals("DENTIST")) {
            // Doctors can message anyone in clinic and patients
            return true;
        }
        // Receptionist, Pharmacist, Staff can message anyone in clinic and patients
        return true;
    }

    // =========================================================
    // =========================================================
    // UPDATE MESSAGE (ONLY ORIGINAL SENDER CAN UPDATE)
    // =========================================================

    public Message updateMessage(Long messageId, Long currentUserId, UpdateMessageRequest request) {
        if (messageId == null) {
            throw new RuntimeException("Message ID is required");
        }
        if (request == null) {
            throw new RuntimeException("Update request cannot be null");
        }

        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found with id: " + messageId));

        boolean isSender = message.getSender() != null && Objects.equals(message.getSender().getId(), currentUserId);
        if (!isSender) {
            throw new RuntimeException("Access denied: Only the original sender can update this message");
        }

        if (request.getContent() != null && !request.getContent().trim().isEmpty()) {
            message.setContent(request.getContent().trim());
        }
        if (request.getSubject() != null && !request.getSubject().trim().isEmpty()) {
            message.setSubject(request.getSubject().trim());
        }
        if (request.getPriority() != null && !request.getPriority().trim().isEmpty()) {
            message.setPriority(request.getPriority().toUpperCase().trim());
        }

        User sender = message.getSender();
        String senderRole = resolveEffectiveRole(sender);

        if ("PATIENT".equals(senderRole)) {
            Patient senderPatient = patientRepository.findByUserId(currentUserId).orElse(null);
            message.setPatient(senderPatient);
            if (request.getAppointmentId() != null) {
                Appointment appt = appointmentRepository.findById(request.getAppointmentId()).orElse(null);
                if (appt != null && senderPatient != null && appt.getPatient() != null &&
                        Objects.equals(appt.getPatient().getId(), senderPatient.getId())) {
                    message.setAppointment(appt);
                }
            }
        } else {
            if (request.getPatientId() != null) {
                Patient pat = patientRepository.findById(request.getPatientId()).orElse(null);
                message.setPatient(pat);
            }
            if (request.getAppointmentId() != null) {
                Appointment appt = appointmentRepository.findById(request.getAppointmentId()).orElse(null);
                message.setAppointment(appt);
            }
        }

        return messageRepository.save(message);
    }

    // =========================================================
    // DELETE MESSAGE (ONLY ORIGINAL SENDER CAN DELETE)
    // =========================================================

    public void deleteMessage(Long messageId, Long currentUserId) {
        if (messageId == null) {
            throw new RuntimeException("Message ID is required");
        }

        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found with id: " + messageId));

        boolean isSender = message.getSender() != null && Objects.equals(message.getSender().getId(), currentUserId);
        if (!isSender) {
            throw new RuntimeException("Access denied: Only the original sender can delete this message");
        }

        messageRepository.delete(message);
    }

    public void deleteMessage(Long messageId, Long currentUserId, boolean isAdmin) {
        deleteMessage(messageId, currentUserId);
    }
}
