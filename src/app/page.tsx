import Link from "next/link";
import { redirect } from "next/navigation";
import { authorized } from "@/lib/auth";
import { listApplications } from "@/lib/store";
import { createApplicationAction, logoutAction } from "./actions";
import { StatusBadge } from "./status-badge";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!(await authorized())) redirect("/login");
  const { error } = await searchParams;
  const apps = await listApplications();
  return (
    <main>
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Auto Apply</h1>
          <p className="text-sm text-neutral-600">Paste a Greenhouse, Lever or Ashby job link. You get a tailored resume and an email with anything I can't answer for you.</p>
        </div>
        <form action={logoutAction}><button className="text-sm text-neutral-500 hover:text-neutral-900">Sign out</button></form>
      </header>

      <form action={createApplicationAction} className="mt-6 flex gap-2">
        <input name="url" type="url" required placeholder="https://job-boards.greenhouse.io/company/jobs/123456" className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2" />
        <button className="rounded-md bg-neutral-900 px-4 py-2 text-white">Start</button>
      </form>
      {error === "url" && <p className="mt-2 text-sm text-red-600">That does not look like a URL.</p>}

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Applications</h2>
        {apps.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">Nothing yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {apps.map((a) => (
              <li key={a.id}>
                <Link href={`/a/${a.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-neutral-50">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{a.job ? `${a.job.company}: ${a.job.title}` : a.url}</div>
                    <div className="truncate text-xs text-neutral-500">{a.job?.location || a.url} · {new Date(a.createdAt).toLocaleString()}</div>
                  </div>
                  <StatusBadge status={a.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
