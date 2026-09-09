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
    <div className="space-y-6">
      <PageHeader title="Notifications" description="Resume ready, details needed, form filled, submitted. The same events also reach your email." actions={list.some((n) => !n.read) ? <form action={markAllReadAction}><button className="btn-ghost">Mark all read</button></form> : undefined} />
      {list.length === 0 ? <div className="panel px-6 py-14 text-center text-sm text-muted">Nothing yet. You will see resume-ready, filled and submitted events here, and by email.</div> : (
        <ul className="panel divide-y divide-line">
          {list.map((n) => (
            <li key={n.id} className={`flex gap-4 px-5 py-4 ${n.read ? "" : "bg-tint/40"}`}>
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${TONE[n.kind]}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3"><span className="font-medium">{n.title}</span><time className="shrink-0 text-xs text-muted">{new Date(n.createdAt).toLocaleString()}</time></div>
                {n.body && <p className="mt-0.5 text-sm text-muted">{n.body}</p>}
                {n.applicationId && <Link href={`/a/${n.applicationId}`} className="mt-1 inline-block text-sm underline">Open application</Link>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
