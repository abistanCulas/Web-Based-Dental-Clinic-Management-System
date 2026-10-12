package com.dentaflow.backend.dto;

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
public class DrugInteractionDTO {

    private Long id;
    private Long medicineOneId;
    private String medicineOneName;
    private Long medicineTwoId;
    private String medicineTwoName;
    private String severity;
    private String description;
    private String recommendation;
    private String status;
}
