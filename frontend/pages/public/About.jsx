import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle,
  Heart,
  Shield,
  Star,
  Users,
} from "lucide-react";

import { STATS, WHY_CHOOSE } from "../../data/mockData";
import aboutHero from "../../assets/about_hero.png";

import styles from "./About.module.css";

export default function About() {
  return (
      <main className={styles.page}>
        {/* =========================
          HERO
      ========================= */}

        <section className={styles.hero}>
          <img
              src={aboutHero}
              alt="DentaFlow dental clinic"
              className={styles.heroImage}
          />

          <div className={styles.heroOverlay} />

          <div className={styles.heroContent}>
            <div className={styles.heroText}>
              <div className={styles.eyebrow}>
                <Heart size={15} />
                <span>ABOUT US</span>
              </div>

              <h1>
                Caring for Healthier
                <span>Brighter Smiles</span>
              </h1>

              <p>
                At DentaFlow, we combine modern technology,
                professional dental care and a patient-first
                approach to create healthier, happier smiles.
              </p>

              <div className={styles.heroHighlights}>
                <div className={styles.highlight}>
                  <div className={styles.highlightIcon}>
                    <Users size={20} />
                  </div>

                  <div>
                    <strong>Patient Focused</strong>
                    <span>Care That Matters</span>
                  </div>
                </div>

                <div className={styles.highlight}>
                  <div className={styles.highlightIcon}>
                    <Shield size={20} />
                  </div>

                  <div>
                    <strong>Trusted Care</strong>
                    <span>Safe & Professional</span>
                  </div>
                </div>

                <div className={styles.highlight}>
                  <div className={styles.highlightIcon}>
                    <Star size={20} />
                  </div>

                  <div>
                    <strong>Modern Dentistry</strong>
                    <span>Technology Driven</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================
          OUR STORY
      ========================= */}

        <section className={styles.storySection}>
          <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>
            OUR STORY
          </span>

            <h2>
              Technology Meets
              <span> Compassionate Care</span>
            </h2>

            <p>
              Learn more about the values and approach
              behind DentaFlow.
            </p>
          </div>

          <div className={styles.storyGrid}>
            <div className={styles.storyContent}>
              <p>
                DentaFlow brings dental care and modern
                digital technology together to create a
                simpler and more comfortable healthcare
                experience for patients.
              </p>

              <p>
                Our platform is designed to connect patients,
                dentists and clinic staff through a unified
                digital environment while keeping patient
                care at the center of every interaction.
              </p>

              <div className={styles.storyPoints}>
                <div>
                  <CheckCircle size={18} />
                  <span>Patient-centered dental care</span>
                </div>

                <div>
                  <CheckCircle size={18} />
                  <span>Modern digital healthcare experience</span>
                </div>

                <div>
                  <CheckCircle size={18} />
                  <span>Professional and organized clinic management</span>
                </div>
              </div>
            </div>

            <div className={styles.missionMiniGrid}>
              <article className={styles.miniCard}>
                <div className={styles.miniIcon}>
                  <Shield size={21} />
                </div>

                <h3>Our Mission</h3>

                <p>
                  To deliver exceptional dental care through
                  innovation, expertise and patient-centered
                  service.
                </p>
              </article>

              <article className={styles.miniCard}>
                <div className={styles.miniIcon}>
                  <Star size={21} />
                </div>

                <h3>Our Vision</h3>

                <p>
                  To build a modern digital dental care
                  experience focused on quality, accessibility
                  and patient well-being.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* =========================
          STATS
      ========================= */}

        <section className={styles.statsSection}>
          <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>
            OUR IMPACT
          </span>

            <h2>
              Built Around
              <span> Patient Care</span>
            </h2>

            <p>
              Numbers that reflect the DentaFlow experience.
            </p>
          </div>

          <div className={styles.statsGrid}>
            {STATS.map((stat) => (
                <article
                    key={stat.label}
                    className={styles.statCard}
                >
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </article>
            ))}
          </div>
        </section>

        {/* =========================
          MISSION & VISION
      ========================= */}

        <section className={styles.missionSection}>
          <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>
            OUR VALUES
          </span>

            <h2>
              Mission &
              <span> Vision</span>
            </h2>

            <p>
              The principles that guide everything we do
              at DentaFlow.
            </p>
          </div>

          <div className={styles.missionGrid}>
            <article className={styles.valueCard}>
              <div className={styles.valueIcon}>
                <Heart size={25} />
              </div>

              <div>
                <h3>Our Mission</h3>

                <p>
                  To deliver exceptional dental care through
                  innovation, expertise and patient-centered
                  service. We aim to make every patient feel
                  valued, comfortable and confident.
                </p>
              </div>
            </article>

            <article className={styles.valueCard}>
              <div className={styles.valueIcon}>
                <Star size={25} />
              </div>

              <div>
                <h3>Our Vision</h3>

                <p>
                  To create a modern digital dental care
                  experience that combines technology,
                  continuous improvement and dedication to
                  patient well-being.
                </p>
              </div>
            </article>
          </div>
        </section>

        {/* =========================
          WHY CHOOSE US
      ========================= */}

        <section className={styles.whySection}>
          <div className={styles.sectionHeader}>
          <span className={styles.sectionEyebrow}>
            WHY DENTAFLOW
          </span>

            <h2>
              Why Choose
              <span> DentaFlow?</span>
            </h2>

            <p>
              Designed to make dental care simpler,
              clearer and more comfortable.
            </p>
          </div>

          <div className={styles.whyGrid}>
            {WHY_CHOOSE.map((item) => (
                <article
                    key={item.title}
                    className={styles.whyCard}
                >
                  <div className={styles.whyIcon}>
                    <CheckCircle size={21} />
                  </div>

                  <div>
                    <h3>{item.title}</h3>

                    <p>{item.desc}</p>
                  </div>
                </article>
            ))}
          </div>
        </section>

        {/* =========================
          CTA
      ========================= */}

        <section className={styles.ctaSection}>
          <div className={styles.ctaCard}>
            <div>
            <span className={styles.ctaEyebrow}>
              START YOUR JOURNEY
            </span>

              <h2>
                Ready for a
                <span> Healthier Smile?</span>
              </h2>

              <p>
                Book your dental appointment and
                experience a more connected way of
                managing your dental care.
              </p>
            </div>

            <Link
                to="/book-appointment"
                className={styles.ctaButton}
            >
              Book Your Appointment
              <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </main>
  );
}