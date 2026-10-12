package com.dentaflow.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DentalServiceDTO {

    private Long id;

    private String serviceCode;

    private String name;

    private String category;

    private String description;

    @JsonProperty("desc")
    public String getDesc() {
        return description;
    }

    @JsonProperty("desc")
    public void setDesc(String desc) {
        if (this.description == null || this.description.isBlank()) {
            this.description = desc;
        }
    }

    private String duration;

    private BigDecimal price;

    private String icon;

    private String status;

    private String imageUrl;

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
}
