package com.dentaflow.backend.mapper;

import com.dentaflow.backend.dto.UserDTO;
import com.dentaflow.backend.entity.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    // Entity → DTO
    public UserDTO toDTO(User user) {

        if (user == null) {
            return null;
        }

        return UserDTO.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .gender(user.getGender())
                .status(user.getStatus())
                .preferredLanguage(
                        user.getPreferredLanguage()
                )
                .authProvider(
                        user.getAuthProvider()
                )
                .providerId(
                        user.getProviderId()
                )
                .emailVerified(
                        user.getEmailVerified()
                )
                .roleId(
                        user.getRole() != null
                                ? user.getRole().getId()
                                : null
                )
                .role(
                        user.getRole() != null
                                ? user.getRole().getName()
                                : null
                )
                .build();
    }

    // DTO → Entity
    public User toEntity(UserDTO dto) {

        if (dto == null) {
            return null;
        }

        User user = new User();

        user.setId(dto.getId());
        user.setFirstName(dto.getFirstName());
        user.setLastName(dto.getLastName());
        user.setEmail(dto.getEmail());
        user.setPhone(dto.getPhone());
        user.setGender(dto.getGender());
        user.setStatus(dto.getStatus());
        user.setPreferredLanguage(
                dto.getPreferredLanguage()
        );
        user.setAuthProvider(
                dto.getAuthProvider()
        );
        user.setProviderId(
                dto.getProviderId()
        );
        user.setEmailVerified(
                dto.getEmailVerified()
        );

        return user;
    }
}