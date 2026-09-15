package com.dentaflow.reports.controller;

import com.dentaflow.reports.dto.request.InquiryRequest;
import com.dentaflow.reports.dto.request.InquiryResponseRequest;
import com.dentaflow.reports.entity.Inquiry;
import com.dentaflow.reports.enums.InquiryStatus;
import com.dentaflow.reports.service.InquiryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inquiries")
@RequiredArgsConstructor
public class InquiryController {

    private final InquiryService inquiryService;

    // GET /api/inquiries?status=PENDING
    @GetMapping
    public ResponseEntity<List<Inquiry>> getAll(@RequestParam(required = false) InquiryStatus status) {
        return ResponseEntity.ok(inquiryService.getAll(status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Inquiry> getById(@PathVariable Long id) {
        return ResponseEntity.ok(inquiryService.getById(id));
    }

    // Patient submits an inquiry.
    @PostMapping
    public ResponseEntity<Inquiry> submit(@Valid @RequestBody InquiryRequest request) {
        Inquiry created = inquiryService.submit(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // Staff reviews the inquiry and records a response / status update.
    @PutMapping("/{id}/respond")
    public ResponseEntity<Inquiry> respond(@PathVariable Long id,
                                            @Valid @RequestBody InquiryResponseRequest request) {
        return ResponseEntity.ok(inquiryService.respond(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        inquiryService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
