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
            System.err.println("WARN: JavaMailSender attempted registration OTP delivery to " + recipientEmail + " but encountered: " + ex.getMessage());
            return false;
        }
    }
}