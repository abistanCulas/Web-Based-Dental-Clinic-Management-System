package com.dentaflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PatientCheckoutSummaryDTO {

    // Patient info
    private Long patientId;
    private String patientCode;
    private String patientName;
    private String patientPhone;
    private String patientEmail;

    // Doctor / Dentist info
    private Long dentistId;
    private String doctorName;
    private String doctorSpecialization;

    // Appointment info
    private Long appointmentId;
    private String appointmentCode;
    private LocalDate appointmentDate;
    private String appointmentTime;
    private String appointmentType;
    private String appointmentStatus;

    // Treatment / Treatment Plan info
    private Long treatmentId;
    private String treatmentCode;
    private Long treatmentPlanId;
    private String treatmentPlanCode;
    private String treatmentName;
    private String treatmentDiagnosis;
    private String treatmentStatus; // e.g. "PLANNED", "APPROVED", "IN_PROGRESS", "COMPLETED"
    private BigDecimal treatmentCost; // e.g. 28000.00

    // Prescription info
    private Long prescriptionId;
    private String prescriptionCode;
    private LocalDate prescriptionDate;
    private String prescriptionStatus; // "ACTIVE", "DISPENSED", "COMPLETED", "CANCELLED"
    private boolean prescriptionDispensed;
    private List<PrescribedItemDTO> prescribedMedicines;

    // Authoritative Financial Summary (calculated by backend)
    private BigDecimal treatmentCharge; // e.g. 28000.00
    private BigDecimal pharmacyCharge;  // e.g. 1700.00 if dispensed, 0.00 if not dispensed
    private BigDecimal grandTotal;     // e.g. 29700.00 or 28000.00

    // Existing Invoice / Bill info
    private Long billId;
    private String billNumber;
    private String billStatus; // "UNPAID", "PARTIALLY_PAID", "PAID", "CANCELLED", "NOT_GENERATED"
    private BigDecimal subtotal;
    private BigDecimal discount;
    private BigDecimal tax;
    private BigDecimal paidAmount;
    private BigDecimal balanceAmount;
    private LocalDateTime billDate;

    // Latest Payment info
    private Long paymentId;
    private String paymentStatus; // "PENDING", "SUCCESS", "FAILED", "NONE"
    private String paymentMethod;
    private String paymentReference;
    private String transactionId;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PrescribedItemDTO {
        private Long id;
        private Long medicineId;
        private String medicineName;
        private String genericName;
        private String dosage;
        private String frequency;
        private Integer durationDays;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal totalPrice;
        private boolean dispensed;
    }

    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class PatientInfo {
        private Long id;
        private String patientCode;
        private String name;
        private String phone;
        private String email;
    }

    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class DoctorInfo {
        private Long id;
        private String name;
        private String specialization;
    }

    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class AppointmentInfo {
        private Long id;
        private String appointmentCode;
        private LocalDate date;
        private String time;
        private String type;
        private String status;
    }

    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class TreatmentPlanInfo {
        private Long id;
        private String code;
        private String title;
        private String notes;
        private String status;
        private BigDecimal cost;
    }

    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class PrescriptionInfo {
        private Long id;
        private String code;
        private LocalDate date;
        private String status;
        private boolean dispensed;
    }

    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class BillInfo {
        private Long id;
        private String billNumber;
        private String status;
        private BigDecimal subtotal;
        private BigDecimal discount;
        private BigDecimal tax;
        private BigDecimal paidAmount;
        private BigDecimal balanceAmount;
        private LocalDateTime date;
    }

    public PatientInfo getPatient() {
        return new PatientInfo(patientId, patientCode, patientName, patientPhone, patientEmail);
    }

    public DoctorInfo getDoctor() {
        return new DoctorInfo(dentistId, doctorName, doctorSpecialization);
    }

    public AppointmentInfo getAppointment() {
        return new AppointmentInfo(appointmentId, appointmentCode, appointmentDate, appointmentTime, appointmentType, appointmentStatus);
    }

    public TreatmentPlanInfo getTreatmentPlan() {
        return new TreatmentPlanInfo(treatmentPlanId, treatmentPlanCode, treatmentName, treatmentDiagnosis, treatmentStatus, treatmentCost);
    }

    public PrescriptionInfo getPrescription() {
        return new PrescriptionInfo(prescriptionId, prescriptionCode, prescriptionDate, prescriptionStatus, prescriptionDispensed);
    }

    public BillInfo getBill() {
        return new BillInfo(billId, billNumber, billStatus, subtotal, discount, tax, paidAmount, balanceAmount, billDate);
    }

    public boolean isHasPharmacyPurchase() {
        return prescriptionDispensed;
    }

    public BigDecimal getPharmacyCost() {
        return pharmacyCharge != null ? pharmacyCharge : BigDecimal.ZERO;
    }
}
