package com.dentaflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PayHereCheckoutDTO {

    private boolean sandbox;
    private String checkoutUrl;
    private String merchantId;
    private String orderId;
    private String items;
    private String currency; // "LKR"
    private String amount;   // Formatted to 2 decimals, e.g. "29700.00"
    private String hash;     // MD5 signature generated with merchant secret
    private String returnUrl;
    private String cancelUrl;
    private String notifyUrl;

    // Customer details
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String address;
    private String city;
    private String country;

    // Internal reference
    private Long billId;
    private Long paymentId;
    private String paymentReference;
    private String billNumber;
}
