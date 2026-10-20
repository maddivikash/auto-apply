import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { userId } from "@/lib/auth";
import { isAdmin, loadAdminData, type AdminUser, type DayCount, type Failure } from "@/lib/admin";
import { Brand } from "@/components/brand";

export const dynamic = "force-dynamic";

const RANGES = [7, 30, 90];

const n = (v: number) => v.toLocaleString("en-IN");
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");
function when(iso?: string): string {
  if (!iso) return "–";
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400_000);
  if (days === 0) return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) + " today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}
function delta(cur: number, prev: number): { text: string; tone: string } {
  if (!prev && !cur) return { text: "no change", tone: "text-faint" };
  if (!prev) return { text: `+${cur} new`, tone: "text-go" };
  const d = Math.round(((cur - prev) / prev) * 100);
  if (Math.abs(d) < 1) return { text: "flat vs previous", tone: "text-faint" };
  return { text: `${d > 0 ? "+" : ""}${d}% vs previous`, tone: d > 0 ? "text-go" : "text-danger" };
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="panel p-4">
      <div className="eyebrow">{label}</div>
      <div className="mt-1 text-[26px] font-medium leading-none tracking-[-0.03em] tabular-nums">{value}</div>
      {sub && <div className={`mt-1.5 text-[12.5px] ${tone ?? "text-muted"}`}>{sub}</div>}
    </div>
  );
}

/** Daily bars, one hue. Native <title> tooltips carry the exact values. */
function Bars({ points, label }: { points: DayCount[]; label: string }) {
  const W = 640, H = 120, padL = 28, padB = 18, padT = 8;
  const max = Math.max(1, ...points.map((p) => p.value));
  const slot = (W - padL) / points.length;
  const bw = Math.max(2, slot - 2);
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);
  const fmtDay = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
  const total = points.reduce((a, p) => a + p.value, 0);
  const labelIdx = [0, Math.floor(points.length / 2), points.length - 1];
  return (
    <figure className="m-0">
      <figcaption className="mb-1 flex items-baseline justify-between text-[13px]"><span className="font-medium">{label}</span><span className="text-muted tabular-nums">{n(total)} in range</span></figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`${label} per day`}>
        <line x1={padL} x2={W} y1={y(0)} y2={y(0)} stroke="var(--line-strong)" />
        <text x={padL - 6} y={y(max) + 4} textAnchor="end" fontSize="10" fill="var(--muted)">{max}</text>
        <text x={padL - 6} y={y(0) + 4} textAnchor="end" fontSize="10" fill="var(--muted)">0</text>
        {points.map((p, i) => (
          <g key={p.date}>
            <title>{`${fmtDay(p.date)}: ${p.value}`}</title>
            <rect x={padL + i * slot} y={padT} width={slot} height={H - padT - padB} fill="transparent" />
            <rect x={padL + i * slot + 1} y={y(p.value)} width={bw} height={Math.max(p.value ? 1.5 : 0, y(0) - y(p.value))} rx="2" fill="var(--accent)" />
          </g>
        ))}
        {labelIdx.map((i) => (
          <text key={i} x={padL + i * slot + slot / 2} y={H - 4} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize="10" fill="var(--muted)">{fmtDay(points[i].date)}</text>
        ))}
      </svg>
    </figure>
  );
}

function UserRow({ u }: { u: AdminUser }) {
  const stage = u.submitted ? "submitted" : u.applications ? "applying" : u.hasProfile ? "profile" : "signed up";
  const tone = u.submitted ? "bg-go-soft text-go" : u.applications ? "bg-accent-soft text-accent" : u.hasProfile ? "bg-signal-soft text-signal" : "bg-surface-2 text-muted";
  return (
    <tr className="border-t border-line align-top">
      <td className="py-2.5 pr-3">
        <div className="flex items-center gap-2.5">
          {u.imageUrl ? <img src={u.imageUrl} alt="" className="h-7 w-7 rounded-full" /> : <span className="h-7 w-7 rounded-full bg-surface-2" />}
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-medium">{u.name}</div>
            <div className="truncate text-[12px] text-muted">{u.email || u.id}</div>
          </div>
        </div>
      </td>
      <td className="py-2.5 pr-3 text-[12.5px] text-muted whitespace-nowrap">{when(u.createdAt)}</td>
      <td className="py-2.5 pr-3 text-[12.5px] text-muted whitespace-nowrap">{when([u.lastActiveAt, u.lastSignInAt, u.lastActivityAt].filter(Boolean).sort().at(-1))}</td>
      <td className="py-2.5 pr-3"><span className={`inline-block rounded-full px-2 py-0.5 text-[11.5px] font-medium ${tone}`}>{stage}</span></td>
      <td className="py-2.5 pr-3 text-right tabular-nums">{u.applications || "–"}</td>
      <td className="py-2.5 pr-3 text-right tabular-nums">{u.submitted || "–"}</td>
      <td className={`py-2.5 pr-3 text-right tabular-nums ${u.failed ? "text-danger" : ""}`}>{u.failed || "–"}</td>
      <td className="py-2.5 pr-3 text-right tabular-nums text-muted">{u.waiting || "–"}</td>
      <td className="py-2.5 text-[12.5px] text-muted whitespace-nowrap">{u.runnerSeenAt ? `runner ${when(u.runnerSeenAt)}` : u.apiKey ? "settings" : "–"}</td>
    </tr>
  );
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ range?: string; show?: string }> }) {
  if (!(await userId())) redirect("/sign-in");
  if (!(await isAdmin())) notFound();
  const sp = await searchParams;
  const range = RANGES.includes(Number(sp.range)) ? Number(sp.range) : 30;
  const d = await loadAdminData(range);
  const t = d.totals;
  const newD = delta(t.newInRange, t.newPrevious);
  const appD = delta(t.applicationsInRange, t.applicationsPrevious);
  const shown = sp.show === "all" ? d.users : d.users.slice(0, 40);

  return (
    <div className="min-h-screen bg-bg">
      <header className="flex items-center justify-between border-b border-line px-5 py-3 md:px-8">
        <Link href="/dashboard"><Brand /></Link>
        <nav className="flex items-center gap-1 text-[13px]">
          {RANGES.map((r) => (
            <Link key={r} href={`/admin?range=${r}`} className={`rounded-full border px-3 py-1 ${r === range ? "border-fg bg-fg text-bg" : "border-line text-muted"}`} aria-current={r === range ? "page" : undefined}>{r} days</Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-[1280px] px-5 py-8 md:px-8">
        <div className="eyebrow">Admin · Lazy Apply</div>
        <h1 className="mt-1 text-[30px] font-medium leading-tight tracking-[-0.035em]">{n(t.users)} users, {n(t.newInRange)} new in the last {range} days.</h1>
        <p className="mt-1.5 text-[14.5px] text-muted">Signups and sign-ins come from Clerk; everything else from what users did in the app. {d.from} to {d.to}.</p>

        <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile label="New users" value={n(t.newInRange)} sub={newD.text} tone={newD.tone} />
          <Tile label="Active users" value={n(t.activeInRange)} sub={`${pct(t.activeInRange, t.users)} of everyone signed in or did something`} />
          <Tile label="Applications" value={n(t.applicationsInRange)} sub={appD.text} tone={appD.tone} />
          <Tile label="Submitted" value={n(t.submittedInRange)} sub={`${n(t.submitted)} all time`} />
        </section>
        <section className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile label="Failed" value={n(t.failedInRange)} sub={`${n(t.failed)} all time`} tone={t.failedInRange ? "text-danger" : "text-muted"} />
          <Tile label="Success rate" value={t.submittedInRange + t.failedInRange ? pct(t.submittedInRange, t.submittedInRange + t.failedInRange) : "–"} sub="submitted ÷ (submitted + failed), in range" />
          <Tile label="Reached a form" value={pct(t.withApplication, t.users)} sub={`${n(t.withApplication)} users started an application`} />
          <Tile label="Got a job out" value={pct(t.withSubmission, t.users)} sub={`${n(t.withSubmission)} users submitted at least one`} />
        </section>

        <section className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="panel p-4"><Bars points={d.signupsByDay} label="Signups" /></div>
          <div className="panel p-4"><Bars points={d.applicationsByDay} label="Applications started" /></div>
          <div className="panel p-4"><Bars points={d.submittedByDay} label="Applications submitted" /></div>
        </section>

        <section className="mt-3 grid gap-3 md:grid-cols-[2fr_1fr]">
          <div className="panel p-4">
            <div className="text-[13px] font-medium">Where users get to</div>
            <ol className="mt-3 grid gap-2">
              {[
                ["Signed up", t.users],
                ["Uploaded a resume (profile)", t.withProfile],
                ["Started an application", t.withApplication],
                ["Submitted at least one", t.withSubmission]
              ].map(([label, v], i) => (
                <li key={String(label)} className="grid grid-cols-[1fr_auto] items-center gap-3 text-[13px]">
                  <div>
                    <div className="flex items-baseline justify-between"><span>{label}</span><span className="tabular-nums text-muted">{n(Number(v))} · {pct(Number(v), t.users)}</span></div>
                    <div className="mt-1 h-2 overflow-hidden rounded bg-surface-2"><div className="h-full rounded bg-accent" style={{ width: `${t.users ? Math.max(1, (Number(v) / t.users) * 100) : 0}%`, opacity: 1 - i * 0.15 }} /></div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="panel p-4">
            <div className="text-[13px] font-medium">Applications by status</div>
            <ul className="mt-3 grid gap-1.5 text-[13px]">
              {d.statusCounts.length === 0 && <li className="text-muted">None yet.</li>}
              {d.statusCounts.map((s) => (
                <li key={s.status} className="flex items-center justify-between gap-3"><span className="text-muted">{s.status.replace(/_/g, " ")}</span><span className="tabular-nums">{n(s.count)}</span></li>
              ))}
            </ul>
          </div>
        </section>

        <section className="panel mt-3 overflow-x-auto p-4">
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-[13px] font-medium">Users, most recently active first</div>
            {d.users.length > shown.length && <Link href={`/admin?range=${range}&show=all`} className="text-[13px] text-muted underline underline-offset-2">Show all {n(d.users.length)}</Link>}
          </div>
          <table className="mt-3 w-full min-w-[760px] text-[13px]">
            <thead>
              <tr className="text-left text-[11.5px] uppercase tracking-wide text-faint">
                <th className="pb-2 pr-3 font-medium">User</th>
                <th className="pb-2 pr-3 font-medium">Joined</th>
                <th className="pb-2 pr-3 font-medium">Last seen</th>
                <th className="pb-2 pr-3 font-medium">Stage</th>
                <th className="pb-2 pr-3 text-right font-medium">Apps</th>
                <th className="pb-2 pr-3 text-right font-medium">Submitted</th>
                <th className="pb-2 pr-3 text-right font-medium">Failed</th>
                <th className="pb-2 pr-3 text-right font-medium">Waiting</th>
                <th className="pb-2 font-medium">Runner</th>
              </tr>
            </thead>
            <tbody>{shown.map((u) => <UserRow key={u.id} u={u} />)}</tbody>
          </table>
        </section>

        <section className="mt-3 grid gap-3 md:grid-cols-[1fr_1.4fr]">
          <div className="panel p-4">
            <div className="text-[13px] font-medium">Errors, grouped</div>
            <p className="mt-0.5 text-[12px] text-muted">Same message with different ids or numbers counts as one bug.</p>
            <ul className="mt-3 grid gap-2 text-[13px]">
              {d.errorGroups.length === 0 && <li className="text-muted">No failed applications.</li>}
              {d.errorGroups.map((g) => (
                <li key={g.key} className="grid grid-cols-[auto_1fr] gap-x-3 border-t border-line pt-2 first:border-0 first:pt-0">
                  <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[12px] font-medium tabular-nums text-danger">{g.count}×</span>
                  <div className="min-w-0"><div className="break-words font-mono text-[12px] leading-snug">{g.example}</div><div className="mt-0.5 text-[11.5px] text-faint">last {when(g.lastAt)}</div></div>
                </li>
              ))}
            </ul>
          </div>
          <div className="panel overflow-x-auto p-4">
            <div className="text-[13px] font-medium">Recent failures</div>
            <table className="mt-3 w-full min-w-[560px] text-[12.5px]">
              <thead><tr className="text-left text-[11.5px] uppercase tracking-wide text-faint"><th className="pb-2 pr-3 font-medium">When</th><th className="pb-2 pr-3 font-medium">User</th><th className="pb-2 pr-3 font-medium">Job</th><th className="pb-2 font-medium">Error</th></tr></thead>
              <tbody>
                {d.failures.length === 0 && <tr><td colSpan={4} className="py-2 text-muted">None.</td></tr>}
                {d.failures.slice(0, 25).map((f: Failure, i) => (
                  <tr key={i} className="border-t border-line align-top">
                    <td className="py-2 pr-3 whitespace-nowrap text-muted">{when(f.updatedAt)}</td>
                    <td className="py-2 pr-3 max-w-[160px] truncate">{f.user}</td>
                    <td className="py-2 pr-3 max-w-[200px] truncate">{f.url ? <a href={f.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">{f.job || new URL(f.url).hostname}</a> : f.job || "–"}</td>
                    <td className="py-2 font-mono text-[11.5px] leading-snug break-words">{f.error.slice(0, 160)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {d.sprintRequests.length > 0 && (
          <section className="panel mt-3 p-4">
            <div className="text-[13px] font-medium">Sprint requests (paid plan leads)</div>
            <ul className="mt-2 grid gap-1.5 text-[13px]">
              {d.sprintRequests.map((s, i) => (
                <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-3"><span>{s.name} <span className="text-muted">{s.email}</span>{s.country ? <span className="text-faint"> · {s.country}</span> : null}{s.roles ? <span className="text-faint"> · {s.roles}</span> : null}</span><span className="text-muted">{when(s.createdAt)}</span></li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-6 text-[12px] text-faint">Loaded {new Date(d.fetchedAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })} IST. &ldquo;Last seen&rdquo; is the latest of Clerk&apos;s last sign-in, last activity, and the last write to the user&apos;s data.</p>
      </main>
    </div>
  );
}
