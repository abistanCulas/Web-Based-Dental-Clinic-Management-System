package com.dentaflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GoogleAuthRequest {

    /**
     * ID Token from Google Identity Services / OpenID Connect.
     */
    private String idToken;

    /**
     * Authorization code from Google OAuth 2.0 authorization code flow.
     */
    private String code;

    /**
     * Redirect URI used during the authorization request.
     */
    private String redirectUri;

    /**
     * Authentication mode: "login" or "register".
     */
    private String mode;
}
