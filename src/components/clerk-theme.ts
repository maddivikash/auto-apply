/** Clerk's components take concrete colors, so the auth pages pass the light tokens here. */
export const clerkAppearance = {
  variables: {
    colorPrimary: "#0b7f7a",
    colorBackground: "#ffffff",
    colorText: "#121826",
    colorTextSecondary: "rgba(18,24,38,0.64)",
    colorInputBackground: "#ffffff",
    colorInputText: "#121826",
    colorNeutral: "#121826",
    colorDanger: "#cf3f3f",
    colorSuccess: "#2b8a3e",
    colorWarning: "#b0680a",
    borderRadius: "10px",
    fontFamily: "var(--font-geist-sans), \"Geist\", system-ui, sans-serif",
    fontSize: "14px"
  },
  elements: {
    cardBox: { boxShadow: "0 0 0 1px rgba(18,24,38,0.07), 0 8px 24px -12px rgba(18,24,38,0.12)", border: "none", borderRadius: "16px" },
    card: { boxShadow: "none" },
    formButtonPrimary: { color: "#ffffff", fontWeight: 500, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28), 0 1px 2px rgba(6,40,38,0.35)" },
    footer: { background: "#f4f2ed" },
    footerActionLink: { color: "#0b7f7a" }
  }
} as const;
