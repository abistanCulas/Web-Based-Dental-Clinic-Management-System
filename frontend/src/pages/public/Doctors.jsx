import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { DOCTORS } from "../../data/mockData";
import { dentistApi } from "../../api/dentists";
import "./public.css";

export default function Doctors() {
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("All");
  const [liveDentists, setLiveDentists] = useState([]);

  useEffect(() => {
    let active = true;
    dentistApi.getAllDentists().then((list) => {
      if (!active) return;
      if (list && list.length > 0) {
        setLiveDentists(list);
      }
    }).catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const dentistList = liveDentists.length > 0 ? liveDentists.map((d) => ({
    id: d.id,
    name: d.name,
    specialty: d.specialization || "General Dentistry",
    qualification: d.qualification || "Dental Surgeon",
    experience: `${d.experienceYears || 5}+ years`,
    rating: 4.9,
    availability: "Mon - Fri, 9:00 AM - 5:00 PM",
  })) : DOCTORS;

  const specialties = ["All", ...new Set(dentistList.map((d) => d.specialty))];

  const filtered = dentistList.filter((d) => {
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const matchSpec = specialty === "All" || d.specialty === specialty;
    return matchSearch && matchSpec;
  });

  return (
    <>
      <div className="df-page-banner">
        <h1>Our Expert Dentists</h1>
        <p>Meet our team of board-certified dental professionals dedicated to your oral health.</p>
      </div>
      <div className="df-page-content">
        <div className="df-filters-row">
          <div className="df-search">
            <span className="df-search-icon">🔍</span>
            <input className="df-input" placeholder="Search doctors..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="df-select" value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
            {specialties.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="df-doctors-grid">
          {filtered.map((d) => (
            <div key={d.id} className="df-doctor-card">
              <div className="df-doctor-photo">{d.name.split(" ").slice(1).map((n) => n[0]).join("")}</div>
              <div className="df-doctor-body">
                <h3>{d.name}</h3>
                <div className="df-doctor-specialty">{d.specialty}</div>
                <div className="df-doctor-meta">{d.qualification}</div>
                <div className="df-doctor-meta">{d.experience} · ★ {d.rating}</div>
                <div className="df-doctor-meta">📅 {d.availability}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <Link to={`/doctors/${d.id}`} className="df-btn df-btn-secondary df-btn-sm" style={{ flex: 1 }}>View Profile</Link>
                  <Link to="/book-appointment" state={{ doctorId: d.id }} className="df-btn df-btn-primary df-btn-sm" style={{ flex: 1 }}>Book</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
