import { useState } from "react";
import {
  AtSign,
  Clock,
  FileText,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  User,
} from "lucide-react";

import { useNotifications } from "../../context/NotificationContext";
import inquiriesApi from "../../api/inquiries";

import contactHero from "../../assets/contact_hero.png";

import styles from "./Contact.module.css";

export default function Contact() {
  const { addToast } = useNotifications();

  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    inquiryType: "GENERAL",
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateField = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
        !form.name.trim() ||
        !form.email.trim() ||
        !form.message.trim()
    ) {
      addToast(
          "Please fill in all required fields",
          "warning"
      );
      return;
    }

    setLoading(true);

    try {
      await inquiriesApi.createInquiry({
        name: form.name.trim(),
        email: form.email.trim(),
        subject:
            form.subject.trim() || "General Inquiry",
        message: form.message.trim(),
        inquiryType:
            form.inquiryType || "GENERAL",
      });

      setSubmitted(true);

      addToast(
          "Thank you for contacting us! We'll reply within 24 hours.",
          "success"
      );

      setForm({
        name: "",
        email: "",
        subject: "",
        message: "",
        inquiryType: "GENERAL",
      });
    } catch (err) {
      const message =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to submit inquiry";

      addToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const contactInfo = [
    {
      icon: <MapPin size={21} />,
      label: "Address",
      value: "123 Dental Avenue, Colombo, Sri Lanka",
    },
    {
      icon: <Phone size={21} />,
      label: "Phone",
      value: "+94 11 234 5678",
    },
    {
      icon: <Mail size={21} />,
      label: "Email",
      value: "hello@dentaflow.com",
    },
    {
      icon: <Clock size={21} />,
      label: "Clinic Hours",
      value: "Mon - Sat: 8:00 AM - 8:00 PM",
    },
  ];

  return (
      <main className={styles.page}>
        {/* HERO */}

        <section className={styles.hero}>
          <img
              src={contactHero}
              alt="DentaFlow dental clinic"
              className={styles.heroImage}
          />

          <div className={styles.heroOverlay} />

          <div className={styles.heroContent}>
            <div className={styles.heroText}>
              <div className={styles.eyebrow}>
                <MessageSquare size={15} />
                <span>CONTACT US</span>
              </div>

              <h1>
                We're Here
                <span>To Help You</span>
              </h1>

              <p>
                Have a question about dental care,
                treatments or appointments? Reach out
                to the DentaFlow team and we'll be happy
                to assist you.
              </p>

              <div className={styles.heroHighlights}>
                <div className={styles.highlight}>
                  <div className={styles.highlightIcon}>
                    <MessageSquare size={20} />
                  </div>

                  <div>
                    <strong>Quick Response</strong>
                    <span>We reply promptly</span>
                  </div>
                </div>

                <div className={styles.highlight}>
                  <div className={styles.highlightIcon}>
                    <Phone size={20} />
                  </div>

                  <div>
                    <strong>Talk to Our Team</strong>
                    <span>Friendly Support</span>
                  </div>
                </div>

                <div className={styles.highlight}>
                  <div className={styles.highlightIcon}>
                    <MapPin size={20} />
                  </div>

                  <div>
                    <strong>Visit Our Clinic</strong>
                    <span>We're here for you</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CONTACT CONTENT */}

        <section className={styles.contactSection}>
          {/* CONTACT DETAILS */}

          <div className={styles.infoCard}>
            <div className={styles.cardHeading}>
              <span>GET IN TOUCH</span>

              <h2>
                We'd Love to
                <strong> Hear From You</strong>
              </h2>

              <p>
                Reach out to us using the contact details
                below or send us a message through the
                inquiry form.
              </p>
            </div>

            <div className={styles.contactList}>
              {contactInfo.map((contact) => (
                  <div
                      key={contact.label}
                      className={styles.contactItem}
                  >
                    <div className={styles.contactIcon}>
                      {contact.icon}
                    </div>

                    <div>
                      <span>{contact.label}</span>
                      <strong>{contact.value}</strong>
                    </div>
                  </div>
              ))}
            </div>

            <div className={styles.infoNote}>
              <Clock size={18} />

              <div>
                <strong>Need urgent assistance?</strong>
                <p>
                  Contact our clinic team during
                  operating hours for assistance.
                </p>
              </div>
            </div>
          </div>

          {/* MESSAGE FORM */}

          <div className={styles.formCard}>
            {submitted ? (
                <div className={styles.successState}>
                  <div className={styles.successIcon}>
                    <MessageSquare size={30} />
                  </div>

                  <span className={styles.successEyebrow}>
                MESSAGE RECEIVED
              </span>

                  <h2>
                    Thank You for
                    <span> Contacting Us!</span>
                  </h2>

                  <p>
                    Our dental clinic coordinator will
                    review your inquiry and get back to
                    you shortly.
                  </p>

                  <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => setSubmitted(false)}
                  >
                    Send Another Message
                  </button>
                </div>
            ) : (
                <>
                  <div className={styles.cardHeading}>
                    <span>SEND A MESSAGE</span>

                    <h2>
                      How Can We
                      <strong> Help You?</strong>
                    </h2>

                    <p>
                      Fill in the form and our team will
                      get back to you.
                    </p>
                  </div>

                  <form
                      onSubmit={handleSubmit}
                      className={styles.form}
                  >
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label>
                          Name
                          <span>*</span>
                        </label>

                        <div className={styles.inputWrap}>
                          <User size={16} />

                          <input
                              type="text"
                              placeholder="Your name"
                              value={form.name}
                              onChange={(event) =>
                                  updateField(
                                      "name",
                                      event.target.value
                                  )
                              }
                              required
                          />
                        </div>
                      </div>

                      <div className={styles.formGroup}>
                        <label>
                          Email
                          <span>*</span>
                        </label>

                        <div className={styles.inputWrap}>
                          <AtSign size={16} />

                          <input
                              type="email"
                              placeholder="your@email.com"
                              value={form.email}
                              onChange={(event) =>
                                  updateField(
                                      "email",
                                      event.target.value
                                  )
                              }
                              required
                          />
                        </div>
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Category</label>

                      <div className={styles.inputWrap}>
                        <FileText size={16} />

                        <select
                            value={form.inquiryType}
                            onChange={(event) =>
                                updateField(
                                    "inquiryType",
                                    event.target.value
                                )
                            }
                        >
                          <option value="GENERAL">
                            General Inquiry
                          </option>

                          <option value="TREATMENT">
                            Treatment & Procedures
                          </option>

                          <option value="APPOINTMENT">
                            Appointment Information
                          </option>

                          <option value="BILLING">
                            Billing & Insurance
                          </option>
                        </select>
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Subject</label>

                      <div className={styles.inputWrap}>
                        <FileText size={16} />

                        <input
                            type="text"
                            placeholder="How can we help you?"
                            value={form.subject}
                            onChange={(event) =>
                                updateField(
                                    "subject",
                                    event.target.value
                                )
                            }
                        />
                      </div>
                    </div>

                    <div className={styles.formGroup}>
                      <label>
                        Message
                        <span>*</span>
                      </label>

                      <div
                          className={`${styles.inputWrap} ${styles.textareaWrap}`}
                      >
                        <MessageSquare size={16} />

                        <textarea
                            rows={5}
                            placeholder="Your message or question..."
                            value={form.message}
                            onChange={(event) =>
                                updateField(
                                    "message",
                                    event.target.value
                                )
                            }
                            required
                        />
                      </div>
                    </div>

                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={loading}
                    >
                      {loading ? (
                          "Sending..."
                      ) : (
                          <>
                            Send Message
                            <Send size={17} />
                          </>
                      )}
                    </button>
                  </form>
                </>
            )}
          </div>
        </section>
      </main>
  );
}