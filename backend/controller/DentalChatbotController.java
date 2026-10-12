package com.dentaflow.backend.controller;

import com.dentaflow.backend.ai.DentalChatbotService;
import com.dentaflow.backend.ai.DentalChatbotService.ChatbotResponse;
import com.dentaflow.backend.security.AccessControlService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/ai/chatbot")
@PreAuthorize("isAuthenticated()")
public class DentalChatbotController {

    private final DentalChatbotService chatbotService;
    private final AccessControlService accessControl;

    @Autowired
    public DentalChatbotController(
            DentalChatbotService chatbotService,
            AccessControlService accessControl) {

        this.chatbotService = chatbotService;
        this.accessControl = accessControl;
    }

    public DentalChatbotController(
            DentalChatbotService chatbotService) {
        this(chatbotService, null);
    }

    private boolean isUnauthenticated() {
        return accessControl != null && accessControl.getCurrentUserId() == null && !accessControl.isAdmin();
    }

    // =========================================================
    // CHAT WITH AI ASSISTANT
    // =========================================================

    @PostMapping
    public ResponseEntity<?> chat(
            @RequestBody ChatRequest request) {

        if (isUnauthenticated()) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Unauthorized"));
        }

        try {

            if (request == null ||
                    request.getMessage() == null ||
                    request.getMessage().trim().isEmpty()) {

                return ResponseEntity
                        .badRequest()
                        .body("Message is required");
            }

            ChatbotResponse response =
                    chatbotService.chat(
                            request.getMessage()
                    );

            return ResponseEntity.ok(response);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // REQUEST MODEL
    // =========================================================

    public static class ChatRequest {

        private String message;

        public ChatRequest() {
        }

        public String getMessage() {
            return message;
        }

        public void setMessage(String message) {
            this.message = message;
        }
    }
}