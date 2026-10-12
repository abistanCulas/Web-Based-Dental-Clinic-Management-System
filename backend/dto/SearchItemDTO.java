package com.dentaflow.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Map;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchItemDTO {

    private String id;
    private String title;
    private String subtitle;
    private String category;
    private String url;
    private String badge;
    private Map<String, Object> metadata;
}
