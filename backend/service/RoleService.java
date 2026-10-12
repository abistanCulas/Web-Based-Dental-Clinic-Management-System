package com.dentaflow.backend.service;

import com.dentaflow.backend.entity.Role;
import com.dentaflow.backend.repository.RoleRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RoleService {

    private final RoleRepository roleRepository;

    public RoleService(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    // Create new role
    public Role createRole(Role role) {

        if (role == null || role.getName() == null ||
                role.getName().trim().isEmpty()) {

            throw new RuntimeException("Role name is required");
        }

        String roleName = role.getName()
                .trim()
                .toUpperCase();

        if (roleRepository.existsByName(roleName)) {
            throw new RuntimeException(
                    "Role already exists: " + roleName
            );
        }

        role.setName(roleName);

        return roleRepository.save(role);
    }

    // Get all roles
    public List<Role> getAllRoles() {
        return roleRepository.findAll();
    }

    // Get role by ID
    public Role getRoleById(Long id) {

        return roleRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Role not found with id: " + id
                        ));
    }

    // Get role by name
    public Role getRoleByName(String name) {

        if (name == null || name.trim().isEmpty()) {
            throw new RuntimeException("Role name is required");
        }

        return roleRepository.findByName(
                        name.trim().toUpperCase()
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "Role not found: " + name
                        ));
    }

    // Update role
    public Role updateRole(Long id, Role updatedRole) {

        Role existingRole = getRoleById(id);

        if (updatedRole == null ||
                updatedRole.getName() == null ||
                updatedRole.getName().trim().isEmpty()) {

            throw new RuntimeException("Role name is required");
        }

        String newRoleName = updatedRole.getName()
                .trim()
                .toUpperCase();

        if (!existingRole.getName().equalsIgnoreCase(newRoleName)
                && roleRepository.existsByName(newRoleName)) {

            throw new RuntimeException(
                    "Role already exists: " + newRoleName
            );
        }

        existingRole.setName(newRoleName);

        return roleRepository.save(existingRole);
    }

    // Delete role
    public void deleteRole(Long id) {

        Role existingRole = getRoleById(id);

        roleRepository.delete(existingRole);
    }
}