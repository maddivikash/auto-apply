import Link from "next/link";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { summarize } from "@/lib/stats";
import { requireUserId } from "@/lib/auth";
import { listApplications } from "@/lib/store";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";

/** Everything that has actually gone out: one line per company, newest first. */
export default async function Applied() {
  const uid = await requireUserId();
  const all = await listApplications(uid);
  const s = summarize(all);
  const apps = all.filter((a) => a.status === "submitted").sort((a, b) => (b.submittedAt || b.updatedAt).localeCompare(a.submittedAt || a.updatedAt));
  const companies = new Set(apps.map((a) => (a.job?.company || "").toLowerCase()));
  return (
    <div className="space-y-8">
      <PageHeader title="Applied" description={apps.length ? `${apps.length} application${apps.length > 1 ? "s" : ""} submitted to ${companies.size} compan${companies.size > 1 ? "ies" : "y"}.` : "Everything you have sent, one line per company."} />
      {apps.length === 0 && (
        <EmptyState icon={<CheckCircle2 size={26} />} title={s.total ? "Nothing submitted yet" : "Your first submission lands here"}
          body={s.total ? "An application moves here the moment you press Submit on it. These are on their way:" : "Prepare an application from Discover or by pasting a job link. Once you approve it and press Submit, it is listed here with the date and the resume you sent."}
          steps={[
            { label: "Waiting for your Submit", count: s.awaitingSubmit, href: "/dashboard", tone: "signal" },
            { label: "Ready to approve", count: s.readyToApprove, href: "/dashboard", tone: "go" },
            { label: "Need your answers", count: s.needsDetails, href: "/dashboard", tone: "signal" },
            { label: "Being prepared or filled", count: s.inProgress, href: "/dashboard", tone: "accent" }
          ]}
          primary={s.total ? { href: "/dashboard", label: "Go to applications" } : { href: "/discover", label: "Find roles" }}
          secondary={s.total ? { href: "/discover", label: "Find more roles" } : { href: "/dashboard", label: "Paste a job link" }} />
      )}
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
