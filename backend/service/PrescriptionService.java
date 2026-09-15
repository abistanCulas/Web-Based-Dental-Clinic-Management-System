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

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

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

    public PrescriptionService(
            PrescriptionRepository prescriptionRepository,
            PrescriptionItemRepository prescriptionItemRepository,
            PatientRepository patientRepository,
            DentistRepository dentistRepository,
            TreatmentRepository treatmentRepository,
            MedicineRepository medicineRepository,
            DrugInteractionRepository drugInteractionRepository,
            AllergyRiskAnalysisService allergyRiskAnalysisService) {

        this.prescriptionRepository = prescriptionRepository;
        this.prescriptionItemRepository = prescriptionItemRepository;
        this.patientRepository = patientRepository;
        this.dentistRepository = dentistRepository;
        this.treatmentRepository = treatmentRepository;
        this.medicineRepository = medicineRepository;
        this.drugInteractionRepository = drugInteractionRepository;
        this.allergyRiskAnalysisService = allergyRiskAnalysisService;
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

        if ("CANCELLED".equalsIgnoreCase(
                prescription.getStatus())) {

            throw new RuntimeException(
                    "Cannot add medicine to a cancelled prescription"
            );
        }

        if ("COMPLETED".equalsIgnoreCase(
                prescription.getStatus())) {

            throw new RuntimeException(
                    "Cannot add medicine to a completed prescription"
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

        if (allergyResult.isRiskDetected()) {

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
                medicine
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
            Medicine newMedicine) {

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

            existing.setStatus(
                    updatedPrescription
                            .getStatus()
                            .trim()
                            .toUpperCase()
            );
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
    // COMPLETE PRESCRIPTION
    // =========================================================

    public Prescription completePrescription(
            Long id) {

        Prescription prescription =
                getPrescriptionById(id);

        if ("CANCELLED".equalsIgnoreCase(
                prescription.getStatus())) {

            throw new RuntimeException(
                    "Cancelled prescription cannot be completed"
            );
        }

        prescription.setStatus("COMPLETED");

        return prescriptionRepository.save(
                prescription
        );
    }

    // =========================================================
    // DELETE PRESCRIPTION
    // =========================================================

    public void deletePrescription(Long id) {

        Prescription prescription =
                getPrescriptionById(id);

        prescriptionItemRepository
                .deleteByPrescriptionId(id);

        prescriptionRepository.delete(
                prescription
        );
    }
}