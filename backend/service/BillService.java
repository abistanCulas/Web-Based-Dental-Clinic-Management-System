package com.dentaflow.backend.service;

import com.dentaflow.backend.dto.BillItemDTO;
import com.dentaflow.backend.dto.PatientCheckoutSummaryDTO;
import com.dentaflow.backend.entity.Appointment;
import com.dentaflow.backend.entity.Bill;
import com.dentaflow.backend.entity.BillItem;
import com.dentaflow.backend.entity.Dentist;
import com.dentaflow.backend.entity.Medicine;
import com.dentaflow.backend.entity.Patient;
import com.dentaflow.backend.entity.Payment;
import com.dentaflow.backend.entity.Prescription;
import com.dentaflow.backend.entity.PrescriptionItem;
import com.dentaflow.backend.entity.Treatment;
import com.dentaflow.backend.entity.TreatmentPlan;
import com.dentaflow.backend.repository.AppointmentRepository;
import com.dentaflow.backend.repository.BillItemRepository;
import com.dentaflow.backend.repository.BillRepository;
import com.dentaflow.backend.repository.PatientRepository;
import com.dentaflow.backend.repository.PaymentRepository;
import com.dentaflow.backend.repository.PrescriptionItemRepository;
import com.dentaflow.backend.repository.PrescriptionRepository;
import com.dentaflow.backend.repository.TreatmentPlanRepository;
import com.dentaflow.backend.repository.TreatmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class BillService {

    private final BillRepository billRepository;
    private final BillItemRepository billItemRepository;
    private final PatientRepository patientRepository;
    private final PaymentRepository paymentRepository;
    private final TreatmentRepository treatmentRepository;
    private final TreatmentPlanRepository treatmentPlanRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final PrescriptionItemRepository prescriptionItemRepository;
    private final AppointmentRepository appointmentRepository;
    private final PaymentService paymentService;

    @Autowired
    public BillService(
            BillRepository billRepository,
            BillItemRepository billItemRepository,
            PatientRepository patientRepository,
            PaymentRepository paymentRepository,
            TreatmentRepository treatmentRepository,
            TreatmentPlanRepository treatmentPlanRepository,
            PrescriptionRepository prescriptionRepository,
            PrescriptionItemRepository prescriptionItemRepository,
            AppointmentRepository appointmentRepository,
            @Lazy PaymentService paymentService) {

        this.billRepository = billRepository;
        this.billItemRepository = billItemRepository;
        this.patientRepository = patientRepository;
        this.paymentRepository = paymentRepository;
        this.treatmentRepository = treatmentRepository;
        this.treatmentPlanRepository = treatmentPlanRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.prescriptionItemRepository = prescriptionItemRepository;
        this.appointmentRepository = appointmentRepository;
        this.paymentService = paymentService;
    }

    public BillService(
            BillRepository billRepository,
            BillItemRepository billItemRepository,
            PatientRepository patientRepository,
            PaymentRepository paymentRepository) {

        this(billRepository, billItemRepository, patientRepository, paymentRepository,
                null, null, null, null, null, null);
    }

    // =========================================================
    // CREATE BILL
    // =========================================================

    public Bill createBill(
            Long patientId,
            Bill bill) {

        if (bill == null) {
            throw new RuntimeException(
                    "Bill data is required"
            );
        }

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Patient not found with id: "
                                        + patientId
                        ));

        if ("INACTIVE".equalsIgnoreCase(patient.getStatus()) || "DEACTIVATED".equalsIgnoreCase(patient.getStatus())) {
            throw new RuntimeException("Cannot create bill for an inactive or deactivated patient");
        }

        bill.setPatient(patient);

        bill.setBillNumber(
                generateBillNumber()
        );

        if (bill.getBillDate() == null) {
            bill.setBillDate(
                    LocalDateTime.now()
            );
        }

        if (bill.getStatus() == null ||
                bill.getStatus().trim().isEmpty()) {

            bill.setStatus("UNPAID");
        }

        if (bill.getDiscount() == null) {
            bill.setDiscount(BigDecimal.ZERO);
        }

        if (bill.getTax() == null) {
            bill.setTax(BigDecimal.ZERO);
        }

        if (bill.getPaidAmount() == null) {
            bill.setPaidAmount(BigDecimal.ZERO);
        }

        calculateBillTotals(bill);

        return billRepository.save(bill);
    }

    // =========================================================
    // CREATE BILL WITH LINE ITEMS
    // =========================================================

    public Bill createBillWithItems(
            Long patientId,
            Bill bill,
            List<BillItemDTO> items) {

        if (items != null && !items.isEmpty()) {
            BigDecimal subtotal = BigDecimal.ZERO;
            for (BillItemDTO it : items) {
                if (it.getItemName() == null || it.getItemName().trim().isEmpty()) {
                    continue;
                }
                int qty = it.getQuantity() != null && it.getQuantity() > 0 ? it.getQuantity() : 1;
                BigDecimal price = it.getUnitPrice() != null && it.getUnitPrice().compareTo(BigDecimal.ZERO) >= 0
                        ? it.getUnitPrice()
                        : BigDecimal.ZERO;
                BigDecimal itemTot = price.multiply(BigDecimal.valueOf(qty)).setScale(2, RoundingMode.HALF_UP);
                it.setTotalPrice(itemTot);
                subtotal = subtotal.add(itemTot);
            }
            if (subtotal.compareTo(BigDecimal.ZERO) > 0) {
                bill.setSubtotal(subtotal);
            }
        }

        Bill saved = createBill(patientId, bill);

        if (items != null && !items.isEmpty()) {
            for (BillItemDTO it : items) {
                if (it.getItemName() == null || it.getItemName().trim().isEmpty()) {
                    continue;
                }
                BillItem bi = new BillItem();
                bi.setItemName(it.getItemName().trim());
                bi.setDescription(it.getDescription());
                bi.setQuantity(it.getQuantity() != null && it.getQuantity() > 0 ? it.getQuantity() : 1);
                bi.setUnitPrice(it.getUnitPrice() != null ? it.getUnitPrice() : BigDecimal.ZERO);
                bi.setItemType(it.getItemType() != null && !it.getItemType().trim().isEmpty() ? it.getItemType().trim() : "PROCEDURE");
                addBillItem(saved.getId(), bi);
            }
        }

        return getBillById(saved.getId());
    }

    // =========================================================
    // GENERATE BILL NUMBER
    // =========================================================

    private String generateBillNumber() {

        long nextNumber =
                billRepository.count() + 1;

        String number;

        do {
            number = String.format(
                    "BILL%06d",
                    nextNumber
            );

            nextNumber++;

        } while (
                billRepository.existsByBillNumber(number)
        );

        return number;
    }

    // =========================================================
    // ADD BILL ITEM
    // =========================================================

    public BillItem addBillItem(
            Long billId,
            BillItem item) {

        if (item == null) {
            throw new RuntimeException(
                    "Bill item is required"
            );
        }

        Bill bill = getBillById(billId);

        if ("PAID".equalsIgnoreCase(
                bill.getStatus())) {

            throw new RuntimeException(
                    "Cannot add item to a paid bill"
            );
        }

        if (item.getItemName() == null ||
                item.getItemName().trim().isEmpty()) {

            throw new RuntimeException(
                    "Bill item name is required"
            );
        }

        if (item.getQuantity() == null ||
                item.getQuantity() <= 0) {

            throw new RuntimeException(
                    "Quantity must be greater than zero"
            );
        }

        if (item.getUnitPrice() == null ||
                item.getUnitPrice()
                        .compareTo(BigDecimal.ZERO) < 0) {

            throw new RuntimeException(
                    "Unit price cannot be negative"
            );
        }

        if (billItemRepository
                .existsByBillIdAndItemNameIgnoreCase(
                        billId,
                        item.getItemName().trim()
                )) {

            throw new RuntimeException(
                    "This item already exists in the bill"
            );
        }

        item.setBill(bill);

        BigDecimal itemTotal =
                item.getUnitPrice()
                        .multiply(
                                BigDecimal.valueOf(
                                        item.getQuantity()
                                )
                        );

        item.setTotalPrice(
                itemTotal.setScale(
                        2,
                        RoundingMode.HALF_UP
                )
        );

        BillItem savedItem =
                billItemRepository.save(item);

        recalculateBill(billId);

        return savedItem;
    }

    // =========================================================
    // GET BILL ITEMS
    // =========================================================

    @Transactional(readOnly = true)
    public List<BillItem> getBillItems(Long billId) {

        getBillById(billId);

        return billItemRepository
                .findByBillIdOrderByIdAsc(
                        billId
                );
    }

    // =========================================================
    // REMOVE BILL ITEM
    // =========================================================

    public void removeBillItem(Long itemId) {

        BillItem item =
                billItemRepository.findById(itemId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Bill item not found"
                                ));

        Long billId =
                item.getBill().getId();

        billItemRepository.delete(item);

        recalculateBill(billId);
    }

    // =========================================================
    // RECALCULATE BILL
    // =========================================================

    public Bill recalculateBill(Long billId) {

        Bill bill = getBillById(billId);

        List<BillItem> items =
                billItemRepository.findByBillId(
                        billId
                );

        if (items != null && !items.isEmpty()) {
            BigDecimal subtotal =
                    BigDecimal.ZERO;

            for (BillItem item : items) {

                if (item.getQuantity() == null ||
                        item.getUnitPrice() == null) {
                    continue;
                }

                BigDecimal itemTotal =
                        item.getUnitPrice()
                                .multiply(
                                        BigDecimal.valueOf(
                                                item.getQuantity()
                                        )
                                );

                item.setTotalPrice(
                        itemTotal.setScale(
                                2,
                                RoundingMode.HALF_UP
                        )
                );

                subtotal = subtotal.add(
                        itemTotal
                );
            }

            subtotal = subtotal.setScale(
                    2,
                    RoundingMode.HALF_UP
            );

            bill.setSubtotal(subtotal);
        }

        calculateBillTotals(bill);

        return billRepository.save(bill);
    }

    // =========================================================
    // AUTOMATIC BILL CALCULATION
    // =========================================================

    private void calculateBillTotals(Bill bill) {

        BigDecimal subtotal =
                bill.getSubtotal() != null
                        ? bill.getSubtotal()
                        : (bill.getTotalAmount() != null ? bill.getTotalAmount() : BigDecimal.ZERO);

        bill.setSubtotal(subtotal);

        BigDecimal discount =
                bill.getDiscount() != null
                        ? bill.getDiscount()
                        : BigDecimal.ZERO;

        BigDecimal tax =
                bill.getTax() != null
                        ? bill.getTax()
                        : BigDecimal.ZERO;

        BigDecimal paidAmount =
                bill.getPaidAmount() != null
                        ? bill.getPaidAmount()
                        : BigDecimal.ZERO;

        if (subtotal.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException(
                    "Total amount cannot be negative"
            );
        }

        if (discount.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException(
                    "Discount cannot be negative"
            );
        }

        if (subtotal.compareTo(BigDecimal.ZERO) > 0 && discount.compareTo(subtotal) > 0) {
            throw new RuntimeException(
                    "Discount cannot exceed the total amount"
            );
        }

        if (tax.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException(
                    "Tax cannot be negative"
            );
        }

        if (paidAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException(
                    "Paid amount cannot be negative"
            );
        }

        BigDecimal total =
                subtotal
                        .subtract(discount)
                        .add(tax);

        if (total.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException(
                    "Final amount cannot be negative"
            );
        }

        total = total.setScale(
                2,
                RoundingMode.HALF_UP
        );

        bill.setTotalAmount(total);

        BigDecimal balance =
                total.subtract(paidAmount);

        if (balance.compareTo(BigDecimal.ZERO) < 0) {
            balance = BigDecimal.ZERO;
        }

        bill.setBalanceAmount(
                balance.setScale(
                        2,
                        RoundingMode.HALF_UP
                )
        );

        updatePaymentStatus(bill);
    }

    // =========================================================
    // UPDATE PAYMENT STATUS
    // =========================================================

    private void updatePaymentStatus(Bill bill) {

        if ("CANCELLED".equalsIgnoreCase(bill.getStatus())) {
            return;
        }

        BigDecimal total =
                bill.getTotalAmount() != null
                        ? bill.getTotalAmount()
                        : BigDecimal.ZERO;

        BigDecimal paid =
                bill.getPaidAmount() != null
                        ? bill.getPaidAmount()
                        : BigDecimal.ZERO;

        if (total.compareTo(BigDecimal.ZERO) == 0) {

            if (!"PAID".equalsIgnoreCase(bill.getStatus())) {
                bill.setStatus("UNPAID");
            }

        } else if (paid.compareTo(total) >= 0) {

            bill.setStatus("PAID");

        } else if (paid.compareTo(BigDecimal.ZERO) > 0) {

            bill.setStatus("PARTIALLY_PAID");

        } else {

            if (!"PARTIALLY_PAID".equalsIgnoreCase(bill.getStatus()) && !"PAID".equalsIgnoreCase(bill.getStatus())) {
                bill.setStatus("UNPAID");
            }
        }
    }

    // =========================================================
    // ADD PAYMENT AMOUNT
    // =========================================================

    public Bill addPaymentAmount(
            Long billId,
            BigDecimal amount) {

        if (amount == null ||
                amount.compareTo(BigDecimal.ZERO) <= 0) {

            throw new RuntimeException(
                    "Payment amount must be greater than zero"
            );
        }

        Bill bill = getBillById(billId);

        if ("PAID".equalsIgnoreCase(
                bill.getStatus())) {

            throw new RuntimeException(
                    "Bill is already fully paid"
            );
        }

        BigDecimal currentPaid =
                bill.getPaidAmount() != null
                        ? bill.getPaidAmount()
                        : BigDecimal.ZERO;

        BigDecimal newPaid =
                currentPaid.add(amount);

        if (bill.getTotalAmount() != null &&
                newPaid.compareTo(
                        bill.getTotalAmount()
                ) > 0) {

            throw new RuntimeException(
                    "Payment cannot exceed bill total"
            );
        }

        bill.setPaidAmount(
                newPaid.setScale(
                        2,
                        RoundingMode.HALF_UP
                )
        );

        calculateBillTotals(bill);

        return billRepository.save(bill);
    }

    // =========================================================
    // GET ALL BILLS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Bill> getAllBills() {
        return billRepository.findAll();
    }

    // =========================================================
    // GET BILL BY ID
    // =========================================================

    @Transactional(readOnly = true)
    public Bill getBillById(Long id) {

        return billRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Bill not found with id: " + id
                        ));
    }

    // =========================================================
    // GET BILL BY NUMBER
    // =========================================================

    @Transactional(readOnly = true)
    public Bill getBillByNumber(
            String billNumber) {

        if (billNumber == null ||
                billNumber.trim().isEmpty()) {

            throw new RuntimeException(
                    "Bill number is required"
            );
        }

        return billRepository
                .findByBillNumber(
                        billNumber
                                .trim()
                                .toUpperCase()
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "Bill not found: "
                                        + billNumber
                        ));
    }

    // =========================================================
    // GET PATIENT BILLS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Bill> getPatientBills(
            Long patientId) {

        patientRepository.findById(patientId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Patient not found with id: "
                                        + patientId
                        ));

        return billRepository
                .findByPatientIdOrderByBillDateDesc(
                        patientId
                );
    }

    // =========================================================
    // GET BILLS BY STATUS
    // =========================================================

    @Transactional(readOnly = true)
    public List<Bill> getBillsByStatus(
            String status) {

        if (status == null ||
                status.trim().isEmpty()) {

            throw new RuntimeException(
                    "Status is required"
            );
        }

        return billRepository
                .findByStatusIgnoreCaseOrderByBillDateDesc(
                        status.trim()
                );
    }

    // =========================================================
    // UPDATE BILL
    // =========================================================

    public Bill updateBill(
            Long billId,
            Bill updatedBill) {

        Bill existing =
                getBillById(billId);

        if (updatedBill == null) {
            throw new RuntimeException(
                    "Bill data is required"
            );
        }

        if ("PAID".equalsIgnoreCase(existing.getStatus())) {
            throw new RuntimeException("Paid bill cannot be modified. Issue a refund if adjustments are required.");
        }

        if (updatedBill.getPatient() != null) {
            existing.setPatient(updatedBill.getPatient());
        }

        if (updatedBill.getAppointment() != null) {
            existing.setAppointment(updatedBill.getAppointment());
        }

        if (updatedBill.getTreatment() != null) {
            existing.setTreatment(updatedBill.getTreatment());
        }

        if (updatedBill.getBillDate() != null) {
            existing.setBillDate(updatedBill.getBillDate());
        }

        if (updatedBill.getNotes() != null) {
            existing.setNotes(updatedBill.getNotes());
        }

        if (updatedBill.getSubtotal() != null) {
            if (updatedBill.getSubtotal().compareTo(BigDecimal.ZERO) < 0) {
                throw new RuntimeException("Subtotal cannot be negative");
            }
            existing.setSubtotal(updatedBill.getSubtotal());
        } else if (updatedBill.getTotalAmount() != null) {
            if (updatedBill.getTotalAmount().compareTo(BigDecimal.ZERO) < 0) {
                throw new RuntimeException("Total amount cannot be negative");
            }
            existing.setSubtotal(updatedBill.getTotalAmount());
        }

        if (updatedBill.getDiscount() != null) {
            if (updatedBill.getDiscount()
                    .compareTo(BigDecimal.ZERO) < 0) {
                throw new RuntimeException(
                        "Discount cannot be negative"
                );
            }
            existing.setDiscount(
                    updatedBill.getDiscount()
            );
        }

        if (updatedBill.getTax() != null) {
            if (updatedBill.getTax()
                    .compareTo(BigDecimal.ZERO) < 0) {
                throw new RuntimeException(
                        "Tax cannot be negative"
                );
            }
            existing.setTax(
                    updatedBill.getTax()
            );
        }

        if (updatedBill.getStatus() != null && !updatedBill.getStatus().trim().isEmpty()) {
            existing.setStatus(updatedBill.getStatus().trim().toUpperCase());
            if ("PAID".equalsIgnoreCase(updatedBill.getStatus())) {
                BigDecimal total = existing.getTotalAmount() != null ? existing.getTotalAmount() : BigDecimal.ZERO;
                existing.setPaidAmount(total);
                existing.setBalanceAmount(BigDecimal.ZERO);
            }
        }

        recalculateBill(billId);

        return billRepository.save(existing);
    }

    public Bill updateBill(
            Long billId,
            Bill updatedBill,
            List<BillItemDTO> items) {

        Bill bill = updateBill(billId, updatedBill);

        if (items != null) {
            billItemRepository.deleteByBillId(billId);
            for (BillItemDTO it : items) {
                if (it.getItemName() == null || it.getItemName().trim().isEmpty()) {
                    continue;
                }
                BillItem bi = new BillItem();
                bi.setItemName(it.getItemName().trim());
                bi.setDescription(it.getDescription());
                bi.setQuantity(it.getQuantity() != null && it.getQuantity() > 0 ? it.getQuantity() : 1);
                bi.setUnitPrice(it.getUnitPrice() != null ? it.getUnitPrice() : BigDecimal.ZERO);
                bi.setItemType(it.getItemType() != null && !it.getItemType().trim().isEmpty() ? it.getItemType().trim() : "PROCEDURE");
                addBillItem(billId, bi);
            }
            bill = getBillById(billId);
        }

        return bill;
    }

    // =========================================================
    // CANCEL BILL
    // =========================================================

    public Bill cancelBill(Long billId) {

        Bill bill =
                getBillById(billId);

        if ("PAID".equalsIgnoreCase(
                bill.getStatus())) {

            throw new RuntimeException(
                    "Paid bill cannot be cancelled. Issue a refund instead."
            );
        }

        if (paymentRepository.existsByBillId(billId) ||
                (bill.getPaidAmount() != null && bill.getPaidAmount().compareTo(BigDecimal.ZERO) > 0)) {

            throw new RuntimeException(
                    "Cannot cancel bill with recorded payments. Refund payments first."
            );
        }

        bill.setStatus("CANCELLED");

        return billRepository.save(bill);
    }

    // =========================================================
    // DELETE BILL
    // =========================================================

    public void deleteBill(Long billId) {

        Bill bill =
                getBillById(billId);

        if ("PAID".equalsIgnoreCase(
                bill.getStatus())) {

            throw new RuntimeException(
                    "Paid bill cannot be deleted"
            );
        }

        if (paymentRepository.existsByBillId(billId) ||
                (bill.getPaidAmount() != null && bill.getPaidAmount().compareTo(BigDecimal.ZERO) > 0)) {

            throw new RuntimeException(
                    "Cannot delete bill: payments have been recorded for this bill. Cancel or refund instead."
            );
        }

        billItemRepository.deleteByBillId(
                billId
        );

        billRepository.delete(bill);
    }

    // =========================================================
    // GET PATIENT CHECKOUT SUMMARY (CASHIER SEARCH)
    // =========================================================

    @Transactional(readOnly = true)
    public PatientCheckoutSummaryDTO getPatientCheckoutSummary(Long patientId) {
        if (patientId == null) {
            throw new RuntimeException("Patient ID is required");
        }

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient not found with ID: " + patientId));

        // 1. Treatment and Treatment Plan lookup
        List<Treatment> treatments = treatmentRepository.findByPatientIdOrderByTreatmentDateDesc(patientId);
        if (treatments != null && !treatments.isEmpty()) {
            treatments.sort((a, b) -> {
                int cmp = (b.getTreatmentDate() != null && a.getTreatmentDate() != null)
                        ? b.getTreatmentDate().compareTo(a.getTreatmentDate()) : 0;
                if (cmp != 0) return cmp;
                return b.getId().compareTo(a.getId());
            });
        }
        List<TreatmentPlan> plans = treatmentPlanRepository.findByPatientIdOrderByStartDateDesc(patientId);

        BigDecimal treatmentCost = BigDecimal.ZERO;
        String treatmentName = "Dental Consultation & Treatment";
        String treatmentDiagnosis = "";
        String treatmentStatus = "PLANNED";
        Long treatmentId = null;
        String treatmentCode = null;
        Long treatmentPlanId = null;
        String treatmentPlanCode = null;
        Dentist doctor = null;
        Appointment appointment = null;

        // Check if there is a treatment record with cost
        for (Treatment t : treatments) {
            BigDecimal cost = t.getActualCost() != null && t.getActualCost().compareTo(BigDecimal.ZERO) > 0
                    ? t.getActualCost()
                    : t.getEstimatedCost();
            if (cost != null && cost.compareTo(BigDecimal.ZERO) > 0) {
                treatmentCost = cost;
                treatmentName = t.getTreatmentType();
                treatmentDiagnosis = t.getDiagnosis();
                treatmentStatus = t.getStatus();
                treatmentId = t.getId();
                treatmentCode = t.getTreatmentCode();
                doctor = t.getDentist();
                appointment = t.getAppointment();
                break;
            }
        }

        // If treatment cost still zero, check Treatment Plans
        for (TreatmentPlan plan : plans) {
            if (treatmentCost.compareTo(BigDecimal.ZERO) == 0 && plan.getEstimatedTotalCost() != null && plan.getEstimatedTotalCost().compareTo(BigDecimal.ZERO) > 0) {
                treatmentCost = plan.getEstimatedTotalCost();
                treatmentName = plan.getPlanName();
                treatmentDiagnosis = plan.getDescription();
                treatmentStatus = plan.getStatus();
                treatmentPlanId = plan.getId();
                treatmentPlanCode = plan.getPlanCode();
                if (doctor == null) doctor = plan.getDentist();
                break;
            } else if (treatmentPlanId == null) {
                treatmentPlanId = plan.getId();
                treatmentPlanCode = plan.getPlanCode();
                if (doctor == null) doctor = plan.getDentist();
            }
        }

        // Fallback to first treatment if present even if zero
        if (treatmentId == null && !treatments.isEmpty()) {
            Treatment first = treatments.get(0);
            treatmentId = first.getId();
            treatmentCode = first.getTreatmentCode();
            treatmentName = first.getTreatmentType();
            treatmentDiagnosis = first.getDiagnosis();
            treatmentStatus = first.getStatus();
            if (doctor == null) doctor = first.getDentist();
            if (appointment == null) appointment = first.getAppointment();
        }

        // Check latest appointment if doctor or appointment not yet resolved
        List<Appointment> appts = appointmentRepository.findByPatientIdOrderByAppointmentDateDescStartTimeDesc(patientId);
        if (!appts.isEmpty()) {
            Appointment latestAppt = appts.get(0);
            if (appointment == null) appointment = latestAppt;
            if (doctor == null) doctor = latestAppt.getDentist();
        }

        // 2. Prescription and Pharmacy lookup
        List<Prescription> prescriptions = prescriptionRepository.findByPatientIdOrderByPrescriptionDateDesc(patientId);
        if (prescriptions != null && !prescriptions.isEmpty()) {
            prescriptions.sort((a, b) -> {
                int cmp = (b.getPrescriptionDate() != null && a.getPrescriptionDate() != null)
                        ? b.getPrescriptionDate().compareTo(a.getPrescriptionDate()) : 0;
                if (cmp != 0) return cmp;
                return b.getId().compareTo(a.getId());
            });
        }
        Prescription latestRx = null;
        // Prioritize dispensed or completed prescription
        for (Prescription rx : prescriptions) {
            if ("DISPENSED".equalsIgnoreCase(rx.getStatus()) || "COMPLETED".equalsIgnoreCase(rx.getStatus())) {
                latestRx = rx;
                break;
            }
        }
        if (latestRx == null) {
            for (Prescription rx : prescriptions) {
                if (!"CANCELLED".equalsIgnoreCase(rx.getStatus())) {
                    latestRx = rx;
                    break;
                }
            }
        }

        boolean isDispensed = false;
        BigDecimal pharmacyCharge = BigDecimal.ZERO;
        List<PatientCheckoutSummaryDTO.PrescribedItemDTO> prescribedItems = new java.util.ArrayList<>();

        if (latestRx != null) {
            isDispensed = "DISPENSED".equalsIgnoreCase(latestRx.getStatus()) || "COMPLETED".equalsIgnoreCase(latestRx.getStatus());
            List<PrescriptionItem> items = prescriptionItemRepository.findByPrescriptionIdOrderByIdAsc(latestRx.getId());
            if (items != null) {
                for (PrescriptionItem it : items) {
                    Medicine med = it.getMedicine();
                    BigDecimal unitPrice = med != null && med.getUnitPrice() != null ? med.getUnitPrice() : BigDecimal.ZERO;
                    int qty = it.getQuantity() != null ? it.getQuantity() : 1;
                    BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(qty));

                    if (isDispensed) {
                        pharmacyCharge = pharmacyCharge.add(lineTotal);
                    }

                    prescribedItems.add(PatientCheckoutSummaryDTO.PrescribedItemDTO.builder()
                            .id(it.getId())
                            .medicineId(med != null ? med.getId() : null)
                            .medicineName(med != null ? med.getName() : "Prescribed Medicine")
                            .genericName(med != null ? med.getGenericName() : "")
                            .dosage(it.getDosage())
                            .frequency(it.getFrequency())
                            .durationDays(it.getDurationDays())
                            .quantity(qty)
                            .unitPrice(unitPrice)
                            .totalPrice(lineTotal)
                            .dispensed(isDispensed)
                            .build());
                }
            }
        }

        // Authoritative Grand Total calculated by backend
        treatmentCost = treatmentCost.setScale(2, RoundingMode.HALF_UP);
        pharmacyCharge = pharmacyCharge.setScale(2, RoundingMode.HALF_UP);
        BigDecimal grandTotal = treatmentCost.add(pharmacyCharge).setScale(2, RoundingMode.HALF_UP);

        // 3. Existing Bill and Payment lookup
        List<Bill> patientBills = billRepository.findByPatientIdOrderByBillDateDesc(patientId);
        Bill activeBill = null;

        for (Bill b : patientBills) {
            if ("CANCELLED".equalsIgnoreCase(b.getStatus())) continue;
            if (treatmentId != null && b.getTreatment() != null && treatmentId.equals(b.getTreatment().getId())) {
                activeBill = b;
                break;
            }
            if (appointment != null && b.getAppointment() != null && appointment.getId().equals(b.getAppointment().getId())) {
                activeBill = b;
                break;
            }
            if ("UNPAID".equalsIgnoreCase(b.getStatus()) || "PARTIALLY_PAID".equalsIgnoreCase(b.getStatus())) {
                if (activeBill == null) activeBill = b;
            }
        }

        if (activeBill == null && !patientBills.isEmpty()) {
            for (Bill b : patientBills) {
                if (!"CANCELLED".equalsIgnoreCase(b.getStatus())) {
                    activeBill = b;
                    break;
                }
            }
        }

        Long billId = null;
        String billNumber = null;
        String billStatus = "NOT_GENERATED";
        BigDecimal subtotal = grandTotal;
        BigDecimal discount = BigDecimal.ZERO;
        BigDecimal tax = BigDecimal.ZERO;
        BigDecimal paidAmount = BigDecimal.ZERO;
        BigDecimal balanceAmount = grandTotal;
        LocalDateTime billDate = null;

        Long paymentId = null;
        String paymentStatus = "NONE";
        String paymentMethod = null;
        String paymentReference = null;
        String transactionId = null;

        if (activeBill != null) {
            billId = activeBill.getId();
            billNumber = activeBill.getBillNumber();
            billStatus = activeBill.getStatus();
            subtotal = activeBill.getSubtotal() != null ? activeBill.getSubtotal() : grandTotal;
            discount = activeBill.getDiscount() != null ? activeBill.getDiscount() : BigDecimal.ZERO;
            tax = activeBill.getTax() != null ? activeBill.getTax() : BigDecimal.ZERO;
            paidAmount = activeBill.getPaidAmount() != null ? activeBill.getPaidAmount() : BigDecimal.ZERO;
            balanceAmount = activeBill.getBalanceAmount() != null ? activeBill.getBalanceAmount() : BigDecimal.ZERO;
            billDate = activeBill.getBillDate();

            List<Payment> payments = paymentRepository.findByBillIdOrderByPaymentDateDesc(activeBill.getId());
            if (!payments.isEmpty()) {
                Payment latestPayment = payments.get(0);
                paymentId = latestPayment.getId();
                paymentStatus = latestPayment.getStatus();
                paymentMethod = latestPayment.getPaymentMethod();
                paymentReference = latestPayment.getPaymentReference();
                transactionId = latestPayment.getTransactionId();
            }
        }

        String patientFullName = ((patient.getFirstName() != null ? patient.getFirstName() : "") + " "
                + (patient.getLastName() != null ? patient.getLastName() : "")).trim();

        String doctorFullName = doctor != null
                ? "Dr. " + ((doctor.getFirstName() != null ? doctor.getFirstName() : "") + " "
                + (doctor.getLastName() != null ? doctor.getLastName() : "")).trim()
                : (appointment != null && appointment.getDentist() != null
                ? "Dr. " + appointment.getDentist().getFirstName() + " " + appointment.getDentist().getLastName()
                : "Attending Dentist");

        return PatientCheckoutSummaryDTO.builder()
                .patientId(patient.getId())
                .patientCode(patient.getPatientCode())
                .patientName(patientFullName)
                .patientPhone(patient.getPhone())
                .patientEmail(patient.getEmail())
                .dentistId(doctor != null ? doctor.getId() : null)
                .doctorName(doctorFullName)
                .doctorSpecialization(doctor != null ? doctor.getSpecialization() : "Dental Specialist")
                .appointmentId(appointment != null ? appointment.getId() : null)
                .appointmentCode(appointment != null ? appointment.getAppointmentCode() : null)
                .appointmentDate(appointment != null ? appointment.getAppointmentDate() : null)
                .appointmentTime(appointment != null && appointment.getStartTime() != null ? appointment.getStartTime().toString() : null)
                .appointmentType(appointment != null ? appointment.getAppointmentType() : null)
                .appointmentStatus(appointment != null ? appointment.getStatus() : null)
                .treatmentId(treatmentId)
                .treatmentCode(treatmentCode)
                .treatmentPlanId(treatmentPlanId)
                .treatmentPlanCode(treatmentPlanCode)
                .treatmentName(treatmentName)
                .treatmentDiagnosis(treatmentDiagnosis)
                .treatmentStatus(treatmentStatus)
                .treatmentCost(treatmentCost)
                .prescriptionId(latestRx != null ? latestRx.getId() : null)
                .prescriptionCode(latestRx != null ? latestRx.getPrescriptionCode() : null)
                .prescriptionDate(latestRx != null ? latestRx.getPrescriptionDate() : null)
                .prescriptionStatus(latestRx != null ? latestRx.getStatus() : "NONE")
                .prescriptionDispensed(isDispensed)
                .prescribedMedicines(prescribedItems)
                .treatmentCharge(treatmentCost)
                .pharmacyCharge(pharmacyCharge)
                .grandTotal(grandTotal)
                .billId(billId)
                .billNumber(billNumber)
                .billStatus(billStatus)
                .subtotal(subtotal)
                .discount(discount)
                .tax(tax)
                .paidAmount(paidAmount)
                .balanceAmount(balanceAmount)
                .billDate(billDate)
                .paymentId(paymentId)
                .paymentStatus(paymentStatus)
                .paymentMethod(paymentMethod)
                .paymentReference(paymentReference)
                .transactionId(transactionId)
                .build();
    }

    // =========================================================
    // LOOKUP PATIENTS FOR CASHIER (BY ID, CODE, PHONE, NAME)
    // =========================================================

    @Transactional(readOnly = true)
    public List<PatientCheckoutSummaryDTO> lookupPatient(String query) {
        if (query == null || query.trim().isEmpty()) {
            return java.util.Collections.emptyList();
        }

        String q = query.trim();
        List<Patient> matches = new java.util.ArrayList<>();

        // If numeric, check patient ID
        if (q.matches("^\\d+$")) {
            patientRepository.findById(Long.parseLong(q)).ifPresent(matches::add);
        }

        // Search across code, names, phone, email
        List<Patient> found = patientRepository.searchAcrossFields(q);
        for (Patient p : found) {
            if (matches.stream().noneMatch(m -> m.getId().equals(p.getId()))) {
                matches.add(p);
            }
        }

        List<PatientCheckoutSummaryDTO> results = new java.util.ArrayList<>();
        for (Patient p : matches) {
            try {
                results.add(getPatientCheckoutSummary(p.getId()));
            } catch (Exception e) {
                // Ignore error building single patient summary in bulk search
            }
        }

        return results;
    }

    // =========================================================
    // GENERATE OR UPDATE COMBINED BILL (AUTHORITATIVE)
    // =========================================================

    public Bill generateOrUpdateCombinedBill(Long patientId) {
        PatientCheckoutSummaryDTO summary = getPatientCheckoutSummary(patientId);

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient not found with ID: " + patientId));

        if ("INACTIVE".equalsIgnoreCase(patient.getStatus()) || "DEACTIVATED".equalsIgnoreCase(patient.getStatus())) {
            throw new RuntimeException("Cannot generate bill for an inactive patient");
        }

        Bill bill = null;
        if (summary.getBillId() != null) {
            bill = billRepository.findById(summary.getBillId()).orElse(null);
        }

        // If no bill exists or existing bill is CANCELLED or already PAID, create a new one
        if (bill == null || "CANCELLED".equalsIgnoreCase(bill.getStatus())) {
            bill = new Bill();
            bill.setPatient(patient);
            bill.setBillNumber(generateBillNumber());
            bill.setBillDate(LocalDateTime.now());
            bill.setStatus("UNPAID");
            bill.setPaidAmount(BigDecimal.ZERO);
            bill.setDiscount(BigDecimal.ZERO);
            bill.setTax(BigDecimal.ZERO);
        }

        if (summary.getTreatmentId() != null) {
            treatmentRepository.findById(summary.getTreatmentId()).ifPresent(bill::setTreatment);
        }
        if (summary.getAppointmentId() != null) {
            appointmentRepository.findById(summary.getAppointmentId()).ifPresent(bill::setAppointment);
        }

        bill.setNotes("Combined Billing: " + summary.getTreatmentName()
                + (summary.isPrescriptionDispensed() ? " + Pharmacy Dispensation (" + summary.getPrescriptionCode() + ")" : ""));

        // Save bill to ensure ID exists
        bill = billRepository.save(bill);

        // Delete previous items for this bill to avoid duplicate charges (Idempotent update)
        billItemRepository.deleteByBillId(bill.getId());

        // Add Treatment Item
        if (summary.getTreatmentCharge() != null && summary.getTreatmentCharge().compareTo(BigDecimal.ZERO) > 0) {
            BillItem treatmentItem = new BillItem();
            treatmentItem.setBill(bill);
            treatmentItem.setItemName(summary.getTreatmentName());
            treatmentItem.setDescription(summary.getTreatmentDiagnosis() != null && !summary.getTreatmentDiagnosis().isEmpty()
                    ? summary.getTreatmentDiagnosis()
                    : "Clinical Dental Procedure");
            treatmentItem.setQuantity(1);
            treatmentItem.setUnitPrice(summary.getTreatmentCharge());
            treatmentItem.setTotalPrice(summary.getTreatmentCharge());
            treatmentItem.setItemType("TREATMENT");
            billItemRepository.save(treatmentItem);
        }

        // Add Pharmacy items ONLY if dispensed
        if (summary.isPrescriptionDispensed() && summary.getPrescribedMedicines() != null) {
            for (PatientCheckoutSummaryDTO.PrescribedItemDTO medItem : summary.getPrescribedMedicines()) {
                BillItem pharmacyItem = new BillItem();
                pharmacyItem.setBill(bill);
                pharmacyItem.setItemName(medItem.getMedicineName());
                pharmacyItem.setDescription("Prescription " + summary.getPrescriptionCode() + " - " + medItem.getDosage());
                pharmacyItem.setQuantity(medItem.getQuantity() != null ? medItem.getQuantity() : 1);
                pharmacyItem.setUnitPrice(medItem.getUnitPrice() != null ? medItem.getUnitPrice() : BigDecimal.ZERO);
                pharmacyItem.setTotalPrice(medItem.getTotalPrice() != null ? medItem.getTotalPrice() : BigDecimal.ZERO);
                pharmacyItem.setItemType("PHARMACY");
                billItemRepository.save(pharmacyItem);
            }
        }

        // Recalculate totals
        BigDecimal subtotal = summary.getGrandTotal();
        bill.setSubtotal(subtotal);

        BigDecimal discount = bill.getDiscount() != null ? bill.getDiscount() : BigDecimal.ZERO;
        BigDecimal tax = bill.getTax() != null ? bill.getTax() : BigDecimal.ZERO;
        BigDecimal total = subtotal.subtract(discount).add(tax).setScale(2, RoundingMode.HALF_UP);
        bill.setTotalAmount(total);

        BigDecimal paid = bill.getPaidAmount() != null ? bill.getPaidAmount() : BigDecimal.ZERO;
        BigDecimal balance = total.subtract(paid);
        if (balance.compareTo(BigDecimal.ZERO) < 0) balance = BigDecimal.ZERO;
        bill.setBalanceAmount(balance.setScale(2, RoundingMode.HALF_UP));

        if (balance.compareTo(BigDecimal.ZERO) == 0 && total.compareTo(BigDecimal.ZERO) > 0) {
            bill.setStatus("PAID");
        } else if (paid.compareTo(BigDecimal.ZERO) > 0) {
            bill.setStatus("PARTIALLY_PAID");
        } else {
            bill.setStatus("UNPAID");
        }

        return billRepository.save(bill);
    }

    // =========================================================
    // PAY CASH FOR PATIENT COMBINED BILL
    // =========================================================

    public Bill payCashForPatient(Long patientId, BigDecimal requestedAmount, String notes) {
        Bill bill = generateOrUpdateCombinedBill(patientId);

        if ("PAID".equalsIgnoreCase(bill.getStatus())) {
            return bill;
        }

        BigDecimal balance = bill.getBalanceAmount() != null ? bill.getBalanceAmount() : bill.getTotalAmount();
        BigDecimal payAmount = (requestedAmount != null && requestedAmount.compareTo(BigDecimal.ZERO) > 0)
                ? requestedAmount
                : balance;

        if (payAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Payment amount must be greater than zero");
        }

        Payment payment = new Payment();
        payment.setBill(bill);
        payment.setAmount(payAmount);
        payment.setPaymentMethod("CASH");
        payment.setStatus("PENDING");
        payment.setNotes(notes != null && !notes.trim().isEmpty() ? notes.trim() : "Cash payment collected at DentaFlow Cashier");

        Payment savedPayment = paymentService.createPayment(bill.getId(), payment);
        paymentService.markPaymentSuccessful(savedPayment.getId());

        return getBillById(bill.getId());
    }
}