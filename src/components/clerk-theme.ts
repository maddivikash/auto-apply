/** Clerk's components take concrete colors, so the auth pages (always dark) pass the dark tokens here. */
export const clerkAppearance = {
  variables: {
    colorPrimary: "#7fe8f2",
    colorBackground: "#0a0b0b",
    colorText: "#ecf0ef",
    colorTextSecondary: "rgba(236,240,239,0.64)",
    colorInputBackground: "#000000",
    colorInputText: "#ecf0ef",
    colorNeutral: "#ecf0ef",
    colorDanger: "#f0757a",
    colorSuccess: "#5fd38a",
    colorWarning: "#f2c572",
    borderRadius: "2px",
    fontFamily: "var(--font-plex-sans), \"IBM Plex Sans\", system-ui, sans-serif",
    fontSize: "14px"
  },
  elements: {
    cardBox: { boxShadow: "none", border: "1px solid rgba(236,240,239,0.10)" },
    card: { boxShadow: "none" },
    formButtonPrimary: { color: "#000000", fontWeight: 500 },
    footer: { background: "#000000" },
    footerActionLink: { color: "#7fe8f2" }
  }
} as const;
