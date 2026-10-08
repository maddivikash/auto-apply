import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Bell, Bot, CheckCircle2, LayoutList, LayoutTemplate, ListChecks, Plug, Search, UserRound } from "lucide-react";
import { userId } from "@/lib/auth";
import { getProfile, getSettings, listApplications, listNotifications } from "@/lib/store";
import { FREE_APPLICATIONS, PLANS } from "@/lib/plans";
import { PlanOffer } from "@/components/plan-offer";
import { dismissPlanOfferAction } from "../actions";
import { NavLink } from "@/components/nav-link";
import { Brand } from "@/components/brand";
import { HideOn } from "@/components/hide-on";
import { ClerkShell } from "@/components/clerk-shell";
import { after } from "next/server";
import { scrubSamplePhone } from "@/lib/scrub-sample-phone";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const uid = await userId();
  if (!uid) redirect("/sign-in");
  // Removes the old sample number from the account if it is still there; runs after the response, once.
  after(() => scrubSamplePhone(uid).catch((e) => console.error("phone scrub failed", e)));
  const preview = process.env.NODE_ENV !== "production" && !!process.env.DEV_FAKE_USER;
  const account = preview ? <span className="h-7 w-7 rounded-full bg-surface-2" /> : <UserButton appearance={{ elements: { avatarBox: "h-7 w-7" } }} />;
  return (
    <ClerkShell>
    <div className="relative flex min-h-screen bg-bg animate-[fade-in_0.35s_ease-out_both]">
      <Suspense fallback={null}><PlanOfferGate uid={uid} /></Suspense>
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-r border-line bg-bg px-4 py-5 md:flex">
        <Link href="/dashboard" className="w-fit px-1.5 py-1"><Brand /></Link>
        <nav className="mt-7 flex flex-col gap-0.5">
          <NavLink href="/dashboard" icon={<LayoutList size={16} />}>Applications</NavLink>
          <NavLink href="/discover" icon={<Search size={16} />}>Discover</NavLink>
          <NavLink href="/applied" icon={<CheckCircle2 size={16} />}>Applied</NavLink>
          <NavLink href="/templates" icon={<LayoutTemplate size={16} />}>Templates</NavLink>
          <Suspense fallback={<NavLink href="/notifications" icon={<Bell size={16} />}>Notifications</NavLink>}><NotificationsLink uid={uid} /></Suspense>
          <div className="eyebrow mt-6 px-2.5 pb-1.5 !text-faint">About you</div>
          <Suspense fallback={<NavLink href="/profile" icon={<UserRound size={16} />}>Profile</NavLink>}><ProfileLink uid={uid} /></Suspense>
          <NavLink href="/answers" icon={<ListChecks size={16} />}>Answers</NavLink>
          <NavLink href="/runner" icon={<Bot size={16} />}>Runner</NavLink>
          <NavLink href="/connect" icon={<Plug size={16} />}>Connect</NavLink>
        </nav>
        <div className="mt-auto flex items-center gap-3 rounded-[var(--radius-ctl)] px-2 py-2 text-[13px] text-muted">{account}<span>Account</span></div>
      </aside>
      <div className="relative min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-3 backdrop-blur md:hidden">
          <Link href="/dashboard"><Brand /></Link>
          <nav className="flex items-center gap-4 text-[13px]"><Link href="/notifications" className="text-muted">Alerts<Suspense fallback={null}><UnreadCount uid={uid} /></Suspense></Link><Link href="/profile" className="text-muted">Profile</Link><Link href="/answers" className="text-muted">Answers</Link>{account}</nav>
        </header>
        <Suspense fallback={null}><ResumeBanner uid={uid} /></Suspense>
        <main className="relative mx-auto max-w-[1280px] px-5 py-8 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
    </ClerkShell>
  );
}

// The shell above renders at once; these read the database and stream in when ready.
async function NotificationsLink({ uid }: { uid: string }) {
  const unread = (await listNotifications(uid)).filter((n) => !n.read).length;
  return <NavLink href="/notifications" icon={<Bell size={16} />} badge={unread || undefined}>Notifications</NavLink>;
}
async function UnreadCount({ uid }: { uid: string }) {
  const unread = (await listNotifications(uid)).filter((n) => !n.read).length;
  return unread ? <> ({unread})</> : null;
}
async function ProfileLink({ uid }: { uid: string }) {
  return <NavLink href="/profile" icon={<UserRound size={16} />} warn={!(await getProfile(uid))}>Profile</NavLink>;
}
async function ResumeBanner({ uid }: { uid: string }) {
  if (await getProfile(uid)) return null;
  return (
    <HideOn path="/profile">
      <div className="relative mx-auto mt-6 max-w-[1280px] px-5 md:px-8">
        <div className="panel flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between md:px-5">
          <div className="flex items-start gap-3">
            <span className="mt-[5px] h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden />
            <div><div className="text-[14px] font-medium">Start with your resume</div><p className="mt-0.5 text-[13px] text-muted">Upload the PDF you already have. It becomes your profile, and every tailored resume after that is written only from what it contains.</p></div>
          </div>
          <Link href="/profile#import" className="btn-primary h-9 shrink-0">Upload resume</Link>
        </div>
      </div>
    </HideOn>
  );
}

/**
 * The paid plan is offered only after the free applications have actually gone out. Streams in, so it
 * never delays the page; the full application list is read only once the offer is still unseen.
 */
async function PlanOfferGate({ uid }: { uid: string }) {
  const settings = await getSettings(uid);
  if (settings?.planOfferSeenAt) return null;
  const apps = await listApplications(uid);
  if (apps.filter((a) => a.status === "submitted").length < FREE_APPLICATIONS) return null;
  return <PlanOffer plans={PLANS} dismiss={dismissPlanOfferAction} />;
}
