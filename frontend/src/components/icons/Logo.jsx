export default function Logo({ size = 40, showText = true, variant = "default" }) {
  const isLight = variant === "light";
  return (
    <div className="df-logo-wrap" style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
        <rect width="40" height="40" rx="10" fill={isLight ? "rgba(255,255,255,0.15)" : "url(#logoGrad)"} />
        <defs>
          <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40">
            <stop stopColor="#1B6EF3" />
            <stop offset="1" stopColor="#0F4CBA" />
          </linearGradient>
        </defs>
        <path
          d="M20 8C16 8 13 11 13 15C13 19 15 21 16 24C17 27 18 30 20 32C22 30 23 27 24 24C25 21 27 19 27 15C27 11 24 8 20 8Z"
          fill={isLight ? "#fff" : "#fff"}
          opacity="0.95"
        />
        <path
          d="M20 8C16 8 13 11 13 15C13 17.5 14 19.5 15 21.5"
          stroke={isLight ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.4)"}
          strokeWidth="1"
          fill="none"
        />
        <path
          d="M8 28C12 26 16 28 20 30C24 28 28 26 32 28"
          stroke={isLight ? "#7EB5F4" : "#4893ED"}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="32" cy="28" r="2" fill="#4893ED" />
      </svg>
      {showText && (
        <div className="df-logo-text-block">
          <span style={{
            fontWeight: 800,
            fontSize: size > 32 ? 18 : 16,
            color: isLight ? "#fff" : "var(--df-text-heading)",
            letterSpacing: "-0.02em",
          }}>
            Denta<span style={{ color: isLight ? "#7EB5F4" : "var(--df-primary-500)" }}>Flow</span>
          </span>
          <small style={{
            display: "block",
            fontSize: 11,
            color: isLight ? "rgba(255,255,255,0.7)" : "var(--df-text-muted)",
            fontWeight: 500,
            marginTop: -2,
          }}>
            Advanced Dental Care
          </small>
        </div>
      )}
    </div>
  );
}
