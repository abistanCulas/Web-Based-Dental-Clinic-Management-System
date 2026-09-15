package com.dentalclinic.dentiststaff.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;

import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "specialization")
public class Specialization {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Specialization name is required")
    @Column(nullable = false, unique = true)
    private String name;

    private String description;

    @ManyToMany(mappedBy = "specializations")
    private Set<Dentist> dentists = new HashSet<>();

    public Specialization() {
    }

    public Specialization(String name, String description) {
        this.name = name;
        this.description = description;
    }

    // ----- Getters and Setters -----

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Set<Dentist> getDentists() {
        return dentists;
    }

    public void setDentists(Set<Dentist> dentists) {
        this.dentists = dentists;
    }
}
