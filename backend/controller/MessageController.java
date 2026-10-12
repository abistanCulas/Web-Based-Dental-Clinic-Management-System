package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.MessageDTO;
import com.dentaflow.backend.dto.MessageRecipientDTO;
import com.dentaflow.backend.dto.SendMessageRequest;
import com.dentaflow.backend.dto.UpdateMessageRequest;
import com.dentaflow.backend.entity.Message;
import com.dentaflow.backend.mapper.MessageMapper;
import com.dentaflow.backend.security.AccessControlService;
import com.dentaflow.backend.service.MessageService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/messages")
@PreAuthorize("isAuthenticated()")
public class MessageController {

    private final MessageService messageService;
    private final MessageMapper messageMapper;
    private final AccessControlService accessControl;

    public MessageController(
            MessageService messageService,
            MessageMapper messageMapper,
            AccessControlService accessControl) {
        this.messageService = messageService;
        this.messageMapper = messageMapper;
        this.accessControl = accessControl;
    }

    // =========================================================
    // GET CURRENT USER'S INBOX / ALL MESSAGES
    //
    // GET /api/messages
    // =========================================================

    @GetMapping
    public ResponseEntity<?> getInbox() {
        Long currentUserId = accessControl.getCurrentUserId();
        if (currentUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        List<Message> messages = messageService.getMessagesForUser(currentUserId);
        List<MessageDTO> dtos = messages.stream()
                .map(messageMapper::toDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    // =========================================================
    // GET CONVERSATION WITH ANOTHER USER
    //
    // GET /api/messages/conversation/{otherUserId}
    // =========================================================

    @GetMapping("/conversation/{otherUserId}")
    public ResponseEntity<?> getConversation(@PathVariable Long otherUserId) {
        Long currentUserId = accessControl.getCurrentUserId();
        if (currentUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        List<Message> messages = messageService.getConversation(currentUserId, otherUserId);
        List<MessageDTO> dtos = messages.stream()
                .map(messageMapper::toDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    // =========================================================
    // GET MESSAGE BY ID
    //
    // GET /api/messages/{id}
    // =========================================================

    @GetMapping("/{id}")
    public ResponseEntity<?> getMessageById(@PathVariable Long id) {
        Long currentUserId = accessControl.getCurrentUserId();
        if (currentUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        try {
            Message message = messageService.getMessageById(id, currentUserId);
            return ResponseEntity.ok(messageMapper.toDTO(message));
        } catch (RuntimeException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Error";
            if (msg.contains("Access denied")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", msg));
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", msg));
        }
    }

    // =========================================================
    // SEND MESSAGE
    //
    // POST /api/messages
    // =========================================================

    @PostMapping
    public ResponseEntity<?> sendMessage(@RequestBody SendMessageRequest request) {
        Long currentUserId = accessControl.getCurrentUserId();
        if (currentUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        try {
            Message saved = messageService.sendMessage(currentUserId, request);
            return ResponseEntity.status(HttpStatus.CREATED).body(messageMapper.toDTO(saved));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // =========================================================
    // MARK MESSAGE AS READ
    //
    // PUT /api/messages/{id}/read
    // PATCH /api/messages/{id}/read
    // =========================================================

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsReadPut(@PathVariable Long id) {
        return handleMarkAsRead(id);
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<?> markAsReadPatch(@PathVariable Long id) {
        return handleMarkAsRead(id);
    }

    private ResponseEntity<?> handleMarkAsRead(Long id) {
        Long currentUserId = accessControl.getCurrentUserId();
        if (currentUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        try {
            Message updated = messageService.markAsRead(id, currentUserId);
            return ResponseEntity.ok(messageMapper.toDTO(updated));
        } catch (RuntimeException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Error";
            if (msg.contains("Access denied")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", msg));
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", msg));
        }
    }

    // =========================================================
    // MARK ENTIRE CONVERSATION AS READ
    //
    // PUT /api/messages/conversation/{otherUserId}/read
    // =========================================================

    @PutMapping("/conversation/{otherUserId}/read")
    public ResponseEntity<?> markConversationAsRead(@PathVariable Long otherUserId) {
        Long currentUserId = accessControl.getCurrentUserId();
        if (currentUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        messageService.markConversationAsRead(currentUserId, otherUserId);
        return ResponseEntity.ok(Map.of("message", "Conversation marked as read"));
    }

    // =========================================================
    // GET UNREAD COUNT
    //
    // GET /api/messages/unread-count
    // =========================================================

    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount() {
        Long currentUserId = accessControl.getCurrentUserId();
        if (currentUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        long count = messageService.getUnreadCount(currentUserId);
        return ResponseEntity.ok(Map.of("unreadCount", count));
    }

    // =========================================================
    // GET AVAILABLE RECIPIENTS
    //
    // GET /api/messages/recipients
    // =========================================================

    @GetMapping("/recipients")
    public ResponseEntity<?> getRecipients() {
        Long currentUserId = accessControl.getCurrentUserId();
        if (currentUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        List<MessageRecipientDTO> recipients = messageService.getAvailableRecipients(currentUserId);
        return ResponseEntity.ok(recipients);
    }

    // =========================================================
    // UPDATE MESSAGE
    //
    // PUT /api/messages/{id}
    // PATCH /api/messages/{id}
    // =========================================================

    @PutMapping("/{id}")
    public ResponseEntity<?> updateMessagePut(@PathVariable Long id, @RequestBody UpdateMessageRequest request) {
        return handleUpdateMessage(id, request);
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> updateMessagePatch(@PathVariable Long id, @RequestBody UpdateMessageRequest request) {
        return handleUpdateMessage(id, request);
    }

    private ResponseEntity<?> handleUpdateMessage(Long id, UpdateMessageRequest request) {
        Long currentUserId = accessControl.getCurrentUserId();
        if (currentUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        try {
            Message updated = messageService.updateMessage(id, currentUserId, request);
            return ResponseEntity.ok(messageMapper.toDTO(updated));
        } catch (RuntimeException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Error";
            if (msg.contains("Access denied")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", msg));
            }
            if (msg.contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", msg));
            }
            return ResponseEntity.badRequest().body(Map.of("error", msg));
        }
    }

    // =========================================================
    // DELETE MESSAGE
    //
    // DELETE /api/messages/{id}
    // =========================================================

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMessage(@PathVariable Long id) {
        Long currentUserId = accessControl.getCurrentUserId();
        if (currentUserId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Authentication required"));
        }

        try {
            messageService.deleteMessage(id, currentUserId);
            return ResponseEntity.ok(Map.of("message", "Message deleted successfully"));
        } catch (RuntimeException e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Error";
            if (msg.contains("Access denied")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", msg));
            }
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", msg));
        }
    }
}
