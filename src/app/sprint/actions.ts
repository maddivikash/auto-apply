"use server";

import { nanoid } from "nanoid";
import { putDoc } from "@/lib/docs";
import { emailSprintRequest } from "@/lib/email";

export type SprintRequestState = { ok: boolean; error?: string } | null;

const clip = (v: FormDataEntryValue | null, n: number) => String(v ?? "").trim().slice(0, n);

/** Public, unauthenticated: stores the request and emails the owner. The honeypot field drops most bots. */
export async function requestSprintAction(_: SprintRequestState, form: FormData): Promise<SprintRequestState> {
  if (clip(form.get("website"), 200)) return { ok: true };
  const r = {
    name: clip(form.get("name"), 120),
    email: clip(form.get("email"), 200),
    country: clip(form.get("country"), 80),
    experience: clip(form.get("experience"), 40),
    roles: clip(form.get("roles"), 400),
    note: clip(form.get("note"), 1500),
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) return { ok: false, error: "Enter an email address we can reply to." };
  if (!r.roles) return { ok: false, error: "Tell us which roles you are applying for." };
  const createdAt = new Date().toISOString();
  await putDoc(`sprint-requests/${createdAt.slice(0, 10)}-${nanoid(6)}.json`, { ...r, createdAt });
  await emailSprintRequest(process.env.SPRINT_NOTIFY_EMAIL || "maddi.vikash@gmail.com", { ...r, received: createdAt }).catch(() => {});
  return { ok: true };
}
