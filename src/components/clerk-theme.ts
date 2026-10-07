/** Clerk's components take concrete colors, so the auth pages pass the light tokens here. */
export const clerkAppearance = {
  variables: {
    colorPrimary: "#3351e5",
    colorBackground: "#ffffff",
    colorText: "#071a31",
    colorTextSecondary: "rgba(7,26,49,0.64)",
    colorInputBackground: "#ffffff",
    colorInputText: "#071a31",
    colorNeutral: "#071a31",
    colorDanger: "#cf3f3f",
    colorSuccess: "#1a9a52",
    colorWarning: "#b0680a",
    borderRadius: "10px",
    fontFamily: "var(--font-geist-sans), \"Geist\", system-ui, sans-serif",
    fontSize: "14px"
  },
  elements: {
    cardBox: { boxShadow: "0 0 0 1px rgba(7,26,49,0.07), 0 8px 24px -12px rgba(7,26,49,0.12)", border: "none", borderRadius: "16px" },
    card: { boxShadow: "none" },
    formButtonPrimary: { color: "#ffffff", fontWeight: 500, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.28), 0 0 0 1px rgba(20,30,90,0.55), 0 1px 3px rgba(10,15,50,0.3)" },
    footer: { background: "#f5f3ee" },
    footerActionLink: { color: "#3351e5" }
  }
} as const;
