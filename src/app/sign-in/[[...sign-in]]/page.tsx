import { ClerkLoaded, ClerkLoading, SignIn } from "@clerk/nextjs";
import { AuthCardSkeleton } from "@/components/auth-card-skeleton";
import { AuthShell } from "@/components/auth-shell";
import { ClerkShell } from "@/components/clerk-shell";
import { clerkAppearance } from "@/components/clerk-theme";
export default function Page() {
  return <ClerkShell><AuthShell title="Welcome back." body="Pick up where you left off: applications waiting for your Submit, questions waiting for your answers."><ClerkLoading><AuthCardSkeleton title="Sign in to Lazy Apply" subtitle="Welcome back. Pick up where you left off." /></ClerkLoading><ClerkLoaded><SignIn forceRedirectUrl="/dashboard" appearance={clerkAppearance} /></ClerkLoaded></AuthShell></ClerkShell>;
}
