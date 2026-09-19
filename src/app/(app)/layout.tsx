import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Bell, Bot, CheckCircle2, LayoutList, ListChecks, Plug, Search, UserRound } from "lucide-react";
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
          <NavLink href="/discover" icon={<Search size={16} />}>Discover</NavLink>
          <NavLink href="/applied" icon={<CheckCircle2 size={16} />}>Applied</NavLink>
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
        {!profile && (
          <div className="relative mx-auto mt-6 max-w-[1080px] px-5 md:px-8">
            <div className="flex flex-col gap-3 border border-line-strong bg-surface p-4 md:flex-row md:items-center md:justify-between md:px-5">
              <div className="flex items-start gap-3">
                <span className="mt-[3px] h-2 w-2 shrink-0 bg-accent" aria-hidden />
                <div><div className="text-[14px] font-medium">Start with your resume</div><p className="mt-0.5 text-[13px] text-muted">Upload the PDF you already have. It becomes your profile, and every tailored resume after that is written only from what it contains.</p></div>
              </div>
              <Link href="/profile#import" className="btn-primary h-9 shrink-0">Upload resume</Link>
            </div>
          </div>
        )}
        <main className="relative mx-auto max-w-[1080px] px-5 py-8 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}
