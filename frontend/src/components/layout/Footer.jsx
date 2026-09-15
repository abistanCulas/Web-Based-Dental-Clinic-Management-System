import { Link } from "react-router-dom";
import Logo from "../icons/Logo";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="df-footer">
      <div className="df-footer-inner">
        <div className="df-footer-grid">
          <div className="df-footer-brand">
            <Logo size={36} />
            <p>Providing modern, reliable, and compassionate dental care for you and your family.</p>
            <div className="df-social-links">
              {["Facebook", "Instagram", "Twitter", "LinkedIn"].map((s) => (
                <a key={s} href="#" aria-label={s} className="df-social-link">{s[0]}</a>
              ))}
            </div>
          </div>

          <div className="df-footer-col">
            <h4>Quick Links</h4>
            <Link to="/">Home</Link>
            <Link to="/services">Services</Link>
            <Link to="/doctors">Doctors</Link>
            <Link to="/about">About Us</Link>
            <Link to="/contact">Contact Us</Link>
            <Link to="/book-appointment">Book Appointment</Link>
          </div>

          <div className="df-footer-col">
            <h4>Services</h4>
            <Link to="/services">General Checkup</Link>
            <Link to="/services">Teeth Cleaning</Link>
            <Link to="/services">Cosmetic Dentistry</Link>
            <Link to="/services">Orthodontics</Link>
            <Link to="/services">Dental Implants</Link>
            <Link to="/services">Root Canal</Link>
          </div>

          <div className="df-footer-col">
            <h4>Contact Us</h4>
            <p>+94 11 234 5678</p>
            <p>hello@dentaflow.com</p>
            <p>123 Dental Avenue, Colombo, Sri Lanka</p>
          </div>
        </div>

        <div className="df-footer-bottom">
          <p>© 2026 DentaFlow. All rights reserved.</p>
          <div className="df-footer-legal">
            <a href="#">Privacy Policy</a>
            <span>·</span>
            <a href="#">Terms & Conditions</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
