package com.dentaflow.backend.service;

import com.dentaflow.backend.dto.MedicationAllergyCheckResult;
import com.dentaflow.backend.dto.PatientAllergiesResponse;
import com.dentaflow.backend.dto.PatientAllergyDTO;
import com.dentaflow.backend.entity.MedicalRecord;
import com.dentaflow.backend.entity.Medicine;
import com.dentaflow.backend.entity.Patient;
import com.dentaflow.backend.repository.MedicalRecordRepository;
import com.dentaflow.backend.repository.MedicineRepository;
import com.dentaflow.backend.repository.PatientRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class PatientAllergyService {

    private final PatientRepository patientRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final MedicineRepository medicineRepository;

    public PatientAllergyService(
            PatientRepository patientRepository,
            MedicalRecordRepository medicalRecordRepository,
            MedicineRepository medicineRepository) {
        this.patientRepository = patientRepository;
        this.medicalRecordRepository = medicalRecordRepository;
        this.medicineRepository = medicineRepository;
    }

    // =========================================================
    // 1. GET PATIENT ALLERGIES
    // =========================================================

    public PatientAllergiesResponse getPatientAllergies(Long patientId) {
        if (patientId == null) {
            throw new RuntimeException("Patient ID is required");
        }

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient not found with id: " + patientId));

        String rawAllergies = patient.getAllergies();

        // If patient entity has empty allergies, check latest medical records as fallback
        if ((rawAllergies == null || rawAllergies.trim().isEmpty() || isNegation(rawAllergies))
                && medicalRecordRepository != null) {
            List<MedicalRecord> records = medicalRecordRepository.findByPatientIdOrderByRecordDateDesc(patientId);
            for (MedicalRecord rec : records) {
                if (rec.getAllergies() != null && !rec.getAllergies().trim().isEmpty() && !isNegation(rec.getAllergies())) {
                    rawAllergies = rec.getAllergies().trim();
                    break;
                }
            }
        }

        List<PatientAllergyDTO> allergyList = parseAllergies(rawAllergies);
        boolean hasAllergies = !allergyList.isEmpty();

        String patientName = (patient.getFirstName() + " " + patient.getLastName()).trim();
        if (patientName.isEmpty()) {
            patientName = "Patient " + (patient.getPatientCode() != null ? patient.getPatientCode() : patient.getId());
        }

        return PatientAllergiesResponse.builder()
                .patientId(patient.getId())
                .patientName(patientName)
                .patientCode(patient.getPatientCode())
                .hasAllergies(hasAllergies)
                .allergyCount(allergyList.size())
                .allergies(allergyList)
                .rawAllergies(rawAllergies)
                .medicalConditions(patient.getMedicalConditions())
                .currentMedications(patient.getCurrentMedications())
                .build();
    }

    // =========================================================
    // 2. UPDATE PATIENT ALLERGIES
    // =========================================================

    @Transactional
    public PatientAllergiesResponse updatePatientAllergies(Long patientId, String rawAllergies) {
        if (patientId == null) {
            throw new RuntimeException("Patient ID is required");
        }

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient not found with id: " + patientId));

        String cleaned = rawAllergies != null ? rawAllergies.trim() : null;
        patient.setAllergies(cleaned);
        patientRepository.save(patient);

        return getPatientAllergies(patientId);
    }

    // =========================================================
    // 3. CHECK MEDICATION ALLERGY CONFLICT
    // =========================================================

    public MedicationAllergyCheckResult checkMedicationAllergy(Long patientId, Long medicineId, String medicineNameInput) {
        if (patientId == null) {
            throw new RuntimeException("Patient ID is required");
        }

        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient not found with id: " + patientId));

        PatientAllergiesResponse allergyInfo = getPatientAllergies(patientId);

        // If patient has no recorded allergies, return no warning
        if (!allergyInfo.isHasAllergies() || allergyInfo.getAllergies().isEmpty()) {
            return MedicationAllergyCheckResult.builder()
                    .hasWarning(false)
                    .riskLevel("NONE")
                    .allergen(null)
                    .medicineName(medicineNameInput)
                    .warningMessage(null)
                    .clinicalAdvice(null)
                    .category(null)
                    .build();
        }

        // Resolve medicine entity if medicineId is provided or search by name
        Medicine medicine = null;
        if (medicineId != null) {
            medicine = medicineRepository.findById(medicineId).orElse(null);
        } else if (medicineNameInput != null && !medicineNameInput.trim().isEmpty()) {
            List<Medicine> found = medicineRepository.findByNameContainingIgnoreCase(medicineNameInput.trim());
            if (!found.isEmpty()) {
                medicine = found.get(0);
            }
        }

        String targetMedName = medicine != null ? medicine.getName() : (medicineNameInput != null ? medicineNameInput.trim() : "");
        String targetGeneric = medicine != null ? medicine.getGenericName() : "";
        String targetBrand = medicine != null ? medicine.getBrandName() : "";
        String targetWarning = medicine != null ? medicine.getAllergyWarning() : "";
        String targetCategory = medicine != null ? medicine.getCategory() : "";

        // Evaluate against all patient's recorded allergies
        for (PatientAllergyDTO allergy : allergyInfo.getAllergies()) {
            String allergenName = allergy.getName();
            if (allergenName == null || allergenName.isBlank()) continue;

            MedicationAllergyCheckResult match = evaluatePotentialConflict(
                    allergenName,
                    allergy,
                    targetMedName,
                    targetGeneric,
                    targetBrand,
                    targetWarning,
                    targetCategory
            );

            if (match != null && match.isHasWarning()) {
                return match;
            }
        }

        // Unrelated medication - no warning
        return MedicationAllergyCheckResult.builder()
                .hasWarning(false)
                .riskLevel("NONE")
                .allergen(null)
                .medicineName(targetMedName)
                .warningMessage(null)
                .clinicalAdvice(null)
                .category(null)
                .build();
    }

    // =========================================================
    // HELPER: EVALUATE CONFLICT BETWEEN ALLERGEN AND MEDICATION
    // =========================================================

    private MedicationAllergyCheckResult evaluatePotentialConflict(
            String allergenName,
            PatientAllergyDTO allergyDTO,
            String medName,
            String genericName,
            String brandName,
            String allergyWarning,
            String category) {

        String algLower = allergenName.toLowerCase().trim();
        String medLower = (medName != null ? medName : "").toLowerCase().trim();
        String genLower = (genericName != null ? genericName : "").toLowerCase().trim();
        String brdLower = (brandName != null ? brandName : "").toLowerCase().trim();
        String wrnLower = (allergyWarning != null ? allergyWarning : "").toLowerCase().trim();
        String catLower = (category != null ? category : "").toLowerCase().trim();

        // 1. Direct name match (e.g. Allergy: Amoxicillin, Medicine: Amoxicillin)
        if (isDirectMatch(algLower, medLower) || isDirectMatch(algLower, genLower) || isDirectMatch(algLower, brdLower)) {
            return MedicationAllergyCheckResult.builder()
                    .hasWarning(true)
                    .riskLevel("HIGH")
                    .allergen(allergenName)
                    .medicineName(medName)
                    .warningMessage("The patient has a recorded allergy to: " + allergenName + "\nSelected medication: " + medName + "\nPlease review the patient's allergy information before continuing.")
                    .clinicalAdvice("Direct allergen match. The patient has a documented allergy to this specific medication. Please review patient history before prescribing.")
                    .category(allergyDTO.getCategory())
                    .build();
        }

        // 2. Medicine allergy warning text match in database
        if (!wrnLower.isEmpty() && (wrnLower.contains(algLower) || algLower.contains(wrnLower))) {
            return MedicationAllergyCheckResult.builder()
                    .hasWarning(true)
                    .riskLevel("HIGH")
                    .allergen(allergenName)
                    .medicineName(medName)
                    .warningMessage("The patient has a recorded allergy to: " + allergenName + "\nSelected medication: " + medName + "\nPlease review the patient's allergy information before continuing.")
                    .clinicalAdvice("Medicine safety record contains an explicit allergy warning associated with: " + allergenName + ".")
                    .category(allergyDTO.getCategory())
                    .build();
        }

        // 3. Clinical Known Allergen Class Relationships:
        // A) PENICILLIN & BETA-LACTAM ANTIBIOTICS
        Set<String> penicillinTerms = Set.of(
                "penicillin", "amoxicillin", "ampicillin", "augmentin", "cloxacillin",
                "dicloxacillin", "piperacillin", "beta-lactam", "beta lactam", "amoxil"
        );
        boolean algIsPenicillinGroup = containsAnyOf(algLower, penicillinTerms);
        boolean medIsPenicillinGroup = containsAnyOf(medLower, penicillinTerms)
                || containsAnyOf(genLower, penicillinTerms)
                || containsAnyOf(brdLower, penicillinTerms);

        if (algIsPenicillinGroup && medIsPenicillinGroup) {
            return MedicationAllergyCheckResult.builder()
                    .hasWarning(true)
                    .riskLevel("HIGH")
                    .allergen(allergenName)
                    .medicineName(medName)
                    .warningMessage("The patient has a recorded allergy to:\n" + allergenName + "\n\nSelected medication:\n" + medName + "\n\nPlease review the patient's allergy information before continuing.")
                    .clinicalAdvice("Amoxicillin and penicillins belong to the beta-lactam class with high cross-reactivity. Review patient allergy history before prescribing.")
                    .category("DRUG")
                    .build();
        }

        // B) SULFONAMIDES (SULFA DRUGS)
        Set<String> sulfaTerms = Set.of("sulfa", "sulfonamide", "bactrim", "septra", "sulfamethoxazole", "trimethoprim-sulfamethoxazole");
        boolean algIsSulfa = containsAnyOf(algLower, sulfaTerms);
        boolean medIsSulfa = containsAnyOf(medLower, sulfaTerms) || containsAnyOf(genLower, sulfaTerms);
        if (algIsSulfa && medIsSulfa) {
            return MedicationAllergyCheckResult.builder()
                    .hasWarning(true)
                    .riskLevel("HIGH")
                    .allergen(allergenName)
                    .medicineName(medName)
                    .warningMessage("The patient has a recorded allergy to:\n" + allergenName + "\n\nSelected medication:\n" + medName + "\n\nPlease review the patient's allergy information before continuing.")
                    .clinicalAdvice("Cross-reactivity within sulfonamide antimicrobials. Verify allergy history before continuing.")
                    .category("DRUG")
                    .build();
        }

        // C) NSAIDs & ASPIRIN
        Set<String> nsaidTerms = Set.of("aspirin", "nsaid", "ibuprofen", "naproxen", "ketorolac", "diclofenac", "mefenamic");
        boolean algIsNsaid = containsAnyOf(algLower, nsaidTerms);
        boolean medIsNsaid = containsAnyOf(medLower, nsaidTerms) || containsAnyOf(genLower, nsaidTerms);
        if (algIsNsaid && medIsNsaid) {
            return MedicationAllergyCheckResult.builder()
                    .hasWarning(true)
                    .riskLevel("HIGH")
                    .allergen(allergenName)
                    .medicineName(medName)
                    .warningMessage("The patient has a recorded allergy to:\n" + allergenName + "\n\nSelected medication:\n" + medName + "\n\nPlease review the patient's allergy information before continuing.")
                    .clinicalAdvice("Patient has documented sensitivity to NSAIDs or Aspirin. Potential cross-reactivity with nonsteroidal anti-inflammatory agents.")
                    .category("DRUG")
                    .build();
        }

        // D) OPIOIDS
        Set<String> opioidTerms = Set.of("codeine", "tramadol", "morphine", "oxycodone", "hydrocodone", "opioid");
        boolean algIsOpioid = containsAnyOf(algLower, opioidTerms);
        boolean medIsOpioid = containsAnyOf(medLower, opioidTerms) || containsAnyOf(genLower, opioidTerms);
        if (algIsOpioid && medIsOpioid) {
            return MedicationAllergyCheckResult.builder()
                    .hasWarning(true)
                    .riskLevel("HIGH")
                    .allergen(allergenName)
                    .medicineName(medName)
                    .warningMessage("The patient has a recorded allergy to:\n" + allergenName + "\n\nSelected medication:\n" + medName + "\n\nPlease review the patient's allergy information before continuing.")
                    .clinicalAdvice("Potential cross-allergenicity or sensitivity within opioid analgesics.")
                    .category("DRUG")
                    .build();
        }

        // E) LOCAL ANESTHETICS (AMIDES / ESTERS)
        Set<String> localAnestheticTerms = Set.of("lidocaine", "articaine", "mepivacaine", "prilocaine", "bupivacaine", "novocaine", "procaine", "local anesthetic");
        boolean algIsLA = containsAnyOf(algLower, localAnestheticTerms);
        boolean medIsLA = containsAnyOf(medLower, localAnestheticTerms) || containsAnyOf(genLower, localAnestheticTerms);
        if (algIsLA && medIsLA) {
            return MedicationAllergyCheckResult.builder()
                    .hasWarning(true)
                    .riskLevel("HIGH")
                    .allergen(allergenName)
                    .medicineName(medName)
                    .warningMessage("The patient has a recorded allergy to:\n" + allergenName + "\n\nSelected medication:\n" + medName + "\n\nPlease review the patient's allergy information before continuing.")
                    .clinicalAdvice("Local anesthetic sensitivity reported. Verify anesthetic class (amide vs ester) before administration.")
                    .category("DRUG")
                    .build();
        }

        // F) DENTAL MATERIALS / OTHER (Latex, Chlorhexidine)
        if (algLower.contains("latex") && (medLower.contains("latex") || wrnLower.contains("latex"))) {
            return MedicationAllergyCheckResult.builder()
                    .hasWarning(true)
                    .riskLevel("HIGH")
                    .allergen(allergenName)
                    .medicineName(medName)
                    .warningMessage("The patient has a recorded allergy to:\n" + allergenName + "\n\nSelected medication/item:\n" + medName + "\n\nPlease review the patient's allergy information before continuing.")
                    .clinicalAdvice("Latex sensitivity alert. Ensure all dental consumables, gloves, and stoppers are latex-free.")
                    .category("MATERIAL")
                    .build();
        }

        if (algLower.contains("chlorhexidine") && (medLower.contains("chlorhexidine") || genLower.contains("chlorhexidine"))) {
            return MedicationAllergyCheckResult.builder()
                    .hasWarning(true)
                    .riskLevel("HIGH")
                    .allergen(allergenName)
                    .medicineName(medName)
                    .warningMessage("The patient has a recorded allergy to:\n" + allergenName + "\n\nSelected medication:\n" + medName + "\n\nPlease review the patient's allergy information before continuing.")
                    .clinicalAdvice("Patient has recorded chlorhexidine sensitivity. Avoid chlorhexidine-containing rinses and irrigants.")
                    .category("DRUG")
                    .build();
        }

        return null;
    }

    // =========================================================
    // HELPER: PARSE RAW ALLERGIES STRING
    // =========================================================

    public List<PatientAllergyDTO> parseAllergies(String rawAllergies) {
        if (rawAllergies == null || rawAllergies.trim().isEmpty()) {
            return Collections.emptyList();
        }

        if (isNegation(rawAllergies)) {
            return Collections.emptyList();
        }

        List<PatientAllergyDTO> results = new ArrayList<>();
        // Split on comma, semicolon, newline, bullet point (•)
        String[] tokens = rawAllergies.split("[,;\\n\\r•]+");

        for (String token : tokens) {
            String cleaned = token.replaceAll("^[\\s\\-*•]+", "").trim();
            if (cleaned.isEmpty() || isNegation(cleaned)) {
                continue;
            }

            // Extract extra details in parentheses if any, e.g. "Penicillin (Severe - Anaphylaxis)"
            String name = cleaned;
            String severity = "UNKNOWN";
            String reaction = null;
            String notes = null;

            Matcher matcher = Pattern.compile("^(.*?)\\((.*?)\\)$").matcher(cleaned);
            if (matcher.find()) {
                name = matcher.group(1).trim();
                String details = matcher.group(2).trim();
                notes = details;

                String detLower = details.toLowerCase();
                if (detLower.contains("severe") || detLower.contains("high") || detLower.contains("anaphylaxis")) {
                    severity = "HIGH";
                } else if (detLower.contains("moderate") || detLower.contains("medium")) {
                    severity = "MODERATE";
                } else if (detLower.contains("mild") || detLower.contains("low")) {
                    severity = "MILD";
                }

                if (detLower.contains("anaphylaxis")) {
                    reaction = "Anaphylaxis";
                } else if (detLower.contains("rash") || detLower.contains("hives") || detLower.contains("urticaria")) {
                    reaction = "Rash / Urticaria";
                } else if (detLower.contains("swelling") || detLower.contains("angioedema")) {
                    reaction = "Facial / Oral Swelling";
                }
            } else {
                String nameLower = name.toLowerCase();
                if (nameLower.contains("severe") || nameLower.contains("anaphylaxis")) {
                    severity = "HIGH";
                }
            }

            String category = inferCategory(name);

            // Default severity based on category / known high-risk drugs
            if ("UNKNOWN".equals(severity)) {
                String nLower = name.toLowerCase();
                if (nLower.contains("penicillin") || nLower.contains("amoxicillin") || nLower.contains("latex")) {
                    severity = "HIGH";
                } else {
                    severity = "MODERATE";
                }
            }

            results.add(PatientAllergyDTO.builder()
                    .name(capitalizeWords(name))
                    .category(category)
                    .severity(severity)
                    .reaction(reaction)
                    .notes(notes)
                    .build());
        }

        return results;
    }

    private String inferCategory(String name) {
        String lower = name.toLowerCase();
        if (lower.contains("penicillin") || lower.contains("amoxicillin") || lower.contains("ampicillin")
                || lower.contains("augmentin") || lower.contains("antibiotic") || lower.contains("sulfa")
                || lower.contains("aspirin") || lower.contains("ibuprofen") || lower.contains("nsaid")
                || lower.contains("codeine") || lower.contains("morphine") || lower.contains("tramadol")
                || lower.contains("lidocaine") || lower.contains("anesthetic") || lower.contains("drug")
                || lower.contains("medication")) {
            return "DRUG";
        }
        if (lower.contains("latex") || lower.contains("nickel") || lower.contains("acrylic")
                || lower.contains("metal") || lower.contains("rubber")) {
            return "MATERIAL";
        }
        if (lower.contains("pollen") || lower.contains("dust") || lower.contains("mold") || lower.contains("hay")) {
            return "ENVIRONMENTAL";
        }
        if (lower.contains("peanut") || lower.contains("nut") || lower.contains("seafood") || lower.contains("shellfish")
                || lower.contains("egg") || lower.contains("milk") || lower.contains("soy") || lower.contains("gluten")) {
            return "FOOD";
        }
        return "OTHER";
    }

    private boolean isNegation(String text) {
        if (text == null) return true;
        String t = text.trim().toLowerCase();
        return t.equals("none") || t.equals("none reported") || t.equals("nil")
                || t.equals("n/a") || t.equals("no") || t.equals("no allergies")
                || t.equals("no known allergies") || t.equals("nkda") || t.equals("no known drug allergies")
                || t.equals("none known") || t.equals("na") || t.equals("null") || t.equals("-");
    }

    private boolean isDirectMatch(String allergen, String med) {
        if (allergen.isEmpty() || med.isEmpty()) return false;
        if (allergen.equals(med)) return true;
        // Check word boundary or substring match
        return med.contains(allergen) || allergen.contains(med);
    }

    private boolean containsAnyOf(String source, Set<String> terms) {
        if (source.isEmpty()) return false;
        for (String term : terms) {
            if (source.contains(term)) return true;
        }
        return false;
    }

    private String capitalizeWords(String input) {
        if (input == null || input.isEmpty()) return input;
        String[] words = input.split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String w : words) {
            if (w.isEmpty()) continue;
            if (sb.length() > 0) sb.append(" ");
            sb.append(Character.toUpperCase(w.charAt(0)));
            if (w.length() > 1) {
                sb.append(w.substring(1));
            }
        }
        return sb.toString();
    }
}
