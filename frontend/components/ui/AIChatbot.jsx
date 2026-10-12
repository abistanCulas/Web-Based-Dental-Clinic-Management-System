import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  FileText,
  HeartPulse,
  Minus,
  Paperclip,
  Send,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  X,
} from "lucide-react";

import apiClient from "../../api/client";
import aiChatbotIcon from "../../assets/ai-chatbot-icon.png";

import "./AIChatbot.css";

const SUGGESTED = [
  {
    text: "How can I book an appointment?",
    icon: CalendarDays,
  },
  {
    text: "What dental services do you offer?",
    icon: HeartPulse,
  },
  {
    text: "How should I prepare for my appointment?",
    icon: FileText,
  },
  {
    text: "Where can I view my prescription?",
    icon: FileText,
  },
  {
    text: "I have severe tooth pain",
    icon: Stethoscope,
  },
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
      text:
          "Hello! I'm your DentaFlow AI dental assistant. How can I help you today?",
    },
  ]);

  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  // Quick Questions can be minimized/maximized
  const [quickQuestionsOpen, setQuickQuestionsOpen] = useState(true);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [messages, typing, open]);

  const sendMessage = async (text) => {
    if (!text || !text.trim() || typing) return;

    const cleanText = text.trim();

    const userMsg = {
      role: "user",
      text: cleanText,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    let replyText = "";
    let recommendation = null;
    let appointmentRecommended = false;

    try {
      const res = await apiClient.post("/ai/chatbot", {
        message: cleanText,
      });

      if (res.data && res.data.message) {
        replyText = res.data.message;

        recommendation =
            res.data.recommendedService || null;

        appointmentRecommended =
            Boolean(res.data.appointmentRecommended);
      }
    } catch {
      const key = cleanText.toLowerCase();

      const matchedKey = Object.keys(RESPONSES).find(
          (k) =>
              key.includes(k) ||
              k.includes(key)
      );

      replyText =
          (matchedKey && RESPONSES[matchedKey]) ||
          "Thank you for your question! For personalized clinical advice, please consult with one of our experienced dentists. You can book an appointment online or contact our clinic directly.";

      if (
          key.includes("tooth") ||
          key.includes("pain") ||
          key.includes("ache") ||
          key.includes("bleed") ||
          key.includes("swelling")
      ) {
        recommendation =
            "GENERAL DENTAL CONSULTATION";

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

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!input.trim()) return;

    sendMessage(input);
  };

  const handleSuggestion = (question) => {
    // Collapse the quick questions after selecting one
    setQuickQuestionsOpen(false);

    sendMessage(question);
  };

  const toggleQuickQuestions = () => {
    setQuickQuestionsOpen((prev) => !prev);
  };

  return (
      <>
        {/* =====================================================
          FLOATING AI BUTTON
      ====================================================== */}

        {!open && (
            <button
                type="button"
                className="df-chat-fab"
                onClick={() => setOpen(true)}
                aria-label="Open DentaFlow AI Assistant"
            >
              <div className="df-fab-glow" />

              <div className="df-fab-icon-wrapper">
                <img
                    src={aiChatbotIcon}
                    alt=""
                    className="df-fab-chat-icon"
                    aria-hidden="true"
                />
              </div>

              <span className="df-fab-online-dot" />

              <span className="df-fab-sparkle sparkle-one">
            ✦
          </span>

              <span className="df-fab-sparkle sparkle-two">
            ✦
          </span>
            </button>
        )}

        {/* =====================================================
          CHAT WINDOW
      ====================================================== */}

        {open && (
            <section
                className="df-chat-window"
                aria-label="DentaFlow AI Assistant"
            >
              {/* HEADER */}
              <header className="df-chat-header">
                <div className="df-chat-header-main">
                  <div className="df-chat-avatar">
                    <img
                        src={aiChatbotIcon}
                        alt=""
                        className="df-chat-header-icon"
                        aria-hidden="true"
                    />

                    <span className="df-chat-avatar-status" />
                  </div>

                  <div className="df-chat-title">
                    <strong>DentaFlow AI</strong>

                    <span>
                  Your Dental Assistant
                </span>

                    <small>
                      <i />
                      Online
                    </small>
                  </div>
                </div>

                <div className="df-chat-header-actions">
                  <button
                      type="button"
                      onClick={() => setOpen(false)}
                      aria-label="Minimize chatbot"
                      title="Minimize"
                  >
                    <Minus size={19} />
                  </button>

                  <button
                      type="button"
                      onClick={() => setOpen(false)}
                      aria-label="Close chatbot"
                      title="Close"
                  >
                    <X size={19} />
                  </button>
                </div>
              </header>

              {/* CHAT BODY */}
              <div className="df-chat-body">
                {/* MESSAGES */}
                <div className="df-chat-messages">
                  {messages.map((message, index) => (
                      <div
                          key={index}
                          className={`df-chat-message-row ${message.role}`}
                      >
                        {message.role === "assistant" && (
                            <div className="df-message-avatar">
                              <img
                                  src={aiChatbotIcon}
                                  alt=""
                                  aria-hidden="true"
                              />
                            </div>
                        )}

                        <div
                            className={`df-chat-msg ${message.role}`}
                        >
                          <div className="df-chat-msg-text">
                            {message.text}
                          </div>

                          {message.appointmentRecommended &&
                              message.recommendation && (
                                  <div className="df-chat-recommendation">
                                    <div className="df-recommendation-title">
                                      <Stethoscope size={14} />

                                      <span>
                              Recommended Care
                            </span>
                                    </div>

                                    <strong>
                                      {message.recommendation}
                                    </strong>

                                    <Link
                                        to="/book-appointment"
                                        onClick={() =>
                                            setOpen(false)
                                        }
                                        className="df-chat-book-btn"
                                    >
                                      Book Consultation
                                      <ArrowRight size={14} />
                                    </Link>
                                  </div>
                              )}
                        </div>
                      </div>
                  ))}

                  {/* TYPING */}
                  {typing && (
                      <div className="df-chat-message-row assistant">
                        <div className="df-message-avatar">
                          <img
                              src={aiChatbotIcon}
                              alt=""
                              aria-hidden="true"
                          />
                        </div>

                        <div className="df-chat-msg assistant df-typing-message">
                          <span />
                          <span />
                          <span />

                          <small>
                            AI is thinking...
                          </small>
                        </div>
                      </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* =================================================
                COLLAPSIBLE QUICK QUESTIONS
            ================================================== */}

                <div
                    className={`df-chat-suggestions ${
                        quickQuestionsOpen
                            ? "is-open"
                            : "is-collapsed"
                    }`}
                >
                  {/* TOGGLE */}
                  <button
                      type="button"
                      className="df-chat-suggestions-toggle"
                      onClick={toggleQuickQuestions}
                      aria-expanded={quickQuestionsOpen}
                      aria-controls="df-quick-question-list"
                  >
                    <div className="df-chat-suggestions-heading">
                      <div>
                        <Sparkles size={16} />

                        <strong>
                          Quick Questions
                        </strong>
                      </div>

                      <span>
                    {quickQuestionsOpen
                        ? "Hide questions"
                        : "Show questions"}
                  </span>
                    </div>

                    <span className="df-chat-toggle-icon">
                  {quickQuestionsOpen
                      ? "⌃"
                      : "⌄"}
                </span>
                  </button>

                  {/* QUESTION OPTIONS */}
                  {quickQuestionsOpen && (
                      <div
                          id="df-quick-question-list"
                          className="df-chat-suggestion-list"
                      >
                        {SUGGESTED.map(
                            ({
                               text,
                               icon: Icon,
                             }) => (
                                <button
                                    type="button"
                                    key={text}
                                    onClick={() =>
                                        handleSuggestion(text)
                                    }
                                    disabled={typing}
                                >
                        <span className="df-suggestion-icon">
                          <Icon size={17} />
                        </span>

                                  <span>
                          {text}
                        </span>

                                  <ArrowRight
                                      size={16}
                                      className="df-suggestion-arrow"
                                  />
                                </button>
                            )
                        )}
                      </div>
                  )}
                </div>
              </div>

              {/* INPUT */}
              <form
                  className="df-chat-input-area"
                  onSubmit={handleSubmit}
              >
                <div className="df-chat-input-box">
                  <Paperclip
                      size={18}
                      className="df-chat-attach-icon"
                  />

                  <input
                      value={input}
                      onChange={(event) =>
                          setInput(event.target.value)
                      }
                      placeholder="Ask a dental question or describe symptoms..."
                      disabled={typing}
                      aria-label="Ask DentaFlow AI"
                  />
                </div>

                <button
                    type="submit"
                    className="df-chat-send"
                    aria-label="Send message"
                    disabled={
                        typing ||
                        !input.trim()
                    }
                >
                  <Send
                      size={19}
                      strokeWidth={2}
                  />
                </button>
              </form>

              {/* SECURITY */}
              <div className="df-chat-security">
                <ShieldCheck size={14} />

                <span>
              Your health information is kept
              private and secure.
            </span>
              </div>
            </section>
        )}
      </>
  );
}