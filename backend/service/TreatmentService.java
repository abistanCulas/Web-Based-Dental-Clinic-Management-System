package com.dentaflow.backend.service;

import com.dentaflow.backend.entity.Appointment;
import com.dentaflow.backend.entity.Dentist;
import com.dentaflow.backend.entity.Patient;
import com.dentaflow.backend.entity.Treatment;
import com.dentaflow.backend.repository.AppointmentRepository;
import com.dentaflow.backend.repository.DentistRepository;
import com.dentaflow.backend.repository.PatientRepository;
import com.dentaflow.backend.repository.TreatmentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@Transactional
public class TreatmentService {

    private final TreatmentRepository treatmentRepository;
    private final PatientRepository patientRepository;
    private final DentistRepository dentistRepository;
    private final AppointmentRepository appointmentRepository;

    public TreatmentService(
            TreatmentRepository treatmentRepository,
            PatientRepository patientRepository,
            DentistRepository dentistRepository,
            AppointmentRepository appointmentRepository) {

        this.treatmentRepository = treatmentRepository;
        this.patientRepository = patientRepository;
        this.dentistRepository = dentistRepository;
        this.appointmentRepository = appointmentRepository;
    }

    // ---------------------------------------------------------
    // CREATE TREATMENT
    // ---------------------------------------------------------

    public Treatment createTreatment(
            Long patientId,
            Long dentistId,
            Long appointmentId,
            Treatment treatment) {

        if (treatment == null) {
            throw new RuntimeException(
                    "Treatment data is required"
            );
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

        Appointment appointment = null;

        if (appointmentId != null) {

            appointment = appointmentRepository.findById(
                    appointmentId
            ).orElseThrow(() ->
                    new RuntimeException(
                            "Appointment not found with id: "
                                    + appointmentId
                    ));

            if (!appointment.getPatient()
                    .getId()
                    .equals(patientId)) {

                throw new RuntimeException(
                        "Appointment does not belong to this patient"
                );
            }

            if (!appointment.getDentist()
                    .getId()
                    .equals(dentistId)) {

                throw new RuntimeException(
                        "Appointment does not belong to this dentist"
                );
            }

            treatment.setAppointment(appointment);
        }

        validateTreatment(treatment);

        treatment.setPatient(patient);
        treatment.setDentist(dentist);

        treatment.setTreatmentCode(
                generateTreatmentCode()
        );

        if (treatment.getTreatmentDate() == null) {
            treatment.setTreatmentDate(
                    LocalDate.now()
            );
        }

        if (treatment.getStatus() == null ||
                treatment.getStatus().trim().isEmpty()) {

            treatment.setStatus("IN_PROGRESS");
        }

        if (treatment.getEstimatedCost() == null) {
            treatment.setEstimatedCost(
                    BigDecimal.ZERO
            );
        }

        if (treatment.getActualCost() == null) {
            treatment.setActualCost(
                    BigDecimal.ZERO
            );
        }

        return treatmentRepository.save(treatment);
    }

    // ---------------------------------------------------------
    // GENERATE TREATMENT CODE
    // ---------------------------------------------------------

    private String generateTreatmentCode() {

        long nextNumber =
                treatmentRepository.count() + 1;

        String code;

        do {
            code = String.format(
                    "TRT%05d",
                    nextNumber
            );

            nextNumber++;

        } while (
                treatmentRepository
                        .existsByTreatmentCode(code)
        );

        return code;
    }

    // ---------------------------------------------------------
    // GET ALL TREATMENTS
    // ---------------------------------------------------------

    @Transactional(readOnly = true)
    public List<Treatment> getAllTreatments() {
        return treatmentRepository.findAll();
    }

    // ---------------------------------------------------------
    // GET TREATMENT BY ID
    // ---------------------------------------------------------

    @Transactional(readOnly = true)
    public Treatment getTreatmentById(Long id) {

        return treatmentRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Treatment not found with id: " + id
                        ));
    }

    // ---------------------------------------------------------
    // GET TREATMENT BY CODE
    // ---------------------------------------------------------

    @Transactional(readOnly = true)
    public Treatment getTreatmentByCode(
            String treatmentCode) {

        if (treatmentCode == null ||
                treatmentCode.trim().isEmpty()) {

            throw new RuntimeException(
                    "Treatment code is required"
            );
        }

        return treatmentRepository
                .findByTreatmentCode(
                        treatmentCode.trim().toUpperCase()
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "Treatment not found: "
                                        + treatmentCode
                        ));
    }

    // ---------------------------------------------------------
    // GET PATIENT TREATMENT HISTORY
    // ---------------------------------------------------------

    @Transactional(readOnly = true)
    public List<Treatment> getPatientTreatments(
            Long patientId) {

        patientRepository.findById(patientId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Patient not found with id: "
                                        + patientId
                        ));

        return treatmentRepository
                .findByPatientIdOrderByTreatmentDateDesc(
                        patientId
                );
    }

    // ---------------------------------------------------------
    // GET DENTIST TREATMENTS
    // ---------------------------------------------------------

    @Transactional(readOnly = true)
    public List<Treatment> getDentistTreatments(
            Long dentistId) {

        dentistRepository.findById(dentistId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Dentist not found with id: "
                                        + dentistId
                        ));

        return treatmentRepository
                .findByDentistIdOrderByTreatmentDateDesc(
                        dentistId
                );
    }

    // ---------------------------------------------------------
    // GET TREATMENTS BY DATE
    // ---------------------------------------------------------

    @Transactional(readOnly = true)
    public List<Treatment> getTreatmentsByDate(
            LocalDate date) {

        if (date == null) {
            throw new RuntimeException(
                    "Treatment date is required"
            );
        }

        return treatmentRepository
                .findByTreatmentDateOrderByTreatmentDateDesc(
                        date
                );
    }

    // ---------------------------------------------------------
    // GET TREATMENTS BY TYPE
    // ---------------------------------------------------------

    @Transactional(readOnly = true)
    public List<Treatment> getTreatmentsByType(
            String treatmentType) {

        if (treatmentType == null ||
                treatmentType.trim().isEmpty()) {

            return treatmentRepository.findAll();
        }

        return treatmentRepository
                .findByTreatmentTypeContainingIgnoreCase(
                        treatmentType.trim()
                );
    }

    // ---------------------------------------------------------
    // GET TREATMENTS BY STATUS
    // ---------------------------------------------------------

    @Transactional(readOnly = true)
    public List<Treatment> getTreatmentsByStatus(
            String status) {

        if (status == null ||
                status.trim().isEmpty()) {

            throw new RuntimeException(
                    "Status is required"
            );
        }

        return treatmentRepository
                .findByStatusIgnoreCaseOrderByTreatmentDateDesc(
                        status.trim()
                );
    }

    // ---------------------------------------------------------
    // UPDATE TREATMENT
    // ---------------------------------------------------------

    public Treatment updateTreatment(
            Long id,
            Treatment updatedTreatment) {

        Treatment existing =
                getTreatmentById(id);

        if (updatedTreatment == null) {
            throw new RuntimeException(
                    "Treatment data is required"
            );
        }

        if (updatedTreatment.getTreatmentType() != null &&
                !updatedTreatment.getTreatmentType()
                        .trim()
                        .isEmpty()) {

            existing.setTreatmentType(
                    updatedTreatment
                            .getTreatmentType()
                            .trim()
            );
        }

        if (updatedTreatment.getDiagnosis() != null) {
            existing.setDiagnosis(
                    updatedTreatment
                            .getDiagnosis()
                            .trim()
            );
        }

        if (updatedTreatment.getDescription() != null) {
            existing.setDescription(
                    updatedTreatment
                            .getDescription()
                            .trim()
            );
        }

        if (updatedTreatment.getToothDetails() != null) {
            existing.setToothDetails(
                    updatedTreatment
                            .getToothDetails()
                            .trim()
            );
        }

        if (updatedTreatment.getTreatmentDate() != null) {
            existing.setTreatmentDate(
                    updatedTreatment.getTreatmentDate()
            );
        }

        if (updatedTreatment.getEstimatedCost() != null) {

            validateCost(
                    updatedTreatment.getEstimatedCost()
            );

            existing.setEstimatedCost(
                    updatedTreatment.getEstimatedCost()
            );
        }

        if (updatedTreatment.getActualCost() != null) {

            validateCost(
                    updatedTreatment.getActualCost()
            );

            existing.setActualCost(
                    updatedTreatment.getActualCost()
            );
        }

        if (updatedTreatment.getDentistNotes() != null) {
            existing.setDentistNotes(
                    updatedTreatment.getDentistNotes().trim()
            );
        }

        if (updatedTreatment.getStatus() != null) {
            existing.setStatus(
                    updatedTreatment
                            .getStatus()
                            .trim()
                            .toUpperCase()
            );
        }

        return treatmentRepository.save(existing);
    }

    // ---------------------------------------------------------
    // START TREATMENT
    // ---------------------------------------------------------

    public Treatment startTreatment(Long id) {

        Treatment treatment =
                getTreatmentById(id);

        if ("COMPLETED".equalsIgnoreCase(
                treatment.getStatus())) {

            throw new RuntimeException(
                    "Completed treatment cannot be started again"
            );
        }

        treatment.setStatus("IN_PROGRESS");

        return treatmentRepository.save(
                treatment
        );
    }

    // ---------------------------------------------------------
    // COMPLETE TREATMENT
    // ---------------------------------------------------------

    public Treatment completeTreatment(Long id) {

        Treatment treatment =
                getTreatmentById(id);

        treatment.setStatus("COMPLETED");

        if (treatment.getActualCost() == null) {

            treatment.setActualCost(
                    treatment.getEstimatedCost() != null
                            ? treatment.getEstimatedCost()
                            : BigDecimal.ZERO
            );
        }

        return treatmentRepository.save(
                treatment
        );
    }

    // ---------------------------------------------------------
    // CANCEL TREATMENT
    // ---------------------------------------------------------

    public Treatment cancelTreatment(Long id) {

        Treatment treatment =
                getTreatmentById(id);

        if ("COMPLETED".equalsIgnoreCase(
                treatment.getStatus())) {

            throw new RuntimeException(
                    "Completed treatment cannot be cancelled"
            );
        }

        treatment.setStatus("CANCELLED");

        return treatmentRepository.save(
                treatment
        );
    }

    // ---------------------------------------------------------
    // DELETE TREATMENT
    // ---------------------------------------------------------

    public void deleteTreatment(Long id) {

        Treatment treatment =
                getTreatmentById(id);

        treatmentRepository.delete(treatment);
    }

    // ---------------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------------

    private void validateTreatment(
            Treatment treatment) {

        if (treatment.getTreatmentType() == null ||
                treatment.getTreatmentType()
                        .trim()
                        .isEmpty()) {

            throw new RuntimeException(
                    "Treatment type is required"
            );
        }

        if (treatment.getTreatmentDate() != null &&
                treatment.getTreatmentDate()
                        .isAfter(LocalDate.now())) {

            throw new RuntimeException(
                    "Treatment date cannot be in the future"
            );
        }

        if (treatment.getEstimatedCost() != null) {
            validateCost(
                    treatment.getEstimatedCost()
            );
        }

        if (treatment.getActualCost() != null) {
            validateCost(
                    treatment.getActualCost()
            );
        }
    }

    private void validateCost(BigDecimal cost) {

        if (cost.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException(
                    "Treatment cost cannot be negative"
            );
        }
    }
}