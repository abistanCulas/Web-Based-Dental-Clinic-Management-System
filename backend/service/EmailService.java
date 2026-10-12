package com.dentaflow.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public EmailService(
            JavaMailSender mailSender) {

        this.mailSender = mailSender;
    }

    // =========================================================
    // SEND EMAIL
    // =========================================================

    public void sendEmail(
            String to,
            String subject,
            String message) {

        if (to == null ||
                to.trim().isEmpty()) {

            throw new RuntimeException(
                    "Recipient email is required"
            );
        }

        if (subject == null ||
                subject.trim().isEmpty()) {

            throw new RuntimeException(
                    "Email subject is required"
            );
        }

        if (message == null ||
                message.trim().isEmpty()) {

            throw new RuntimeException(
                    "Email message is required"
            );
        }

        SimpleMailMessage mail =
                new SimpleMailMessage();

        mail.setFrom(fromEmail);

        mail.setTo(
                to.trim()
        );

        mail.setSubject(
                subject.trim()
        );

        mail.setText(
                message.trim()
        );

        mailSender.send(mail);
    }

    // =========================================================
    // PATIENT QUESTION AUTO RESPONSE
    // =========================================================

    public void sendQuestionAutoResponse(
            String patientEmail) {

        String subject =
                "DentaFlow - We Received Your Question";

        String message =
                "Dear Patient,\n\n"
                        + "Thank you for contacting DentaFlow.\n\n"
                        + "We have received your question and "
                        + "our team will review it shortly. "
                        + "An administrator will provide a response "
                        + "if further assistance is required.\n\n"
                        + "Please do not reply to this automated "
                        + "message if your concern is an emergency. "
                        + "Please seek immediate medical attention "
                        + "for emergencies.\n\n"
                        + "Best regards,\n"
                        + "DentaFlow Support Team";

        sendEmail(
                patientEmail,
                subject,
                message
        );
    }

    // =========================================================
    // ADMIN RESPONSE TO PATIENT
    // =========================================================

    public void sendAdminResponse(
            String patientEmail,
            String adminResponse,
            String adminName) {

        if (adminResponse == null ||
                adminResponse.trim().isEmpty()) {

            throw new RuntimeException(
                    "Admin response is required"
            );
        }

        String subject =
                "DentaFlow - Response to Your Question";

        String message =
                "Dear Patient,\n\n"
                        + "Thank you for contacting DentaFlow.\n\n"
                        + "Our administrator has responded to "
                        + "your question:\n\n"
                        + adminResponse.trim()
                        + "\n\n"
                        + "Regards,\n";

        if (adminName != null &&
                !adminName.trim().isEmpty()) {

            message +=
                    adminName.trim() + "\n";
        }

        message +=
                "DentaFlow Support Team";

        sendEmail(
                patientEmail,
                subject,
                message
        );
    }

    // =========================================================
    // FEEDBACK AUTO RESPONSE
    // =========================================================

    public void sendFeedbackAutoResponse(
            String patientEmail,
            String response) {

        if (response == null ||
                response.trim().isEmpty()) {

            throw new RuntimeException(
                    "Feedback response is required"
            );
        }

        String subject =
                "DentaFlow - Thank You for Your Feedback";

        String message =
                "Dear Patient,\n\n"
                        + response.trim()
                        + "\n\n"
                        + "Best regards,\n"
                        + "DentaFlow Support Team";

        sendEmail(
                patientEmail,
                subject,
                message
        );
    }

    // =========================================================
    // NEGATIVE FEEDBACK ADMIN ALERT
    // =========================================================

    public void sendNegativeFeedbackAlert(
            String adminEmail,
            String feedbackCode,
            String comment) {

        String subject =
                "DentaFlow Alert - Negative Feedback Received";

        String message =
                "Dear Admin,\n\n"
                        + "A negative feedback has been received "
                        + "in the DentaFlow system.\n\n"
                        + "Feedback Code: "
                        + feedbackCode
                        + "\n\n"
                        + "Patient Comment:\n"
                        + (
                        comment != null &&
                                !comment.trim().isEmpty()
                                ? comment.trim()
                                : "No comment provided."
                )
                        + "\n\n"
                        + "Please review this feedback "
                        + "and take the necessary action.\n\n"
                        + "DentaFlow System";

        sendEmail(
                adminEmail,
                subject,
                message
        );
    }

    // =========================================================
    // PASSWORD RESET OTP EMAIL
    // =========================================================

    public boolean sendPasswordResetOtp(
            String recipientEmail,
            String otp) {

        if (recipientEmail == null || recipientEmail.trim().isEmpty()) {
            throw new RuntimeException("Recipient email is required");
        }

        if (otp == null || otp.trim().isEmpty()) {
            throw new RuntimeException("OTP code is required");
        }

        String subject = "DentaFlow - Password Reset Verification Code";

        String message = "Dear DentaFlow User,\n\n"
                + "We received a request to reset the password for your DentaFlow healthcare account.\n\n"
                + "Your 6-digit verification code is:\n\n"
                + "         [ " + otp.trim() + " ]\n\n"
                + "This verification code will expire in 10 minutes.\n\n"
                + "SECURITY WARNING:\n"
                + "Never share this code with anyone. DentaFlow staff will never ask for your verification code.\n"
                + "If you did not make this request, your account is still secure. You can safely ignore this email.\n\n"
                + "Warm regards,\n"
                + "The DentaFlow Security Team\n"
                + "https://dentaflow.local";

        try {
            sendEmail(recipientEmail, subject, message);
            return true;
        } catch (Exception ex) {
            System.out.println("[DEV-CONSOLE-MAIL] Reset OTP for " + recipientEmail + ": " + otp);
            System.err.println("WARN: JavaMailSender attempted delivery to " + recipientEmail + " but encountered: " + ex.getMessage());
            return false;
        }
    }

    // =========================================================
    // REGISTRATION VERIFICATION OTP EMAIL
    // =========================================================

    public boolean sendRegistrationOtp(
            String recipientEmail,
            String otp) {

        if (recipientEmail == null || recipientEmail.trim().isEmpty()) {
            throw new RuntimeException("Recipient email is required");
        }

        if (otp == null || otp.trim().isEmpty()) {
            throw new RuntimeException("OTP code is required");
        }

        String subject = "DentaFlow - Registration Verification Code";

        String message = "Dear User,\n\n"
                + "Welcome to DentaFlow Dental Care!\n\n"
                + "To complete your account registration, please verify your email address using the following 6-digit verification code:\n\n"
                + "         [ " + otp.trim() + " ]\n\n"
                + "This verification code will expire in 5 minutes.\n\n"
                + "SECURITY WARNING:\n"
                + "Never share this code with anyone. DentaFlow staff will never ask for your verification code.\n"
                + "If you did not attempt to register an account with DentaFlow, please ignore this email.\n\n"
                + "Best regards,\n"
                + "The DentaFlow Team\n"
                + "https://dentaflow.local";

        try {
            sendEmail(recipientEmail, subject, message);
            return true;
        } catch (Exception ex) {
            System.out.println("[DEV-CONSOLE-MAIL] Registration OTP for " + recipientEmail + ": " + otp);
            System.err.println("WARN: JavaMailSender attempted registration OTP delivery to " + recipientEmail + " but encountered: " + ex.getMessage());
            return false;
        }
    }

    // =========================================================
    // APPOINTMENT CONFIRMATION EMAIL
    // =========================================================

    public boolean sendAppointmentConfirmation(
            String recipientEmail,
            String patientName,
            String doctorName,
            String date,
            String time,
            String appointmentCode) {

        if (recipientEmail == null || recipientEmail.trim().isEmpty()) return false;

        String subject = "DentaFlow - Appointment Confirmed [" + (appointmentCode != null ? appointmentCode : "BOOKING") + "]";

        String message = "Dear " + (patientName != null ? patientName : "Valued Patient") + ",\n\n"
                + "Your dental appointment has been successfully confirmed at DentaFlow Dental Care.\n\n"
                + "APPOINTMENT DETAILS:\n"
                + "--------------------------------------------------\n"
                + "Appointment Reference: " + (appointmentCode != null ? appointmentCode : "N/A") + "\n"
                + "Attending Dentist:     " + (doctorName != null ? doctorName : "Specialist") + "\n"
                + "Date:                  " + date + "\n"
                + "Time:                  " + time + "\n"
                + "Location:              DentaFlow Clinic, Level 2 Medical Center\n"
                + "--------------------------------------------------\n\n"
                + "Please arrive 10 minutes prior to your scheduled time.\n"
                + "If you need to reschedule or cancel, please visit your patient portal or call clinic reception.\n\n"
                + "Warm regards,\n"
                + "The DentaFlow Care Team\n"
                + "https://dentaflow.local";

        try {
            sendEmail(recipientEmail, subject, message);
            return true;
        } catch (Exception ex) {
            System.out.println("[DEV-CONSOLE-MAIL] Appointment Confirmation to " + recipientEmail + " (" + appointmentCode + "): " + date + " " + time);
            return false;
        }
    }

    // =========================================================
    // APPOINTMENT CANCELLATION EMAIL
    // =========================================================

    public boolean sendAppointmentCancellation(
            String recipientEmail,
            String patientName,
            String doctorName,
            String date,
            String time,
            String appointmentCode,
            String reason) {

        if (recipientEmail == null || recipientEmail.trim().isEmpty()) return false;

        String subject = "DentaFlow - Appointment Cancelled [" + (appointmentCode != null ? appointmentCode : "REF") + "]";

        String message = "Dear " + (patientName != null ? patientName : "Valued Patient") + ",\n\n"
                + "This email confirms that your appointment has been cancelled.\n\n"
                + "CANCELLED APPOINTMENT DETAILS:\n"
                + "--------------------------------------------------\n"
                + "Reference:        " + (appointmentCode != null ? appointmentCode : "N/A") + "\n"
                + "Dentist:          " + (doctorName != null ? doctorName : "Specialist") + "\n"
                + "Scheduled Date:   " + date + "\n"
                + "Scheduled Time:   " + time + "\n"
                + "Cancellation Note: " + (reason != null && !reason.trim().isEmpty() ? reason.trim() : "Cancelled as requested") + "\n"
                + "--------------------------------------------------\n\n"
                + "You may book a new consultation at any time through your DentaFlow patient portal.\n\n"
                + "Warm regards,\n"
                + "The DentaFlow Care Team";

        try {
            sendEmail(recipientEmail, subject, message);
            return true;
        } catch (Exception ex) {
            System.out.println("[DEV-CONSOLE-MAIL] Appointment Cancellation to " + recipientEmail + " (" + appointmentCode + ")");
            return false;
        }
    }

    // =========================================================
    // APPOINTMENT RESCHEDULED EMAIL
    // =========================================================

    public boolean sendAppointmentRescheduled(
            String recipientEmail,
            String patientName,
            String doctorName,
            String newDate,
            String newTime,
            String appointmentCode) {

        if (recipientEmail == null || recipientEmail.trim().isEmpty()) return false;

        String subject = "DentaFlow - Appointment Rescheduled [" + (appointmentCode != null ? appointmentCode : "REF") + "]";

        String message = "Dear " + (patientName != null ? patientName : "Valued Patient") + ",\n\n"
                + "Your dental appointment has been successfully rescheduled.\n\n"
                + "UPDATED APPOINTMENT SCHEDULE:\n"
                + "--------------------------------------------------\n"
                + "Appointment Code:  " + (appointmentCode != null ? appointmentCode : "N/A") + "\n"
                + "Attending Dentist: " + (doctorName != null ? doctorName : "Specialist") + "\n"
                + "New Date:          " + newDate + "\n"
                + "New Time:          " + newTime + "\n"
                + "Location:          DentaFlow Clinic, Level 2 Medical Center\n"
                + "--------------------------------------------------\n\n"
                + "Please note your updated time. Thank you for choosing DentaFlow.\n\n"
                + "Warm regards,\n"
                + "The DentaFlow Care Team";

        try {
            sendEmail(recipientEmail, subject, message);
            return true;
        } catch (Exception ex) {
            System.out.println("[DEV-CONSOLE-MAIL] Appointment Rescheduled to " + recipientEmail + " (" + appointmentCode + "): " + newDate + " " + newTime);
            return false;
        }
    }

    // =========================================================
    // APPOINTMENT REMINDER EMAIL
    // =========================================================

    public boolean sendAppointmentReminder(
            String recipientEmail,
            String patientName,
            String doctorName,
            String date,
            String time,
            String appointmentCode) {

        if (recipientEmail == null || recipientEmail.trim().isEmpty()) return false;

        String subject = "DentaFlow Reminder - Upcoming Dental Appointment [" + (appointmentCode != null ? appointmentCode : "REF") + "]";

        String message = "Dear " + (patientName != null ? patientName : "Valued Patient") + ",\n\n"
                + "This is a friendly reminder of your upcoming appointment with DentaFlow Dental Care.\n\n"
                + "APPOINTMENT DETAILS:\n"
                + "--------------------------------------------------\n"
                + "Code:    " + (appointmentCode != null ? appointmentCode : "N/A") + "\n"
                + "Dentist: " + (doctorName != null ? doctorName : "Specialist") + "\n"
                + "Date:    " + date + "\n"
                + "Time:    " + time + "\n"
                + "--------------------------------------------------\n\n"
                + "We look forward to seeing you.\n\n"
                + "Best regards,\n"
                + "The DentaFlow Care Team";

        try {
            sendEmail(recipientEmail, subject, message);
            return true;
        } catch (Exception ex) {
            System.out.println("[DEV-CONSOLE-MAIL] Appointment Reminder to " + recipientEmail);
            return false;
        }
    }

    // =========================================================
    // PAYMENT RECEIPT EMAIL
    // =========================================================

    public boolean sendPaymentReceipt(
            String recipientEmail,
            String patientName,
            String paymentCode,
            Double amount,
            String paymentMethod,
            String paymentDate) {

        if (recipientEmail == null || recipientEmail.trim().isEmpty()) return false;

        String subject = "DentaFlow - Payment Receipt [" + (paymentCode != null ? paymentCode : "TXN") + "]";

        String formattedAmount = amount != null ? String.format("%.2f", amount) : "0.00";

        String message = "Dear " + (patientName != null ? patientName : "Valued Patient") + ",\n\n"
                + "Thank you for your payment. Here is your official payment receipt from DentaFlow Dental Care.\n\n"
                + "PAYMENT RECEIPT:\n"
                + "--------------------------------------------------\n"
                + "Receipt / Code: " + (paymentCode != null ? paymentCode : "N/A") + "\n"
                + "Amount Paid:    $" + formattedAmount + " USD\n"
                + "Payment Method: " + (paymentMethod != null ? paymentMethod : "CARD") + "\n"
                + "Date:           " + (paymentDate != null ? paymentDate : "Today") + "\n"
                + "Status:         PAID & COMPLETED\n"
                + "--------------------------------------------------\n\n"
                + "This receipt is officially generated by the DentaFlow Billing System.\n"
                + "For questions regarding your bill, please reach out to our billing desk.\n\n"
                + "Warm regards,\n"
                + "DentaFlow Accounts & Billing Team\n"
                + "https://dentaflow.local";

        try {
            sendEmail(recipientEmail, subject, message);
            return true;
        } catch (Exception ex) {
            System.out.println("[DEV-CONSOLE-MAIL] Payment Receipt to " + recipientEmail + " (" + paymentCode + "): $" + formattedAmount);
            return false;
        }
    }
}