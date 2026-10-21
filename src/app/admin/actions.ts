"use server";

import { redirect } from "next/navigation";
import { userEmail } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { sendTestEmail } from "@/lib/email";

/** Sends one test email to the signed-in admin and shows the result on the admin page. */
export async function sendTestEmailAction(formData: FormData) {
  if (!(await isAdmin())) redirect("/admin");
  const to = await userEmail();
  const range = String(formData.get("range") || "30");
  const result = to ? await sendTestEmail(to) : { ok: false as const, error: "No email on your account." };
  const q = new URLSearchParams({ range, test: result.ok ? `sent:${to}` : `error:${result.error}` });
  redirect(`/admin?${q}`);
}
