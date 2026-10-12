package com.dentaflow.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
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
public class DentistDTO {

    private Long id;

    private String dentistCode;

    private Long userId;

    private String firstName;

    private String lastName;

    private String email;

    private String phone;

    private String specialization;

    private String qualification;

    private Integer experienceYears;

    private String status;

    private String licenseNumber;

    private java.math.BigDecimal consultationFee;

    private String about;

    @JsonProperty("bio")
    public String getBio() {
        return about;
    }

    @JsonProperty("bio")
    public void setBio(String bio) {
        if (this.about == null || this.about.isBlank()) {
            this.about = bio;
        }
    }

    @JsonProperty("name")
    public String getName() {
        String full = ((firstName != null ? firstName : "") + " " + (lastName != null ? lastName : "")).trim();
        if (full.isEmpty()) return null;
        return full.startsWith("Dr.") ? full : "Dr. " + full;
    }

    private String imageUrl;

    @JsonProperty("profileImage")
    public String getProfileImage() {
        return imageUrl;
    }

    @JsonProperty("profileImage")
    public void setProfileImage(String profileImage) {
        if (this.imageUrl == null || this.imageUrl.isBlank()) {
            this.imageUrl = profileImage;
        }
    }

    @JsonProperty("image")
    public String getImage() {
        return imageUrl;
    }

    @JsonProperty("image")
    public void setImage(String image) {
        if (this.imageUrl == null || this.imageUrl.isBlank()) {
            this.imageUrl = image;
        }
    }

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password;
}