import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth-shell";
import { clerkAppearance } from "@/components/clerk-theme";
export default function Page() {
  return <AuthShell title="Start with the resume you already have." body="Upload it once. It becomes your profile, the only source of facts for every tailored resume after that."><SignUp forceRedirectUrl="/profile?welcome=1" appearance={clerkAppearance} /></AuthShell>;
}
