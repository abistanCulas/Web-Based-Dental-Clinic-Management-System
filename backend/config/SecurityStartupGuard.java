package com.dentaflow.backend.config;

import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Fail-fast startup guard for the security configuration policy (A1).
 *
 * Runs during context startup, before the embedded web server starts serving,
 * and refuses to boot when the configuration is unsafe:
 *
 *  - no explicit Spring profile is active (SPRING_PROFILES_ACTIVE is required);
 *  - the JWT signing secret is missing, too short for HS256 (&gt;= 32 bytes),
 *    or resolves to a previously committed / revoked / weak value;
 *  - database or SMTP credentials are missing or resolve to previously
 *    committed (revoked) values;
 *  - running the "prod" profile without required production settings
 *    (database, mail, CORS allow-list, demo seeding disabled).
 */
@Component
public class SecurityStartupGuard implements SmartInitializingSingleton {

    /**
     * Previously committed (now revoked) development secrets. Any value that
     * resolves to one of these is rejected so a deployment can never silently
     * boot on known credentials.
     */
    static final String OLD_JWT_SECRET_BASE64 =
            "VGhpc0lzQVNlY3VyZUJhc2U2NEtleUZvckRlbnRhRmxvd0pXVFRva2VuMjAyNg==";
    static final String OLD_JWT_SECRET_PLAINTEXT =
            "ThisIsASecureBase64KeyForDentaFlowJWTToken2026";

    private static final Set<String> REVOKED_SECRETS = Set.of(
            OLD_JWT_SECRET_BASE64,
            OLD_JWT_SECRET_PLAINTEXT,
            "Root@123",
            "demo123",
            "Admin@123",
            "dentaflow123"
    );

    /** Common placeholder / example values that must never be used as secrets. */
    private static final Set<String> WEAK_PLACEHOLDER_SECRETS = Set.of(
            "changeme", "change-me", "change_me", "changeit", "change.it",
            "your-jwt-secret", "your_jwt_secret", "yoursecret",
            "replaceme", "replace-me", "replace_me", "perfectsecret",
            "jwtsecret", "jwt-secret", "secretkey", "secret-key", "secret",
            "placeholder", "password", "password123", "<jwt-secret>",
            "<your-secret>", "12345678"
    );

    private static final int JWT_SECRET_MIN_BYTES = 32; // HS256 requires >= 256 bits

    private final Environment environment;

    public SecurityStartupGuard(Environment environment) {
        this.environment = environment;
    }

    @Override
    public void afterSingletonsInstantiated() {
        List<String> problems = new ArrayList<>();

        String profile = resolveProfile();
        if (profile == null || profile.isEmpty() || profile.startsWith("${")) {
            throw new IllegalStateException(
                    "DentaFlow configuration guard: no Spring profile is active. "
                            + "Set SPRING_PROFILES_ACTIVE=dev for local development "
                            + "or SPRING_PROFILES_ACTIVE=prod for production. "
                            + "DentaFlow refuses to boot without an explicit profile."
            );
        }

        boolean prod = "prod".equalsIgnoreCase(profile);

        validateJwtSecret(problems);
        validateDatabaseCredentials(problems);
        validateMailCredentials(problems);

        if (prod) {
            validateProduction(problems);
        } else {
            validateDevelopment(problems);
        }

        if (!problems.isEmpty()) {
            throw new IllegalStateException(
                    "DentaFlow configuration guard rejected startup:\n  - "
                            + String.join("\n  - ", problems)
            );
        }
    }

    private String resolveProfile() {
        String[] active = environment.getActiveProfiles();
        if (active.length > 0) {
            for (String p : active) {
                if ("prod".equalsIgnoreCase(p)) {
                    return "prod";
                }
            }
            return active[0];
        }
        return resolve("spring.profiles.active");
    }

    private void validateJwtSecret(List<String> problems) {
        String secret = resolve("jwt.secret");
        if (secret == null || secret.isEmpty()) {
            problems.add("JWT secret is not configured. Set the JWT_SECRET environment variable (at least 32 bytes).");
            return;
        }
        if (isRevoked(secret) || isWeakPlaceholder(secret)) {
            problems.add("JWT secret resolves to a previously committed, known, or weak value. Rotate it and set a NEW JWT_SECRET environment variable (at least 32 bytes).");
            return;
        }
        int bytes = secret.getBytes(StandardCharsets.UTF_8).length;
        if (bytes < JWT_SECRET_MIN_BYTES) {
            problems.add("JWT secret is only " + bytes + " bytes; HS256 signing requires at least "
                    + JWT_SECRET_MIN_BYTES + " bytes (256 bits). Set a longer JWT_SECRET.");
        }
    }

    private void validateDatabaseCredentials(List<String> problems) {
        String password = resolve("spring.datasource.password");
        if (password == null || password.isEmpty()) {
            problems.add("Database password is not configured. Set the DB_PASSWORD environment variable.");
        } else if (isRevoked(password)) {
            problems.add("Database password resolves to a previously committed value. Set a new DB_PASSWORD environment variable.");
        }
    }

    private void validateMailCredentials(List<String> problems) {
        String username = resolve("spring.mail.username");
        if (username == null || username.isEmpty()) {
            problems.add("SMTP username is not configured. Set the MAIL_USERNAME environment variable.");
        } else if ("dentaflow@gmail.com".equalsIgnoreCase(username)) {
            problems.add("SMTP username resolves to the previously committed development account. Set a real MAIL_USERNAME.");
        }

        String password = resolve("spring.mail.password");
        if (password == null || password.isEmpty()) {
            problems.add("SMTP password is not configured. Set the MAIL_PASSWORD environment variable.");
        } else if (isRevoked(password)) {
            problems.add("SMTP password resolves to a previously committed value. Set a new MAIL_PASSWORD environment variable.");
        }
    }

    private void validateProduction(List<String> problems) {
        requireResolved("spring.datasource.url", "DB_URL", problems);
        requireResolved("spring.datasource.username", "DB_USERNAME", problems);
        requireResolved("app.cors.allowed-origins", "CORS_ALLOWED_ORIGINS", problems);

        String seed = resolve("app.seed-demo-data");
        if (seed == null || seed.isEmpty()) {
            problems.add("Production requires app.seed-demo-data to be set to false (demo accounts must never be seeded).");
        } else if ("true".equalsIgnoreCase(seed)) {
            problems.add("app.seed-demo-data is 'true' but demo seeding is forbidden in production. Set it to 'false'.");
        }
    }

    private void validateDevelopment(List<String> problems) {
        String seed = resolve("app.seed-demo-data");
        if (seed == null || "true".equalsIgnoreCase(seed)) {
            requireResolved("app.demo.default-password", "DEMO_PASSWORD", problems);
            requireResolved("app.demo.admin-password", "DEMO_ADMIN_PASSWORD", problems);
        }
    }

    private boolean isRevoked(String value) {
        return REVOKED_SECRETS.contains(value);
    }

    private boolean isWeakPlaceholder(String value) {
        String lower = value.toLowerCase(Locale.ROOT);
        if (WEAK_PLACEHOLDER_SECRETS.contains(lower)) {
            return true;
        }
        return lower.startsWith("your-")
                || lower.startsWith("your_")
                || lower.startsWith("<")
                || lower.startsWith("change")
                || lower.startsWith("replace");
    }

    private void requireResolved(String key, String envVar, List<String> problems) {
        String value = resolve(key);
        if (value == null || value.isEmpty() || value.startsWith("${")) {
            problems.add(key + " is not configured. Set the " + envVar + " environment variable.");
        }
    }

    /**
     * Resolves a property value including a single-level {@code ${...}}
     * placeholder that references an environment variable or system property.
     */
    private String resolve(String key) {
        String raw = environment.getProperty(key);
        if (raw == null) {
            return null;
        }
        String trimmed = raw.trim();
        if (trimmed.startsWith("${") && trimmed.endsWith("}")) {
            String inner = trimmed.substring(2, trimmed.length() - 1);
            String variable = inner;
            String fallback = null;
            int colon = inner.indexOf(':');
            if (colon >= 0) {
                variable = inner.substring(0, colon);
                fallback = inner.substring(colon + 1);
            }
            String value = environment.getProperty(variable);
            return value != null ? value.trim() : fallback;
        }
        return trimmed;
    }
}