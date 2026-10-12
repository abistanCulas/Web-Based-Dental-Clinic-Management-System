package com.dentaflow.backend.service;

import com.dentaflow.backend.entity.DentalService;
import com.dentaflow.backend.repository.DentalServiceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class DentalServiceService {

    private final DentalServiceRepository dentalServiceRepository;

    public DentalServiceService(DentalServiceRepository dentalServiceRepository) {
        this.dentalServiceRepository = dentalServiceRepository;
    }

    // =========================================================
    // GET ALL ACTIVE SERVICES (PUBLIC)
    // =========================================================
    @Transactional(readOnly = true)
    public List<DentalService> getAllActiveServices() {
        return dentalServiceRepository.findByStatusIgnoreCaseOrderByNameAsc("ACTIVE");
    }

    // =========================================================
    // GET ALL SERVICES (ADMIN)
    // =========================================================
    @Transactional(readOnly = true)
    public List<DentalService> getAllServicesAdmin() {
        return dentalServiceRepository.findAllByOrderByIdDesc();
    }

    // =========================================================
    // GET SERVICE BY ID
    // =========================================================
    @Transactional(readOnly = true)
    public DentalService getServiceById(Long id) {
        if (id == null) {
            throw new RuntimeException("Service ID is required");
        }
        return dentalServiceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Dental service not found with id: " + id));
    }

    // =========================================================
    // CREATE SERVICE (ADMIN)
    // =========================================================
    public DentalService createService(DentalService service) {
        if (service == null) {
            throw new RuntimeException("Dental service data is required");
        }

        if (service.getName() == null || service.getName().trim().isEmpty()) {
            throw new RuntimeException("Service name is required");
        }
        service.setName(service.getName().trim());

        if (service.getCategory() == null || service.getCategory().trim().isEmpty()) {
            throw new RuntimeException("Service category is required");
        }
        service.setCategory(service.getCategory().trim());

        if (service.getPrice() == null) {
            throw new RuntimeException("Service price is required");
        }

        if (dentalServiceRepository.existsByNameIgnoreCase(service.getName())) {
            throw new RuntimeException("A service with name '" + service.getName() + "' already exists");
        }

        // Service code handling
        if (service.getServiceCode() == null || service.getServiceCode().trim().isEmpty()) {
            service.setServiceCode(generateUniqueServiceCode());
        } else {
            service.setServiceCode(service.getServiceCode().trim().toUpperCase());
            if (dentalServiceRepository.existsByServiceCode(service.getServiceCode())) {
                throw new RuntimeException("Service code '" + service.getServiceCode() + "' already exists");
            }
        }

        if (service.getStatus() == null || service.getStatus().trim().isEmpty()) {
            service.setStatus("ACTIVE");
        } else {
            service.setStatus(service.getStatus().trim().toUpperCase());
        }

        if (service.getDuration() != null) {
            service.setDuration(service.getDuration().trim());
        }

        if (service.getIcon() != null) {
            service.setIcon(service.getIcon().trim().toLowerCase());
        }

        return dentalServiceRepository.save(service);
    }

    // =========================================================
    // UPDATE SERVICE (ADMIN)
    // =========================================================
    public DentalService updateService(Long id, DentalService updated) {
        if (id == null) {
            throw new RuntimeException("Service ID is required");
        }
        if (updated == null) {
            throw new RuntimeException("Updated service data is required");
        }

        DentalService existing = getServiceById(id);

        if (updated.getName() != null && !updated.getName().trim().isEmpty()) {
            String newName = updated.getName().trim();
            if (dentalServiceRepository.existsByNameIgnoreCaseAndIdNot(newName, id)) {
                throw new RuntimeException("A service with name '" + newName + "' already exists");
            }
            existing.setName(newName);
        }

        if (updated.getCategory() != null && !updated.getCategory().trim().isEmpty()) {
            existing.setCategory(updated.getCategory().trim());
        }

        if (updated.getDescription() != null) {
            existing.setDescription(updated.getDescription());
        }

        if (updated.getDuration() != null) {
            existing.setDuration(updated.getDuration().trim());
        }

        if (updated.getPrice() != null) {
            existing.setPrice(updated.getPrice());
        }

        if (updated.getIcon() != null) {
            existing.setIcon(updated.getIcon().trim().toLowerCase());
        }

        if (updated.getStatus() != null && !updated.getStatus().trim().isEmpty()) {
            existing.setStatus(updated.getStatus().trim().toUpperCase());
        }

        if (updated.getImageUrl() != null) {
            existing.setImageUrl(updated.getImageUrl().trim().isEmpty() ? null : updated.getImageUrl().trim());
        }

        return dentalServiceRepository.save(existing);
    }

    // =========================================================
    // DELETE SERVICE (ADMIN)
    // =========================================================
    public void deleteService(Long id) {
        DentalService existing = getServiceById(id);
        dentalServiceRepository.delete(existing);
    }

    // =========================================================
    // HELPER: GENERATE CODE
    // =========================================================
    private String generateUniqueServiceCode() {
        long count = dentalServiceRepository.count() + 1;
        String candidate = String.format("SRV-%03d", count);
        while (dentalServiceRepository.existsByServiceCode(candidate)) {
            candidate = "SRV-" + UUID.randomUUID().toString().substring(0, 5).toUpperCase();
        }
        return candidate;
    }
}
