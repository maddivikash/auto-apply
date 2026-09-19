/**
 * The PDF is named after the person, never the company: "Vikash_Maddi.pdf". A file called
 * Resume_Databricks.pdf tells the recruiter the resume was generated for their posting.
 */
export function resumeFileName(...nameParts: (string | undefined | null)[]): string {
  const clean = nameParts.filter(Boolean).join(" ").trim().replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "");
  return `${clean || "Resume"}.pdf`;
}
