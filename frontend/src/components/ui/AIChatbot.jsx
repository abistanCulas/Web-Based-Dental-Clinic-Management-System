import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import apiClient from "../../api/client";
import "./AIChatbot.css";

const SUGGESTED = [
  "How can I book an appointment?",
  "What dental services do you offer?",
  "How should I prepare for my appointment?",
  "Where can I view my prescription?",
  "I have severe tooth pain",
];

const RESPONSES = {
  "how can i book an appointment?":
    "You can book an appointment by clicking 'Book Appointment' in the navigation menu. Select your preferred doctor, service, date, and time. You'll need to log in to confirm your booking.",
  "what dental services do you offer?":
    "DentaFlow offers comprehensive dental services including General Checkups, Teeth Cleaning, Fillings, Root Canal, Implants, Orthodontics, Cosmetic Dentistry, Whitening, Gum Treatment, Pediatric Dentistry, Crowns & Bridges, and Oral Surgery.",
  "how should i prepare for my appointment?":
    "Please arrive 10 minutes early, bring your ID and insurance details, list any medications you're taking, and avoid eating 30 minutes before if you're having a procedure.",
  "where can i view my prescription?":
    "After logging in, go to your Patient Dashboard and click 'Prescriptions' in the sidebar to view all your prescriptions and their status.",
  "i have severe tooth pain":
    "Tooth pain can indicate decay, infection, or nerve irritation. A general dental consultation is recommended promptly. Please seek emergency care if you experience swelling or fever.",
};

export default function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hello! I'm your DentaFlow AI dental assistant. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, typing, open]);

  const sendMessage = async (text) => {
    if (!text || !text.trim() || typing) return;
    const cleanText = text.trim();
    const userMsg = { role: "user", text: cleanText };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    let replyText = "";
    let recommendation = null;
    let appointmentRecommended = false;

    try {
      // Attempt to call backend AI chatbot endpoint: POST /api/ai/chatbot
      const res = await apiClient.post("/ai/chatbot", { message: cleanText });
      if (res.data && res.data.message) {
        replyText = res.data.message;
        recommendation = res.data.recommendedService || null;
        appointmentRecommended = Boolean(res.data.appointmentRecommended);
      }
    } catch {
      // Graceful offline fallback using local knowledge base
      const key = cleanText.toLowerCase();
      const matchedKey = Object.keys(RESPONSES).find(
        (k) => key.includes(k) || k.includes(key)
      );

      replyText =
        (matchedKey && RESPONSES[matchedKey]) ||
        "Thank you for your question! For personalized clinical advice, please consult with one of our experienced dentists. You can book an appointment online or contact our clinic directly.";

      if (key.includes("tooth") || key.includes("pain") || key.includes("ache") || key.includes("bleed") || key.includes("swelling")) {
        recommendation = "GENERAL DENTAL CONSULTATION";
        appointmentRecommended = true;
      }
    } finally {
      setTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: replyText,
          recommendation,
          appointmentRecommended,
        },
      ]);
    }
  };

  return (
    <>
      <button
        className="df-chat-fab"
        onClick={() => setOpen(!open)}
        aria-label="AI Dental Assistant"
      >
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
              stroke="white"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
        )}
      </button>

      {open && (
        <div className="df-chat-window">
          <div className="df-chat-header">
            <div className="df-chat-avatar">AI</div>
            <div>
              <strong>DentaFlow Assistant</strong>
              <small>AI Dental Assistant · Connected</small>
            </div>
          </div>

          <div className="df-chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`df-chat-msg ${m.role}`}>
                <div>{m.text}</div>
                {m.appointmentRecommended && m.recommendation && (
                  <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px dashed rgba(0,0,0,0.12)" }}>
                    <small style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
                      Recommended Care: {m.recommendation}
                    </small>
                    <Link
                      to="/book-appointment"
                      onClick={() => setOpen(false)}
                      className="df-btn df-btn-primary df-btn-sm"
                      style={{ fontSize: 11, padding: "4px 8px", display: "inline-block" }}
                    >
                      Book Consultation →
                    </Link>
                  </div>
                )}
              </div>
            ))}
            {typing && (
              <div className="df-chat-msg assistant" style={{ fontStyle: "italic", opacity: 0.8 }}>
                AI is analyzing your symptoms…
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 1 && (
            <div className="df-chat-suggestions">
              {SUGGESTED.map((q) => (
                <button key={q} onClick={() => sendMessage(q)}>
                  {q}
                </button>
              ))}
            </div>
          )}

          <div className="df-chat-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
              placeholder="Ask a dental question or describe symptoms..."
              disabled={typing}
            />
            <button
              onClick={() => sendMessage(input)}
              aria-label="Send"
              disabled={typing || !input.trim()}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
