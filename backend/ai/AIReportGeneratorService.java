package com.dentaflow.backend.ai;

import com.dentaflow.backend.entity.Appointment;
import com.dentaflow.backend.entity.Bill;
import com.dentaflow.backend.entity.MedicalRecord;
import com.dentaflow.backend.entity.Payment;
import com.dentaflow.backend.entity.Prescription;
import com.dentaflow.backend.entity.Treatment;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
public class AIReportGeneratorService {

    // =========================================================
    // PATIENT REPORT
    // =========================================================

    public ReportResult generatePatientReport(
            Long patientId,
            List<MedicalRecord> medicalRecords,
            List<Treatment> treatments,
            List<Prescription> prescriptions,
            List<Bill> bills,
            List<Payment> payments) {

        List<String> findings = new ArrayList<>();

        int medicalRecordCount =
                medicalRecords != null
                        ? medicalRecords.size()
                        : 0;

        int treatmentCount =
                treatments != null
                        ? treatments.size()
                        : 0;

        int prescriptionCount =
                prescriptions != null
                        ? prescriptions.size()
                        : 0;

        int billCount =
                bills != null
                        ? bills.size()
                        : 0;

        int paymentCount =
                payments != null
                        ? payments.size()
                        : 0;

        BigDecimal totalBilled =
                calculateTotalBills(bills);

        BigDecimal totalPaid =
                calculateTotalPayments(payments);

        BigDecimal outstanding =
                totalBilled.subtract(totalPaid);

        if (medicalRecordCount > 0) {
            findings.add(
                    medicalRecordCount
                            + " medical record(s) available."
            );
        }

        if (treatmentCount > 0) {
            findings.add(
                    treatmentCount
                            + " treatment record(s) available."
            );
        }

        if (prescriptionCount > 0) {
            findings.add(
                    prescriptionCount
                            + " prescription(s) available."
            );
        }

        if (billCount > 0) {
            findings.add(
                    "Total billed amount: "
                            + totalBilled
            );
        }

        if (paymentCount > 0) {
            findings.add(
                    "Total successful payment amount: "
                            + totalPaid
            );
        }

        if (outstanding.compareTo(
                BigDecimal.ZERO
        ) > 0) {

            findings.add(
                    "Outstanding balance: "
                            + outstanding
            );
        }

        String summary =
                "Patient report generated for patient ID "
                        + patientId
                        + ". "
                        + "Medical records: "
                        + medicalRecordCount
                        + ", treatments: "
                        + treatmentCount
                        + ", prescriptions: "
                        + prescriptionCount
                        + ", bills: "
                        + billCount
                        + ", payments: "
                        + paymentCount
                        + ".";

        return new ReportResult(
                "PATIENT_REPORT",
                summary,
                findings,
                medicalRecordCount,
                treatmentCount,
                prescriptionCount,
                billCount,
                paymentCount,
                totalBilled,
                totalPaid,
                outstanding
        );
    }

    // =========================================================
    // APPOINTMENT REPORT
    // =========================================================

    public ReportResult generateAppointmentReport(
            List<Appointment> appointments) {

        int totalAppointments =
                appointments != null
                        ? appointments.size()
                        : 0;

        int completed = 0;
        int cancelled = 0;
        int pending = 0;

        List<String> findings =
                new ArrayList<>();

        if (appointments != null) {

            for (Appointment appointment :
                    appointments) {

                if (appointment == null) {
                    continue;
                }

                String status =
                        appointment.getStatus();

                if (status == null) {
                    continue;
                }

                if ("COMPLETED"
                        .equalsIgnoreCase(status)) {

                    completed++;

                } else if ("CANCELLED"
                        .equalsIgnoreCase(status)) {

                    cancelled++;

                } else if ("PENDING"
                        .equalsIgnoreCase(status)) {

                    pending++;
                }
            }
        }

        findings.add(
                "Total appointments: "
                        + totalAppointments
        );

        findings.add(
                "Completed appointments: "
                        + completed
        );

        findings.add(
                "Cancelled appointments: "
                        + cancelled
        );

        findings.add(
                "Pending appointments: "
                        + pending
        );

        String summary =
                "Appointment report generated. "
                        + "Total: "
                        + totalAppointments
                        + ", Completed: "
                        + completed
                        + ", Cancelled: "
                        + cancelled
                        + ", Pending: "
                        + pending
                        + ".";

        return new ReportResult(
                "APPOINTMENT_REPORT",
                summary,
                findings,
                totalAppointments,
                completed,
                pending,
                cancelled,
                0,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO
        );
    }

    // =========================================================
    // TREATMENT REPORT
    // =========================================================

    public ReportResult generateTreatmentReport(
            List<Treatment> treatments) {

        int totalTreatments =
                treatments != null
                        ? treatments.size()
                        : 0;

        int planned = 0;
        int completed = 0;
        int cancelled = 0;

        BigDecimal estimatedCost =
                BigDecimal.ZERO;

        BigDecimal actualCost =
                BigDecimal.ZERO;

        List<String> findings =
                new ArrayList<>();

        if (treatments != null) {

            for (Treatment treatment :
                    treatments) {

                if (treatment == null) {
                    continue;
                }

                if (treatment.getEstimatedCost()
                        != null) {

                    estimatedCost =
                            estimatedCost.add(
                                    treatment
                                            .getEstimatedCost()
                            );
                }

                if (treatment.getActualCost()
                        != null) {

                    actualCost =
                            actualCost.add(
                                    treatment
                                            .getActualCost()
                            );
                }

                String status =
                        treatment.getStatus();

                if (status == null) {
                    continue;
                }

                if ("PLANNED"
                        .equalsIgnoreCase(status)) {

                    planned++;

                } else if ("COMPLETED"
                        .equalsIgnoreCase(status)) {

                    completed++;

                } else if ("CANCELLED"
                        .equalsIgnoreCase(status)) {

                    cancelled++;
                }
            }
        }

        findings.add(
                "Total treatments: "
                        + totalTreatments
        );

        findings.add(
                "Planned treatments: "
                        + planned
        );

        findings.add(
                "Completed treatments: "
                        + completed
        );

        findings.add(
                "Cancelled treatments: "
                        + cancelled
        );

        findings.add(
                "Estimated treatment cost: "
                        + estimatedCost
        );

        findings.add(
                "Actual treatment cost: "
                        + actualCost
        );

        String summary =
                "Treatment report generated. "
                        + "Total treatments: "
                        + totalTreatments
                        + ". Estimated cost: "
                        + estimatedCost
                        + ". Actual cost: "
                        + actualCost
                        + ".";

        return new ReportResult(
                "TREATMENT_REPORT",
                summary,
                findings,
                totalTreatments,
                planned,
                completed,
                cancelled,
                0,
                estimatedCost,
                actualCost,
                BigDecimal.ZERO
        );
    }

    // =========================================================
    // BILLING REPORT
    // =========================================================

    public ReportResult generateBillingReport(
            List<Bill> bills) {

        int totalBills =
                bills != null
                        ? bills.size()
                        : 0;

        BigDecimal totalSubtotal =
                BigDecimal.ZERO;

        BigDecimal totalDiscount =
                BigDecimal.ZERO;

        BigDecimal totalTax =
                BigDecimal.ZERO;

        BigDecimal totalAmount =
                BigDecimal.ZERO;

        BigDecimal totalPaid =
                BigDecimal.ZERO;

        BigDecimal totalBalance =
                BigDecimal.ZERO;

        int unpaid = 0;
        int partiallyPaid = 0;
        int paid = 0;

        List<String> findings =
                new ArrayList<>();

        if (bills != null) {

            for (Bill bill : bills) {

                if (bill == null) {
                    continue;
                }

                if (bill.getSubtotal() != null) {
                    totalSubtotal =
                            totalSubtotal.add(
                                    bill.getSubtotal()
                            );
                }

                if (bill.getDiscount() != null) {
                    totalDiscount =
                            totalDiscount.add(
                                    bill.getDiscount()
                            );
                }

                if (bill.getTax() != null) {
                    totalTax =
                            totalTax.add(
                                    bill.getTax()
                            );
                }

                if (bill.getTotalAmount() != null) {
                    totalAmount =
                            totalAmount.add(
                                    bill.getTotalAmount()
                            );
                }

                if (bill.getPaidAmount() != null) {
                    totalPaid =
                            totalPaid.add(
                                    bill.getPaidAmount()
                            );
                }

                if (bill.getBalanceAmount() != null) {
                    totalBalance =
                            totalBalance.add(
                                    bill.getBalanceAmount()
                            );
                }

                String status =
                        bill.getStatus();

                if ("PAID"
                        .equalsIgnoreCase(status)) {

                    paid++;

                } else if ("PARTIALLY_PAID"
                        .equalsIgnoreCase(status)) {

                    partiallyPaid++;

                } else if ("UNPAID"
                        .equalsIgnoreCase(status)) {

                    unpaid++;
                }
            }
        }

        findings.add(
                "Total bills: "
                        + totalBills
        );

        findings.add(
                "Total amount: "
                        + totalAmount
        );

        findings.add(
                "Total paid: "
                        + totalPaid
        );

        findings.add(
                "Total outstanding balance: "
                        + totalBalance
        );

        findings.add(
                "Paid bills: "
                        + paid
        );

        findings.add(
                "Partially paid bills: "
                        + partiallyPaid
        );

        findings.add(
                "Unpaid bills: "
                        + unpaid
        );

        String summary =
                "Billing report generated. "
                        + "Total billed: "
                        + totalAmount
                        + ", Total paid: "
                        + totalPaid
                        + ", Outstanding: "
                        + totalBalance
                        + ".";

        return new ReportResult(
                "BILLING_REPORT",
                summary,
                findings,
                totalBills,
                paid,
                partiallyPaid,
                unpaid,
                0,
                totalAmount,
                totalPaid,
                totalBalance
        );
    }

    // =========================================================
    // PAYMENT REPORT
    // =========================================================

    public ReportResult generatePaymentReport(
            List<Payment> payments) {

        int totalPayments =
                payments != null
                        ? payments.size()
                        : 0;

        int successful = 0;
        int pending = 0;
        int failed = 0;
        int refunded = 0;

        BigDecimal totalAmount =
                BigDecimal.ZERO;

        List<String> findings =
                new ArrayList<>();

        if (payments != null) {

            for (Payment payment :
                    payments) {

                if (payment == null) {
                    continue;
                }

                if (payment.getAmount() != null) {

                    totalAmount =
                            totalAmount.add(
                                    payment.getAmount()
                            );
                }

                String status =
                        payment.getStatus();

                if ("SUCCESS"
                        .equalsIgnoreCase(status)) {

                    successful++;

                } else if ("PENDING"
                        .equalsIgnoreCase(status)) {

                    pending++;

                } else if ("FAILED"
                        .equalsIgnoreCase(status)) {

                    failed++;

                } else if ("REFUNDED"
                        .equalsIgnoreCase(status)) {

                    refunded++;
                }
            }
        }

        findings.add(
                "Total payments: "
                        + totalPayments
        );

        findings.add(
                "Successful payments: "
                        + successful
        );

        findings.add(
                "Pending payments: "
                        + pending
        );

        findings.add(
                "Failed payments: "
                        + failed
        );

        findings.add(
                "Refunded payments: "
                        + refunded
        );

        findings.add(
                "Total payment amount: "
                        + totalAmount
        );

        String summary =
                "Payment report generated. "
                        + "Total payments: "
                        + totalPayments
                        + ", Successful: "
                        + successful
                        + ", Failed: "
                        + failed
                        + ", Total amount: "
                        + totalAmount
                        + ".";

        return new ReportResult(
                "PAYMENT_REPORT",
                summary,
                findings,
                totalPayments,
                successful,
                pending,
                failed,
                refunded,
                totalAmount,
                BigDecimal.ZERO,
                BigDecimal.ZERO
        );
    }

    // =========================================================
    // CALCULATE BILL TOTAL
    // =========================================================

    private BigDecimal calculateTotalBills(
            List<Bill> bills) {

        BigDecimal total =
                BigDecimal.ZERO;

        if (bills == null) {
            return total;
        }

        for (Bill bill : bills) {

            if (bill != null &&
                    bill.getTotalAmount() != null) {

                total =
                        total.add(
                                bill.getTotalAmount()
                        );
            }
        }

        return total;
    }

    // =========================================================
    // CALCULATE PAYMENT TOTAL
    // =========================================================

    private BigDecimal calculateTotalPayments(
            List<Payment> payments) {

        BigDecimal total =
                BigDecimal.ZERO;

        if (payments == null) {
            return total;
        }

        for (Payment payment : payments) {

            if (payment != null &&
                    payment.getAmount() != null &&
                    "SUCCESS".equalsIgnoreCase(
                            payment.getStatus()
                    )) {

                total =
                        total.add(
                                payment.getAmount()
                        );
            }
        }

        return total;
    }

    // =========================================================
    // REPORT RESULT
    // =========================================================

    public static class ReportResult {

        private final String reportType;
        private final String summary;
        private final List<String> findings;

        private final int totalRecords;
        private final int primaryCount;
        private final int secondaryCount;
        private final int tertiaryCount;
        private final int additionalCount;

        private final BigDecimal primaryAmount;
        private final BigDecimal secondaryAmount;
        private final BigDecimal balanceAmount;

        public ReportResult(
                String reportType,
                String summary,
                List<String> findings,
                int totalRecords,
                int primaryCount,
                int secondaryCount,
                int tertiaryCount,
                int additionalCount,
                BigDecimal primaryAmount,
                BigDecimal secondaryAmount,
                BigDecimal balanceAmount) {

            this.reportType = reportType;
            this.summary = summary;
            this.findings = findings;
            this.totalRecords = totalRecords;
            this.primaryCount = primaryCount;
            this.secondaryCount = secondaryCount;
            this.tertiaryCount = tertiaryCount;
            this.additionalCount = additionalCount;
            this.primaryAmount = primaryAmount;
            this.secondaryAmount = secondaryAmount;
            this.balanceAmount = balanceAmount;
        }

        public String getReportType() {
            return reportType;
        }

        public String getSummary() {
            return summary;
        }

        public List<String> getFindings() {
            return findings;
        }

        public int getTotalRecords() {
            return totalRecords;
        }

        public int getPrimaryCount() {
            return primaryCount;
        }

        public int getSecondaryCount() {
            return secondaryCount;
        }

        public int getTertiaryCount() {
            return tertiaryCount;
        }

        public int getAdditionalCount() {
            return additionalCount;
        }

        public BigDecimal getPrimaryAmount() {
            return primaryAmount;
        }

        public BigDecimal getSecondaryAmount() {
            return secondaryAmount;
        }

        public BigDecimal getBalanceAmount() {
            return balanceAmount;
        }
    }
}