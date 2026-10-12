package com.dentaflow.backend.config;

import com.dentaflow.backend.security.JwtAuthenticationEntryPoint;
import com.dentaflow.backend.security.JwtAuthenticationFilter;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.beans.factory.annotation.Value;

import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;

import org.springframework.security.config.http.SessionCreationPolicy;

import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import org.springframework.http.HttpMethod;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final JwtAuthenticationEntryPoint authenticationEntryPoint;

    // Comma-separated exact frontend origins. Never uses "*".
    @Value("${app.cors.allowed-origins:http://localhost:5173}")
    private String allowedOrigins;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter,
            JwtAuthenticationEntryPoint authenticationEntryPoint) {

        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.authenticationEntryPoint = authenticationEntryPoint;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Explicit, environment-driven origins only. Wildcards are not
        // permitted together with credentials.
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .collect(Collectors.toList());

        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(List.of(
                "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"
        ));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("Authorization", "Content-Disposition"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http) throws Exception {

        http

                // =================================================
                // CORS
                // =================================================

                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // =================================================
                // CSRF
                // =================================================

                .csrf(csrf -> csrf.disable())

                // =================================================
                // SESSION
                // =================================================

                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )

                // =================================================
                // EXCEPTION HANDLING
                // =================================================

                .exceptionHandling(exception ->
                        exception.authenticationEntryPoint(
                                authenticationEntryPoint
                        )
                )

                // =================================================
                // AUTHORIZATION
                // =================================================

                .authorizeHttpRequests(auth -> auth

                        // Preflight OPTIONS requests must always succeed for CORS
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Public authentication & open APIs
                        .requestMatchers(
                                "/error",
                                "/uploads/**",
                                "/api/uploads/**",
                                "/api/upload",
                                "/api/upload/**",
                                "/api/uploads",
                                "/api/auth/register",
                                "/api/auth/register/**",
                                "/api/auth/login",
                                "/api/auth/google",
                                "/api/auth/google/**",
                                "/api/auth/oauth2/**",
                                "/api/auth/forgot-password",
                                "/api/auth/verify-otp",
                                "/api/auth/reset-password",
                                "/api/auth/resend-otp",
                                "/api/reviews/public",
                                "/api/payments/payhere/notify"
                        ).permitAll()

                        // Admin-only dental service & dentist mutations & management
                        .requestMatchers("/api/services/admin", "/api/services/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/dentists/admin", "/api/dentists/admin/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/services", "/api/services/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/services/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/services/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/dentists/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/staff/**").hasRole("ADMIN")

                        // Public doctor & booking discovery APIs
                        .requestMatchers(HttpMethod.GET,
                                "/api/services",
                                "/api/services/*",
                                "/api/dentists",
                                "/api/dentists/**",
                                "/api/dentist-availability",
                                "/api/dentist-availability/**",
                                "/api/appointments/booking-window",
                                "/api/appointments/available-slots",
                                "/api/appointments/check-availability",
                                "/api/reviews/public",
                                "/api/reviews/dentist/**"
                        ).permitAll()

                        // Public inquiry submission APIs
                        .requestMatchers(HttpMethod.POST,
                                "/api/inquiries",
                                "/api/inquiries/**"
                        ).permitAll()

                        // Swagger
                        .requestMatchers(
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/v3/api-docs/**"
                        ).permitAll()

                        // User self-service profile avatar & preferences
                        .requestMatchers(
                                "/api/users/me",
                                "/api/users/me/**"
                        ).authenticated()

                        // Global Search (all authenticated users)
                        .requestMatchers(
                                "/api/search",
                                "/api/search/**"
                        ).authenticated()

                        // Admin only user management
                        .requestMatchers(
                                "/api/users/**"
                        ).hasRole("ADMIN")

                        // Admin only audit logs (defense-in-depth on top of
                        // the @PreAuthorize annotations on AuditLogController)
                        .requestMatchers(
                                "/api/audit-logs/**"
                        ).hasRole("ADMIN")

                        // Admin only account reactivation
                        .requestMatchers(
                                "/api/auth/activate"
                        ).hasRole("ADMIN")

                        // Admin only schedule management (defense-in-depth)
                        .requestMatchers(
                                "/api/admin/schedules",
                                "/api/admin/schedules/**"
                        ).hasRole("ADMIN")

                        // All other APIs require login
                        .anyRequest().authenticated()
                )

                // =================================================
                // JWT FILTER
                // =================================================

                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }
}