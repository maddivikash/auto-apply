"use client";
import { useState } from "react";
import type { Profile, Role, Project } from "@/lib/profile/types";
import { saveProfileAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

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

  return (
    <form action={saveProfileAction} className="space-y-6">
      <input type="hidden" name="profile" value={JSON.stringify(p)} readOnly />
      <Section title="Contact">
        <div className="grid gap-3 md:grid-cols-2">
          {(["name", "email", "phone", "location", "linkedin", "github", "website"] as const).map((k) => (
            <label key={k} className="text-sm"><span className="text-muted">{k[0].toUpperCase() + k.slice(1)}</span><input className="field mt-1" value={p[k]} onChange={(e) => set(k, e.target.value)} /></label>
          ))}
        </div>
      </Section>
      <Section title="Education">
        {p.education.map((e, i) => (
          <div key={i} className="grid gap-3 md:grid-cols-2">
            {(["school", "place", "degree", "dates", "gpa"] as const).map((k) => (
              <label key={k} className="text-sm"><span className="text-muted">{k[0].toUpperCase() + k.slice(1)}</span><input className="field mt-1" value={e[k]} onChange={(ev) => set("education", p.education.map((x, j) => (j === i ? { ...x, [k]: ev.target.value } : x)))} /></label>
            ))}
          </div>
        ))}
      </Section>
      <Section title="Experience" hint="One bullet per line. Keep the numbers exactly as they happened; the tailoring step is only allowed to reuse them.">
        {p.roles.map((r, i) => (
          <div key={i} className="rounded-lg border border-line p-4">
            <div className="grid gap-3 md:grid-cols-4">
              {(["company", "title", "start", "end"] as const).map((k) => <label key={k} className="text-sm"><span className="text-muted">{k[0].toUpperCase() + k.slice(1)}</span><input className="field mt-1" value={r[k]} onChange={(e) => setRole(i, { [k]: e.target.value })} /></label>)}
            </div>
            <textarea className="field mt-3 font-mono text-xs leading-relaxed" rows={Math.max(4, r.bullets.length + 1)} defaultValue={roleBullets(r)} onBlur={(e) => setRole(i, { bullets: parseRoleBullets(e.target.value, r) })} />
            <div className="mt-2 flex justify-between text-xs text-muted"><span>{r.bullets.length} bullets</span><button type="button" className="hover:text-danger" onClick={() => set("roles", p.roles.filter((_, j) => j !== i))}>Remove role</button></div>
          </div>
        ))}
        <button type="button" className="btn-ghost" onClick={() => set("roles", [...p.roles, { company: "", title: "", start: "", end: "", bullets: [{ id: "b0", tags: [], text: "" }] }])}>Add a role</button>
      </Section>
      <Section title="Projects">
        {p.projects.map((pr, i) => (
          <div key={i} className="rounded-lg border border-line p-4">
            <div className="grid gap-3 md:grid-cols-3">
              {(["name", "stack", "year"] as const).map((k) => <label key={k} className="text-sm"><span className="text-muted">{k[0].toUpperCase() + k.slice(1)}</span><input className="field mt-1" value={pr[k]} onChange={(e) => setProject(i, { [k]: e.target.value })} /></label>)}
            </div>
            <textarea className="field mt-3 font-mono text-xs leading-relaxed" rows={3} defaultValue={lines(pr.bullets)} onBlur={(e) => setProject(i, { bullets: unlines(e.target.value) })} />
            <div className="mt-2 text-right text-xs"><button type="button" className="text-muted hover:text-danger" onClick={() => set("projects", p.projects.filter((_, j) => j !== i))}>Remove project</button></div>
          </div>
        ))}
        <button type="button" className="btn-ghost" onClick={() => set("projects", [...p.projects, { name: "", stack: "", year: "", tags: [], bullets: [""] }])}>Add a project</button>
      </Section>
      <Section title="Skills" hint="One group per line as Group: item, item, item.">
        <textarea className="field font-mono text-xs leading-relaxed" rows={Math.max(4, Object.keys(p.skills).length + 1)} defaultValue={Object.entries(p.skills).map(([k, v]) => `${k}: ${v.join(", ")}`).join("\n")} onBlur={(e) => set("skills", Object.fromEntries(unlines(e.target.value).map((l) => { const [k, ...rest] = l.split(":"); return [k.trim(), rest.join(":").split(",").map((x) => x.trim()).filter(Boolean)]; }).filter(([k, v]) => k && (v as string[]).length)))} />
      </Section>
      <Section title="Achievements and coursework" hint="One per line.">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm"><span className="text-muted">Achievements</span><textarea className="field mt-1 text-xs" rows={4} defaultValue={lines(p.achievements)} onBlur={(e) => set("achievements", unlines(e.target.value))} /></label>
          <label className="text-sm"><span className="text-muted">Coursework</span><textarea className="field mt-1 text-xs" rows={4} defaultValue={lines(p.coursework)} onBlur={(e) => set("coursework", unlines(e.target.value))} /></label>
        </div>
      </Section>
      <div className="flex justify-end"><SubmitButton pending="Saving...">Save profile</SubmitButton></div>
    </form>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return <section className="panel space-y-4 p-5"><div><h2 className="font-medium">{title}</h2>{hint && <p className="mt-1 text-xs text-muted">{hint}</p>}</div>{children}</section>;
}
