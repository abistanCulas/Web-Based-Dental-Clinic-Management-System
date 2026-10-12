import React from "react";
import logoImage from "../../assets/reference/dentaflow-logo.png";

export default function Logo({
                                 size = 36,
                                 showText = true,
                                 variant = "default",
                             }) {
    const isLight = variant === "light";

    return (
        <div
            className="df-logo-wrap"
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                flexShrink: 0,
                textDecoration: "none",
                userSelect: "none",
            }}
        >
            <div
                className="df-logo-icon-container"
                style={{
                    width: size,
                    height: size,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                }}
            >
                <img
                    src={logoImage}
                    alt="DentaFlow"
                    style={{
                        display: "block",
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        objectPosition: "center",
                    }}
                />
            </div>

            {showText && (
                <div
                    className="df-logo-text-block"
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        lineHeight: 1.1,
                        textAlign: "left",
                    }}
                >
                    <span
                        className="df-logo-title"
                        style={{
                            fontWeight: 800,
                            fontSize: size > 32 ? 18 : 16,
                            color: isLight ? "#FFFFFF" : "#10234B",
                            letterSpacing: "-0.035em",
                            fontFamily:
                                "var(--df-font-display, Inter, sans-serif)",
                            whiteSpace: "nowrap",
                        }}
                    >
                        Denta<span style={{ color: "#2563EB" }}>Flow</span>
                    </span>

                    <span
                        className="df-logo-tagline"
                        style={{
                            fontSize: 9.5,
                            color: isLight ? "#BFDBFE" : "#64748B",
                            fontWeight: 500,
                            letterSpacing: "0.015em",
                            marginTop: 3,
                            whiteSpace: "nowrap",
                        }}
                    >
                        Smart Dental Care for Everyone
                    </span>
                </div>
            )}
        </div>
    );
}