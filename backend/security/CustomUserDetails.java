package com.dentaflow.backend.security;

import com.dentaflow.backend.entity.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;

public class CustomUserDetails implements UserDetails {

    private final User user;

    public CustomUserDetails(User user) {
        this.user = user;
    }

    // =========================================================
    // GET USER
    // =========================================================

    public User getUser() {
        return user;
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

        if (!role.startsWith("ROLE_")) {
            role = "ROLE_" + role;
        }

        return Collections.singletonList(
                new SimpleGrantedAuthority(role)
        );
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
        return "ACTIVE".equalsIgnoreCase(
                user.getStatus()
        );
    }
}