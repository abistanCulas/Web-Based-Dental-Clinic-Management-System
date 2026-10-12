package com.dentaflow.backend.service;

import com.dentaflow.backend.entity.Appointment;
import com.dentaflow.backend.entity.Dentist;
import com.dentaflow.backend.entity.Patient;
import com.dentaflow.backend.entity.Treatment;
import com.dentaflow.backend.entity.TreatmentPlan;
import com.dentaflow.backend.repository.AppointmentRepository;
import com.dentaflow.backend.repository.BillRepository;
import com.dentaflow.backend.repository.DentistRepository;
import com.dentaflow.backend.repository.PatientRepository;
import com.dentaflow.backend.repository.PrescriptionRepository;
import com.dentaflow.backend.repository.TreatmentPlanRepository;
import com.dentaflow.backend.repository.TreatmentRepository;
import com.dentaflow.backend.strategy.treatment.TreatmentStrategyContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class TreatmentService {

    private final TreatmentRepository treatmentRepository;
    private final PatientRepository patientRepository;
    private final DentistRepository dentistRepository;
    private final AppointmentRepository appointmentRepository;
    private final BillRepository billRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final TreatmentPlanRepository treatmentPlanRepository;
    private final TreatmentStrategyContext treatmentStrategyContext;

    @Autowired
    public TreatmentService(
            TreatmentRepository treatmentRepository,
            PatientRepository patientRepository,
            DentistRepository dentistRepository,
            AppointmentRepository appointmentRepository,
            BillRepository billRepository,
            PrescriptionRepository prescriptionRepository,
            TreatmentPlanRepository treatmentPlanRepository,
            TreatmentStrategyContext treatmentStrategyContext) {

        this.treatmentRepository = treatmentRepository;
        this.patientRepository = patientRepository;
        this.dentistRepository = dentistRepository;
        this.appointmentRepository = appointmentRepository;
        this.billRepository = billRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.treatmentPlanRepository = treatmentPlanRepository;
        this.treatmentStrategyContext = treatmentStrategyContext;
    }

    public TreatmentService(
            TreatmentRepository treatmentRepository,
            PatientRepository patientRepository,
            DentistRepository dentistRepository,
            AppointmentRepository appointmentRepository,
            BillRepository billRepository,
            PrescriptionRepository prescriptionRepository) {

        this(treatmentRepository, patientRepository, dentistRepository, appointmentRepository,
                billRepository, prescriptionRepository, null, null);
    }

    // ---------------------------------------------------------
    // CREATE TREATMENT
    // ---------------------------------------------------------

    public Treatment createTreatment(
            Long patientId,
            Long dentistId,
            Long appointmentId,
            Treatment treatment) {
        return createTreatment(patientId, dentistId, appointmentId, null, treatment);
    }

    public Treatment createTreatment(
            Long patientId,
            Long dentistId,
            Long appointmentId,
            Long treatmentPlanId,
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

        if ("INACTIVE".equalsIgnoreCase(patient.getStatus()) || "DEACTIVATED".equalsIgnoreCase(patient.getStatus())) {
            throw new RuntimeException("Cannot create treatment for an inactive or deactivated patient");
        }

        if (!"ACTIVE".equalsIgnoreCase(dentist.getStatus())) {
            throw new RuntimeException("Cannot create treatment for an inactive dentist");
        }

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

        if (treatmentPlanId != null && treatmentPlanRepository != null) {
            TreatmentPlan plan = treatmentPlanRepository.findById(treatmentPlanId).orElse(null);
            if (plan != null) {
                if (plan.getPatient() != null && !plan.getPatient().getId().equals(patientId)) {
                    throw new RuntimeException("Treatment Plan does not belong to this patient");
                }
                treatment.setTreatmentPlan(plan);
            }
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

        if (updatedTreatment.getFollowUpDate() != null) {
            existing.setFollowUpDate(
                    updatedTreatment.getFollowUpDate()
            );
        }

        if (updatedTreatment.getTreatmentPlan() != null) {
            existing.setTreatmentPlan(
                    updatedTreatment.getTreatmentPlan()
            );
        }

        if (updatedTreatment.getStatus() != null) {
            String newStatus = updatedTreatment.getStatus().trim().toUpperCase();
            if (!newStatus.isEmpty() && !newStatus.equalsIgnoreCase(existing.getStatus()) && treatmentStrategyContext != null) {
                Map<String, Object> ctx = new HashMap<>();
                if (existing.getDentistNotes() != null) {
                    ctx.put("dentistNotes", existing.getDentistNotes());
                }
                if (existing.getActualCost() != null) {
                    ctx.put("actualCost", existing.getActualCost());
                }
                return treatmentStrategyContext.executeTransition(
                        existing,
                        newStatus,
                        ctx
                );
            } else if (!newStatus.isEmpty()) {
                existing.setStatus(newStatus);
            }
        }

        return treatmentRepository.save(existing);
    }

    public Treatment updateTreatment(
            Long id,
            Long treatmentPlanId,
            Treatment updatedTreatment) {

        if (treatmentPlanId != null && treatmentPlanRepository != null) {
            TreatmentPlan plan = treatmentPlanRepository.findById(treatmentPlanId).orElse(null);
            if (plan != null) {
                updatedTreatment.setTreatmentPlan(plan);
            }
        }
        return updateTreatment(id, updatedTreatment);
    }

    // ---------------------------------------------------------
    // START TREATMENT
    // ---------------------------------------------------------

    public Treatment startTreatment(Long id) {

        Treatment treatment =
                getTreatmentById(id);

        if (treatmentStrategyContext != null) {
            return treatmentStrategyContext.executeTransition(
                    treatment,
                    "IN_PROGRESS",
                    Collections.emptyMap()
            );
        }

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

        if (treatmentStrategyContext != null) {
            return treatmentStrategyContext.executeTransition(
                    treatment,
                    "COMPLETED",
                    Collections.emptyMap()
            );
        }

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

        if (treatmentStrategyContext != null) {
            return treatmentStrategyContext.executeTransition(
                    treatment,
                    "CANCELLED",
                    Collections.emptyMap()
            );
        }

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
    // STRATEGY PATTERN LIFECYCLE DELEGATES
    // ---------------------------------------------------------

    public Treatment transitionTreatmentStatus(
            Long id,
            String targetStatus,
            Map<String, Object> context) {

        Treatment treatment = getTreatmentById(id);
        if (treatmentStrategyContext != null) {
            return treatmentStrategyContext.executeTransition(
                    treatment,
                    targetStatus,
                    context != null ? context : Collections.emptyMap()
            );
        }
        treatment.setStatus(targetStatus != null ? targetStatus.toUpperCase() : "PLANNED");
        return treatmentRepository.save(treatment);
    }

    @Transactional(readOnly = true)
    public List<String> getAvailableTransitions(Long id) {
        Treatment treatment = getTreatmentById(id);
        if (treatmentStrategyContext != null) {
            return treatmentStrategyContext.getAvailableTransitions(treatment);
        }
        return Collections.emptyList();
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> getRegisteredStrategiesMetadata() {
        if (treatmentStrategyContext != null) {
            return treatmentStrategyContext.getRegisteredStrategiesMetadata();
        }
        return Collections.emptyList();
    }

    // ---------------------------------------------------------
    // DELETE TREATMENT
    // ---------------------------------------------------------

    public void deleteTreatment(Long id) {

        Treatment treatment =
                getTreatmentById(id);

        if (billRepository.existsByTreatmentId(id) ||
                prescriptionRepository.existsByTreatmentId(id)) {

            throw new RuntimeException(
                    "Cannot delete treatment: active bills, prescriptions, or dependent clinical records exist. Cancel the treatment instead."
            );
        }

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