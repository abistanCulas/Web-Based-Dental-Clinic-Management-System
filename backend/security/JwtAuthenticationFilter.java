package com.dentaflow.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;

    public JwtAuthenticationFilter(
            JwtService jwtService,
            CustomUserDetailsService userDetailsService) {

        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String authorizationHeader =
                request.getHeader("Authorization");

        System.out.println("=================================");
        System.out.println("JWT FILTER");
        System.out.println("REQUEST : " + request.getRequestURI());
        System.out.println(
                "AUTH HEADER EXISTS : "
                        + (authorizationHeader != null)
        );

        // ---------------------------------------------------------
        // No Authorization header
        // ---------------------------------------------------------

        if (authorizationHeader == null ||
                !authorizationHeader.startsWith("Bearer ")) {

            System.out.println("NO JWT TOKEN");
            filterChain.doFilter(request, response);
            return;
        }

        // ---------------------------------------------------------
        // Extract token
        // ---------------------------------------------------------

        String token =
                authorizationHeader.substring(7).trim();

        System.out.println("JWT TOKEN RECEIVED");

        try {

            // -----------------------------------------------------
            // Extract email
            // -----------------------------------------------------

            String email =
                    jwtService.extractEmail(token);

            System.out.println(
                    "JWT EMAIL : " + email
            );

            if (email == null ||
                    email.trim().isEmpty()) {

                System.out.println("JWT EMAIL EMPTY");
                filterChain.doFilter(request, response);
                return;
            }

            // -----------------------------------------------------
            // Load user
            // -----------------------------------------------------

            UserDetails userDetails =
                    userDetailsService
                            .loadUserByUsername(email);

            CustomUserDetails customUserDetails =
                    (CustomUserDetails) userDetails;

            System.out.println(
                    "DATABASE USER : "
                            + userDetails.getUsername()
            );

            System.out.println(
                    "AUTHORITIES : "
                            + userDetails.getAuthorities()
            );

            // -----------------------------------------------------
            // Validate token
            // -----------------------------------------------------

            boolean valid =
                    jwtService.isTokenValid(
                            token,
                            customUserDetails.getUser()
                    );

            System.out.println(
                    "JWT VALID : " + valid
            );

            // -----------------------------------------------------
            // Set authentication
            // -----------------------------------------------------

            if (valid) {

                if (customUserDetails.isEnabled()) {

                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,
                                    userDetails.getAuthorities()
                            );

                    authentication.setDetails(
                            new WebAuthenticationDetailsSource()
                                    .buildDetails(request)
                    );

                    SecurityContextHolder
                            .getContext()
                            .setAuthentication(authentication);

                    System.out.println(
                            "AUTHENTICATION SET SUCCESSFULLY"
                    );

                    System.out.println(
                            "CURRENT AUTH : "
                                    + SecurityContextHolder
                                    .getContext()
                                    .getAuthentication()
                    );

                } else {

                    System.out.println(
                            "USER ACCOUNT NOT ENABLED "
                                    + "(DEACTIVATED / INACTIVE)"
                    );

                    SecurityContextHolder.clearContext();
                }

            } else {

                System.out.println(
                        "JWT INVALID"
                );

                SecurityContextHolder.clearContext();
            }

        } catch (Exception exception) {

            System.out.println(
                    "========== JWT ERROR =========="
            );

            System.out.println(
                    "ERROR TYPE : "
                            + exception.getClass().getName()
            );

            System.out.println(
                    "ERROR MESSAGE : "
                            + exception.getMessage()
            );

            SecurityContextHolder.clearContext();
        }

        // ---------------------------------------------------------
        // Continue request
        // ---------------------------------------------------------

        filterChain.doFilter(request, response);
    }
}