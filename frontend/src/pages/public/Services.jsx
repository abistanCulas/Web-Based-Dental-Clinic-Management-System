import { useState } from "react";
import { Link } from "react-router-dom";
import { SERVICES, SERVICE_CATEGORIES } from "../../data/mockData";
import "./public.css";

export default function Services() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const filtered = SERVICES.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "All" || s.category === category;
    return matchSearch && matchCat;
  });

  return (
    <>
      <div className="df-page-banner">
        <h1>Our Dental Services</h1>
        <p>Comprehensive dental care across all specialties — from preventive checkups to advanced surgical procedures.</p>
      </div>
      <div className="df-page-content">
        <div className="df-filters-row">
          <div className="df-search">
            <span className="df-search-icon">🔍</span>
            <input className="df-input" placeholder="Search services..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="df-category-pills">
          <button className={`df-category-pill ${category === "All" ? "active" : ""}`} onClick={() => setCategory("All")}>All</button>
          {SERVICE_CATEGORIES.map((c) => (
            <button key={c} className={`df-category-pill ${category === c ? "active" : ""}`} onClick={() => setCategory(c)}>{c}</button>
          ))}
        </div>
        <div className="df-services-grid">
          {filtered.map((s) => (
            <div key={s.id} className="df-service-card">
              <div className="df-service-icon">🦷</div>
              <span className="df-badge df-badge-primary">{s.category}</span>
              <h3>{s.name}</h3>
              <p>{s.desc}</p>
              <div className="df-service-meta"><span>⏱ {s.duration}</span><span>💰 From {s.price}</span></div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <Link to={`/services/${s.id}`} className="df-btn df-btn-secondary df-btn-sm">Details</Link>
                <Link to="/book-appointment" state={{ serviceId: s.id }} className="df-btn df-btn-primary df-btn-sm">Book</Link>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && <div className="df-empty"><p>No services found.</p></div>}
      </div>
    </>
  );
}
