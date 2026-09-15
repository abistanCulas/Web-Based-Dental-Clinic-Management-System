package com.dentaflow.backend.mapper;

import com.dentaflow.backend.dto.BillingDTO;
import com.dentaflow.backend.entity.Bill;
import org.springframework.stereotype.Component;

@Component
public class BillingMapper {

    // =========================================================
    // ENTITY → DTO
    // =========================================================

    public BillingDTO toDTO(Bill bill) {

        if (bill == null) {
            return null;
        }

        return BillingDTO.builder()
                .id(bill.getId())
                .billNumber(bill.getBillNumber())

                .patientId(
                        bill.getPatient() != null
                                ? bill.getPatient().getId()
                                : null
                )

                .appointmentId(
                        bill.getAppointment() != null
                                ? bill.getAppointment().getId()
                                : null
                )

                .treatmentId(
                        bill.getTreatment() != null
                                ? bill.getTreatment().getId()
                                : null
                )

                .billDate(bill.getBillDate())
                .subtotal(bill.getSubtotal())
                .discount(bill.getDiscount())
                .tax(bill.getTax())
                .totalAmount(bill.getTotalAmount())
                .paidAmount(bill.getPaidAmount())
                .balanceAmount(bill.getBalanceAmount())
                .status(bill.getStatus())
                .notes(bill.getNotes())
                .build();
    }

    // =========================================================
    // DTO → ENTITY
    // =========================================================

    public Bill toEntity(BillingDTO dto) {

        if (dto == null) {
            return null;
        }

        Bill bill = new Bill();

        bill.setId(dto.getId());
        bill.setBillNumber(dto.getBillNumber());
        bill.setBillDate(dto.getBillDate());

        bill.setSubtotal(dto.getSubtotal());
        bill.setDiscount(dto.getDiscount());
        bill.setTax(dto.getTax());

        bill.setTotalAmount(dto.getTotalAmount());
        bill.setPaidAmount(dto.getPaidAmount());
        bill.setBalanceAmount(dto.getBalanceAmount());

        bill.setStatus(dto.getStatus());
        bill.setNotes(dto.getNotes());

        return bill;
    }
}