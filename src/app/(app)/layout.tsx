import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { userId } from "@/lib/auth";
import { getProfile, listNotifications } from "@/lib/store";
import { NavLink } from "@/components/nav-link";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const uid = await userId();
  if (!uid) redirect("/sign-in");
  const [profile, notifications] = await Promise.all([getProfile(uid), listNotifications(uid)]);
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-card px-4 py-6 md:flex">
        <Link href="/dashboard" className="serif px-2 text-xl">Auto Apply</Link>
        <nav className="mt-8 flex flex-col gap-1 text-sm">
          <NavLink href="/dashboard">Applications</NavLink>
          <NavLink href="/notifications" badge={unread || undefined}>Notifications</NavLink>
          <NavLink href="/profile" warn={!profile}>Profile</NavLink>
          <NavLink href="/answers">Answers</NavLink>
          <NavLink href="/runner">Runner</NavLink>
        </nav>
        <div className="mt-auto flex items-center gap-3 px-2 text-sm text-muted"><UserButton /><span>Account</span></div>
      </aside>
      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-line bg-card px-4 py-3 md:hidden">
          <Link href="/dashboard" className="serif text-lg">Auto Apply</Link>
          <nav className="flex gap-3 text-sm"><Link href="/notifications">Alerts{unread ? ` (${unread})` : ""}</Link><Link href="/profile">Profile</Link><Link href="/answers">Answers</Link><Link href="/runner">Runner</Link><UserButton /></nav>
        </header>
        {!profile && <div className="border-b border-line bg-signal-soft px-6 py-2 text-sm text-signal">No profile yet. <Link href="/profile" className="underline">Upload your resume</Link> before pasting a job link.</div>}
        <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
