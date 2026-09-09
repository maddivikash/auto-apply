import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Bell, Bot, LayoutList, ListChecks, UserRound } from "lucide-react";
import { userId } from "@/lib/auth";
import { getProfile, listNotifications } from "@/lib/store";
import { NavLink } from "@/components/nav-link";
import { Brand } from "@/components/brand";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const uid = await userId();
  if (!uid) redirect("/sign-in");
  const [profile, notifications] = await Promise.all([getProfile(uid), listNotifications(uid)]);
  const unread = notifications.filter((n) => !n.read).length;
  const preview = process.env.NODE_ENV !== "production" && !!process.env.DEV_FAKE_USER;
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-card px-4 py-6 md:flex">
        <Link href="/dashboard" className="px-2"><Brand /></Link>
        <nav className="mt-8 flex flex-col gap-1">
          <NavLink href="/dashboard" icon={<LayoutList size={16} />}>Applications</NavLink>
          <NavLink href="/notifications" icon={<Bell size={16} />} badge={unread || undefined}>Notifications</NavLink>
          <div className="mt-4 px-3 pb-1 text-xs font-medium text-muted">You</div>
          <NavLink href="/profile" icon={<UserRound size={16} />} warn={!profile}>Profile</NavLink>
          <NavLink href="/answers" icon={<ListChecks size={16} />}>Answers</NavLink>
          <NavLink href="/runner" icon={<Bot size={16} />}>Runner</NavLink>
        </nav>
        <div className="mt-auto flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-muted">{preview ? <span className="h-7 w-7 rounded-full bg-tint" /> : <UserButton />}<span>Account</span></div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-line bg-card px-4 py-3 md:hidden">
          <Link href="/dashboard"><Brand /></Link>
          <nav className="flex items-center gap-3 text-sm"><Link href="/notifications">Alerts{unread ? ` (${unread})` : ""}</Link><Link href="/profile">Profile</Link><Link href="/answers">Answers</Link>{!preview && <UserButton />}</nav>
        </header>
        {!profile && <div className="border-b border-line bg-signal-soft px-6 py-2.5 text-sm text-signal">Your profile is empty. <Link href="/profile#import" className="font-medium underline">Upload your resume</Link> to start applying.</div>}
        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
      </div>
    </div>
  );
}
