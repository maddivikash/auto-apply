/** Clerk's components take concrete colors, so the auth pages (always dark) pass the dark tokens here. */
export const clerkAppearance = {
  variables: {
    colorPrimary: "#eceef3",
    colorBackground: "#121722",
    colorText: "#eceef3",
    colorTextSecondary: "#8b91a3",
    colorInputBackground: "#0c1017",
    colorInputText: "#eceef3",
    colorNeutral: "#eceef3",
    colorDanger: "#f87171",
    colorSuccess: "#4ade80",
    colorWarning: "#f7b955",
    borderRadius: "8px",
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
    fontSize: "14px"
  },
  elements: {
    cardBox: { boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 24px 60px -30px rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.08)" },
    card: { boxShadow: "none" },
    formButtonPrimary: { color: "#0c1017", fontWeight: 500 },
    footer: { background: "#0c1017" },
    footerActionLink: { color: "#8f97ff" }
  }
} as const;
