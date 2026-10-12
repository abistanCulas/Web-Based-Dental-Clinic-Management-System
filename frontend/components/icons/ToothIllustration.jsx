export default function ToothIllustration({ variant = "pedestal", size = 260, className = "" }) {
  const isShield = variant === "shield";
  const dim = size;

  return (
    <div
      className={`df-tooth-illustration-wrap ${className}`}
      style={{
        position: "relative",
        width: dim,
        height: dim,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      aria-hidden="true"
    >
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 280 280"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: "drop-shadow(0 16px 32px rgba(37, 99, 235, 0.18))" }}
      >
        <defs>
          {/* Ambient Glow */}
          <radialGradient id="dfAmbientGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#2563eb" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </radialGradient>

          {/* Pedestal Gradients */}
          <linearGradient id="dfPedestalTop" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e0f2fe" />
          </linearGradient>
          <linearGradient id="dfPedestalBase" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e0f2fe" />
            <stop offset="45%" stopColor="#bae6fd" />
            <stop offset="100%" stopColor="#7dd3fc" />
          </linearGradient>
          <linearGradient id="dfPedestalStep" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f0f9ff" />
            <stop offset="100%" stopColor="#bae6fd" />
          </linearGradient>

          {/* 3D Glossy Molar Gradient */}
          <linearGradient id="dfToothCrown" x1="30%" y1="0%" x2="70%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="40%" stopColor="#f8fafc" />
            <stop offset="85%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>

          {/* Blue Specular Reflection */}
          <linearGradient id="dfToothReflection" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.2" />
          </linearGradient>

          {/* Glowing Ribbon Gradient */}
          <linearGradient id="dfRibbonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>

          {/* Medical Shield Gradient */}
          <linearGradient id="dfShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>

          {/* Leaves Gradient */}
          <linearGradient id="dfLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="dfLeafGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>

        {/* Ambient Back Glow */}
        <circle cx="140" cy="135" r="105" fill="url(#dfAmbientGlow)" />

        {/* Pedestal Bottom Base Step */}
        <ellipse cx="140" cy="235" rx="86" ry="24" fill="rgba(15, 23, 42, 0.08)" />
        <path d="M54 220 C54 207 92 196 140 196 C188 196 226 207 226 220 L226 232 C226 245 188 256 140 256 C92 256 54 245 54 232 Z" fill="url(#dfPedestalBase)" />
        <ellipse cx="140" cy="220" rx="86" ry="24" fill="url(#dfPedestalTop)" stroke="#bae6fd" strokeWidth="1" />

        {/* Pedestal Top Step */}
        <path d="M72 205 C72 195 102 186 140 186 C178 186 208 195 208 205 L208 214 C208 224 178 233 140 233 C102 233 72 224 72 214 Z" fill="url(#dfPedestalStep)" />
        <ellipse cx="140" cy="205" rx="68" ry="18" fill="url(#dfPedestalTop)" stroke="#e0f2fe" strokeWidth="1.5" />

        {/* Left Green Leaf */}
        <g transform="translate(48, 178) rotate(-22)">
          <path d="M0 25 C10 12 25 5 45 0 C40 16 32 30 18 36 C7 40 0 35 0 25 Z" fill="url(#dfLeafGrad)" opacity="0.9" />
          <path d="M0 25 C18 18 30 10 45 0" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.4" />
        </g>
        <g transform="translate(56, 195) rotate(-10)">
          <path d="M0 18 C8 8 20 4 34 0 C30 12 24 22 14 26 C5 30 0 25 0 18 Z" fill="url(#dfLeafGrad2)" opacity="0.85" />
        </g>

        {/* Right Green Leaf */}
        <g transform="translate(195, 172) rotate(24) scale(-1, 1)">
          <path d="M0 25 C10 12 25 5 45 0 C40 16 32 30 18 36 C7 40 0 35 0 25 Z" fill="url(#dfLeafGrad)" opacity="0.9" />
          <path d="M0 25 C18 18 30 10 45 0" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.4" />
        </g>
        <g transform="translate(190, 192) rotate(12) scale(-1, 1)">
          <path d="M0 18 C8 8 20 4 34 0 C30 12 24 22 14 26 C5 30 0 25 0 18 Z" fill="url(#dfLeafGrad2)" opacity="0.85" />
        </g>

        {/* Glowing Spiral Ribbon Behind Tooth */}
        {!isShield && (
          <path
            d="M58 135 C58 90 92 65 140 65 C195 65 228 105 222 155"
            stroke="url(#dfRibbonGradient)"
            strokeWidth="11"
            strokeLinecap="round"
            fill="none"
            opacity="0.35"
            filter="blur(3px)"
          />
        )}

        {/* 3D Glossy Molar Tooth Body */}
        <g id="dfMolarBody">
          {/* Main 3D Tooth Silhouette */}
          <path
            d="M96 68 C80 82 72 105 74 136 C76 162 85 186 100 206 C105 212 114 213 118 207 C125 197 132 185 137 175 C141 167 146 167 149 175 C154 185 161 197 168 207 C172 213 181 212 186 206 C201 186 210 162 212 136 C214 105 206 82 190 68 C176 56 160 62 143 65 C141 65 139 65 137 65 C120 62 104 56 96 68 Z"
            fill="url(#dfToothCrown)"
            filter="drop-shadow(0 12px 24px rgba(15, 23, 42, 0.16))"
          />

          {/* Tooth Gloss Highlights */}
          <path
            d="M102 76 C90 88 84 108 86 132 C88 152 94 170 106 186 C104 158 106 114 122 88 C128 78 134 74 140 73 C124 71 110 68 102 76 Z"
            fill="url(#dfToothReflection)"
          />

          {/* Top Specular Gleam */}
          <ellipse cx="120" cy="80" rx="14" ry="7" fill="#ffffff" fillOpacity="0.75" transform="rotate(-18 120 80)" />
          <ellipse cx="168" cy="82" rx="11" ry="5" fill="#ffffff" fillOpacity="0.6" transform="rotate(15 168 82)" />
        </g>

        {/* Glowing Spiral Ribbon Wrapping In Front */}
        {!isShield && (
          <path
            d="M62 165 C80 205 150 215 205 178 C232 158 238 122 225 95 C216 75 196 68 180 72"
            stroke="url(#dfRibbonGradient)"
            strokeWidth="9"
            strokeLinecap="round"
            fill="none"
            filter="drop-shadow(0 4px 12px rgba(37, 99, 235, 0.45))"
          />
        )}

        {/* Medical Shield (Register Page) */}
        {isShield && (
          <g transform="translate(136, 126)">
            {/* Shield Outline */}
            <path
              d="M0 -4 C16 -4 28 6 30 20 C30 42 12 56 0 65 C-12 56 -30 42 -30 20 C-28 6 -16 -4 0 -4 Z"
              fill="url(#dfShieldGrad)"
              filter="drop-shadow(0 8px 16px rgba(37, 99, 235, 0.45))"
            />
            {/* Shield Inner Rim */}
            <path
              d="M0 0 C13 0 24 8 26 20 C26 38 10 50 0 58 C-10 50 -26 38 -26 20 C-24 8 -13 0 0 0 Z"
              fill="none"
              stroke="#93c5fd"
              strokeWidth="1.5"
              strokeOpacity="0.7"
            />
            {/* White Plus Cross */}
            <rect x="-4" y="14" width="8" height="26" rx="3" fill="#ffffff" />
            <rect x="-13" y="23" width="26" height="8" rx="3" fill="#ffffff" />
          </g>
        )}

        {/* Floating Sparkles */}
        <g fill="#38bdf8" opacity="0.85">
          <path d="M52 82 Q56 90 64 94 Q56 98 52 106 Q48 98 40 94 Q48 90 52 82 Z" />
          <path d="M228 114 Q231 120 237 123 Q231 126 228 132 Q225 126 219 123 Q225 120 228 114 Z" />
          <circle cx="218" cy="68" r="3" fill="#60a5fa" />
          <circle cx="68" cy="120" r="2.5" fill="#38bdf8" />
        </g>
      </svg>
    </div>
  );
}
