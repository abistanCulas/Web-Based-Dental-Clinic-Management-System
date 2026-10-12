package com.dentaflow.backend.mapper;

import com.dentaflow.backend.dto.PurchaseRequestDTO;
import com.dentaflow.backend.entity.PurchaseRequest;
import org.springframework.stereotype.Component;

@Component
public class PurchaseRequestMapper {

    public PurchaseRequestDTO toDTO(PurchaseRequest entity) {
        if (entity == null) {
            return null;
        }

        String pharmacistName = null;
        String pharmacistEmail = null;
        Long pharmacistId = null;

        if (entity.getPharmacist() != null) {
            pharmacistId = entity.getPharmacist().getId();
            pharmacistEmail = entity.getPharmacist().getEmail();
            String first = entity.getPharmacist().getFirstName() != null ? entity.getPharmacist().getFirstName().trim() : "";
            String last = entity.getPharmacist().getLastName() != null ? entity.getPharmacist().getLastName().trim() : "";
            pharmacistName = (first + " " + last).trim();
            if (pharmacistName.isEmpty()) {
                pharmacistName = pharmacistEmail;
            }
        }

        Long medicineId = null;
        String medicineCode = null;
        if (entity.getMedicine() != null) {
            medicineId = entity.getMedicine().getId();
            medicineCode = entity.getMedicine().getMedicineCode();
        }

        Long processedById = null;
        String processedByName = null;
        if (entity.getProcessedBy() != null) {
            processedById = entity.getProcessedBy().getId();
            String pFirst = entity.getProcessedBy().getFirstName() != null ? entity.getProcessedBy().getFirstName().trim() : "";
            String pLast = entity.getProcessedBy().getLastName() != null ? entity.getProcessedBy().getLastName().trim() : "";
            processedByName = (pFirst + " " + pLast).trim();
            if (processedByName.isEmpty()) {
                processedByName = entity.getProcessedBy().getEmail();
            }
        }

        return PurchaseRequestDTO.builder()
                .id(entity.getId())
                .requestCode(entity.getRequestCode())
                .pharmacistId(pharmacistId)
                .pharmacistName(pharmacistName)
                .pharmacistEmail(pharmacistEmail)
                .medicineId(medicineId)
                .medicineCode(medicineCode)
                .medicineName(entity.getMedicineName())
                .requestedQuantity(entity.getRequestedQuantity())
                .reason(entity.getReason())
                .status(entity.getStatus())
                .adminNote(entity.getAdminNote())
                .requestDate(entity.getRequestDate())
                .processedAt(entity.getProcessedAt())
                .processedById(processedById)
                .processedByName(processedByName)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
