package com.dentaflow.backend.controller;

import com.dentaflow.backend.dto.PaymentDTO;
import com.dentaflow.backend.entity.Payment;
import com.dentaflow.backend.mapper.PaymentMapper;
import com.dentaflow.backend.service.PaymentService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin
public class PaymentController {

    private final PaymentService paymentService;
    private final PaymentMapper paymentMapper;

    public PaymentController(
            PaymentService paymentService,
            PaymentMapper paymentMapper) {

        this.paymentService = paymentService;
        this.paymentMapper = paymentMapper;
    }

    // =========================================================
    // CREATE PAYMENT
    // =========================================================

    @PostMapping
    public ResponseEntity<?> createPayment(
            @RequestBody PaymentDTO dto) {

        try {

            if (dto == null) {
                return ResponseEntity
                        .badRequest()
                        .body("Payment data is required");
            }

            if (dto.getBillId() == null) {
                return ResponseEntity
                        .badRequest()
                        .body("Bill ID is required");
            }

            Payment payment =
                    paymentMapper.toEntity(dto);

            Payment saved =
                    paymentService.createPayment(
                            dto.getBillId(),
                            payment
                    );

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(
                            paymentMapper.toDTO(saved)
                    );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET ALL PAYMENTS
    // =========================================================

    @GetMapping
    public ResponseEntity<List<PaymentDTO>> getAllPayments() {

        List<PaymentDTO> payments =
                paymentService
                        .getAllPayments()
                        .stream()
                        .map(paymentMapper::toDTO)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(payments);
    }

    // =========================================================
    // GET PAYMENT BY ID
    // =========================================================

    @GetMapping("/{id}")
    public ResponseEntity<?> getPaymentById(
            @PathVariable Long id) {

        try {

            Payment payment =
                    paymentService.getPaymentById(id);

            return ResponseEntity.ok(
                    paymentMapper.toDTO(payment)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET PAYMENT BY REFERENCE
    // =========================================================

    @GetMapping("/reference/{paymentReference}")
    public ResponseEntity<?> getPaymentByReference(
            @PathVariable String paymentReference) {

        try {

            Payment payment =
                    paymentService.getPaymentByReference(
                            paymentReference
                    );

            return ResponseEntity.ok(
                    paymentMapper.toDTO(payment)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET PAYMENTS FOR BILL
    // =========================================================

    @GetMapping("/bill/{billId}")
    public ResponseEntity<?> getPaymentsForBill(
            @PathVariable Long billId) {

        try {

            List<PaymentDTO> payments =
                    paymentService
                            .getPaymentsForBill(billId)
                            .stream()
                            .map(paymentMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(payments);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET PAYMENTS BY STATUS
    // =========================================================

    @GetMapping("/status/{status}")
    public ResponseEntity<?> getPaymentsByStatus(
            @PathVariable String status) {

        try {

            List<PaymentDTO> payments =
                    paymentService
                            .getPaymentsByStatus(status)
                            .stream()
                            .map(paymentMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(payments);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET PAYMENTS BY METHOD
    // =========================================================

    @GetMapping("/method/{paymentMethod}")
    public ResponseEntity<?> getPaymentsByMethod(
            @PathVariable String paymentMethod) {

        try {

            List<PaymentDTO> payments =
                    paymentService
                            .getPaymentsByMethod(paymentMethod)
                            .stream()
                            .map(paymentMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(payments);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET SUCCESSFUL PAYMENTS FOR BILL
    // =========================================================

    @GetMapping("/bill/{billId}/successful")
    public ResponseEntity<?> getSuccessfulPaymentsForBill(
            @PathVariable Long billId) {

        try {

            List<PaymentDTO> payments =
                    paymentService
                            .getSuccessfulPaymentsForBill(
                                    billId
                            )
                            .stream()
                            .map(paymentMapper::toDTO)
                            .collect(Collectors.toList());

            return ResponseEntity.ok(payments);

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // GET PAYMENT BY TRANSACTION ID
    // =========================================================

    @GetMapping("/transaction/{transactionId}")
    public ResponseEntity<?> getPaymentByTransactionId(
            @PathVariable String transactionId) {

        try {

            Payment payment =
                    paymentService
                            .getPaymentByTransactionId(
                                    transactionId
                            );

            return ResponseEntity.ok(
                    paymentMapper.toDTO(payment)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // UPDATE PAYMENT
    // =========================================================

    @PutMapping("/{id}")
    public ResponseEntity<?> updatePayment(
            @PathVariable Long id,
            @RequestBody PaymentDTO dto) {

        try {

            if (dto == null) {
                return ResponseEntity
                        .badRequest()
                        .body("Payment data is required");
            }

            Payment payment =
                    paymentMapper.toEntity(dto);

            Payment updated =
                    paymentService.updatePayment(
                            id,
                            payment
                    );

            return ResponseEntity.ok(
                    paymentMapper.toDTO(updated)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // VERIFY / MARK PAYMENT SUCCESSFUL
    // =========================================================

    @PostMapping("/{id}/verify")
    public ResponseEntity<?> verifyPayment(
            @PathVariable Long id) {

        try {

            Payment payment =
                    paymentService
                            .markPaymentSuccessful(id);

            return ResponseEntity.ok(
                    paymentMapper.toDTO(payment)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // MARK PAYMENT FAILED
    // =========================================================

    @PostMapping("/{id}/fail")
    public ResponseEntity<?> markPaymentFailed(
            @PathVariable Long id,
            @RequestParam(required = false)
            String gatewayResponse) {

        try {

            Payment payment =
                    paymentService.markPaymentFailed(
                            id,
                            gatewayResponse
                    );

            return ResponseEntity.ok(
                    paymentMapper.toDTO(payment)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // CANCEL PAYMENT
    // =========================================================

    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancelPayment(
            @PathVariable Long id) {

        try {

            Payment payment =
                    paymentService.cancelPayment(id);

            return ResponseEntity.ok(
                    paymentMapper.toDTO(payment)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // REFUND PAYMENT
    // =========================================================

    @PostMapping("/{id}/refund")
    public ResponseEntity<?> refundPayment(
            @PathVariable Long id,
            @RequestParam BigDecimal amount,
            @RequestParam(required = false)
            String reason) {

        try {

            Payment payment =
                    paymentService.refundPayment(
                            id,
                            amount,
                            reason
                    );

            return ResponseEntity.ok(
                    paymentMapper.toDTO(payment)
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }

    // =========================================================
    // DELETE PAYMENT
    // =========================================================

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePayment(
            @PathVariable Long id) {

        try {

            paymentService.deletePayment(id);

            return ResponseEntity.ok(
                    "Payment deleted successfully"
            );

        } catch (RuntimeException exception) {

            return ResponseEntity
                    .badRequest()
                    .body(exception.getMessage());
        }
    }
}