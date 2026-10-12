import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  MessageSquare,
  RotateCcw,
  Search,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";

import reviewsApi from "../../api/reviews";
import reviewsHero from "../../assets/reviews_hero.png";

import styles from "./Reviews.module.css";

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [ratingFilter, setRatingFilter] = useState("All");
  const [sortBy, setSortBy] = useState("latest");

  useEffect(() => {
    let active = true;

    reviewsApi
        .getPublicReviews()
        .then((list) => {
          if (active) {
            setReviews(Array.isArray(list) ? list : []);
          }
        })
        .catch(() => {
          if (active) {
            setReviews([]);
          }
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });

    return () => {
      active = false;
    };
  }, []);

  const normalizedReviews = useMemo(() => {
    return reviews.map((review, index) => {
      const displayName =
          review.patientName ||
          review.name ||
          "Patient";

      const displayComment =
          review.comment ||
          review.text ||
          "";

      const displayRating = Math.max(
          1,
          Math.min(5, Number(review.rating) || 5)
      );

      const rawDate =
          review.createdAt ||
          review.date ||
          null;

      const dateValue = rawDate
          ? new Date(rawDate)
          : null;

      const displayDate =
          dateValue && !Number.isNaN(dateValue.getTime())
              ? dateValue.toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })
              : "Recent";

      const displayDoctor = review.dentistName
          ? `Dentist: ${
              review.dentistName.startsWith("Dr.")
                  ? review.dentistName
                  : `Dr. ${review.dentistName}`
          }`
          : review.service || "";

      const initials =
          displayName
              .split(" ")
              .filter(Boolean)
              .map((name) => name[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "P";

      return {
        ...review,
        _index: index,
        displayName,
        displayComment,
        displayRating,
        displayDate,
        displayDoctor,
        initials,
        dateValue,
      };
    });
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    const query = search.trim().toLowerCase();

    let result = normalizedReviews.filter((review) => {
      const searchableText = [
        review.displayName,
        review.displayComment,
        review.displayDoctor,
        review.service,
      ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

      const matchesSearch =
          !query || searchableText.includes(query);

      const matchesRating =
          ratingFilter === "All" ||
          review.displayRating === Number(ratingFilter);

      return matchesSearch && matchesRating;
    });

    if (sortBy === "latest") {
      result = [...result].sort((a, b) => {
        const aTime = a.dateValue?.getTime() || 0;
        const bTime = b.dateValue?.getTime() || 0;
        return bTime - aTime;
      });
    }

    if (sortBy === "oldest") {
      result = [...result].sort((a, b) => {
        const aTime = a.dateValue?.getTime() || 0;
        const bTime = b.dateValue?.getTime() || 0;
        return aTime - bTime;
      });
    }

    if (sortBy === "rating") {
      result = [...result].sort(
          (a, b) => b.displayRating - a.displayRating
      );
    }

    return result;
  }, [
    normalizedReviews,
    search,
    ratingFilter,
    sortBy,
  ]);

  const averageRating = useMemo(() => {
    if (!normalizedReviews.length) return 0;

    const total = normalizedReviews.reduce(
        (sum, review) => sum + review.displayRating,
        0
    );

    return total / normalizedReviews.length;
  }, [normalizedReviews]);

  const clearFilters = () => {
    setSearch("");
    setRatingFilter("All");
    setSortBy("latest");
  };

  if (loading) {
    return (
        <main className={styles.page}>
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <h3>Loading patient reviews...</h3>
            <p>
              Please wait while we load the latest reviews.
            </p>
          </div>
        </main>
    );
  }

  return (
      <main className={styles.page}>
        {/* HERO */}
        <section className={styles.hero}>
          <img
              src={reviewsHero}
              alt="Patient receiving dental care"
              className={styles.heroImage}
          />

          <div className={styles.heroOverlay} />

          <div className={styles.heroContent}>
            <div className={styles.heroText}>
              <div className={styles.eyebrow}>
                <Star size={15} fill="currentColor" />
                <span>PATIENT REVIEWS</span>
              </div>

              <h1>
                Real Stories
                <span>Real Smiles</span>
              </h1>

              <p>
                Hear from our patients about their experiences
                with DentaFlow. Your feedback helps us continue
                delivering quality dental care.
              </p>

              <div className={styles.heroHighlights}>
                <div className={styles.highlight}>
                  <div className={styles.highlightIcon}>
                    <Users size={20} />
                  </div>

                  <div>
                    <strong>Trusted by Patients</strong>
                    <span>Real Experiences</span>
                  </div>
                </div>

                <div className={styles.highlight}>
                  <div className={styles.highlightIcon}>
                    <Star size={20} />
                  </div>

                  <div>
                    <strong>Quality Care</strong>
                    <span>Patient Feedback</span>
                  </div>
                </div>

                <div className={styles.highlight}>
                  <div className={styles.highlightIcon}>
                    <MessageSquare size={20} />
                  </div>

                  <div>
                    <strong>Patient Voices</strong>
                    <span>Genuine Reviews</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FILTERS */}
        <section className={styles.filterSection}>
          <div className={styles.searchBox}>
            <Search size={19} />

            <input
                type="text"
                placeholder="Search reviews..."
                value={search}
                onChange={(event) =>
                    setSearch(event.target.value)
                }
            />
          </div>

          <div className={styles.selectWrapper}>
            <select
                value={ratingFilter}
                onChange={(event) =>
                    setRatingFilter(event.target.value)
                }
            >
              <option value="All">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
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
              <option value="latest">Latest First</option>
              <option value="oldest">Oldest First</option>
              <option value="rating">Highest Rating</option>
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

        {/* REVIEWS */}
        <section className={styles.reviewsSection}>
          <div className={styles.sectionHeader}>
            <div>
            <span className={styles.sectionEyebrow}>
              PATIENT REVIEWS
            </span>

              <h2>
                What Our
                <span> Patients Say</span>
              </h2>

              <p>
                Genuine feedback from our valued patients.
              </p>
            </div>

            {normalizedReviews.length > 0 && (
                <div className={styles.ratingSummary}>
                  <div className={styles.ratingNumber}>
                    {averageRating.toFixed(1)}
                  </div>

                  <div className={styles.ratingDetails}>
                    <div className={styles.ratingStars}>
                      {[...Array(5)].map((_, index) => (
                          <Star
                              key={index}
                              size={16}
                              fill={
                                index < Math.round(averageRating)
                                    ? "#eab308"
                                    : "none"
                              }
                              color={
                                index < Math.round(averageRating)
                                    ? "#eab308"
                                    : "#cbd5e1"
                              }
                          />
                      ))}
                    </div>

                    <span>
                  Based on {normalizedReviews.length}{" "}
                      {normalizedReviews.length === 1
                          ? "Review"
                          : "Reviews"}
                </span>
                  </div>
                </div>
            )}
          </div>

          {filteredReviews.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  {reviews.length === 0 ? (
                      <MessageSquare size={26} />
                  ) : (
                      <ShieldCheck size={26} />
                  )}
                </div>

                <h3>
                  {reviews.length === 0
                      ? "No Patient Reviews Yet"
                      : "No Reviews Found"}
                </h3>

                <p>
                  {reviews.length === 0
                      ? "Genuine reviews from patients will appear here once submitted through their patient account."
                      : "No review matches the selected search or filters."}
                </p>

                {reviews.length > 0 && (
                    <button
                        type="button"
                        onClick={clearFilters}
                        className={styles.emptyButton}
                    >
                      Clear Filters
                    </button>
                )}
              </div>
          ) : (
              <div className={styles.reviewGrid}>
                {filteredReviews.map((review) => (
                    <article
                        key={review.id || review._index}
                        className={styles.reviewCard}
                    >
                      <div className={styles.reviewHeader}>
                        <div className={styles.avatarWrap}>
                          <img
                              src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                  review.displayName
                              )}`}
                              alt={review.displayName}
                              className={styles.avatar}
                              onError={(event) => {
                                event.currentTarget.style.display =
                                    "none";
                              }}
                          />

                          <span className={styles.avatarInitials}>
                      {review.initials}
                    </span>
                        </div>

                        <div className={styles.reviewMeta}>
                          <strong>
                            {review.displayName}
                          </strong>

                          <span>
                      {review.displayDate}
                    </span>
                        </div>
                      </div>

                      <div className={styles.reviewStars}>
                        {[...Array(5)].map((_, index) => (
                            <Star
                                key={index}
                                size={16}
                                fill={
                                  index < review.displayRating
                                      ? "#eab308"
                                      : "none"
                                }
                                color={
                                  index < review.displayRating
                                      ? "#eab308"
                                      : "#cbd5e1"
                                }
                            />
                        ))}
                      </div>

                      <p className={styles.reviewText}>
                        {review.displayComment}
                      </p>

                      {review.displayDoctor && (
                          <span className={styles.reviewService}>
                    {review.displayDoctor}
                  </span>
                      )}
                    </article>
                ))}
              </div>
          )}
        </section>
      </main>
  );
}