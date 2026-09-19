import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Bell, Bot, LayoutList, ListChecks, Plug, UserRound } from "lucide-react";
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
  const account = preview ? <span className="h-7 w-7 rounded-full bg-surface-2" /> : <UserButton appearance={{ elements: { avatarBox: "h-7 w-7" } }} />;
  return (
    <div className="relative flex min-h-screen bg-bg">
      <div className="topline pointer-events-none absolute inset-x-0 top-0 z-20" aria-hidden />
      <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col border-r border-line bg-surface px-4 py-5 md:flex">
        <Link href="/dashboard" className="w-fit px-1.5 py-1"><Brand /></Link>
        <nav className="mt-7 flex flex-col gap-0.5">
          <NavLink href="/dashboard" icon={<LayoutList size={16} />}>Applications</NavLink>
          <NavLink href="/notifications" icon={<Bell size={16} />} badge={unread || undefined}>Notifications</NavLink>
          <div className="mt-5 px-2.5 pb-1.5 text-[11.5px] font-medium text-faint">About you</div>
          <NavLink href="/profile" icon={<UserRound size={16} />} warn={!profile}>Profile</NavLink>
          <NavLink href="/answers" icon={<ListChecks size={16} />}>Answers</NavLink>
          <NavLink href="/runner" icon={<Bot size={16} />}>Runner</NavLink>
          <NavLink href="/connect" icon={<Plug size={16} />}>Connect</NavLink>
        </nav>
        <div className="mt-auto flex items-center gap-3 rounded-[var(--radius-ctl)] px-2 py-2 text-[13px] text-muted">{account}<span>Account</span></div>
      </aside>
      <div className="relative min-w-0 flex-1">
        <div className="grid-fade pointer-events-none absolute inset-x-0 top-0 h-[60vh] opacity-60" aria-hidden />
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface/90 px-4 py-3 backdrop-blur md:hidden">
          <Link href="/dashboard"><Brand /></Link>
          <nav className="flex items-center gap-4 text-[13px]"><Link href="/notifications" className="text-muted">Alerts{unread ? ` (${unread})` : ""}</Link><Link href="/profile" className="text-muted">Profile</Link><Link href="/answers" className="text-muted">Answers</Link>{account}</nav>
        </header>
        {!profile && <div className="border-b border-line bg-signal-soft px-6 py-2.5 text-[13.5px] text-signal">Your profile is empty. <Link href="/profile#import" className="font-medium underline underline-offset-2">Upload your resume</Link> to start applying.</div>}
        <main className="relative mx-auto max-w-[1080px] px-5 py-8 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}
