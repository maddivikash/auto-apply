import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { listApplications } from "@/lib/store";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

/** Everything that has actually gone out: one line per company, newest first. */
export default async function Applied() {
  const uid = await requireUserId();
  const apps = (await listApplications(uid)).filter((a) => a.status === "submitted").sort((a, b) => (b.submittedAt || b.updatedAt).localeCompare(a.submittedAt || a.updatedAt));
  const companies = new Set(apps.map((a) => (a.job?.company || "").toLowerCase()));
  return (
    <div className="space-y-8">
      <PageHeader title="Applied" description={apps.length ? `${apps.length} application${apps.length > 1 ? "s" : ""} submitted to ${companies.size} compan${companies.size > 1 ? "ies" : "y"}.` : "Nothing submitted yet. Submitted applications collect here, one line per company."} />
      {apps.length > 0 && (
        <section className="panel overflow-hidden">
          <table className="w-full text-left text-[13.5px]">
            <thead className="meta"><tr className="border-b border-line"><th className="px-5 py-3 font-normal">Submitted</th><th className="px-5 py-3 font-normal">Company</th><th className="px-5 py-3 font-normal">Role</th><th className="px-5 py-3 font-normal">Board</th><th className="px-5 py-3 font-normal">Resume</th><th className="px-5 py-3" /></tr></thead>
            <tbody className="divide-rows">
              {apps.map((a) => (
                <tr key={a.id}>
                  <td className="meta whitespace-nowrap px-5 py-3">{new Date(a.submittedAt || a.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</td>
                  <td className="px-5 py-3 font-medium">{a.job?.company}</td>
                  <td className="max-w-[360px] truncate px-5 py-3 text-muted"><Link href={`/a/${a.id}`} className="hover:text-fg">{a.job?.title}</Link></td>
                  <td className="meta px-5 py-3 capitalize">{a.job?.board}</td>
                  <td className="meta px-5 py-3">{a.resumeChoice === "full" ? "original" : "tailored"}</td>
                  <td className="px-5 py-3 text-right">{a.job?.applyUrl && <a href={a.job.applyUrl.replace(/#app$/, "")} target="_blank" rel="noreferrer" className="btn-quiet h-7 text-[12px]"><ExternalLink size={12} /> Posting</a>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
