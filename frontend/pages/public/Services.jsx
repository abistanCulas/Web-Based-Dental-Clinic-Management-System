import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    ArrowRight,
    ChevronDown,
    Clock3,
    Heart,
    RotateCcw,
    Search,
    ShieldCheck,
    Sparkles,
    Users,
} from "lucide-react";

import servicesApi from "../../api/services";
import servicesHero from "../../assets/services_hero.png";

import styles from "./Services.module.css";

export default function Services() {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("All");
    const [sortBy, setSortBy] = useState("default");

    useEffect(() => {
        let active = true;

        const loadServices = async () => {
            try {
                const list = await servicesApi.getServices();

                if (active) {
                    setServices(Array.isArray(list) ? list : []);
                }
            } catch {
                if (active) {
                    setServices([]);
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        loadServices();

        return () => {
            active = false;
        };
    }, []);

    const normalizedServices = useMemo(() => {
        return services.map((service) => ({
            ...service,
            id: service.id,
            name: service.name || "Dental Service",
            category: service.category || "General",
            duration: service.duration || "",
            price: service.price || "",
            desc: service.desc || service.description || "",
            image:
                service.imageUrl ||
                service.image ||
                service.photoUrl ||
                service.imagePath ||
                null,
        }));
    }, [services]);

    const categories = useMemo(() => {
        const values = normalizedServices
            .map((service) => service.category)
            .filter(Boolean);

        return [
            "All",
            ...Array.from(new Set(values)),
        ];
    }, [normalizedServices]);

    const filteredServices = useMemo(() => {
        const query = search.trim().toLowerCase();

        let result = normalizedServices.filter((service) => {
            const searchableText = [
                service.name,
                service.category,
                service.desc,
                service.duration,
                service.price,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const matchesSearch =
                !query || searchableText.includes(query);

            const matchesCategory =
                category === "All" ||
                service.category === category;

            return matchesSearch && matchesCategory;
        });

        if (sortBy === "name") {
            result = [...result].sort((a, b) =>
                a.name.localeCompare(b.name)
            );
        }

        if (sortBy === "category") {
            result = [...result].sort((a, b) =>
                a.category.localeCompare(b.category)
            );
        }

        return result;
    }, [
        normalizedServices,
        search,
        category,
        sortBy,
    ]);

    const clearFilters = () => {
        setSearch("");
        setCategory("All");
        setSortBy("default");
    };

    return (
        <main className={styles.page}>
            {/* =========================
          HERO
      ========================= */}

            <section className={styles.hero}>
                <img
                    src={servicesHero}
                    alt="DentaFlow dental services"
                    className={styles.heroImage}
                />

                <div className={styles.heroOverlay} />

                <div className={styles.heroContent}>
                    <div className={styles.heroText}>
                        <div className={styles.eyebrow}>
                            <Sparkles size={15} />
                            <span>OUR SERVICES</span>
                        </div>

                        <h1>
                            Comprehensive
                            <span>Dental Care for Every Smile</span>
                        </h1>

                        <p>
                            Explore the dental services available at
                            DentaFlow, created and managed by our clinic
                            team to support your oral health and smile.
                        </p>

                        <div className={styles.heroHighlights}>
                            <div className={styles.highlight}>
                                <div className={styles.highlightIcon}>
                                    <Users size={20} />
                                </div>

                                <div>
                                    <strong>Expert Care</strong>
                                    <span>Skilled Professionals</span>
                                </div>
                            </div>

                            <div className={styles.highlight}>
                                <div className={styles.highlightIcon}>
                                    <ShieldCheck size={20} />
                                </div>

                                <div>
                                    <strong>Advanced Technology</strong>
                                    <span>Modern Equipment</span>
                                </div>
                            </div>

                            <div className={styles.highlight}>
                                <div className={styles.highlightIcon}>
                                    <Heart size={20} />
                                </div>

                                <div>
                                    <strong>Patient First</strong>
                                    <span>Your Comfort Matters</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* =========================
          FILTER
      ========================= */}

            <section className={styles.filterSection}>
                <div className={styles.filterHeader}>
                    <div>
            <span className={styles.filterEyebrow}>
              OUR DENTAL SERVICES
            </span>

                        <h2>
                            Explore Our
                            <span> Dental Services</span>
                        </h2>

                        <p>
                            Browse the services currently available
                            at DentaFlow.
                        </p>
                    </div>

                    <div className={styles.resultCount}>
                        <strong>
                            {filteredServices.length}
                        </strong>

                        <span>
              {filteredServices.length === 1
                  ? "Service"
                  : "Services"}
            </span>
                    </div>
                </div>

                <div className={styles.filterBar}>
                    <div className={styles.searchBox}>
                        <Search size={18} />

                        <input
                            type="text"
                            placeholder="Search services..."
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                        />
                    </div>

                    <div className={styles.selectWrapper}>
                        <select
                            value={category}
                            onChange={(event) =>
                                setCategory(event.target.value)
                            }
                        >
                            {categories.map((item) => (
                                <option
                                    key={item}
                                    value={item}
                                >
                                    {item === "All"
                                        ? "All Categories"
                                        : item}
                                </option>
                            ))}
                        </select>

                        <ChevronDown size={16} />
                    </div>

                    <div className={styles.selectWrapper}>
                        <select
                            value={sortBy}
                            onChange={(event) =>
                                setSortBy(event.target.value)
                            }
                        >
                            <option value="default">
                                Sort by
                            </option>

                            <option value="name">
                                Name
                            </option>

                            <option value="category">
                                Category
                            </option>
                        </select>

                        <ChevronDown size={16} />
                    </div>

                    <button
                        type="button"
                        className={styles.clearButton}
                        onClick={clearFilters}
                    >
                        <RotateCcw size={15} />
                        Clear
                    </button>
                </div>
            </section>

            {/* =========================
          SERVICES
      ========================= */}

            <section className={styles.servicesSection}>
                {loading ? (
                    <div className={styles.stateCard}>
                        <div className={styles.spinner} />

                        <h3>Loading services...</h3>

                        <p>
                            Please wait while we load the latest
                            services.
                        </p>
                    </div>
                ) : filteredServices.length === 0 ? (
                    <div className={styles.stateCard}>
                        <div className={styles.emptyIcon}>
                            <ShieldCheck size={26} />
                        </div>

                        <h3>
                            {services.length === 0
                                ? "No services available"
                                : "No services found"}
                        </h3>

                        <p>
                            {services.length === 0
                                ? "Services added by the clinic will appear here."
                                : "No service matches the selected search or filters."}
                        </p>

                        {services.length > 0 && (
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
                    <div className={styles.serviceGrid}>
                        {filteredServices.map((service) => (
                            <article
                                key={service.id}
                                className={styles.serviceCard}
                            >
                                <div className={styles.serviceImageWrap}>
                                    {service.image ? (
                                        <img
                                            src={service.image}
                                            alt={service.name}
                                            className={styles.serviceImage}
                                        />
                                    ) : (
                                        <div
                                            className={
                                                styles.imagePlaceholder
                                            }
                                        >
                                            <Heart size={28} />
                                        </div>
                                    )}

                                    <div className={styles.imageOverlay} />

                                    {service.category && (
                                        <span
                                            className={
                                                styles.categoryBadge
                                            }
                                        >
                      {service.category}
                    </span>
                                    )}
                                </div>

                                <div className={styles.serviceBody}>
                                    <div className={styles.serviceTitle}>
                                        <h3>{service.name}</h3>
                                    </div>

                                    {(service.duration ||
                                        service.price) && (
                                        <div className={styles.serviceInfo}>
                                            {service.duration && (
                                                <div
                                                    className={
                                                        styles.infoItem
                                                    }
                                                >
                                                    <Clock3 size={14} />
                                                    <span>
                            {service.duration}
                          </span>
                                                </div>
                                            )}

                                            {service.price && (
                                                <div
                                                    className={
                                                        styles.infoItem
                                                    }
                                                >
                          <span
                              className={
                                  styles.priceLabel
                              }
                          >
                            LKR
                          </span>

                                                    <span>
                            {service.price}
                          </span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {service.desc && (
                                        <p
                                            className={
                                                styles.serviceDescription
                                            }
                                        >
                                            {service.desc}
                                        </p>
                                    )}

                                    <Link
                                        to={`/services/${service.id}`}
                                        className={styles.detailsButton}
                                    >
                                        View Details
                                        <ArrowRight size={16} />
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </main>
    );
}