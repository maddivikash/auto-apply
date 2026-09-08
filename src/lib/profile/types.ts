import { z } from "zod";

/** A user's master profile: the only facts the tailoring step may use. */
export const BulletBank = z.object({ id: z.string(), tags: z.array(z.string()).default([]), text: z.string().min(20) });
export const Role = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  location: z.string().optional(),
  start: z.string().min(1),
  end: z.string().min(1),
  bullets: z.array(BulletBank).min(1)
});
export const Project = z.object({
  name: z.string().min(1),
  stack: z.string().default(""),
  year: z.string().default(""),
  tags: z.array(z.string()).default([]),
  bullets: z.array(z.string().min(20)).min(1)
});
export const Education = z.object({
  school: z.string().min(1),
  place: z.string().default(""),
  degree: z.string().min(1),
  dates: z.string().default(""),
  gpa: z.string().default("")
});
export const Profile = z.object({
  name: z.string().min(1),
  phone: z.string().default(""),
  email: z.string().default(""),
  linkedin: z.string().default(""),
  github: z.string().default(""),
  website: z.string().default(""),
  location: z.string().default(""),
  education: z.array(Education).min(1),
  roles: z.array(Role).min(1),
  projects: z.array(Project).default([]),
  skills: z.record(z.string(), z.array(z.string())).default({}),
  coursework: z.array(z.string()).default([]),
  achievements: z.array(z.string()).default([])
});
export type Profile = z.infer<typeof Profile>;
export type Role = z.infer<typeof Role>;
export type Project = z.infer<typeof Project>;

/** Answers the form filler already knows for this user. Everything else becomes an open question. */
export const Settings = z.object({
  firstName: z.string().default(""),
  lastName: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  phoneCountry: z.string().default(""),
  location: z.string().default(""),
  linkedin: z.string().default(""),
  github: z.string().default(""),
  website: z.string().default(""),
  heardFrom: z.string().default("LinkedIn"),
  /** Countries where the user can work without sponsorship, comma separated. Sponsorship answers depend on the job's country. */
  workAuthorizedCountries: z.string().default(""),
  /** Answer for jobs outside those countries. */
  sponsorshipElsewhere: z.enum(["Yes", "No"]).default("Yes"),
  needsSponsorship: z.enum(["Yes", "No"]).default("No"),
  willingToRelocate: z.enum(["Yes", "No"]).default("Yes"),
  openToOnsite: z.enum(["Yes", "No"]).default("Yes"),
  noticePeriod: z.string().default(""),
  currentCompany: z.string().default(""),
  currentTitle: z.string().default(""),
  yearsExperience: z.string().default(""),
  salaryExpectation: z.string().default(""),
  /** Runner bearer token for this user's machine. */
  runnerToken: z.string().default(""),
  notifyEmail: z.string().default("")
});
export type Settings = z.infer<typeof Settings>;

/** Every distinct number-like token in a profile, used to catch invented figures. */
export function profileNumbers(p: Profile): Set<string> {
  const text = JSON.stringify(p);
  return new Set((text.match(/\d[\d,.]*\s*(%|x|k\+|\+)?/g) || []).map((n) => n.replace(/\s+/g, "")));
}
