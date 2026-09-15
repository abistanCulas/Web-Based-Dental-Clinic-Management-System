import { useState } from "react";
import { useNotifications } from "../../context/NotificationContext";
import "./public.css";

export default function Contact() {
  const { addToast } = useNotifications();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      addToast("Please fill in all required fields", "warning");
      return;
    }
    setSubmitted(true);
    addToast("Thank you for contacting us! We'll reply within 24 hours.", "success");
    setForm({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <>
      <div className="df-page-banner">
        <h1>Contact Us</h1>
        <p>We're here to help with your dental care questions, treatment inquiries, and appointment needs.</p>
      </div>
      <div className="df-page-content">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 32 }}>
          <div>
            <h2 style={{ marginBottom: 24 }}>Get in Touch</h2>
            {[
              { icon: "📞", label: "Phone", value: "+94 11 234 5678" },
              { icon: "✉️", label: "Email", value: "hello@dentaflow.com" },
              { icon: "📍", label: "Address", value: "123 Dental Avenue, Colombo, Sri Lanka" },
              { icon: "🕐", label: "Hours", value: "Mon - Sat: 8:00 AM - 8:00 PM" },
            ].map((c) => (
              <div key={c.label} style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: "var(--df-primary-50)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                  }}
                >
                  {c.icon}
                </div>
                <div>
                  <small style={{ color: "var(--df-text-muted)" }}>{c.label}</small>
                  <strong style={{ display: "block" }}>{c.value}</strong>
                </div>
              </div>
            ))}
          </div>
          <div className="df-card">
            <div className="df-card-body">
              <h3 style={{ marginBottom: 16 }}>Send a Message</h3>
              {submitted ? (
                <div style={{ textAlign: "center", padding: "32px 16px" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✉️</div>
                  <h4>Message Sent Successfully!</h4>
                  <p style={{ color: "var(--df-text-secondary)", marginTop: 8 }}>
                    Our dental clinic coordinator will review your inquiry and get back to you shortly.
                  </p>
                  <button
                    className="df-btn df-btn-secondary"
                    style={{ marginTop: 16 }}
                    onClick={() => setSubmitted(false)}
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="df-form-group">
                    <label className="df-label">Name *</label>
                    <input
                      className="df-input"
                      placeholder="Your name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="df-form-group">
                    <label className="df-label">Email *</label>
                    <input
                      className="df-input"
                      type="email"
                      placeholder="your@email.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="df-form-group">
                    <label className="df-label">Subject</label>
                    <input
                      className="df-input"
                      placeholder="How can we help you?"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    />
                  </div>
                  <div className="df-form-group">
                    <label className="df-label">Message *</label>
                    <textarea
                      className="df-textarea"
                      rows={4}
                      placeholder="Your message or question..."
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      required
                    />
                  </div>
                  <button type="submit" className="df-btn df-btn-primary df-btn-block">
                    Send Message
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
