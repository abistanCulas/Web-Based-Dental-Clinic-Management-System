# Patient Care Record Management Frontend — US05–US08

## Run standalone
```bash
npm install
npm run dev
```
Backend should run on port 8080.

## LEADER MERGE NOTES
- This is a React + Vite module. If the group frontend is already React, copy the page/component logic and `services/patientCareApi.js` into the existing project rather than replacing the group's package.json.
- Add a route/menu item named **Patient Care Records** pointing to this module.
- Keep the API helper centralized. If backend host changes, set `VITE_API_BASE_URL`.
- Replace this module's header/nav with the group's shared Navbar/Layout after merging.
- Connect the group's authentication/role context. Receptionist/Dentist/Admin are staff users for record management; patient-facing access can be restricted to the logged-in patient's own record/submissions.
- Do not duplicate inquiry/feedback admin screens if Jayasundara's module already owns them. This frontend only demonstrates US08 patient submission/status.
