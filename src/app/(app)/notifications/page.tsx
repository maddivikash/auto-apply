import Link from "next/link";
import { requireUserId } from "@/lib/auth";
import { listNotifications } from "@/lib/store";
import { markAllReadAction } from "../../actions";
import { PageHeader } from "@/components/page-header";

export const dynamic = "force-dynamic";
const TONE: Record<string, string> = { ready: "bg-go", needs_details: "bg-signal", filled: "bg-signal", submitted: "bg-go", failed: "bg-danger", unsupported: "bg-danger", info: "bg-muted" };

export default async function NotificationsPage() {
  const uid = await requireUserId();
  const list = await listNotifications(uid);
  return (
    <div className="space-y-8">
      <PageHeader title="Notifications" description="Resume ready, details needed, form filled, submitted. The same events also reach your email." actions={list.some((n) => !n.read) ? <form action={markAllReadAction}><button className="btn-ghost">Mark all read</button></form> : undefined} />
      {list.length === 0 ? <div className="panel px-6 py-14 text-center text-[13.5px] text-muted">Nothing yet. Resume-ready, filled and submitted events show up here and in your email.</div> : (
        <ul className="panel divide-rows overflow-hidden">
          {list.map((n) => (
            <li key={n.id} className={`flex gap-4 px-5 py-4 ${n.read ? "" : "bg-accent-soft/40"}`}>
              <span className={`mt-[7px] h-2 w-2 shrink-0 rounded-full ${TONE[n.kind]}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3"><span className={`text-[14px] ${n.read ? "" : "font-medium"}`}>{n.title}</span><time className="shrink-0 text-[12px] text-faint">{new Date(n.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time></div>
                {n.body && <p className="mt-0.5 text-[13px] text-muted">{n.body}</p>}
                {n.applicationId && <Link href={`/a/${n.applicationId}`} className="mt-1.5 inline-block text-[13px] text-accent hover:underline">Open application</Link>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
