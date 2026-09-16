# Patient Care Record Management Backend — US05–US08
Owner: Kandegedara D.M.T.H. (IT25102558)

## Scope implemented
- US05: Patient care record CRUD, medical/dental profile, allergies, medications, guardian link, recall date, active/inactive record.
- US06: Treatment/visit history retrieval + consent record management linked to patient.
- US07: Upcoming recall detection (`GET /api/patient-care/recalls?days=30`).
- US08: Patient inquiry/feedback submission + status viewing.

## Run standalone
1. Create/start MySQL. The app creates `dental_clinic` when permitted.
2. Update `src/main/resources/application.properties` username/password.
3. Run `mvn spring-boot:run` with Java 17+.

## LEADER MERGE NOTES
1. Copy `com/dentalclinic/patientcare/**` under the main project's root package so Spring component scanning finds it.
2. Do NOT copy `PatientCareApplication.java` if the group already has its own main Spring Boot class.
3. Merge datasource/CORS settings instead of duplicating them.
4. API prefix is `/api/patient-care` to avoid route collisions.
5. **Treatment integration:** `CareHistoryEntry` is a module-safe placeholder. If Culas' Treatment module owns the final treatment table, replace it with his entity/API and keep this module read-only for treatment history.
6. **Inquiry/feedback integration:** this module owns patient submission for US08. Jayasundara's Reports/Inquiry/Feedback module should manage/reply/status these same submissions rather than create duplicates.
7. Authentication is intentionally not hard-coded. After the group's login/role module is merged, secure create/update/delete for Receptionist/Dentist/Admin and patient-facing submission/view routes as agreed.
8. Delete of patient is a soft delete (`active=false`) so clinical history is not destroyed accidentally.
