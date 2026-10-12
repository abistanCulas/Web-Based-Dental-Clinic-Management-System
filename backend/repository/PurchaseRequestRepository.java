package com.dentaflow.backend.repository;

import com.dentaflow.backend.entity.PurchaseRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PurchaseRequestRepository extends JpaRepository<PurchaseRequest, Long> {

    List<PurchaseRequest> findAllByOrderByCreatedAtDesc();

    List<PurchaseRequest> findByPharmacistIdOrderByCreatedAtDesc(Long pharmacistId);

    List<PurchaseRequest> findByPharmacistIdAndStatusIgnoreCaseOrderByCreatedAtDesc(Long pharmacistId, String status);

    List<PurchaseRequest> findByStatusIgnoreCaseOrderByCreatedAtDesc(String status);

    Optional<PurchaseRequest> findByRequestCode(String requestCode);

    boolean existsByRequestCode(String requestCode);

    boolean existsByPharmacistId(Long pharmacistId);

    boolean existsByProcessedById(Long processedById);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE PurchaseRequest p SET p.pharmacist = null WHERE p.pharmacist.id = :userId")
    void unlinkPharmacist(@org.springframework.data.repository.query.Param("userId") Long userId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE PurchaseRequest p SET p.processedBy = null WHERE p.processedBy.id = :userId")
    void unlinkProcessedBy(@org.springframework.data.repository.query.Param("userId") Long userId);
}
