package com.dentaflow.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidationExceptions(MethodArgumentNotValidException ex) {
        String firstError = "Validation failed";
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            firstError = error.getDefaultMessage();
            break;
        }

        Map<String, Object> body = new HashMap<>();
        body.put("success", false);
        body.put("error", firstError);
        body.put("message", firstError);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }
}
