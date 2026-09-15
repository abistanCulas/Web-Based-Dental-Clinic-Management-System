package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.BillingDTO;
import com.dentaflow.backend.entity.Bill;
import com.dentaflow.backend.mapper.BillingMapper;
import com.dentaflow.backend.service.BillService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/billing")
@CrossOrigin
public class BillingController {

    private final BillService billService;
    private final BillingMapper billingMapper;

    public BillingController(
            BillService billService,
            BillingMapper billingMapper) {

        this.billService = billService;
        this.billingMapper = billingMapper;
    }

    // =========================================================
    // CREATE BILL
    // =========================================================

    @PostMapping
    public ResponseEntity<?> createBill(
            @RequestBody BillingDTO dto) {

        try {

            if (dto.getPatientId() == null) {
                return ResponseEntity.badRequest()
                        .body("Patient ID is required");
            }

            Bill bill =
                    billingMapper.toEntity(dto);

            Bill saved =
                    billService.createBill(
                            dto.getPatientId(),
                            bill
                    );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(
                            billingMapper.toDTO(saved)
                    );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET ALL BILLS
    // =========================================================

    @GetMapping
    public ResponseEntity<List<BillingDTO>> getAllBills() {

        List<BillingDTO> bills =
                billService
                        .getAllBills()
                        .stream()
                        .map(billingMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(bills);
    }

    // =========================================================
    // GET BILL BY ID
    // =========================================================

    @GetMapping("/{id}")
    public ResponseEntity<?> getBillById(
            @PathVariable Long id) {

        try {

            Bill bill =
                    billService.getBillById(id);

            return ResponseEntity.ok(
                    billingMapper.toDTO(bill)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET BILL BY NUMBER
    // =========================================================

    @GetMapping("/number/{billNumber}")
    public ResponseEntity<?> getBillByNumber(
            @PathVariable String billNumber) {

        try {

            Bill bill =
                    billService.getBillByNumber(
                            billNumber
                    );

            return ResponseEntity.ok(
                    billingMapper.toDTO(bill)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET PATIENT BILLS
    // =========================================================

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<?> getPatientBills(
            @PathVariable Long patientId) {

        try {

            List<BillingDTO> bills =
                    billService
                            .getPatientBills(patientId)
                            .stream()
                            .map(billingMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(bills);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET BILLS BY STATUS
    // =========================================================

    @GetMapping("/status/{status}")
    public ResponseEntity<?> getBillsByStatus(
            @PathVariable String status) {

        try {

            List<BillingDTO> bills =
                    billService
                            .getBillsByStatus(status)
                            .stream()
                            .map(billingMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(bills);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // UPDATE BILL
    // =========================================================

    @PutMapping("/{id}")
    public ResponseEntity<?> updateBill(
            @PathVariable Long id,
            @RequestBody BillingDTO dto) {

        try {

            Bill bill =
                    billingMapper.toEntity(dto);

            Bill updated =
                    billService.updateBill(
                            id,
                            bill
                    );

            return ResponseEntity.ok(
                    billingMapper.toDTO(updated)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // ADD PAYMENT
    // =========================================================

    @PostMapping("/{id}/payment")
    public ResponseEntity<?> addPayment(
            @PathVariable Long id,
            @RequestParam BigDecimal amount) {

        try {

            Bill updated =
                    billService.addPaymentAmount(
                            id,
                            amount
                    );

            return ResponseEntity.ok(
                    billingMapper.toDTO(updated)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // DELETE BILL
    // =========================================================

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteBill(
            @PathVariable Long id) {

        try {

            billService.deleteBill(id);

            return ResponseEntity.ok(
                    "Bill deleted successfully"
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }
}