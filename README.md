# Appointment Management Module

Spring Boot backend + separate HTML/CSS/JavaScript frontend.

## User Stories
- US13: Book Appointment
- US14: Reschedule / Cancel Appointment
- US15: Queue Management
- US16: Upcoming Appointment Reminders

## Before Running
1. Create a MySQL database named `dental_clinic`.
2. Open `backend/src/main/resources/application.properties`.
3. Replace `YOUR_PASSWORD` with your MySQL password.
4. Run the Spring Boot backend.
5. Open the frontend using a local web server (for example VS Code Live Server).

## Team Leader Merge Notes
Search the project for `MERGE NOTE`.
- `patientId` is temporary and should later connect to the Patient Management entity.
- `dentistId` is temporary and should later connect to the Dentist & Staff Management entity.
- Keep Appointment APIs under `/api/appointments`.
- Replace the standalone navigation with the team's shared navigation.
- `config.js` contains the frontend API base URL.
- Reminder functionality currently shows upcoming appointments in-system; connect the team's selected notification provider later if required.
- Restrict CORS for production/final integration.

## Important
This starter version updates an appointment when rescheduling. If the final requirement is to preserve every previous schedule, add an AppointmentHistory entity/table during integration.
