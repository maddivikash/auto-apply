import { ClerkLoaded, ClerkLoading, SignUp } from "@clerk/nextjs";
import { AuthCardSkeleton } from "@/components/auth-card-skeleton";
import { AuthShell } from "@/components/auth-shell";
import { ClerkShell } from "@/components/clerk-shell";
import { clerkAppearance } from "@/components/clerk-theme";
export default function Page() {
  return <ClerkShell><AuthShell title="Start with the resume you already have." body="Upload it once. It becomes your profile, the only source of facts for every tailored resume after that."><ClerkLoading><AuthCardSkeleton title="Create your Lazy Apply account" subtitle="Start with the resume you already have." /></ClerkLoading><ClerkLoaded><SignUp forceRedirectUrl="/profile?welcome=1" appearance={clerkAppearance} /></ClerkLoaded></AuthShell></ClerkShell>;
}
