package com.dentaflow.backend.mapper;

import com.dentaflow.backend.dto.BillItemDTO;
import com.dentaflow.backend.dto.BillingDTO;
import com.dentaflow.backend.entity.Bill;
import com.dentaflow.backend.entity.BillItem;
import com.dentaflow.backend.entity.Dentist;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class BillingMapper {

    // =========================================================
    // ENTITY → DTO
    // =========================================================

    public BillingDTO toDTO(Bill bill) {
        return toDTO(bill, null);
    }

    public BillingDTO toDTO(Bill bill, List<BillItem> items) {
        if (bill == null) {
            return null;
        }

        String patientName = null;
        if (bill.getPatient() != null) {
            String fn = bill.getPatient().getFirstName() != null ? bill.getPatient().getFirstName() : "";
            String ln = bill.getPatient().getLastName() != null ? bill.getPatient().getLastName() : "";
            patientName = (fn + " " + ln).trim();
            if (patientName.isEmpty()) {
                patientName = "Patient #" + bill.getPatient().getId();
            }
        }

        String doctorName = null;
        String apptCode = null;
        if (bill.getAppointment() != null) {
            apptCode = bill.getAppointment().getAppointmentCode();
            Dentist d = bill.getAppointment().getDentist();
            if (d != null) {
                String dfn = d.getFirstName() != null ? d.getFirstName() : "";
                String dln = d.getLastName() != null ? d.getLastName() : "";
                doctorName = (dfn + " " + dln).trim();
            }
        }

        String treatmentName = null;
        if (bill.getTreatment() != null) {
            treatmentName = bill.getTreatment().getTreatmentType();
            if (doctorName == null && bill.getTreatment().getDentist() != null) {
                Dentist d = bill.getTreatment().getDentist();
                String dfn = d.getFirstName() != null ? d.getFirstName() : "";
                String dln = d.getLastName() != null ? d.getLastName() : "";
                doctorName = (dfn + " " + dln).trim();
            }
        }

        List<BillItemDTO> itemDTOs = null;
        if (items != null && !items.isEmpty()) {
            itemDTOs = items.stream().map(this::toItemDTO).collect(Collectors.toList());
        }

        return BillingDTO.builder()
                .id(bill.getId())
                .billNumber(bill.getBillNumber())
                .patientId(bill.getPatient() != null ? bill.getPatient().getId() : null)
                .patientName(patientName)
                .appointmentId(bill.getAppointment() != null ? bill.getAppointment().getId() : null)
                .appointmentCode(apptCode)
                .treatmentId(bill.getTreatment() != null ? bill.getTreatment().getId() : null)
                .treatmentName(treatmentName)
                .doctorName(doctorName)
                .billDate(bill.getBillDate())
                .subtotal(bill.getSubtotal())
                .discount(bill.getDiscount())
                .tax(bill.getTax())
                .totalAmount(bill.getTotalAmount())
                .paidAmount(bill.getPaidAmount())
                .balanceAmount(bill.getBalanceAmount())
                .status(bill.getStatus())
                .notes(bill.getNotes())
                .items(itemDTOs)
                .build();
    }

    public BillItemDTO toItemDTO(BillItem item) {
        if (item == null) return null;
        return BillItemDTO.builder()
                .id(item.getId())
                .billId(item.getBill() != null ? item.getBill().getId() : null)
                .itemName(item.getItemName())
                .description(item.getDescription())
                .quantity(item.getQuantity())
                .unitPrice(item.getUnitPrice())
                .totalPrice(item.getTotalPrice())
                .itemType(item.getItemType())
                .build();
    }

    public BillItem toItemEntity(BillItemDTO dto) {
        if (dto == null) return null;
        BillItem item = new BillItem();
        item.setId(dto.getId());
        item.setItemName(dto.getItemName());
        item.setDescription(dto.getDescription());
        item.setQuantity(dto.getQuantity() != null && dto.getQuantity() > 0 ? dto.getQuantity() : 1);
        item.setUnitPrice(dto.getUnitPrice() != null ? dto.getUnitPrice() : java.math.BigDecimal.ZERO);
        item.setItemType(dto.getItemType() != null ? dto.getItemType() : "PROCEDURE");
        return item;
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