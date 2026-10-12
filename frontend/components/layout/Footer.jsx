import { Link } from "react-router-dom";
import {
  Phone,
  Mail,
  MapPin,
  Lock,
  Heart,
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
  Twitter,
} from "lucide-react";
import Logo from "../icons/Logo";
import "./Footer.css";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="df-footer-section">
      <div className="df-footer-outer-container">
        {/* Main 5-Column Liquid-Glass Card */}
        <div className="df-footer-glass-card">
          <div className="df-footer-grid">
            {/* COLUMN 1: Brand & Contact */}
            <div className="df-footer-col df-footer-col-brand">
              <div className="df-footer-brand-header">
                <Logo size={34} variant="default" />
              </div>
              <p className="df-footer-about">
                Leading digital dental care platform combining clinical excellence,
                cutting-edge technology, and patient-first compassionate care.
              </p>
              <div className="df-footer-contact-list">
                <a href="tel:+94112345678" className="df-footer-contact-item">
                  <Phone size={14} className="df-footer-contact-icon" />
                  <span>+94 11 234 5678</span>
                </a>
                <a href="mailto:hello@dentaflow.com" className="df-footer-contact-item">
                  <Mail size={14} className="df-footer-contact-icon" />
                  <span>hello@dentaflow.com</span>
                </a>
                <div className="df-footer-contact-item">
                  <MapPin size={14} className="df-footer-contact-icon" />
                  <span>123 Dental Avenue, Colombo, Sri Lanka</span>
                </div>
              </div>
              <div className="df-footer-social-row">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="df-footer-social-circle"
                  aria-label="Facebook"
                >
                  <Facebook size={14} />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="df-footer-social-circle"
                  aria-label="Instagram"
                >
                  <Instagram size={14} />
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="df-footer-social-circle"
                  aria-label="YouTube"
                >
                  <Youtube size={14} />
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="df-footer-social-circle"
                  aria-label="LinkedIn"
                >
                  <Linkedin size={14} />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="df-footer-social-circle"
                  aria-label="Twitter"
                >
                  <Twitter size={14} />
                </a>
              </div>
            </div>

            {/* COLUMN 2: Quick Links */}
            <div className="df-footer-col">
              <h4 className="df-footer-col-title">Quick Links</h4>
              <ul className="df-footer-links">
                <li><Link to="/">Home</Link></li>
                <li><Link to="/services">Services</Link></li>
                <li><Link to="/doctors">Our Doctors</Link></li>
                <li><Link to="/book-appointment">Book Appointment</Link></li>
                <li><Link to="/about">About Us</Link></li>
                <li><Link to="/contact">Contact Us</Link></li>
              </ul>
            </div>

            {/* COLUMN 3: Our Services */}
            <div className="df-footer-col">
              <h4 className="df-footer-col-title">Our Services</h4>
              <ul className="df-footer-links">
                <li><Link to="/services">General Dentistry</Link></li>
                <li><Link to="/services">Teeth Cleaning & Scaling</Link></li>
                <li><Link to="/services">Cosmetic Dentistry</Link></li>
                <li><Link to="/services">Orthodontics & Braces</Link></li>
                <li><Link to="/services">Dental Implants</Link></li>
                <li><Link to="/services">Emergency Dental Care</Link></li>
              </ul>
            </div>

            {/* COLUMN 4: Clinic Hours */}
            <div className="df-footer-col">
              <h4 className="df-footer-col-title">Clinic Hours</h4>
              <div className="df-footer-hours-table">
                <div className="df-footer-hour-row">
                  <span className="df-hour-day">Mon - Fri:</span>
                  <span className="df-hour-time">8:00 AM - 8:00 PM</span>
                </div>
                <div className="df-footer-hour-row">
                  <span className="df-hour-day">Saturday:</span>
                  <span className="df-hour-time">9:00 AM - 6:00 PM</span>
                </div>
                <div className="df-footer-hour-row">
                  <span className="df-hour-day">Sunday:</span>
                  <span className="df-hour-time df-hour-highlight">Emergency On-Call</span>
                </div>
              </div>
              <a href="tel:+94112345678" className="df-footer-helpline-btn">
                <Phone size={15} />
                <span>24/7 Dental Helpline</span>
              </a>
            </div>

            {/* COLUMN 5: Patient Portal */}
            <div className="df-footer-col">
              <h4 className="df-footer-col-title">Patient Portal</h4>
              <ul className="df-footer-links">
                <li><Link to="/login">Patient Sign In</Link></li>
                <li><Link to="/register">Create Patient Account</Link></li>
                <li><Link to="/forgot-password">Reset Password</Link></li>
                <li><Link to="/book-appointment">Online Check-in</Link></li>
              </ul>
              <div className="df-footer-hipaa-badge">
                <Lock size={13} className="df-hipaa-icon" />
                <span>HIPAA Compliant & Secure</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright, Legal, Motto */}
        <div className="df-footer-bottom-bar">
          <div className="df-footer-copy">
            © {currentYear} DentaFlow. All rights reserved.
          </div>
          <div className="df-footer-legal">
            <Link to="/privacy">Privacy Policy</Link>
            <span className="df-footer-sep">|</span>
            <Link to="/terms">Terms of Service</Link>
            <span className="df-footer-sep">|</span>
            <Link to="/cookies">Cookie Policy</Link>
          </div>
          <div className="df-footer-motto">
            <span>Smiles for a Brighter Tomorrow</span>
            <Heart size={14} className="df-footer-heart" />
          </div>
        </div>
      </div>
    </footer>
  );
}
