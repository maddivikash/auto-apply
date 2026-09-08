"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { nanoid } from "nanoid";
import { authorized, loginWithPassword, logout } from "@/lib/auth";
import { getApplication, saveApplication, deleteApplication, type Application } from "@/lib/store";
import { processApplication } from "@/lib/apply/pipeline";

async function guard() { if (!(await authorized())) redirect("/login"); }

export async function loginAction(formData: FormData) {
  const ok = await loginWithPassword(String(formData.get("password") || ""));
  redirect(ok ? "/" : "/login?error=1");
}

export async function logoutAction() { await logout(); redirect("/login"); }

export async function createApplicationAction(formData: FormData) {
  await guard();
  const url = String(formData.get("url") || "").trim();
  if (!/^https?:\/\//.test(url)) redirect("/?error=url");
  const id = nanoid(10);
  const now = new Date().toISOString();
  const app: Application = { id, url, createdAt: now, updatedAt: now, status: "queued", questions: [] };
  await saveApplication(app);
  // Runs after the redirect response is sent; the function stays alive up to maxDuration.
  after(() => processApplication(id));
  redirect(`/a/${id}`);
}

export async function reprocessAction(formData: FormData) {
  await guard();
  const id = String(formData.get("id"));
  const app = await getApplication(id);
  if (!app) redirect("/");
  app.status = "queued"; app.error = undefined; await saveApplication(app);
  after(() => processApplication(id));
  redirect(`/a/${id}`);
}

export async function saveAnswersAction(formData: FormData) {
  await guard();
  const id = String(formData.get("id"));
  const app = await getApplication(id);
  if (!app) redirect("/");
  for (const q of app.questions) {
    const v = formData.get(`q:${q.id}`);
    if (typeof v === "string" && v.trim() !== (q.answer || "")) {
      q.answer = v.trim() || undefined;
      q.source = v.trim() ? "user" : undefined;
      q.needsHuman = false;
    }
  }
  await saveApplication(app);
  redirect(`/a/${id}?saved=1`);
}

export async function approveAction(formData: FormData) {
  await guard();
  const id = String(formData.get("id"));
  const app = await getApplication(id);
  if (!app || app.status !== "ready") redirect(`/a/${id}`);
  app.status = "approved"; app.approvedAt = new Date().toISOString();
  await saveApplication(app);
  redirect(`/a/${id}`);
}

/** The only path to a real submission. Requires the runner to have filled the form first. */
export async function requestSubmitAction(formData: FormData) {
  await guard();
  const id = String(formData.get("id"));
  const app = await getApplication(id);
  if (!app || app.status !== "filled") redirect(`/a/${id}`);
  app.status = "submit_requested";
  await saveApplication(app);
  redirect(`/a/${id}`);
}

export async function deleteAction(formData: FormData) {
  await guard();
  await deleteApplication(String(formData.get("id")));
  redirect("/");
}
