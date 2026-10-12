package com.dentaflow.backend.mapper;

import com.dentaflow.backend.dto.MedicineDTO;
import com.dentaflow.backend.entity.Medicine;
import org.springframework.stereotype.Component;

@Component
public class MedicineMapper {

    // =========================================================
    // ENTITY → DTO
    // =========================================================

    public MedicineDTO toDTO(Medicine medicine) {

        if (medicine == null) {
            return null;
        }

        return MedicineDTO.builder()
                .id(medicine.getId())
                .medicineCode(
                        medicine.getMedicineCode()
                )
                .name(
                        medicine.getName()
                )
                .genericName(
                        medicine.getGenericName()
                )
                .brandName(
                        medicine.getBrandName()
                )
                .category(
                        medicine.getCategory()
                )
                .dosageForm(
                        medicine.getDosageForm()
                )
                .strength(
                        medicine.getStrength()
                )
                .manufacturer(
                        medicine.getManufacturer()
                )
                .stockQuantity(
                        medicine.getStockQuantity()
                )
                .reorderLevel(
                        medicine.getReorderLevel()
                )
                .unitPrice(
                        medicine.getUnitPrice()
                )
                .expiryDate(
                        medicine.getExpiryDate()
                )
                .allergyWarning(
                        medicine.getAllergyWarning()
                )
                .interactionInformation(
                        medicine.getInteractionInformation()
                )
                .status(
                        medicine.getStatus()
                )
                .build();
    }

    // =========================================================
    // DTO → ENTITY
    // =========================================================

    public Medicine toEntity(MedicineDTO dto) {

        if (dto == null) {
            return null;
        }

        Medicine medicine =
                new Medicine();

        medicine.setId(
                dto.getId()
        );

        medicine.setMedicineCode(
                dto.getMedicineCode()
        );

        medicine.setName(
                dto.getName()
        );

        medicine.setGenericName(
                dto.getGenericName()
        );

        medicine.setBrandName(
                dto.getBrandName()
        );

        medicine.setCategory(
                dto.getCategory()
        );

        medicine.setDosageForm(
                dto.getDosageForm()
        );

        medicine.setStrength(
                dto.getStrength()
        );

        medicine.setManufacturer(
                dto.getManufacturer()
        );

        medicine.setStockQuantity(
                dto.getStockQuantity()
        );

        medicine.setReorderLevel(
                dto.getReorderLevel()
        );

        medicine.setUnitPrice(
                dto.getUnitPrice()
        );

        medicine.setExpiryDate(
                dto.getExpiryDate()
        );

        medicine.setAllergyWarning(
                dto.getAllergyWarning()
        );

        medicine.setInteractionInformation(
                dto.getInteractionInformation()
        );

        medicine.setStatus(
                dto.getStatus()
        );

        return medicine;
    }
}