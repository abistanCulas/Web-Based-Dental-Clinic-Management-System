package com.dentaflow.backend.service;

import com.dentaflow.backend.ai.AllergyRiskAnalysisService;
import com.dentaflow.backend.entity.Dentist;
import com.dentaflow.backend.entity.DrugInteraction;
import com.dentaflow.backend.entity.Medicine;
import com.dentaflow.backend.entity.Patient;
import com.dentaflow.backend.entity.Prescription;
import com.dentaflow.backend.entity.PrescriptionItem;
import com.dentaflow.backend.entity.Treatment;
import com.dentaflow.backend.repository.DentistRepository;
import com.dentaflow.backend.repository.DrugInteractionRepository;
import com.dentaflow.backend.repository.MedicineRepository;
import com.dentaflow.backend.repository.PatientRepository;
import com.dentaflow.backend.repository.PrescriptionItemRepository;
import com.dentaflow.backend.repository.PrescriptionRepository;
import com.dentaflow.backend.repository.TreatmentRepository;

import com.dentaflow.backend.strategy.prescription.PrescriptionStrategyContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final PrescriptionItemRepository prescriptionItemRepository;
    private final PatientRepository patientRepository;
    private final DentistRepository dentistRepository;
    private final TreatmentRepository treatmentRepository;
    private final MedicineRepository medicineRepository;
    private final DrugInteractionRepository drugInteractionRepository;
    private final AllergyRiskAnalysisService allergyRiskAnalysisService;
    private final PrescriptionStrategyContext prescriptionStrategyContext;

    @Autowired
    public PrescriptionService(
            PrescriptionRepository prescriptionRepository,
            PrescriptionItemRepository prescriptionItemRepository,
            PatientRepository patientRepository,
            DentistRepository dentistRepository,
            TreatmentRepository treatmentRepository,
            MedicineRepository medicineRepository,
            DrugInteractionRepository drugInteractionRepository,
            AllergyRiskAnalysisService allergyRiskAnalysisService,
            PrescriptionStrategyContext prescriptionStrategyContext) {

        this.prescriptionRepository = prescriptionRepository;
        this.prescriptionItemRepository = prescriptionItemRepository;
        this.patientRepository = patientRepository;
        this.dentistRepository = dentistRepository;
        this.treatmentRepository = treatmentRepository;
        this.medicineRepository = medicineRepository;
        this.drugInteractionRepository = drugInteractionRepository;
        this.allergyRiskAnalysisService = allergyRiskAnalysisService;
        this.prescriptionStrategyContext = prescriptionStrategyContext;
    }

    public PrescriptionService(
            PrescriptionRepository prescriptionRepository,
            PrescriptionItemRepository prescriptionItemRepository,
            PatientRepository patientRepository,
            DentistRepository dentistRepository,
            TreatmentRepository treatmentRepository,
            MedicineRepository medicineRepository,
            DrugInteractionRepository drugInteractionRepository,
            AllergyRiskAnalysisService allergyRiskAnalysisService) {

        this(prescriptionRepository, prescriptionItemRepository, patientRepository, dentistRepository,
                treatmentRepository, medicineRepository, drugInteractionRepository, allergyRiskAnalysisService, null);
    }

    // =========================================================
    // CREATE PRESCRIPTION
    // =========================================================

    public Prescription createPrescription(
            Long patientId,
            Long dentistId,
            Long treatmentId,
            Prescription prescription) {

        if (patientId == null) {
            throw new RuntimeException("Patient ID is required");
        }

        if (dentistId == null) {
            throw new RuntimeException("Dentist ID is required");
        }

        if (prescription == null) {
            throw new RuntimeException("Prescription data is required");
        }

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Patient not found with id: " + patientId
                        ));

        Dentist dentist = dentistRepository.findById(dentistId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Dentist not found with id: " + dentistId
                        ));

        if ("INACTIVE".equalsIgnoreCase(patient.getStatus()) || "DEACTIVATED".equalsIgnoreCase(patient.getStatus())) {
            throw new RuntimeException("Cannot create prescription for an inactive or deactivated patient");
        }

        if (!"ACTIVE".equalsIgnoreCase(dentist.getStatus())) {
            throw new RuntimeException(
                    "Only active dentists can create prescriptions"
            );
        }

        Treatment treatment = null;

        if (treatmentId != null) {

            treatment = treatmentRepository.findById(treatmentId)
                    .orElseThrow(() ->
                            new RuntimeException(
                                    "Treatment not found with id: "
                                            + treatmentId
                            ));

            if (!treatment.getPatient()
                    .getId()
                    .equals(patientId)) {

                throw new RuntimeException(
                        "Treatment does not belong to this patient"
                );
            }

            if (!treatment.getDentist()
                    .getId()
                    .equals(dentistId)) {

                throw new RuntimeException(
                        "Treatment does not belong to this dentist"
                );
            }

            prescription.setTreatment(treatment);
        }

        prescription.setPatient(patient);
        prescription.setDentist(dentist);

        prescription.setPrescriptionCode(
                generatePrescriptionCode()
        );

        if (prescription.getPrescriptionDate() == null) {
            prescription.setPrescriptionDate(
                    LocalDate.now()
            );
        }

        if (prescription.getPrescriptionDate()
                .isAfter(LocalDate.now())) {

            throw new RuntimeException(
                    "Prescription date cannot be in the future"
            );
        }

        if (prescription.getStatus() == null ||
                prescription.getStatus().trim().isEmpty()) {

            prescription.setStatus("ACTIVE");

        } else {

            prescription.setStatus(
                    prescription.getStatus()
                            .trim()
                            .toUpperCase()
            );
        }

        return prescriptionRepository.save(prescription);
    }

    // =========================================================
    // GENERATE PRESCRIPTION CODE
    // =========================================================

    private String generatePrescriptionCode() {

        long nextNumber =
                prescriptionRepository.count() + 1;

        String code;

        do {

            code = String.format(
                    "RX%05d",
                    nextNumber
            );

            nextNumber++;

        } while (
                prescriptionRepository
                        .existsByPrescriptionCode(code)
        );

        return code;
    }

    // =========================================================
    // GET ALL PRESCRIPTIONS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Prescription> getAllPrescriptions() {

        return prescriptionRepository.findAll();
    }

    // =========================================================
    // GET PRESCRIPTION BY ID
    // =========================================================

    @Transactional(readOnly = true)
    public Prescription getPrescriptionById(Long id) {

        if (id == null) {
            throw new RuntimeException(
                    "Prescription ID is required"
            );
        }

        return prescriptionRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Prescription not found with id: "
                                        + id
                        ));
    }

    // =========================================================
    // GET BY PRESCRIPTION CODE
    // =========================================================

    @Transactional(readOnly = true)
    public Prescription getPrescriptionByCode(
            String prescriptionCode) {

        if (prescriptionCode == null ||
                prescriptionCode.trim().isEmpty()) {

            throw new RuntimeException(
                    "Prescription code is required"
            );
        }

        return prescriptionRepository
                .findByPrescriptionCode(
                        prescriptionCode
                                .trim()
                                .toUpperCase()
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "Prescription not found: "
                                        + prescriptionCode
                        ));
    }

    // =========================================================
    // GET PATIENT PRESCRIPTIONS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Prescription> getPatientPrescriptions(
            Long patientId) {

        if (patientId == null) {
            throw new RuntimeException(
                    "Patient ID is required"
            );
        }

        patientRepository.findById(patientId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Patient not found with id: "
                                        + patientId
                        ));

        return prescriptionRepository
                .findByPatientIdOrderByPrescriptionDateDesc(
                        patientId
                );
    }

    // =========================================================
    // GET DENTIST PRESCRIPTIONS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Prescription> getDentistPrescriptions(
            Long dentistId) {

        if (dentistId == null) {
            throw new RuntimeException(
                    "Dentist ID is required"
            );
        }

        dentistRepository.findById(dentistId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Dentist not found with id: "
                                        + dentistId
                        ));

        return prescriptionRepository
                .findByDentistIdOrderByPrescriptionDateDesc(
                        dentistId
                );
    }

    // =========================================================
    // ADD MEDICINE TO PRESCRIPTION
    // =========================================================

    public PrescriptionItem addMedicine(
            Long prescriptionId,
            Long medicineId,
            PrescriptionItem item) {

        return addMedicine(prescriptionId, medicineId, item, false);
    }

    public PrescriptionItem addMedicine(
            Long prescriptionId,
            Long medicineId,
            PrescriptionItem item,
            boolean acknowledgeAllergy) {

        return addMedicine(prescriptionId, medicineId, item, acknowledgeAllergy, false);
    }

    public PrescriptionItem addMedicine(
            Long prescriptionId,
            Long medicineId,
            PrescriptionItem item,
            boolean acknowledgeAllergy,
            boolean acknowledgeInteraction) {

        if (prescriptionId == null) {
            throw new RuntimeException(
                    "Prescription ID is required"
            );
        }

        if (medicineId == null) {
            throw new RuntimeException(
                    "Medicine ID is required"
            );
        }

        if (item == null) {
            throw new RuntimeException(
                    "Prescription item is required"
            );
        }

        Prescription prescription =
                getPrescriptionById(prescriptionId);

        Medicine medicine =
                medicineRepository.findById(medicineId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Medicine not found with id: "
                                                + medicineId
                                ));

        if (item.getDosage() == null || item.getDosage().trim().isEmpty()) {
            throw new RuntimeException("Dosage is required");
        }

        if (item.getFrequency() == null || item.getFrequency().trim().isEmpty()) {
            throw new RuntimeException("Frequency is required");
        }

        if (item.getDurationDays() == null || item.getDurationDays() <= 0) {
            throw new RuntimeException("Duration must be greater than zero");
        }

        if (item.getQuantity() == null || item.getQuantity() <= 0) {
            throw new RuntimeException("Quantity must be greater than zero");
        }

        if (!"ACTIVE".equalsIgnoreCase(medicine.getStatus())) {
            throw new RuntimeException("Cannot prescribe inactive medicine: " + medicine.getName());
        }

        if (medicine.getExpiryDate() != null && medicine.getExpiryDate().isBefore(LocalDate.now())) {
            throw new RuntimeException("Cannot prescribe expired medicine: " + medicine.getName());
        }

        if ("CANCELLED".equalsIgnoreCase(
                prescription.getStatus())) {

            throw new RuntimeException(
                    "Cannot add medicine to a cancelled prescription"
            );
        }

        if ("COMPLETED".equalsIgnoreCase(
                prescription.getStatus()) ||
                "DISPENSED".equalsIgnoreCase(
                        prescription.getStatus())) {

            throw new RuntimeException(
                    "Cannot add medicine to a completed or dispensed prescription"
            );
        }

        if (prescriptionItemRepository
                .existsByPrescriptionIdAndMedicineId(
                        prescriptionId,
                        medicineId
                )) {

            throw new RuntimeException(
                    "This medicine is already added to the prescription"
            );
        }

        // =====================================================
        // AI ALLERGY RISK CHECK
        // =====================================================

        AllergyRiskAnalysisService.AllergyRiskResult
                allergyResult =
                allergyRiskAnalysisService.analyzeRisk(
                        prescription.getPatient(),
                        medicine
                );

        if (allergyResult.isRiskDetected() && !acknowledgeAllergy) {

            throw new RuntimeException(
                    "ALLERGY WARNING: "
                            + allergyResult.getMessage()
                            + " | Medicine: "
                            + allergyResult.getMedicineName()
                            + " | Risk Level: "
                            + allergyResult.getRiskLevel()
            );
        }

        // =====================================================
        // CHECK DRUG INTERACTIONS
        // =====================================================

        checkDrugInteractions(
                prescription,
                medicine,
                acknowledgeInteraction
        );

        item.setPrescription(prescription);
        item.setMedicine(medicine);

        return prescriptionItemRepository.save(item);
    }

    // =========================================================
    // GET PRESCRIPTION ITEMS
    // =========================================================

    @Transactional(readOnly = true)
    public List<PrescriptionItem> getPrescriptionItems(
            Long prescriptionId) {

        if (prescriptionId == null) {
            throw new RuntimeException(
                    "Prescription ID is required"
            );
        }

        getPrescriptionById(prescriptionId);

        return prescriptionItemRepository
                .findByPrescriptionIdOrderByIdAsc(
                        prescriptionId
                );
    }

    // =========================================================
    // GET PRESCRIPTION ITEM BY ID
    // =========================================================

    @Transactional(readOnly = true)
    public PrescriptionItem getPrescriptionItemById(Long itemId) {

        if (itemId == null) {
            throw new RuntimeException(
                    "Prescription item ID is required"
            );
        }

        return prescriptionItemRepository.findById(itemId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Prescription item not found with id: " + itemId
                        ));
    }

    // =========================================================
    // REMOVE MEDICINE
    // =========================================================

    public void removeMedicine(Long itemId) {

        if (itemId == null) {
            throw new RuntimeException(
                    "Prescription item ID is required"
            );
        }

        PrescriptionItem item =
                prescriptionItemRepository.findById(itemId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Prescription item not found"
                                ));

        prescriptionItemRepository.delete(item);
    }

    // =========================================================
    // CHECK DRUG INTERACTIONS
    // =========================================================

    private void checkDrugInteractions(
            Prescription prescription,
            Medicine newMedicine,
            boolean acknowledgeInteraction) {

        List<PrescriptionItem> existingItems =
                prescriptionItemRepository
                        .findByPrescriptionId(
                                prescription.getId()
                        );

        if (existingItems == null ||
                existingItems.isEmpty()) {

            return;
        }

        for (PrescriptionItem existingItem :
                existingItems) {

            if (existingItem.getMedicine() == null) {
                continue;
            }

            Long existingMedicineId =
                    existingItem
                            .getMedicine()
                            .getId();

            Long newMedicineId =
                    newMedicine.getId();

            List<DrugInteraction> interactions =
                    drugInteractionRepository
                            .findByMedicineOneIdOrMedicineTwoId(
                                    existingMedicineId,
                                    existingMedicineId
                            );

            for (DrugInteraction interaction :
                    interactions) {

                if (interaction.getMedicineOne() == null ||
                        interaction.getMedicineTwo() == null) {

                    continue;
                }

                Long medicineOneId =
                        interaction
                                .getMedicineOne()
                                .getId();

                Long medicineTwoId =
                        interaction
                                .getMedicineTwo()
                                .getId();

                boolean matched =
                        (medicineOneId.equals(
                                existingMedicineId)
                                &&
                                medicineTwoId.equals(
                                        newMedicineId))
                                ||
                                (medicineOneId.equals(
                                        newMedicineId)
                                        &&
                                        medicineTwoId.equals(
                                                existingMedicineId));

                if (matched &&
                        "ACTIVE".equalsIgnoreCase(
                                interaction.getStatus())) {

                    String severity =
                            interaction.getSeverity();

                    if (!acknowledgeInteraction) {
                        throw new RuntimeException(
                                "DRUG INTERACTION WARNING: "
                                        + newMedicine.getName()
                                        + " may interact with "
                                        + existingItem
                                        .getMedicine()
                                        .getName()
                                        + ". Severity: "
                                        + severity
                        );
                    }
                }
            }
        }
    }

    // =========================================================
    // UPDATE PRESCRIPTION
    // =========================================================

    public Prescription updatePrescription(
            Long id,
            Prescription updatedPrescription) {

        Prescription existing =
                getPrescriptionById(id);

        if (updatedPrescription == null) {
            throw new RuntimeException(
                    "Prescription data is required"
            );
        }

        if (updatedPrescription.getDiagnosis() != null) {

            existing.setDiagnosis(
                    updatedPrescription
                            .getDiagnosis()
                            .trim()
            );
        }

        if (updatedPrescription.getDentistNotes() != null) {

            existing.setDentistNotes(
                    updatedPrescription
                            .getDentistNotes()
                            .trim()
            );
        }

        if (updatedPrescription.getInstructions() != null) {

            existing.setInstructions(
                    updatedPrescription
                            .getInstructions()
                            .trim()
            );
        }

        if (updatedPrescription.getPrescriptionDate() != null) {

            if (updatedPrescription
                    .getPrescriptionDate()
                    .isAfter(LocalDate.now())) {

                throw new RuntimeException(
                        "Prescription date cannot be in the future"
                );
            }

            existing.setPrescriptionDate(
                    updatedPrescription
                            .getPrescriptionDate()
            );
        }

        if (updatedPrescription.getStatus() != null) {
            String newStatus = updatedPrescription.getStatus().trim().toUpperCase();
            if (!newStatus.isEmpty() && !newStatus.equalsIgnoreCase(existing.getStatus()) && prescriptionStrategyContext != null) {
                Map<String, Object> ctx = new HashMap<>();
                if (updatedPrescription.getInstructions() != null) {
                    ctx.put("instructions", updatedPrescription.getInstructions());
                }
                return prescriptionStrategyContext.executeTransition(existing, newStatus, ctx);
            } else if (!newStatus.isEmpty()) {
                existing.setStatus(newStatus);
            }
        }

        return prescriptionRepository.save(existing);
    }

    // =========================================================
    // CANCEL PRESCRIPTION
    // =========================================================

    public Prescription cancelPrescription(
            Long id) {

        Prescription prescription =
                getPrescriptionById(id);

        if (prescriptionStrategyContext != null) {
            return prescriptionStrategyContext.executeTransition(
                    prescription,
                    "CANCELLED",
                    Collections.emptyMap()
            );
        }

        if ("COMPLETED".equalsIgnoreCase(
                prescription.getStatus())) {

            throw new RuntimeException(
                    "Completed prescription cannot be cancelled"
            );
        }

        prescription.setStatus("CANCELLED");

        return prescriptionRepository.save(
                prescription
        );
    }

    // =========================================================
    // COMPLETE / DISPENSE PRESCRIPTION
    // =========================================================

    public Prescription completePrescription(
            Long id) {

        Prescription prescription =
                getPrescriptionById(id);

        if (prescriptionStrategyContext != null) {
            return prescriptionStrategyContext.executeTransition(
                    prescription,
                    "DISPENSED",
                    Collections.emptyMap()
            );
        }

        if ("CANCELLED".equalsIgnoreCase(
                prescription.getStatus())) {

            throw new RuntimeException(
                    "Cannot dispense a cancelled prescription"
            );
        }

        if ("DISPENSED".equalsIgnoreCase(
                prescription.getStatus()) ||
                "COMPLETED".equalsIgnoreCase(
                        prescription.getStatus())) {

            throw new RuntimeException(
                    "Prescription is already dispensed / completed"
            );
        }

        List<PrescriptionItem> items =
                prescriptionItemRepository
                        .findByPrescriptionId(id);

        if (items != null && !items.isEmpty()) {
            for (PrescriptionItem item : items) {
                Medicine medicine = item.getMedicine();
                if (medicine == null) continue;

                if (!"ACTIVE".equalsIgnoreCase(medicine.getStatus())) {
                    throw new RuntimeException(
                            "Cannot dispense inactive medicine: " + medicine.getName()
                    );
                }

                if (medicine.getExpiryDate() != null && medicine.getExpiryDate().isBefore(LocalDate.now())) {
                    throw new RuntimeException(
                            "Cannot dispense expired medicine: " + medicine.getName() + " (Expired on " + medicine.getExpiryDate() + ")"
                    );
                }

                int currentStock = medicine.getStockQuantity() != null ? medicine.getStockQuantity() : 0;
                int reqQty = item.getQuantity() != null ? item.getQuantity() : 1;

                if (reqQty > currentStock) {
                    throw new RuntimeException(
                            "Cannot dispense prescription: Insufficient stock for medicine: " + medicine.getName()
                            + " (Available: " + currentStock + ", Required: " + reqQty + ")"
                    );
                }
            }

            for (PrescriptionItem item : items) {
                Medicine medicine = item.getMedicine();
                if (medicine == null) continue;

                int currentStock = medicine.getStockQuantity() != null ? medicine.getStockQuantity() : 0;
                int reqQty = item.getQuantity() != null ? item.getQuantity() : 1;
                medicine.setStockQuantity(currentStock - reqQty);
                medicineRepository.save(medicine);
            }
        }

        prescription.setStatus("DISPENSED");

        return prescriptionRepository.save(
                prescription
        );
    }

    public Prescription dispensePrescription(Long id) {
        return completePrescription(id);
    }

    // =========================================================
    // VERIFY PRESCRIPTION (PHARMACY VERIFICATION)
    // =========================================================

    public Prescription verifyPrescription(Long id) {
        Prescription prescription = getPrescriptionById(id);
        if (prescriptionStrategyContext != null) {
            return prescriptionStrategyContext.executeTransition(
                    prescription,
                    "VERIFIED",
                    Collections.emptyMap()
            );
        }
        if ("CANCELLED".equalsIgnoreCase(prescription.getStatus())) {
            throw new RuntimeException("Cannot verify a cancelled prescription");
        }
        if ("DISPENSED".equalsIgnoreCase(prescription.getStatus()) ||
                "COMPLETED".equalsIgnoreCase(prescription.getStatus())) {
            throw new RuntimeException("Prescription is already dispensed");
        }
        prescription.setStatus("VERIFIED");
        return prescriptionRepository.save(prescription);
    }

    // =========================================================
    // STRATEGY PATTERN LIFECYCLE DELEGATES
    // =========================================================

    public Prescription transitionPrescriptionStatus(
            Long id,
            String targetStatus,
            Map<String, Object> context) {

        Prescription prescription = getPrescriptionById(id);
        if (prescriptionStrategyContext != null) {
            return prescriptionStrategyContext.executeTransition(
                    prescription,
                    targetStatus,
                    context != null ? context : Collections.emptyMap()
            );
        }
        prescription.setStatus(targetStatus != null ? targetStatus.toUpperCase() : "ACTIVE");
        return prescriptionRepository.save(prescription);
    }

    @Transactional(readOnly = true)
    public List<String> getAvailableTransitions(Long id) {
        Prescription prescription = getPrescriptionById(id);
        if (prescriptionStrategyContext != null) {
            return prescriptionStrategyContext.getAvailableTransitions(prescription);
        }
        return Collections.emptyList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getRegisteredStrategiesMetadata() {
        if (prescriptionStrategyContext != null) {
            return prescriptionStrategyContext.getRegisteredStrategiesMetadata();
        }
        return Collections.emptyList();
    }

    // =========================================================
    // DELETE PRESCRIPTION
    // =========================================================

    public void deletePrescription(Long id) {

        Prescription prescription =
                getPrescriptionById(id);

        if ("DISPENSED".equalsIgnoreCase(prescription.getStatus()) ||
                "COMPLETED".equalsIgnoreCase(prescription.getStatus())) {

            throw new RuntimeException(
                    "Cannot delete a dispensed or completed prescription"
            );
        }

        prescriptionItemRepository
                .deleteByPrescriptionId(id);

        prescriptionRepository.delete(
                prescription
        );
    }
}