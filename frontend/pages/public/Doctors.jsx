import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Clock3,
  Heart,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Users,
} from "lucide-react";

import clinicReception from "../../assets/clinic_reception_desk.png";
import { dentistApi } from "../../api/dentists";

import styles from "./Doctors.module.css";

export default function Doctors() {
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("All");
  const [availability, setAvailability] = useState("All");
  const [sortBy, setSortBy] = useState("default");
  const [dentists, setDentists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadDentists = async () => {
      try {
        const list = await dentistApi.getAllDentists();

        if (!active) return;

        setDentists(Array.isArray(list) ? list : []);
      } catch {
        if (active) {
          setDentists([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadDentists();

    return () => {
      active = false;
    };
  }, []);

  const normalizedDentists = useMemo(() => {
    return dentists
      .filter((doctor) => doctor && (doctor.status === "active" || doctor.rawStatus === "ACTIVE"))
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
            clinicReception;

      const doctorSpecialty =
          doctor.specialization ||
          doctor.specialty ||
          "General Dentistry";

      const qualification =
          doctor.qualification ||
          doctor.qualifications ||
          "Dental Professional";

      const availabilityText =
          doctor.availability ||
          doctor.availableTime ||
          doctor.workingHours ||
          doctor.schedule ||
          "";

      const isAvailable =
          doctor.availableToday === true ||
          doctor.isAvailable === true ||
          Boolean(availabilityText);

      return {
        ...doctor,
        id: doctor.id,
        name: doctor.name || "Dentist",
        specialty: doctorSpecialty,
        qualification,
        experienceYears:
            typeof experienceYears === "number"
                ? experienceYears
                : Number(experienceYears) || null,
        image,
        availabilityText,
        isAvailable,
        rating:
            typeof doctor.rating === "number" ? doctor.rating : null,
        reviewCount:
            typeof doctor.reviewCount === "number"
                ? doctor.reviewCount
                : typeof doctor.reviewsCount === "number"
                    ? doctor.reviewsCount
                    : null,
        bio:
            doctor.bio ||
            doctor.description ||
            "",
      };
    });
  }, [dentists]);

  const specialties = useMemo(() => {
    const values = normalizedDentists
        .map((doctor) => doctor.specialty)
        .filter(Boolean);

    return ["All", ...Array.from(new Set(values))];
  }, [normalizedDentists]);

  const filteredDoctors = useMemo(() => {
    const query = search.trim().toLowerCase();

    let result = normalizedDentists.filter((doctor) => {
      const searchableText = [
        doctor.name,
        doctor.specialty,
        doctor.qualification,
        doctor.bio,
      ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

      const matchesSearch =
          !query || searchableText.includes(query);

      const matchesSpecialty =
          specialty === "All" ||
          doctor.specialty === specialty;

      const matchesAvailability =
          availability === "All" ||
          (availability === "Available" && doctor.isAvailable) ||
          (availability === "Not Available" && !doctor.isAvailable);

      return (
          matchesSearch &&
          matchesSpecialty &&
          matchesAvailability
      );
    });

    if (sortBy === "name") {
      result = [...result].sort((a, b) =>
          a.name.localeCompare(b.name)
      );
    }

    if (sortBy === "experience") {
      result = [...result].sort(
          (a, b) =>
              (b.experienceYears || 0) -
              (a.experienceYears || 0)
      );
    }

    if (sortBy === "rating") {
      result = [...result].sort(
          (a, b) =>
              (b.rating || 0) -
              (a.rating || 0)
      );
    }

    return result;
  }, [
    normalizedDentists,
    search,
    specialty,
    availability,
    sortBy,
  ]);

  const clearFilters = () => {
    setSearch("");
    setSpecialty("All");
    setAvailability("All");
    setSortBy("default");
  };

  return (
      <main className={styles.page}>
        {/* Hero */}
        <section className={styles.hero}>
          <div className={styles.heroOverlay} />

          <div className={styles.heroContent}>
            <div className={styles.heroText}>
              <div className={styles.eyebrow}>
                <Users size={15} />
                <span>OUR DOCTORS</span>
              </div>

              <h1>
                Expert Care for
                <span>Your Healthier Smile</span>
              </h1>

              <p>
                Meet our experienced and dedicated dental
                professionals who are committed to providing
                compassionate, modern dental care for you.
              </p>

              <div className={styles.heroHighlights}>
                <div className={styles.highlight}>
                  <div className={styles.highlightIcon}>
                    <ShieldCheck size={20} />
                  </div>

                  <div>
                    <strong>Certified</strong>
                    <span>Professionals</span>
                  </div>
                </div>

                <div className={styles.highlight}>
                  <div className={styles.highlightIcon}>
                    <Users size={20} />
                  </div>

                  <div>
                    <strong>Experienced</strong>
                    <span>& Friendly</span>
                  </div>
                </div>

                <div className={styles.highlight}>
                  <div className={styles.highlightIcon}>
                    <Heart size={20} />
                  </div>

                  <div>
                    <strong>Patient-Focused</strong>
                    <span>Care</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.heroVisual}>
              <img
                  src={clinicReception}
                  alt="DentaFlow dental clinic"
              />

              <div className={styles.heroGlow} />

              <div className={styles.heroMessage}>
                <span>Healthy Smiles</span>
                <strong>Happier Lives</strong>
                <i>♡</i>
              </div>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className={styles.filterSection}>
          <div className={styles.searchBox}>
            <Search size={19} />

            <input
                type="text"
                placeholder="Search doctors by name, specialty, or keyword..."
                value={search}
                onChange={(event) =>
                    setSearch(event.target.value)
                }
            />
          </div>

          <div className={styles.selectWrapper}>
            <select
                value={specialty}
                onChange={(event) =>
                    setSpecialty(event.target.value)
                }
            >
              {specialties.map((item) => (
                  <option key={item} value={item}>
                    {item === "All"
                        ? "All Specialties"
                        : item}
                  </option>
              ))}
            </select>

            <ChevronDown size={17} />
          </div>

          <div className={styles.selectWrapper}>
            <select
                value={availability}
                onChange={(event) =>
                    setAvailability(event.target.value)
                }
            >
              <option value="All">All Availability</option>
              <option value="Available">Available</option>
              <option value="Not Available">
                Not Available
              </option>
            </select>

            <ChevronDown size={17} />
          </div>

          <div className={styles.selectWrapper}>
            <select
                value={sortBy}
                onChange={(event) =>
                    setSortBy(event.target.value)
                }
            >
              <option value="default">Sort by</option>
              <option value="name">Name</option>
              <option value="experience">
                Experience
              </option>
              <option value="rating">Rating</option>
            </select>

            <ChevronDown size={17} />
          </div>

          <button
              type="button"
              className={styles.clearButton}
              onClick={clearFilters}
          >
            <RotateCcw size={16} />
            Clear Filters
          </button>
        </section>

        {/* Doctor Results */}
        <section className={styles.doctorsSection}>
          <div className={styles.sectionHeader}>
            <div>
            <span className={styles.sectionEyebrow}>
              OUR DENTAL TEAM
            </span>

              <h2>
                Meet Our
                <span> Expert Dentists</span>
              </h2>

              <p>
                Find the right dental professional for your
                care and book an appointment with ease.
              </p>
            </div>

            <div className={styles.resultCount}>
              <strong>{filteredDoctors.length}</strong>
              <span>
              {filteredDoctors.length === 1
                  ? "Dentist"
                  : "Dentists"}
            </span>
            </div>
          </div>

          {loading ? (
              <div className={styles.stateCard}>
                <div className={styles.spinner} />
                <h3>Loading our dentists...</h3>
                <p>
                  Please wait while we load the latest
                  dentist information.
                </p>
              </div>
          ) : filteredDoctors.length === 0 ? (
              <div className={styles.stateCard}>
                <div className={styles.emptyIcon}>
                  <SlidersHorizontal size={26} />
                </div>

                <h3>No dentists found</h3>

                <p>
                  No dentist matches the selected search or
                  filters.
                </p>

                <button
                    type="button"
                    onClick={clearFilters}
                    className={styles.emptyButton}
                >
                  Clear Filters
                </button>
              </div>
          ) : (
              <div className={styles.doctorGrid}>
                {filteredDoctors.map((doctor) => (
                    <article
                        key={doctor.id}
                        className={styles.doctorCard}
                    >
                      <div className={styles.doctorCardTop}>
                        {doctor.isAvailable && (
                            <div className={styles.availableBadge}>
                              <span />
                              Available
                            </div>
                        )}

                        <img
                            src={doctor.image}
                            alt={doctor.name}
                            className={styles.doctorImage}
                        />
                      </div>

                      <div className={styles.doctorBody}>
                        <div className={styles.doctorHeading}>
                          <div>
                            <h3>{doctor.name}</h3>
                            <p>{doctor.specialty}</p>
                          </div>
                        </div>

                        <div className={styles.doctorInfo}>
                          <div className={styles.infoRow}>
                            <ShieldCheck size={16} />
                            <span>
                        {doctor.qualification}
                      </span>
                          </div>

                          {doctor.rating !== null && (
                              <div className={styles.infoRow}>
                                <Star
                                    size={16}
                                    className={styles.star}
                                    fill="currentColor"
                                />

                                <span>
                          {doctor.rating.toFixed(1)}

                                  {doctor.reviewCount !== null &&
                                      ` (${doctor.reviewCount} reviews)`}
                        </span>
                              </div>
                          )}

                          {doctor.experienceYears !== null && (
                              <div className={styles.infoRow}>
                                <CalendarDays size={16} />
                                <span>
                          {doctor.experienceYears}+
                                  {" "}
                                  Years Experience
                        </span>
                              </div>
                          )}

                          {doctor.availabilityText && (
                              <div className={styles.infoRow}>
                                <Clock3 size={16} />
                                <span>
                          {doctor.availabilityText}
                        </span>
                              </div>
                          )}
                        </div>

                        {doctor.bio && (
                            <p className={styles.doctorBio}>
                              {doctor.bio}
                            </p>
                        )}

                        <div className={styles.cardActions}>
                          <Link
                              to={`/doctors/${doctor.id}`}
                              className={styles.profileButton}
                          >
                            View Profile
                            <ArrowRight size={16} />
                          </Link>

                          <Link
                              to="/book-appointment"
                              state={{
                                doctorId: doctor.id,
                              }}
                              className={styles.calendarButton}
                              aria-label={`Book appointment with ${doctor.name}`}
                          >
                            <CalendarDays size={18} />
                          </Link>
                        </div>
                      </div>
                    </article>
                ))}
              </div>
          )}
        </section>
      </main>
  );
}