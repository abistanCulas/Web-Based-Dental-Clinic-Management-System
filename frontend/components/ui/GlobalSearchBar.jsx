import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import SidebarIcon from "../icons/SidebarIcons";
import { searchApi } from "../../api/search";
import "./GlobalSearchBar.css";

const DEFAULT_PLACEHOLDERS = {
  admin: "Search patients, appointments, doctors, modules...",
  doctor: "Search patients, appointments, records, prescriptions...",
  dentist: "Search patients, appointments, records, prescriptions...",
  patient: "Search your appointments, doctors, records...",
  receptionist: "Search patients, appointments, doctors, staff...",
  pharmacist: "Search medicines, prescriptions, stock...",
  cashier: "Search invoices, payments, patients...",
  user: "Search invoices, payments, patients...",
};

export default function GlobalSearchBar({ role, isAdmin, customPlaceholder }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ query: "", totalResults: 0, categories: [] });
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const navigate = useNavigate();

  const placeholder =
    customPlaceholder ||
    DEFAULT_PLACEHOLDERS[role] ||
    (isAdmin ? DEFAULT_PLACEHOLDERS.admin : "Search DentaFlow...");

  // Flattened items for keyboard navigation across categories
  const flattenedItems = useMemo(() => {
    if (!results.categories || results.categories.length === 0) return [];
    return results.categories.flatMap((cat) =>
      cat.items.map((item) => ({
        ...item,
        categoryName: cat.name,
        categoryIcon: cat.icon,
      }))
    );
  }, [results.categories]);

  // Global ⌘K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setIsOpen(true);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Click outside listener to dismiss dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search query handler
  const executeSearch = useCallback(async (searchTerm) => {
    const trimmed = (searchTerm || "").trim();

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (trimmed.length < 2) {
      setResults({ query: trimmed, totalResults: 0, categories: [] });
      setLoading(false);
      setSelectedIndex(-1);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);

    try {
      const data = await searchApi.globalSearch(trimmed, controller.signal);
      setResults(data || { query: trimmed, totalResults: 0, categories: [] });
      setSelectedIndex(-1);
    } catch (err) {
      if (err.name !== "CanceledError" && err.name !== "AbortError") {
        console.warn("Global search query failed:", err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      executeSearch(val);
    }, 220);
  };

  const handleClear = () => {
    setQuery("");
    setResults({ query: "", totalResults: 0, categories: [] });
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleSelectItem = (item) => {
    if (!item || !item.url) return;

    setIsOpen(false);

    // Pass metadata and search context so the target view can filter/highlight/open record
    const navigationState = {
      ...(item.metadata || {}),
      search: item.title,
      selectedId:
        item.metadata?.patientId ||
        item.metadata?.appointmentId ||
        item.metadata?.recordId ||
        item.metadata?.prescriptionId ||
        item.metadata?.planId ||
        item.metadata?.dentistId ||
        item.metadata?.staffId ||
        item.id,
      fromGlobalSearch: true,
    };

    navigate(item.url, { state: navigationState });
  };

  // Keyboard navigation within the input & dropdown
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setIsOpen(true);
        return;
      }
    }

    if (flattenedItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < flattenedItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : flattenedItems.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < flattenedItems.length) {
        handleSelectItem(flattenedItems[selectedIndex]);
      } else if (flattenedItems.length > 0) {
        handleSelectItem(flattenedItems[0]);
      }
    }
  };

  return (
    <div
      className="df-header-search df-global-search-container"
      ref={containerRef}
      role="search"
      aria-expanded={isOpen}
      aria-haspopup="listbox"
    >
      <span className="df-header-search-icon" aria-hidden="true">
        {loading ? (
          <span className="df-search-spinner" />
        ) : (
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        )}
      </span>

      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        aria-label="Search dashboard"
        placeholder={placeholder}
        autoComplete="off"
        spellCheck="false"
      />

      {query.length > 0 ? (
        <button
          type="button"
          className="df-header-search-clear"
          onClick={handleClear}
          aria-label="Clear search"
          title="Clear search"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      ) : (
        <span className="df-header-search-badge" aria-hidden="true">
          ⌘K
        </span>
      )}

      {/* DROPDOWN RESULTS */}
      {isOpen && (
        <div className="df-search-dropdown" role="listbox">
          {query.trim().length < 2 ? (
            <div className="df-search-prompt">
              <span className="df-search-prompt-icon">🔍</span>
              <p className="df-search-prompt-title">Global Search</p>
              <p className="df-search-prompt-desc">
                Type at least 2 characters to search across {role === "patient" ? "your records, appointments & doctors" : "records, patients & appointments"}.
              </p>
            </div>
          ) : loading && results.categories.length === 0 ? (
            <div className="df-search-loading">
              <span className="df-search-spinner-lg" />
              <span>Searching across {role || "system"}...</span>
            </div>
          ) : results.totalResults === 0 ? (
            <div className="df-search-empty">
              <p className="df-search-empty-title">No results found</p>
              <p className="df-search-empty-desc">
                No matches found for &ldquo;<strong>{query}</strong>&rdquo;. Try searching by name, ID code, or procedure.
              </p>
            </div>
          ) : (
            <div className="df-search-results-list">
              <div className="df-search-header-meta">
                <span>
                  Found <strong>{results.totalResults}</strong> result{results.totalResults === 1 ? "" : "s"}
                </span>
                <span className="df-search-header-shortcut">Press ↵ to select</span>
              </div>

              {results.categories.map((category) => (
                <div key={category.name} className="df-search-category-group">
                  <div className="df-search-category-title">
                    <span className="df-search-category-icon">
                      <SidebarIcon name={category.icon || "dashboard"} size={14} />
                    </span>
                    <span className="df-search-category-name">{category.name}</span>
                    <span className="df-search-category-count">{category.count}</span>
                  </div>

                  <div className="df-search-category-items">
                    {category.items.map((item) => {
                      const itemGlobalIndex = flattenedItems.findIndex((fi) => fi.id === item.id);
                      const isSelected = itemGlobalIndex === selectedIndex;

                      return (
                        <div
                          key={item.id}
                          className={`df-search-item ${isSelected ? "selected" : ""}`}
                          onClick={() => handleSelectItem(item)}
                          onMouseEnter={() => setSelectedIndex(itemGlobalIndex)}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <div className="df-search-item-icon-box">
                            <SidebarIcon name={category.icon || "dashboard"} size={16} />
                          </div>

                          <div className="df-search-item-content">
                            <div className="df-search-item-top">
                              <span className="df-search-item-title">{item.title}</span>
                              {item.badge && (
                                <span className={`df-search-item-badge badge-${item.badge.toLowerCase().replace(/\s+/g, "-")}`}>
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            {item.subtitle && (
                              <div className="df-search-item-subtitle">{item.subtitle}</div>
                            )}
                          </div>

                          <div className="df-search-item-arrow" aria-hidden="true">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M9 18l6-6-6-6" />
                            </svg>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="df-search-footer">
                <div className="df-search-footer-hint">
                  <kbd>↑</kbd> <kbd>↓</kbd> to navigate &bull; <kbd>↵</kbd> to open &bull; <kbd>ESC</kbd> to close
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
