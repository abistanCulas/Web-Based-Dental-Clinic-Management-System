package com.dentaflow.backend.service;

import com.dentaflow.backend.entity.DrugInteraction;
import com.dentaflow.backend.entity.Medicine;
import com.dentaflow.backend.repository.DrugInteractionRepository;
import com.dentaflow.backend.repository.MedicineRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class DrugInteractionService {

    private final DrugInteractionRepository drugInteractionRepository;
    private final MedicineRepository medicineRepository;

    public DrugInteractionService(
            DrugInteractionRepository drugInteractionRepository,
            MedicineRepository medicineRepository) {

        this.drugInteractionRepository = drugInteractionRepository;
        this.medicineRepository = medicineRepository;
    }

    // =========================================================
    // CREATE DRUG INTERACTION
    // =========================================================

    public DrugInteraction createInteraction(
            Long medicineOneId,
            Long medicineTwoId,
            DrugInteraction interaction) {

        if (interaction == null) {
            throw new RuntimeException(
                    "Drug interaction data is required"
            );
        }

        if (medicineOneId == null ||
                medicineTwoId == null) {

            throw new RuntimeException(
                    "Both medicine IDs are required"
            );
        }

        if (medicineOneId.equals(medicineTwoId)) {
            throw new RuntimeException(
                    "A medicine cannot interact with itself"
            );
        }

        Medicine medicineOne =
                medicineRepository.findById(medicineOneId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "First medicine not found: "
                                                + medicineOneId
                                ));

        Medicine medicineTwo =
                medicineRepository.findById(medicineTwoId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Second medicine not found: "
                                                + medicineTwoId
                                ));

        // Check whether interaction already exists
        if (interactionExists(
                medicineOneId,
                medicineTwoId)) {

            throw new RuntimeException(
                    "Drug interaction already exists"
            );
        }

        if (interaction.getSeverity() == null ||
                interaction.getSeverity()
                        .trim()
                        .isEmpty()) {

            throw new RuntimeException(
                    "Interaction severity is required"
            );
        }

        interaction.setMedicineOne(medicineOne);
        interaction.setMedicineTwo(medicineTwo);

        interaction.setSeverity(
                interaction.getSeverity()
                        .trim()
                        .toUpperCase()
        );

        if (interaction.getStatus() == null ||
                interaction.getStatus()
                        .trim()
                        .isEmpty()) {

            interaction.setStatus("ACTIVE");
        }

        return drugInteractionRepository.save(
                interaction
        );
    }

    // =========================================================
    // GET ALL INTERACTIONS
    // =========================================================

    @Transactional(readOnly = true)
    public List<DrugInteraction> getAllInteractions() {

        return drugInteractionRepository.findAll();
    }

    // =========================================================
    // GET INTERACTION BY ID
    // =========================================================

    @Transactional(readOnly = true)
    public DrugInteraction getInteractionById(Long id) {

        return drugInteractionRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Drug interaction not found with id: "
                                        + id
                        ));
    }

    // =========================================================
    // GET INTERACTIONS FOR MEDICINE
    // =========================================================

    @Transactional(readOnly = true)
    public List<DrugInteraction> getMedicineInteractions(
            Long medicineId) {

        medicineRepository.findById(medicineId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Medicine not found with id: "
                                        + medicineId
                        ));

        return drugInteractionRepository
                .findByMedicineOneIdOrMedicineTwoId(
                        medicineId,
                        medicineId
                );
    }

    // =========================================================
    // CHECK TWO MEDICINES
    // =========================================================

    @Transactional(readOnly = true)
    public List<DrugInteraction> checkInteraction(
            Long medicineOneId,
            Long medicineTwoId) {

        if (medicineOneId == null ||
                medicineTwoId == null) {

            throw new RuntimeException(
                    "Both medicine IDs are required"
            );
        }

        if (medicineOneId.equals(medicineTwoId)) {
            return List.of();
        }

        medicineRepository.findById(medicineOneId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "First medicine not found"
                        ));

        medicineRepository.findById(medicineTwoId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Second medicine not found"
                        ));

        List<DrugInteraction> firstDirection =
                drugInteractionRepository
                        .findByMedicineOneIdAndMedicineTwoId(
                                medicineOneId,
                                medicineTwoId
                        );

        List<DrugInteraction> secondDirection =
                drugInteractionRepository
                        .findByMedicineOneIdAndMedicineTwoId(
                                medicineTwoId,
                                medicineOneId
                        );

        List<DrugInteraction> result =
                new java.util.ArrayList<>();

        result.addAll(firstDirection);
        result.addAll(secondDirection);

        return result;
    }

    // =========================================================
    // CHECK INTERACTIONS FOR A LIST OF MEDICINES
    // =========================================================

    @Transactional(readOnly = true)
    public List<DrugInteraction> checkInteractionsForList(List<Long> medicineIds) {
        if (medicineIds == null || medicineIds.size() < 2) {
            return java.util.Collections.emptyList();
        }

        List<DrugInteraction> results = new java.util.ArrayList<>();
        java.util.Set<Long> seenIds = new java.util.HashSet<>();

        for (int i = 0; i < medicineIds.size(); i++) {
            Long id1 = medicineIds.get(i);
            if (id1 == null) continue;
            for (int j = i + 1; j < medicineIds.size(); j++) {
                Long id2 = medicineIds.get(j);
                if (id2 == null || id1.equals(id2)) continue;

                try {
                    List<DrugInteraction> pairInteractions = checkInteraction(id1, id2);
                    for (DrugInteraction di : pairInteractions) {
                        if ("ACTIVE".equalsIgnoreCase(di.getStatus()) && seenIds.add(di.getId())) {
                            results.add(di);
                        }
                    }
                } catch (Exception e) {
                    // Ignore missing medicine or invalid pair in batch check
                }
            }
        }

        return results;
    }

    // =========================================================
    // CHECK WHETHER INTERACTION EXISTS
    // =========================================================

    @Transactional(readOnly = true)
    public boolean interactionExists(
            Long medicineOneId,
            Long medicineTwoId) {

        if (medicineOneId.equals(medicineTwoId)) {
            return false;
        }

        List<DrugInteraction> interactions =
                checkInteraction(
                        medicineOneId,
                        medicineTwoId
                );

        return interactions.stream()
                .anyMatch(interaction ->
                        "ACTIVE".equalsIgnoreCase(
                                interaction.getStatus()
                        ));
    }

    // =========================================================
    // GET BY SEVERITY
    // =========================================================

    @Transactional(readOnly = true)
    public List<DrugInteraction> getBySeverity(
            String severity) {

        if (severity == null ||
                severity.trim().isEmpty()) {

            throw new RuntimeException(
                    "Severity is required"
            );
        }

        return drugInteractionRepository
                .findBySeverityIgnoreCase(
                        severity.trim()
                );
    }

    // =========================================================
    // GET ACTIVE INTERACTIONS
    // =========================================================

    @Transactional(readOnly = true)
    public List<DrugInteraction> getActiveInteractions() {

        return drugInteractionRepository
                .findByStatusIgnoreCase("ACTIVE");
    }

    // =========================================================
    // UPDATE INTERACTION
    // =========================================================

    public DrugInteraction updateInteraction(
            Long id,
            DrugInteraction updatedInteraction) {

        DrugInteraction existing =
                getInteractionById(id);

        if (updatedInteraction == null) {
            throw new RuntimeException(
                    "Drug interaction data is required"
            );
        }

        if (updatedInteraction.getSeverity() != null &&
                !updatedInteraction.getSeverity()
                        .trim()
                        .isEmpty()) {

            existing.setSeverity(
                    updatedInteraction
                            .getSeverity()
                            .trim()
                            .toUpperCase()
            );
        }

        if (updatedInteraction.getDescription() != null) {

            existing.setDescription(
                    updatedInteraction
                            .getDescription()
                            .trim()
            );
        }

        if (updatedInteraction.getRecommendation() != null) {

            existing.setRecommendation(
                    updatedInteraction
                            .getRecommendation()
                            .trim()
            );
        }

        if (updatedInteraction.getStatus() != null) {

            existing.setStatus(
                    updatedInteraction
                            .getStatus()
                            .trim()
                            .toUpperCase()
            );
        }

        return drugInteractionRepository.save(
                existing
        );
    }

    // =========================================================
    // ACTIVATE INTERACTION
    // =========================================================

    public DrugInteraction activateInteraction(Long id) {

        DrugInteraction interaction =
                getInteractionById(id);

        interaction.setStatus("ACTIVE");

        return drugInteractionRepository.save(
                interaction
        );
    }

    // =========================================================
    // DEACTIVATE INTERACTION
    // =========================================================

    public DrugInteraction deactivateInteraction(Long id) {

        DrugInteraction interaction =
                getInteractionById(id);

        interaction.setStatus("INACTIVE");

        return drugInteractionRepository.save(
                interaction
        );
    }

    // =========================================================
    // DELETE INTERACTION
    // =========================================================

    public void deleteInteraction(Long id) {

        DrugInteraction interaction =
                getInteractionById(id);

        drugInteractionRepository.delete(
                interaction
        );
    }
}