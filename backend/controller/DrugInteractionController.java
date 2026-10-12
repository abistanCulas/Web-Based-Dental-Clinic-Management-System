package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.DrugInteractionDTO;
import com.dentaflow.backend.entity.DrugInteraction;
import com.dentaflow.backend.service.DrugInteractionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/drug-interactions")
@PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST', 'DENTIST', 'DOCTOR', 'STAFF')")
public class DrugInteractionController {

    private final DrugInteractionService drugInteractionService;

    @Autowired
    public DrugInteractionController(DrugInteractionService drugInteractionService) {
        this.drugInteractionService = drugInteractionService;
    }

    private DrugInteractionDTO toDTO(DrugInteraction interaction) {
        if (interaction == null) return null;
        return DrugInteractionDTO.builder()
                .id(interaction.getId())
                .medicineOneId(interaction.getMedicineOne() != null ? interaction.getMedicineOne().getId() : null)
                .medicineOneName(interaction.getMedicineOne() != null ? interaction.getMedicineOne().getName() : "")
                .medicineTwoId(interaction.getMedicineTwo() != null ? interaction.getMedicineTwo().getId() : null)
                .medicineTwoName(interaction.getMedicineTwo() != null ? interaction.getMedicineTwo().getName() : "")
                .severity(interaction.getSeverity())
                .description(interaction.getDescription())
                .recommendation(interaction.getRecommendation())
                .status(interaction.getStatus())
                .build();
    }

    @GetMapping
    public ResponseEntity<List<DrugInteractionDTO>> getAllInteractions() {
        List<DrugInteractionDTO> dtos = drugInteractionService.getAllInteractions().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'PHARMACIST')")
    public ResponseEntity<DrugInteractionDTO> createInteraction(@RequestBody DrugInteractionDTO dto) {
        DrugInteraction entity = new DrugInteraction();
        entity.setSeverity(dto.getSeverity());
        entity.setDescription(dto.getDescription());
        entity.setRecommendation(dto.getRecommendation());
        entity.setStatus(dto.getStatus() != null ? dto.getStatus() : "ACTIVE");

        DrugInteraction created = drugInteractionService.createInteraction(
                dto.getMedicineOneId(),
                dto.getMedicineTwoId(),
                entity
        );
        return ResponseEntity.ok(toDTO(created));
    }

    @GetMapping("/medicine/{medicineId}")
    public ResponseEntity<List<DrugInteractionDTO>> getMedicineInteractions(@PathVariable Long medicineId) {
        List<DrugInteractionDTO> dtos = drugInteractionService.getMedicineInteractions(medicineId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/check")
    public ResponseEntity<List<DrugInteractionDTO>> checkInteractions(@RequestBody Object requestBody) {
        List<Long> medicineIds = new java.util.ArrayList<>();

        if (requestBody instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof Number number) {
                    medicineIds.add(number.longValue());
                } else if (item instanceof String str) {
                    try {
                        medicineIds.add(Long.parseLong(str.trim()));
                    } catch (NumberFormatException ignored) {}
                }
            }
        } else if (requestBody instanceof Map<?, ?> map) {
            Object idsObj = map.get("medicineIds");
            if (idsObj instanceof List<?> list) {
                for (Object item : list) {
                    if (item instanceof Number number) {
                        medicineIds.add(number.longValue());
                    } else if (item instanceof String str) {
                        try {
                            medicineIds.add(Long.parseLong(str.trim()));
                        } catch (NumberFormatException ignored) {}
                    }
                }
            }
        }

        if (medicineIds.size() < 2) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        List<DrugInteractionDTO> dtos = drugInteractionService.checkInteractionsForList(medicineIds).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }
}
