package com.dentaflow.backend.service;

import com.dentaflow.backend.entity.Dentist;
import com.dentaflow.backend.entity.MedicalRecord;
import com.dentaflow.backend.entity.Patient;
import com.dentaflow.backend.enums.RecordCategory;
import com.dentaflow.backend.repository.DentistRepository;
import com.dentaflow.backend.repository.MedicalRecordRepository;
import com.dentaflow.backend.repository.PatientRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class MedicalRecordService {

    private final MedicalRecordRepository medicalRecordRepository;
    private final PatientRepository patientRepository;
    private final DentistRepository dentistRepository;

    public MedicalRecordService(
            MedicalRecordRepository medicalRecordRepository,
            PatientRepository patientRepository,
            DentistRepository dentistRepository) {

        this.medicalRecordRepository = medicalRecordRepository;
        this.patientRepository = patientRepository;
        this.dentistRepository = dentistRepository;
    }

    // =========================================================
    // CREATE MEDICAL RECORD
    // =========================================================

    public MedicalRecord createMedicalRecord(
            Long patientId,
            Long dentistId,
            MedicalRecord medicalRecord) {

        // -----------------------------------------------------
        // 1. Medical record object validation
        // -----------------------------------------------------

        if (medicalRecord == null) {
            throw new RuntimeException(
                    "Medical record data is required"
            );
        }

        // -----------------------------------------------------
        // 2. Patient validation
        // -----------------------------------------------------

        if (patientId == null) {
            throw new RuntimeException(
                    "Patient is required"
            );
        }

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Patient not found with id: " + patientId
                        ));

        medicalRecord.setPatient(patient);

        // -----------------------------------------------------
        // 3. Dentist validation
        // -----------------------------------------------------

        if (dentistId == null) {
            throw new RuntimeException(
                    "Treating dentist is required"
            );
        }

        Dentist dentist = dentistRepository.findById(dentistId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Dentist not found with id: " + dentistId
                        ));

        medicalRecord.setDentist(dentist);

        // -----------------------------------------------------
        // 4. Record date validation
        // -----------------------------------------------------

        if (medicalRecord.getRecordDate() == null) {

            // If frontend does not send date,
            // current date will be used.
            medicalRecord.setRecordDate(LocalDate.now());

        } else if (medicalRecord.getRecordDate()
                .isAfter(LocalDate.now())) {

            throw new RuntimeException(
                    "Medical record date cannot be in the future"
            );
        }

        // -----------------------------------------------------
        // 5. Record category validation
        // -----------------------------------------------------

        if (medicalRecord.getRecordType() == null ||
                medicalRecord.getRecordType().trim().isEmpty()) {

            throw new RuntimeException(
                    "Record category is required"
            );
        }

        String rawRecordType =
                medicalRecord.getRecordType()
                        .trim()
                        .toUpperCase();

        String recordType = RecordCategory.normalize(rawRecordType);

        if (!RecordCategory.isValid(recordType)) {
            throw new RuntimeException(
                    "Invalid record category"
            );
        }

        medicalRecord.setRecordType(recordType);

        // -----------------------------------------------------
        // 6. Record title / diagnosis validation
        // -----------------------------------------------------

        if (medicalRecord.getDiagnosis() == null ||
                medicalRecord.getDiagnosis().trim().isEmpty()) {

            throw new RuntimeException(
                    "Record title / diagnosis is required"
            );
        }

        String diagnosis =
                medicalRecord.getDiagnosis().trim();

        if (diagnosis.length() < 3) {
            throw new RuntimeException(
                    "Record title / diagnosis must contain at least 3 characters"
            );
        }

        if (diagnosis.length() > 1000) {
            throw new RuntimeException(
                    "Record title / diagnosis cannot exceed 1000 characters"
            );
        }

        medicalRecord.setDiagnosis(diagnosis);

        // -----------------------------------------------------
        // 7. Clinical findings / operative notes validation
        // -----------------------------------------------------

        if (medicalRecord.getClinicalNotes() == null ||
                medicalRecord.getClinicalNotes().trim().isEmpty()) {

            throw new RuntimeException(
                    "Clinical findings and operative notes are required"
            );
        }

        String clinicalNotes =
                medicalRecord.getClinicalNotes().trim();

        if (clinicalNotes.length() < 5) {
            throw new RuntimeException(
                    "Clinical findings and operative notes must contain at least 5 characters"
            );
        }

        if (clinicalNotes.length() > 2000) {
            throw new RuntimeException(
                    "Clinical findings and operative notes cannot exceed 2000 characters"
            );
        }

        medicalRecord.setClinicalNotes(clinicalNotes);

        // -----------------------------------------------------
        // 8. Optional symptoms
        // -----------------------------------------------------

        if (medicalRecord.getSymptoms() != null) {

            String symptoms =
                    medicalRecord.getSymptoms().trim();

            if (symptoms.length() > 1000) {
                throw new RuntimeException(
                        "Symptoms cannot exceed 1000 characters"
                );
            }

            medicalRecord.setSymptoms(
                    symptoms.isEmpty() ? null : symptoms
            );
        }

        // -----------------------------------------------------
        // 9. Optional allergies
        // -----------------------------------------------------

        if (medicalRecord.getAllergies() != null) {

            String allergies =
                    medicalRecord.getAllergies().trim();

            if (allergies.length() > 1000) {
                throw new RuntimeException(
                        "Allergies cannot exceed 1000 characters"
                );
            }

            medicalRecord.setAllergies(
                    allergies.isEmpty() ? null : allergies
            );
        }

        // -----------------------------------------------------
        // 10. Optional medical conditions
        // -----------------------------------------------------

        if (medicalRecord.getMedicalConditions() != null) {

            String conditions =
                    medicalRecord.getMedicalConditions().trim();

            if (conditions.length() > 1500) {
                throw new RuntimeException(
                        "Medical conditions cannot exceed 1500 characters"
                );
            }

            medicalRecord.setMedicalConditions(
                    conditions.isEmpty() ? null : conditions
            );
        }

        // -----------------------------------------------------
        // 11. Status validation
        // -----------------------------------------------------

        if (medicalRecord.getStatus() == null ||
                medicalRecord.getStatus().trim().isEmpty()) {

            medicalRecord.setStatus("ACTIVE");

        } else {

            String status =
                    medicalRecord.getStatus()
                            .trim()
                            .toUpperCase();

            if (!status.equals("ACTIVE") &&
                    !status.equals("ARCHIVED")) {

                throw new RuntimeException(
                        "Status must be ACTIVE or ARCHIVED"
                );
            }

            medicalRecord.setStatus(status);
        }

        // -----------------------------------------------------
        // 12. Optional attachments / radiograph
        // -----------------------------------------------------

        if (medicalRecord.getAttachments() != null) {
            String attachments = medicalRecord.getAttachments().trim();
            if (attachments.equalsIgnoreCase("None") || attachments.isEmpty()) {
                medicalRecord.setAttachments(null);
            } else {
                if (attachments.length() > 255) {
                    throw new RuntimeException("Attachment name cannot exceed 255 characters");
                }
                medicalRecord.setAttachments(attachments);
            }
        }

        // -----------------------------------------------------
        // 13. Save only after all validations pass
        // -----------------------------------------------------

        return medicalRecordRepository.save(
                medicalRecord
        );
    }


    // =========================================================
    // GET ALL MEDICAL RECORDS
    // =========================================================

    @Transactional(readOnly = true)
    public List<MedicalRecord> getAllMedicalRecords() {

        return medicalRecordRepository.findAll();
    }


    // =========================================================
    // GET MEDICAL RECORD BY ID
    // =========================================================

    @Transactional(readOnly = true)
    public MedicalRecord getMedicalRecordById(Long id) {

        if (id == null) {
            throw new RuntimeException(
                    "Medical record ID is required"
            );
        }

        if (id <= 0) {
            throw new RuntimeException(
                    "Medical record ID must be greater than 0"
            );
        }

        return medicalRecordRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Medical record not found with id: "
                                        + id
                        ));
    }


    // =========================================================
    // GET PATIENT MEDICAL RECORDS
    // =========================================================

    @Transactional(readOnly = true)
    public List<MedicalRecord> getPatientMedicalRecords(
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

        return medicalRecordRepository
                .findByPatientIdOrderByRecordDateDesc(
                        patientId
                );
    }


    // =========================================================
    // GET DENTIST MEDICAL RECORDS
    // =========================================================

    @Transactional(readOnly = true)
    public List<MedicalRecord> getDentistMedicalRecords(
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

        return medicalRecordRepository
                .findByDentistIdOrderByRecordDateDesc(
                        dentistId
                );
    }


    // =========================================================
    // GET RECORDS BY TYPE
    // =========================================================

    @Transactional(readOnly = true)
    public List<MedicalRecord> getRecordsByType(
            String recordType) {

        if (recordType == null ||
                recordType.trim().isEmpty()) {

            return medicalRecordRepository.findAll();
        }

        return medicalRecordRepository
                .findByRecordTypeIgnoreCase(
                        recordType.trim()
                );
    }


    // =========================================================
    // GET RECORDS BY DATE
    // =========================================================

    @Transactional(readOnly = true)
    public List<MedicalRecord> getRecordsByDate(
            LocalDate date) {

        if (date == null) {
            throw new RuntimeException(
                    "Record date is required"
            );
        }

        if (date.isAfter(LocalDate.now())) {
            throw new RuntimeException(
                    "Medical record date cannot be in the future"
            );
        }

        return medicalRecordRepository
                .findByRecordDateOrderByIdDesc(
                        date
                );
    }


    // =========================================================
    // GET RECORDS BY STATUS
    // =========================================================

    @Transactional(readOnly = true)
    public List<MedicalRecord> getRecordsByStatus(
            String status) {

        if (status == null ||
                status.trim().isEmpty()) {

            throw new RuntimeException(
                    "Status is required"
            );
        }

        String normalizedStatus =
                status.trim().toUpperCase();

        if (!normalizedStatus.equals("ACTIVE") &&
                !normalizedStatus.equals("ARCHIVED")) {

            throw new RuntimeException(
                    "Status must be ACTIVE or ARCHIVED"
            );
        }

        return medicalRecordRepository
                .findByStatusIgnoreCase(
                        normalizedStatus
                );
    }

    // =========================================================
    // GET ACCESSIBLE MEDICAL RECORDS (filtered by current user)
    // =========================================================

    @Transactional(readOnly = true)
    public List<MedicalRecord> getAccessibleMedicalRecords(
            Long userId, boolean isAdmin) {

        if (userId == null) {
            return Collections.emptyList();
        }

        if (isAdmin) {
            return getAllMedicalRecords();
        }

        Optional<Dentist> dentist = dentistRepository.findByUserId(userId);
        if (dentist.isPresent()) {
            return getDentistMedicalRecords(dentist.get().getId());
        }

        Optional<Patient> patient = patientRepository.findByUserId(userId);
        if (patient.isPresent()) {
            return getPatientMedicalRecords(patient.get().getId());
        }

        return Collections.emptyList();
    }

    @Transactional(readOnly = true)
    public List<MedicalRecord> getAccessibleRecordsByType(
            Long userId, boolean isAdmin, String recordType) {

        if (userId == null) {
            return Collections.emptyList();
        }

        if (isAdmin) {
            return getRecordsByType(recordType);
        }

        Optional<Dentist> dentist = dentistRepository.findByUserId(userId);
        if (dentist.isPresent()) {
            List<MedicalRecord> dentistRecords =
                    getDentistMedicalRecords(dentist.get().getId());
            return dentistRecords.stream()
                    .filter(r -> r.getRecordType() != null
                            && r.getRecordType().equalsIgnoreCase(recordType))
                    .collect(Collectors.toList());
        }

        Optional<Patient> patient = patientRepository.findByUserId(userId);
        if (patient.isPresent()) {
            List<MedicalRecord> patientRecords =
                    getPatientMedicalRecords(patient.get().getId());
            return patientRecords.stream()
                    .filter(r -> r.getRecordType() != null
                            && r.getRecordType().equalsIgnoreCase(recordType))
                    .collect(Collectors.toList());
        }

        return Collections.emptyList();
    }

    @Transactional(readOnly = true)
    public List<MedicalRecord> getAccessibleRecordsByDate(
            Long userId, boolean isAdmin, LocalDate date) {

        if (userId == null) {
            return Collections.emptyList();
        }

        if (isAdmin) {
            return getRecordsByDate(date);
        }

        Optional<Dentist> dentist = dentistRepository.findByUserId(userId);
        if (dentist.isPresent()) {
            List<MedicalRecord> dentistRecords =
                    getDentistMedicalRecords(dentist.get().getId());
            return dentistRecords.stream()
                    .filter(r -> r.getRecordDate() != null
                            && r.getRecordDate().equals(date))
                    .collect(Collectors.toList());
        }

        Optional<Patient> patient = patientRepository.findByUserId(userId);
        if (patient.isPresent()) {
            List<MedicalRecord> patientRecords =
                    getPatientMedicalRecords(patient.get().getId());
            return patientRecords.stream()
                    .filter(r -> r.getRecordDate() != null
                            && r.getRecordDate().equals(date))
                    .collect(Collectors.toList());
        }

        return Collections.emptyList();
    }

    @Transactional(readOnly = true)
    public List<MedicalRecord> getAccessibleRecordsByStatus(
            Long userId, boolean isAdmin, String status) {

        if (userId == null) {
            return Collections.emptyList();
        }

        if (isAdmin) {
            return getRecordsByStatus(status);
        }

        Optional<Dentist> dentist = dentistRepository.findByUserId(userId);
        if (dentist.isPresent()) {
            List<MedicalRecord> dentistRecords =
                    getDentistMedicalRecords(dentist.get().getId());
            return dentistRecords.stream()
                    .filter(r -> r.getStatus() != null
                            && r.getStatus().equalsIgnoreCase(status))
                    .collect(Collectors.toList());
        }

        Optional<Patient> patient = patientRepository.findByUserId(userId);
        if (patient.isPresent()) {
            List<MedicalRecord> patientRecords =
                    getPatientMedicalRecords(patient.get().getId());
            return patientRecords.stream()
                    .filter(r -> r.getStatus() != null
                            && r.getStatus().equalsIgnoreCase(status))
                    .collect(Collectors.toList());
        }

        return Collections.emptyList();
    }


    // =========================================================
    // GET ACTIVE PATIENT RECORDS
    // =========================================================

    @Transactional(readOnly = true)
    public List<MedicalRecord> getActivePatientRecords(
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

        return medicalRecordRepository
                .findByPatientIdAndStatusIgnoreCase(
                        patientId,
                        "ACTIVE"
                );
    }


    // =========================================================
    // UPDATE MEDICAL RECORD
    // =========================================================

    public MedicalRecord updateMedicalRecord(
            Long id,
            MedicalRecord updatedRecord) {

        // -----------------------------------------------------
        // Validate record ID
        // -----------------------------------------------------

        if (id == null || id <= 0) {
            throw new RuntimeException(
                    "Valid medical record ID is required"
            );
        }

        MedicalRecord existing =
                getMedicalRecordById(id);

        // -----------------------------------------------------
        // Validate request body
        // -----------------------------------------------------

        if (updatedRecord == null) {
            throw new RuntimeException(
                    "Medical record data is required"
            );
        }

        // -----------------------------------------------------
        // Record date
        // -----------------------------------------------------

        if (updatedRecord.getRecordDate() != null) {

            if (updatedRecord.getRecordDate()
                    .isAfter(LocalDate.now())) {

                throw new RuntimeException(
                        "Medical record date cannot be in the future"
                );
            }

            existing.setRecordDate(
                    updatedRecord.getRecordDate()
            );
        }

        // -----------------------------------------------------
        // Record type
        // -----------------------------------------------------

        if (updatedRecord.getRecordType() != null) {

            String rawRecordType =
                    updatedRecord.getRecordType()
                            .trim()
                            .toUpperCase();

            if (rawRecordType.isEmpty()) {
                throw new RuntimeException(
                        "Record category cannot be empty"
                );
            }

            String recordType = RecordCategory.normalize(rawRecordType);

            if (!RecordCategory.isValid(recordType)) {
                throw new RuntimeException(
                        "Invalid record category"
                );
            }

            existing.setRecordType(recordType);
        }

        // -----------------------------------------------------
        // Diagnosis / record title
        // -----------------------------------------------------

        if (updatedRecord.getDiagnosis() != null) {

            String diagnosis =
                    updatedRecord.getDiagnosis().trim();

            if (diagnosis.isEmpty()) {
                throw new RuntimeException(
                        "Record title / diagnosis cannot be empty"
                );
            }

            if (diagnosis.length() < 3) {
                throw new RuntimeException(
                        "Record title / diagnosis must contain at least 3 characters"
                );
            }

            if (diagnosis.length() > 1000) {
                throw new RuntimeException(
                        "Record title / diagnosis cannot exceed 1000 characters"
                );
            }

            existing.setDiagnosis(diagnosis);
        }

        // -----------------------------------------------------
        // Clinical notes
        // -----------------------------------------------------

        if (updatedRecord.getClinicalNotes() != null) {

            String clinicalNotes =
                    updatedRecord.getClinicalNotes().trim();

            if (clinicalNotes.isEmpty()) {
                throw new RuntimeException(
                        "Clinical findings and operative notes cannot be empty"
                );
            }

            if (clinicalNotes.length() < 5) {
                throw new RuntimeException(
                        "Clinical findings and operative notes must contain at least 5 characters"
                );
            }

            if (clinicalNotes.length() > 2000) {
                throw new RuntimeException(
                        "Clinical findings and operative notes cannot exceed 2000 characters"
                );
            }

            existing.setClinicalNotes(clinicalNotes);
        }

        // -----------------------------------------------------
        // Symptoms
        // -----------------------------------------------------

        if (updatedRecord.getSymptoms() != null) {

            String symptoms =
                    updatedRecord.getSymptoms().trim();

            if (symptoms.length() > 1000) {
                throw new RuntimeException(
                        "Symptoms cannot exceed 1000 characters"
                );
            }

            existing.setSymptoms(
                    symptoms.isEmpty() ? null : symptoms
            );
        }

        // -----------------------------------------------------
        // Allergies
        // -----------------------------------------------------

        if (updatedRecord.getAllergies() != null) {

            String allergies =
                    updatedRecord.getAllergies().trim();

            if (allergies.length() > 1000) {
                throw new RuntimeException(
                        "Allergies cannot exceed 1000 characters"
                );
            }

            existing.setAllergies(
                    allergies.isEmpty() ? null : allergies
            );
        }

        // -----------------------------------------------------
        // Medical conditions
        // -----------------------------------------------------

        if (updatedRecord.getMedicalConditions() != null) {

            String conditions =
                    updatedRecord.getMedicalConditions().trim();

            if (conditions.length() > 1500) {
                throw new RuntimeException(
                        "Medical conditions cannot exceed 1500 characters"
                );
            }

            existing.setMedicalConditions(
                    conditions.isEmpty() ? null : conditions
            );
        }

        // -----------------------------------------------------
        // Status
        // -----------------------------------------------------

        if (updatedRecord.getStatus() != null) {

            String status =
                    updatedRecord.getStatus()
                            .trim()
                            .toUpperCase();

            if (status.isEmpty()) {
                throw new RuntimeException(
                        "Status cannot be empty"
                );
            }

            if (!status.equals("ACTIVE") &&
                    !status.equals("ARCHIVED")) {

                throw new RuntimeException(
                        "Status must be ACTIVE or ARCHIVED"
                );
            }

            existing.setStatus(status);
        }

        // -----------------------------------------------------
        // Attachments / radiograph
        // -----------------------------------------------------

        if (updatedRecord.getAttachments() != null) {
            String attachments = updatedRecord.getAttachments().trim();
            if (attachments.equalsIgnoreCase("None") || attachments.isEmpty()) {
                existing.setAttachments(null);
            } else {
                if (attachments.length() > 255) {
                    throw new RuntimeException("Attachment name cannot exceed 255 characters");
                }
                existing.setAttachments(attachments);
            }
        }

        // -----------------------------------------------------
        // Save updated record
        // -----------------------------------------------------

        return medicalRecordRepository.save(
                existing
        );
    }


    // =========================================================
    // ACTIVATE RECORD
    // =========================================================

    public MedicalRecord activateRecord(Long id) {

        MedicalRecord record =
                getMedicalRecordById(id);

        record.setStatus("ACTIVE");

        return medicalRecordRepository.save(record);
    }


    // =========================================================
    // ARCHIVE RECORD
    // =========================================================

    public MedicalRecord archiveRecord(Long id) {

        MedicalRecord record =
                getMedicalRecordById(id);

        record.setStatus("ARCHIVED");

        return medicalRecordRepository.save(record);
    }


    // =========================================================
    // DELETE RECORD
    // =========================================================

    public void deleteMedicalRecord(Long id) {

        MedicalRecord record =
                getMedicalRecordById(id);

        medicalRecordRepository.delete(record);
    }
}