package com.dentaflow.backend.security;

import com.dentaflow.backend.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    // =========================================================
    // SIGNING KEY
    // =========================================================

    private SecretKey getSigningKey() {

        return Keys.hmacShaKeyFor(
                jwtSecret.getBytes(StandardCharsets.UTF_8)
        );
    }

    // =========================================================
    // GENERATE JWT TOKEN
    // =========================================================

    public String generateToken(User user) {

        if (user == null) {
            throw new RuntimeException(
                    "User is required"
            );
        }

        String role = null;

        if (user.getRole() != null) {
            role = user.getRole().getName();
        }

        return Jwts.builder()
                .subject(user.getEmail())
                .claim("userId", user.getId())
                .claim("role", role)
                .issuedAt(new Date())
                .expiration(
                        new Date(
                                System.currentTimeMillis()
                                        + jwtExpiration
                        )
                )
                .signWith(getSigningKey())
                .compact();
    }

    // =========================================================
    // EXTRACT EMAIL
    // =========================================================

    public String extractEmail(String token) {

        return extractAllClaims(token)
                .getSubject();
    }

    // =========================================================
    // EXTRACT USER ID
    // =========================================================

    public Long extractUserId(String token) {

        Object userId =
                extractAllClaims(token)
                        .get("userId");

        if (userId == null) {
            return null;
        }

        if (userId instanceof Number) {
            return ((Number) userId).longValue();
        }

        return Long.parseLong(
                userId.toString()
        );
    }

    // =========================================================
    // EXTRACT ROLE
    // =========================================================

    public String extractRole(String token) {

        Object role =
                extractAllClaims(token)
                        .get("role");

        return role != null
                ? role.toString()
                : null;
    }

    // =========================================================
    // VALIDATE TOKEN
    // =========================================================

    public boolean isTokenValid(
            String token,
            User user) {

        if (token == null ||
                token.trim().isEmpty() ||
                user == null) {

            return false;
        }

        try {

            String email =
                    extractEmail(token);

            return email.equalsIgnoreCase(
                    user.getEmail()
            ) && !isTokenExpired(token);

        } catch (Exception exception) {

            return false;
        }
    }

    // =========================================================
    // CHECK TOKEN EXPIRATION
    // =========================================================

    public boolean isTokenExpired(
            String token) {

        try {

            Date expiration =
                    extractAllClaims(token)
                            .getExpiration();

            return expiration.before(
                    new Date()
            );

        } catch (Exception exception) {

            return true;
        }
    }

    // =========================================================
    // GET ALL CLAIMS
    // =========================================================

    private Claims extractAllClaims(
            String token) {

        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}