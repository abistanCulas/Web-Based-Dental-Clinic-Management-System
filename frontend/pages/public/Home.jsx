import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Cpu,
  Heart,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";

import servicesApi from "../../api/services";
import reviewsApi from "../../api/reviews";
import { dentistApi } from "../../api/dentists";

import homeHero from "../../assets/home_hero.png";
import homeCta from "../../assets/home_cta.png";

import serviceTools from "../../assets/reference/service_tools.png";
import serviceSmile from "../../assets/reference/service_smile.png";
import serviceAligner from "../../assets/reference/service_aligner.png";
import serviceCrown from "../../assets/reference/service_crown.png";

import "./Home.css";

const serviceFallbackImages = [
  serviceTools,
  serviceSmile,
  serviceAligner,
  serviceCrown,
];

export default function Home() {
  const [services, setServices] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [reviews, setReviews] = useState([]);

  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);

  /* =====================================================
     LOAD SERVICES
  ===================================================== */

  useEffect(() => {
    let active = true;

    const loadServices = async () => {
      try {
        const data = await servicesApi.getServices();

        if (active) {
          setServices(Array.isArray(data) ? data : []);
        }
      } catch {
        if (active) {
          setServices([]);
        }
      } finally {
        if (active) {
          setLoadingServices(false);
        }
      }
    };

    loadServices();

    return () => {
      active = false;
    };
  }, []);

  /* =====================================================
     LOAD DOCTORS
  ===================================================== */

  useEffect(() => {
    let active = true;

    const loadDoctors = async () => {
      try {
        const data = await dentistApi.getAllDentists();

        if (active) {
          setDoctors(Array.isArray(data) ? data : []);
        }
      } catch {
        if (active) {
          setDoctors([]);
        }
      } finally {
        if (active) {
          setLoadingDoctors(false);
        }
      }
    };

    loadDoctors();

    return () => {
      active = false;
    };
  }, []);

  /* =====================================================
     LOAD REVIEWS
  ===================================================== */

  useEffect(() => {
    let active = true;

    const loadReviews = async () => {
      try {
        const data = await reviewsApi.getPublicReviews();

        if (active) {
          setReviews(Array.isArray(data) ? data : []);
        }
      } catch {
        if (active) {
          setReviews([]);
        }
      } finally {
        if (active) {
          setLoadingReviews(false);
        }
      }
    };

    loadReviews();

    return () => {
      active = false;
    };
  }, []);

  /* =====================================================
     HOME SERVICES
  ===================================================== */

  const homeServices = useMemo(() => {
    return services.slice(0, 4).map((service, index) => ({
      ...service,

      name:
          service.name ||
          service.serviceName ||
          service.title ||
          "Dental Service",

      description:
          service.desc ||
          service.description ||
          "",

      image:
          service.imageUrl ||
          service.image ||
          service.photoUrl ||
          service.imagePath ||
          serviceFallbackImages[
          index % serviceFallbackImages.length
              ],
    }));
  }, [services]);

  /* =====================================================
     HOME DOCTORS
  ===================================================== */

  const homeDoctors = useMemo(() => {
    return doctors
      .filter((doctor) => doctor && (doctor.status === "active" || doctor.rawStatus === "ACTIVE"))
      .slice(0, 4)
      .map((doctor) => {
      const experienceYears =
          doctor.experienceYears ??
          doctor.yearsOfExperience ??
          doctor.experience ??
          null;

      const image =
          doctor.imageUrl ||
          doctor.profileImage ||
          doctor.profileImageUrl ||
          doctor.image ||
          doctor.photoUrl ||
          null;

      return {
        ...doctor,

        id: doctor.id,

        name: doctor.name || "Dentist",

        specialty:
            doctor.specialization ||
            doctor.specialty ||
            "General Dentistry",

        qualification:
            doctor.qualification ||
            doctor.qualifications ||
            "Dental Professional",

        experienceYears:
            typeof experienceYears === "number"
                ? experienceYears
                : Number(experienceYears) || null,

        image,

        rating:
            typeof doctor.rating === "number"
                ? doctor.rating
                : null,

        reviewCount:
            typeof doctor.reviewCount === "number"
                ? doctor.reviewCount
                : typeof doctor.reviewsCount === "number"
                    ? doctor.reviewsCount
                    : null,
      };
    });
  }, [doctors]);

  /* =====================================================
     HOME REVIEWS
  ===================================================== */

  const homeReviews = useMemo(() => {
    return reviews.slice(0, 3).map((review) => {
      const name =
          review.patientName ||
          review.name ||
          "Patient";

      const rating = Math.max(
          1,
          Math.min(
              5,
              Number(review.rating) || 5
          )
      );

      const comment =
          review.comment ||
          review.text ||
          "";

      const initials =
          name
              .split(" ")
              .filter(Boolean)
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "P";

      return {
        ...review,

        displayName: name,
        displayRating: rating,
        displayComment: comment,
        initials,
      };
    });
  }, [reviews]);

  return (
      <main className="df-home">

        {/* =================================================
          HERO
      ================================================= */}

        <section className="df-home-hero">

          <img
              src={homeHero}
              alt="DentaFlow dental care"
              className="df-home-hero-image"
          />

          <div className="df-home-hero-overlay" />

          <div className="df-home-hero-content">

            <div className="df-home-hero-text">

              <div className="df-home-hero-eyebrow">
                <ShieldCheck size={15} />
                <span>TRUSTED DENTAL CARE</span>
              </div>

              <h1>
                Your Smile
                <span>Our Priority</span>
              </h1>

              <p>
                Experience modern dental care with trusted
                professionals, advanced technology, and a
                compassionate approach for a healthier,
                brighter smile.
              </p>

              <div className="df-home-hero-actions">

                <Link
                    to="/book-appointment"
                    className="df-home-hero-primary-btn"
                >
                  <CalendarDays size={17} />
                  Book Appointment
                  <ArrowRight size={16} />
                </Link>

                <Link
                    to="/services"
                    className="df-home-hero-secondary-btn"
                >
                  Explore Services
                </Link>

              </div>

              <div className="df-home-hero-trust-row">

                <div className="df-home-hero-trust-card">

                  <div className="df-home-hero-trust-icon">
                    <Users size={18} />
                  </div>

                  <div>
                    <strong>Experienced Team</strong>
                    <span>Certified & Qualified</span>
                  </div>

                </div>


                <div className="df-home-hero-trust-card">

                  <div className="df-home-hero-trust-icon">
                    <ShieldCheck size={18} />
                  </div>

                  <div>
                    <strong>Modern Technology</strong>
                    <span>Safe & Advanced</span>
                  </div>

                </div>


                <div className="df-home-hero-trust-card">

                  <div className="df-home-hero-trust-icon">
                    <Heart size={18} />
                  </div>

                  <div>
                    <strong>Patient Focused</strong>
                    <span>Your Comfort Matters</span>
                  </div>

                </div>

              </div>

            </div>

          </div>

        </section>


        {/* =================================================
          SERVICES
      ================================================= */}

        <section className="df-home-section">

          <div className="df-home-glass-panel">

            <div className="df-home-section-header">

              <div>

              <span className="df-home-section-label">
                OUR DENTAL SERVICES
              </span>

                <h2>
                  Complete Care
                  <span> For Every Smile</span>
                </h2>

                <p>
                  Explore the dental services currently
                  available at DentaFlow.
                </p>

              </div>

              <Link
                  to="/services"
                  className="df-home-view-btn"
              >
                View All Services
                <ArrowRight size={15} />
              </Link>

            </div>


            {loadingServices ? (

                <div className="df-home-state">

                  <div className="df-home-spinner" />

                  <p>
                    Loading dental services...
                  </p>

                </div>

            ) : homeServices.length === 0 ? (

                <div className="df-home-empty">

                  <ShieldCheck size={30} />

                  <h3>
                    No Dental Services Available
                  </h3>

                  <p>
                    Services added by the clinic will appear here.
                  </p>

                </div>

            ) : (

                <div className="df-home-services-grid">

                  {homeServices.map((service) => (

                      <article
                          key={service.id}
                          className="df-home-service-card"
                      >

                        <div className="df-home-service-image">

                          <img
                              src={service.image}
                              alt={service.name}
                          />

                          {service.category && (
                              <span>
                        {service.category}
                      </span>
                          )}

                        </div>

                        <div className="df-home-service-body">

                          <h3>
                            {service.name}
                          </h3>

                          {service.duration && (

                              <div className="df-home-service-meta">
                                <Clock3 size={14} />
                                {service.duration}
                              </div>

                          )}

                          {service.description && (
                              <p>
                                {service.description}
                              </p>
                          )}

                          <Link
                              to={`/services/${service.id}`}
                              className="df-home-service-link"
                          >
                            View Details
                            <ArrowRight size={14} />
                          </Link>

                        </div>

                      </article>

                  ))}

                </div>

            )}

          </div>

        </section>


        {/* =================================================
          CLINIC HIGHLIGHTS
      ================================================= */}

        <section className="df-home-section">

          <div className="df-home-highlights">

            <div className="df-home-highlight">

              <div className="df-home-highlight-icon">
                <Users size={21} />
              </div>

              <div>
                <strong>Professional</strong>
                <span>Dental Team</span>
              </div>

            </div>


            <div className="df-home-highlight-divider" />


            <div className="df-home-highlight">

              <div className="df-home-highlight-icon">
                <ShieldCheck size={21} />
              </div>

              <div>
                <strong>Trusted</strong>
                <span>Dental Care</span>
              </div>

            </div>


            <div className="df-home-highlight-divider" />


            <div className="df-home-highlight">

              <div className="df-home-highlight-icon">
                <Cpu size={21} />
              </div>

              <div>
                <strong>Modern</strong>
                <span>Dental Technology</span>
              </div>

            </div>


            <div className="df-home-highlight-divider" />


            <div className="df-home-highlight">

              <div className="df-home-highlight-icon">
                <Heart size={21} />
              </div>

              <div>
                <strong>Patient</strong>
                <span>Focused Care</span>
              </div>

            </div>

          </div>

        </section>


        {/* =================================================
          DOCTORS
      ================================================= */}

        <section className="df-home-section">

          <div className="df-home-doctors-panel">

            <div className="df-home-doctors-heading">

              <div>

              <span className="df-home-section-label">
                <Users size={15} />
                OUR DOCTORS
              </span>

                <h2>
                  Meet Our
                  <span> Expert Dentists</span>
                </h2>

                <p>
                  Get to know our experienced dental
                  professionals committed to your oral health.
                </p>

              </div>

              <Link
                  to="/doctors"
                  className="df-home-view-btn"
              >
                View All Doctors
                <ArrowRight size={15} />
              </Link>

            </div>


            {loadingDoctors ? (

                <div className="df-home-state">

                  <div className="df-home-spinner" />

                  <p>
                    Loading doctors...
                  </p>

                </div>

            ) : homeDoctors.length === 0 ? (

                <div className="df-home-empty">

                  <Users size={30} />

                  <h3>
                    No Doctors Available
                  </h3>

                  <p>
                    Doctors added by the clinic will appear here.
                  </p>

                </div>

            ) : (

                <div className="df-home-doctors-grid">

                  {homeDoctors.map((doctor) => (

                      <article
                          key={doctor.id}
                          className="df-home-doctor-card"
                      >

                        <div className="df-home-doctor-image">

                          {doctor.image ? (

                              <img
                                  src={doctor.image}
                                  alt={doctor.name}
                              />

                          ) : (

                              <div className="df-home-doctor-placeholder">
                                <Users size={34} />
                              </div>

                          )}

                        </div>


                        <div className="df-home-doctor-body">

                          <h3>
                            {doctor.name}
                          </h3>

                          <span className="df-home-doctor-specialty">
                      {doctor.specialty}
                    </span>

                          {doctor.qualification && (
                              <span className="df-home-doctor-qualification">
                        {doctor.qualification}
                      </span>
                          )}

                          {doctor.rating !== null && (

                              <div className="df-home-doctor-rating">

                                <div className="df-home-stars">

                                  {[1, 2, 3, 4, 5].map((star) => (

                                      <Star
                                          key={star}
                                          size={13}
                                          fill={
                                            star <= Math.round(doctor.rating)
                                                ? "#f5b301"
                                                : "none"
                                          }
                                          color={
                                            star <= Math.round(doctor.rating)
                                                ? "#f5b301"
                                                : "#cbd5e1"
                                          }
                                      />

                                  ))}

                                </div>

                                <span>
                          {doctor.rating.toFixed(1)}
                        </span>

                                {doctor.reviewCount !== null && (
                                    <small>
                                      ({doctor.reviewCount})
                                    </small>
                                )}

                              </div>

                          )}

                          {doctor.experienceYears && (

                              <div className="df-home-doctor-meta">

                                <Clock3 size={14} />

                                {doctor.experienceYears}
                                {" "}
                                years experience

                              </div>

                          )}

                          <Link
                              to={`/doctors/${doctor.id}`}
                              className="df-home-doctor-button"
                          >
                            View Profile
                            <ArrowRight size={14} />
                          </Link>

                        </div>

                      </article>

                  ))}

                </div>

            )}

          </div>

        </section>


        {/* =================================================
          PATIENT REVIEWS
      ================================================= */}

        <section className="df-home-section">

          <div className="df-home-glass-panel">

            <div className="df-home-section-header">

              <div>

              <span className="df-home-section-label">
                PATIENT REVIEWS
              </span>

                <h2>
                  What Our
                  <span> Patients Say</span>
                </h2>

                <p>
                  Genuine experiences shared by patients
                  who visited DentaFlow.
                </p>

              </div>

              <Link
                  to="/reviews"
                  className="df-home-view-btn"
              >
                View All Reviews
                <ArrowRight size={15} />
              </Link>

            </div>


            {loadingReviews ? (

                <div className="df-home-state">

                  <div className="df-home-spinner" />

                  <p>
                    Loading patient reviews...
                  </p>

                </div>

            ) : homeReviews.length === 0 ? (

                <div className="df-home-empty">

                  <Star size={30} />

                  <h3>
                    No Patient Reviews Yet
                  </h3>

                  <p>
                    Genuine reviews will appear here once submitted.
                  </p>

                </div>

            ) : (

                <div className="df-home-reviews-grid">

                  {homeReviews.map((review) => (

                      <article
                          key={review.id}
                          className="df-home-review-card"
                      >

                        <div className="df-home-review-top">

                          <div className="df-home-avatar">
                            {review.initials}
                          </div>

                          <div>

                            <strong>
                              {review.displayName}
                            </strong>

                            <div className="df-home-stars">

                              {[1, 2, 3, 4, 5].map((star) => (

                                  <Star
                                      key={star}
                                      size={14}
                                      fill={
                                        star <= review.displayRating
                                            ? "#f5b301"
                                            : "none"
                                      }
                                      color={
                                        star <= review.displayRating
                                            ? "#f5b301"
                                            : "#cbd5e1"
                                      }
                                  />

                              ))}

                            </div>

                          </div>

                        </div>

                        <p>
                          “{review.displayComment}”
                        </p>

                      </article>

                  ))}

                </div>

            )}

          </div>

        </section>


        {/* =================================================
          BOTTOM CTA
      ================================================= */}

        <section className="df-home-section df-home-cta-section">

          <div className="df-home-cta">

            <img
                src={homeCta}
                alt="Book your dental appointment"
                className="df-home-cta-image"
            />

            <div className="df-home-cta-overlay" />

            <Link
                to="/book-appointment"
                className="df-home-cta-button-area"
                aria-label="Book Appointment"
            />

          </div>

        </section>

      </main>
  );
}