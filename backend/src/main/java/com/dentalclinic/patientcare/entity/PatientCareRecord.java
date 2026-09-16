package com.dentalclinic.patientcare.entity;
import jakarta.persistence.*;import jakarta.validation.constraints.*;import java.time.*;
@Entity @Table(name="patient_care_records") public class PatientCareRecord {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @NotBlank @Size(max=80) private String fullName;
 @NotNull @Past private LocalDate dateOfBirth;
 @NotBlank @Pattern(regexp="^[0-9+() -]{7,20}$") private String phone;
 @Email @Size(max=120) private String email;
 @Size(max=255) private String address;
 @Size(max=500) private String medicalConditions;
 @Size(max=500) private String medications;
 @Size(max=500) private String allergies;
 @Size(max=500) private String dentalNotes;
 private Long guardianPatientId; private Boolean active=true; private LocalDate nextRecallDate;
 @Column(nullable=false,updatable=false) private LocalDateTime createdAt; @Column(nullable=false) private LocalDateTime updatedAt;
 @PrePersist void prePersist(){createdAt=updatedAt=LocalDateTime.now();if(active==null)active=true;} @PreUpdate void preUpdate(){updatedAt=LocalDateTime.now();}
 public Long getId(){return id;} public void setId(Long v){id=v;} public String getFullName(){return fullName;} public void setFullName(String v){fullName=v;} public LocalDate getDateOfBirth(){return dateOfBirth;} public void setDateOfBirth(LocalDate v){dateOfBirth=v;} public String getPhone(){return phone;} public void setPhone(String v){phone=v;} public String getEmail(){return email;} public void setEmail(String v){email=v;} public String getAddress(){return address;} public void setAddress(String v){address=v;} public String getMedicalConditions(){return medicalConditions;} public void setMedicalConditions(String v){medicalConditions=v;} public String getMedications(){return medications;} public void setMedications(String v){medications=v;} public String getAllergies(){return allergies;} public void setAllergies(String v){allergies=v;} public String getDentalNotes(){return dentalNotes;} public void setDentalNotes(String v){dentalNotes=v;} public Long getGuardianPatientId(){return guardianPatientId;} public void setGuardianPatientId(Long v){guardianPatientId=v;} public Boolean getActive(){return active;} public void setActive(Boolean v){active=v;} public LocalDate getNextRecallDate(){return nextRecallDate;} public void setNextRecallDate(LocalDate v){nextRecallDate=v;} public LocalDateTime getCreatedAt(){return createdAt;} public LocalDateTime getUpdatedAt(){return updatedAt;}
}