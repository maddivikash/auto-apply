import type { Profile, Settings } from "./profile/types";

/** What a profile needs before the next step makes sense: who you are and at least one role to tailor from. */
export function profileGaps(p: Profile): string[] {
  const gaps: string[] = [];
  if (!p.name.trim()) gaps.push("name");
  if (!p.email.trim()) gaps.push("email");
  if (!p.gender) gaps.push("gender");
  if (!p.roles.length) gaps.push("at least one role");
  return gaps;
}

const ESSENTIAL: [keyof Settings, string][] = [
  ["firstName", "first name"], ["lastName", "last name"], ["email", "email"], ["phone", "phone"],
  ["location", "current city"], ["workAuthorizedCountries", "countries you can work in"], ["noticePeriod", "notice period"],
];

/** Standing answers almost every form asks; with these filled, applications rarely stop for questions. */
export function answerGaps(s: Settings): string[] {
  return ESSENTIAL.filter(([k]) => !String(s[k] ?? "").trim()).map(([, label]) => label);
}
