package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.GlobalSearchResponseDTO;
import com.dentaflow.backend.service.GlobalSearchService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/search")
public class GlobalSearchController {

    private final GlobalSearchService globalSearchService;

    public GlobalSearchController(GlobalSearchService globalSearchService) {
        this.globalSearchService = globalSearchService;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<GlobalSearchResponseDTO> search(
            @RequestParam(value = "q", required = false) String query) {
        GlobalSearchResponseDTO response = globalSearchService.search(query);
        return ResponseEntity.ok(response);
    }
}
