package com.dentaflow.reports.controller;

import com.dentaflow.reports.dto.request.FeedbackRequest;
import com.dentaflow.reports.dto.request.FeedbackResponseRequest;
import com.dentaflow.reports.entity.Feedback;
import com.dentaflow.reports.enums.FeedbackStatus;
import com.dentaflow.reports.service.FeedbackService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;

    // GET /api/feedback?status=SUBMITTED
    @GetMapping
    public ResponseEntity<List<Feedback>> getAll(@RequestParam(required = false) FeedbackStatus status) {
        return ResponseEntity.ok(feedbackService.getAll(status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Feedback> getById(@PathVariable Long id) {
        return ResponseEntity.ok(feedbackService.getById(id));
    }

    // Patient submits feedback.
    @PostMapping
    public ResponseEntity<Feedback> submit(@Valid @RequestBody FeedbackRequest request) {
        Feedback created = feedbackService.submit(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // Staff reviews feedback and records a response / status update.
    @PutMapping("/{id}/respond")
    public ResponseEntity<Feedback> respond(@PathVariable Long id,
                                             @Valid @RequestBody FeedbackResponseRequest request) {
        return ResponseEntity.ok(feedbackService.respond(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        feedbackService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
