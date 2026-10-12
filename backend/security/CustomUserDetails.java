package com.dentaflow.backend.security;

import com.dentaflow.backend.entity.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;

public class CustomUserDetails implements UserDetails {

    private final User user;
    private final String staffRole;

    public CustomUserDetails(User user) {
        this(user, null);
    }

    public CustomUserDetails(User user, String staffRole) {
        this.user = user;
        this.staffRole = staffRole;
    }

    // =========================================================
    // GET USER
    // =========================================================

    public User getUser() {
        return user;
    }

    public String getStaffRole() {
        return staffRole;
    }

    // =========================================================
    // AUTHORITIES / ROLE
    // =========================================================

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {

        if (user.getRole() == null ||
                user.getRole().getName() == null ||
                user.getRole().getName().trim().isEmpty()) {

            return Collections.emptyList();
        }

        String role =
                user.getRole()
                        .getName()
                        .trim()
                        .toUpperCase();

        java.util.Set<String> authNames = new java.util.HashSet<>();

        if (!role.startsWith("ROLE_")) {
            authNames.add("ROLE_" + role);
        } else {
            authNames.add(role);
        }

        // Sub-role resolution based on staff domain record first
        if (staffRole != null && !staffRole.trim().isEmpty()) {
            String normStaffRole = staffRole.trim().toUpperCase().replace(" ", "_").replace("-", "_");
            authNames.add("ROLE_" + normStaffRole);
            authNames.add("ROLE_STAFF");
        }

        // Direct user role mappings for Receptionist, Pharmacist, Cashier
        if (role.contains("RECEPTIONIST")) {
            authNames.add("ROLE_RECEPTIONIST");
            authNames.add("ROLE_STAFF");
        } else if (role.contains("PHARMACIST")) {
            authNames.add("ROLE_PHARMACIST");
            authNames.add("ROLE_STAFF");
        } else if (role.contains("CASHIER")) {
            authNames.add("ROLE_CASHIER");
            authNames.add("ROLE_STAFF");
        }

        // Sub-role resolution fallback for STAFF based on email convention for unlinked demo accounts
        if (authNames.contains("ROLE_STAFF") && !authNames.contains("ROLE_RECEPTIONIST")
                && !authNames.contains("ROLE_PHARMACIST") && !authNames.contains("ROLE_CASHIER")) {
            String email = user.getEmail() != null ? user.getEmail().toLowerCase() : "";
            if (email.contains("pharm")) {
                authNames.add("ROLE_PHARMACIST");
            } else if (email.contains("reception")) {
                authNames.add("ROLE_RECEPTIONIST");
            } else if (email.contains("cashier")) {
                authNames.add("ROLE_CASHIER");
            }
        }

        // Add DOCTOR alias for DENTIST and vice versa
        if (authNames.contains("ROLE_DENTIST")) {
            authNames.add("ROLE_DOCTOR");
        }
        if (authNames.contains("ROLE_DOCTOR")) {
            authNames.add("ROLE_DENTIST");
        }

        java.util.List<GrantedAuthority> authorities = new java.util.ArrayList<>();
        for (String a : authNames) {
            authorities.add(new SimpleGrantedAuthority(a));
        }

        return authorities;
    }

    // =========================================================
    // PASSWORD
    // =========================================================

    @Override
    public String getPassword() {
        return user.getPassword();
    }

    // =========================================================
    // USERNAME
    // =========================================================

    @Override
    public String getUsername() {
        return user.getEmail();
    }

    // =========================================================
    // ACCOUNT STATUS
    // =========================================================

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return !"DEACTIVATED".equalsIgnoreCase(user.getStatus()) && !"INACTIVE".equalsIgnoreCase(user.getStatus());
    }
}