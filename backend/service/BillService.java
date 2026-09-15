package com.dentaflow.backend.service;

import com.dentaflow.backend.entity.Bill;
import com.dentaflow.backend.entity.BillItem;
import com.dentaflow.backend.entity.Patient;
import com.dentaflow.backend.repository.BillItemRepository;
import com.dentaflow.backend.repository.BillRepository;
import com.dentaflow.backend.repository.PatientRepository;
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

    public BillService(
            BillRepository billRepository,
            BillItemRepository billItemRepository,
            PatientRepository patientRepository) {

        this.billRepository = billRepository;
        this.billItemRepository = billItemRepository;
        this.patientRepository = patientRepository;
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
                        : BigDecimal.ZERO;

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

        if (discount.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException(
                    "Discount cannot be negative"
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
            total = BigDecimal.ZERO;
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

        BigDecimal total =
                bill.getTotalAmount() != null
                        ? bill.getTotalAmount()
                        : BigDecimal.ZERO;

        BigDecimal paid =
                bill.getPaidAmount() != null
                        ? bill.getPaidAmount()
                        : BigDecimal.ZERO;

        if (total.compareTo(BigDecimal.ZERO) == 0) {

            bill.setStatus("UNPAID");

        } else if (paid.compareTo(total) >= 0) {

            bill.setStatus("PAID");

        } else if (paid.compareTo(BigDecimal.ZERO) > 0) {

            bill.setStatus("PARTIALLY_PAID");

        } else {

            bill.setStatus("UNPAID");
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

        recalculateBill(billId);

        return billRepository.save(existing);
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

        billItemRepository.deleteByBillId(
                billId
        );

        billRepository.delete(bill);
    }
}