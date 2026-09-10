import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth-shell";
import { clerkAppearance } from "@/components/clerk-theme";
export default function Page() {
  return <AuthShell title="Welcome back." body="Pick up where you left off: applications waiting for your Submit, questions waiting for your answers."><SignIn forceRedirectUrl="/dashboard" appearance={clerkAppearance} /></AuthShell>;
}
