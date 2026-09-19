"use client";
import { useState } from "react";
import type { Profile, Role, Project } from "@/lib/profile/types";
import { saveProfileAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];
const lines = (a: string[]) => a.join("\n");
const unlines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

/** Structured editor. Bullets are one per line, which is how people already write resumes. */
export function ProfileEditor({ initial }: { initial: Profile }) {
  const [p, setP] = useState<Profile>(initial);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP({ ...p, [k]: v });
  const setRole = (i: number, patch: Partial<Role>) => set("roles", p.roles.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const setProject = (i: number, patch: Partial<Project>) => set("projects", p.projects.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const roleBullets = (r: Role) => lines(r.bullets.map((b) => b.text));
  const parseRoleBullets = (s: string, r: Role) => unlines(s).map((text, i) => ({ id: r.bullets[i]?.id || `b${i}`, tags: r.bullets[i]?.tags || [], text }));

  const sections = [
    ["contact", "Contact", 7],
    ["education", "Education", p.education.length],
    ["experience", "Experience", p.roles.reduce((n, r) => n + r.bullets.length, 0)],
    ["projects", "Projects", p.projects.length],
    ["skills", "Skills", Object.keys(p.skills).length],
    ["more", "Achievements and coursework", p.achievements.length + p.coursework.length]
  ] as const;
  type SectionId = (typeof sections)[number][0];
  const [tab, setTab] = useState<SectionId>("contact");
  const show = (id: SectionId) => (tab === id ? "" : "hidden");

  return (
    <form action={saveProfileAction} className="grid gap-5 lg:grid-cols-[200px_1fr] lg:items-start">
      <input type="hidden" name="profile" value={JSON.stringify(p)} readOnly />
      <nav aria-label="Profile sections" className="-mx-5 flex gap-1 overflow-x-auto px-5 lg:sticky lg:top-8 lg:mx-0 lg:flex-col lg:px-0">
        {sections.map(([id, label, count]) => (
          <button key={id} type="button" onClick={() => setTab(id)} aria-current={tab === id ? "page" : undefined} className={`flex shrink-0 items-center justify-between gap-3 rounded-[var(--radius-ctl)] px-3 py-2 text-left text-[13.5px] transition-colors ${tab === id ? "bg-surface-2 font-medium text-fg" : "text-muted hover:bg-surface-2/60 hover:text-fg"}`}>
            <span>{label}</span><span className="tabular-nums text-[12px] text-faint">{count}</span>
          </button>
        ))}
      </nav>
      <div className="min-w-0 space-y-5">
      <Section title="Contact" className={show("contact")}>
        <div className="grid gap-3 md:grid-cols-2">
          {(["name", "email", "phone", "location", "linkedin", "github", "website"] as const).map((k) => (
            <label key={k} className="text-[13px]"><span className="text-muted">{k[0].toUpperCase() + k.slice(1)}</span><input className="field mt-1.5" value={p[k]} onChange={(e) => set(k, e.target.value)} /></label>
          ))}
          <label className="text-[13px]"><span className="text-muted">Gender <span className="text-danger">required</span></span>
            <select className="field mt-1.5" required value={p.gender} onChange={(e) => set("gender", e.target.value)}>
              <option value="">Choose</option>
              {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <span className="mt-1 block text-[12px] text-faint">Only used for the voluntary demographic question on forms. "Prefer not to say" picks the decline option.</span>
          </label>
        </div>
      </Section>
      <Section title="Education" className={show("education")}>
        {p.education.map((e, i) => (
          <div key={i} className="grid gap-3 md:grid-cols-2">
            {(["school", "place", "degree", "dates", "gpa"] as const).map((k) => (
              <label key={k} className="text-[13px]"><span className="text-muted">{k[0].toUpperCase() + k.slice(1)}</span><input className="field mt-1.5" value={e[k]} onChange={(ev) => set("education", p.education.map((x, j) => (j === i ? { ...x, [k]: ev.target.value } : x)))} /></label>
            ))}
          </div>
        ))}
      </Section>
      <Section title="Experience" className={show("experience")} hint="One bullet per line. Keep the numbers exactly as they happened; the tailoring step is only allowed to reuse them.">
        {p.roles.map((r, i) => (
          <div key={i} className="rounded-[var(--radius-ctl)] border border-line bg-surface-2/40 p-4">
            <div className="grid gap-3 md:grid-cols-4">
              {(["company", "title", "start", "end"] as const).map((k) => <label key={k} className="text-[13px]"><span className="text-muted">{k[0].toUpperCase() + k.slice(1)}</span><input className="field mt-1.5" value={r[k]} onChange={(e) => setRole(i, { [k]: e.target.value })} /></label>)}
            </div>
            <textarea className="field mono mt-3 text-[12.5px] leading-relaxed" rows={Math.max(4, r.bullets.length + 1)} defaultValue={roleBullets(r)} onBlur={(e) => setRole(i, { bullets: parseRoleBullets(e.target.value, r) })} />
            <div className="mt-2 flex justify-between text-[12px] text-muted"><span>{r.bullets.length} bullets</span><button type="button" className="hover:text-danger" onClick={() => set("roles", p.roles.filter((_, j) => j !== i))}>Remove role</button></div>
          </div>
        ))}
        <button type="button" className="btn-ghost" onClick={() => set("roles", [...p.roles, { company: "", title: "", start: "", end: "", bullets: [{ id: "b0", tags: [], text: "" }] }])}>Add a role</button>
      </Section>
      <Section title="Projects" className={show("projects")}>
        {p.projects.map((pr, i) => (
          <div key={i} className="rounded-[var(--radius-ctl)] border border-line bg-surface-2/40 p-4">
            <div className="grid gap-3 md:grid-cols-3">
              {(["name", "stack", "year"] as const).map((k) => <label key={k} className="text-[13px]"><span className="text-muted">{k[0].toUpperCase() + k.slice(1)}</span><input className="field mt-1.5" value={pr[k]} onChange={(e) => setProject(i, { [k]: e.target.value })} /></label>)}
            </div>
            <textarea className="field mono mt-3 text-[12.5px] leading-relaxed" rows={3} defaultValue={lines(pr.bullets)} onBlur={(e) => setProject(i, { bullets: unlines(e.target.value) })} />
            <div className="mt-2 text-right text-[12px]"><button type="button" className="text-muted hover:text-danger" onClick={() => set("projects", p.projects.filter((_, j) => j !== i))}>Remove project</button></div>
          </div>
        ))}
        <button type="button" className="btn-ghost" onClick={() => set("projects", [...p.projects, { name: "", stack: "", year: "", tags: [], bullets: [""] }])}>Add a project</button>
      </Section>
      <Section title="Skills" className={show("skills")} hint="One group per line as Group: item, item, item.">
        <textarea className="field mono text-[12.5px] leading-relaxed" rows={Math.max(4, Object.keys(p.skills).length + 1)} defaultValue={Object.entries(p.skills).map(([k, v]) => `${k}: ${v.join(", ")}`).join("\n")} onBlur={(e) => set("skills", Object.fromEntries(unlines(e.target.value).map((l) => { const [k, ...rest] = l.split(":"); return [k.trim(), rest.join(":").split(",").map((x) => x.trim()).filter(Boolean)]; }).filter(([k, v]) => k && (v as string[]).length)))} />
      </Section>
      <Section title="Achievements and coursework" className={show("more")} hint="One per line.">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-[13px]"><span className="text-muted">Achievements</span><textarea className="field mt-1.5 text-[12.5px]" rows={4} defaultValue={lines(p.achievements)} onBlur={(e) => set("achievements", unlines(e.target.value))} /></label>
          <label className="text-[13px]"><span className="text-muted">Coursework</span><textarea className="field mt-1.5 text-[12.5px]" rows={4} defaultValue={lines(p.coursework)} onBlur={(e) => set("coursework", unlines(e.target.value))} /></label>
        </div>
      </Section>
      <div className="sticky bottom-4 flex items-center justify-end gap-3"><span className="text-[12.5px] text-muted">Saves every section, not just the one open.</span><SubmitButton pending="Saving" className="btn-primary lift">Save profile</SubmitButton></div>
      </div>
    </form>
  );
}

function Section({ title, hint, className = "", children }: { title: string; hint?: string; className?: string; children: React.ReactNode }) {
  return <section className={`panel p-5 md:p-6 ${className}`}><div><h2 className="text-[15px] font-semibold">{title}</h2>{hint && <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{hint}</p>}</div><div className="mt-5 space-y-4">{children}</div></section>;
}
