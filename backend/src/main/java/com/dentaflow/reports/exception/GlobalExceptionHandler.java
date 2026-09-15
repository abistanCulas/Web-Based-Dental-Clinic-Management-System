package com.dentaflow.reports.exception;

import com.dentaflow.reports.dto.response.ApiError;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Central place that turns every failure mode from the Reports, Inquiry &
 * Feedback use case (steps 5a, 6a, 7a, 8a in the use-case document) into a
 * predictable JSON shape the React app can show to the user.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    // Bean Validation failures (missing/invalid fields on the request body).
    // Covers extensions 6a (incomplete inquiry) and 7a (invalid feedback).
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
        List<String> details = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .toList();

        ApiError error = ApiError.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .error("Validation Failed")
                .message("Please correct the highlighted fields and try again.")
                .details(details)
                .build();
        return ResponseEntity.badRequest().body(error);
    }

    // Extension 5a: invalid date range or missing report criteria.
    @ExceptionHandler(InvalidReportCriteriaException.class)
    public ResponseEntity<ApiError> handleInvalidReportCriteria(InvalidReportCriteriaException ex) {
        ApiError error = ApiError.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.BAD_REQUEST.value())
                .error("Invalid Report Criteria")
                .message(ex.getMessage())
                .build();
        return ResponseEntity.badRequest().body(error);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(ResourceNotFoundException ex) {
        ApiError error = ApiError.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.NOT_FOUND.value())
                .error("Not Found")
                .message(ex.getMessage())
                .build();
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    // Extension 8a: the system detects an error while generating or saving a record.
    @ExceptionHandler(RecordSaveException.class)
    public ResponseEntity<ApiError> handleSaveFailure(RecordSaveException ex) {
        ApiError error = ApiError.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .error("Save Failed")
                .message("Something went wrong while saving. Please try again.")
                .build();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception ex) {
        ApiError error = ApiError.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .error("Unexpected Error")
                .message("An unexpected error occurred. Please try again.")
                .build();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
