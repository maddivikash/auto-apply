import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth-shell";
export default function Page() {
  return <AuthShell title="Welcome back." body="Pick up where you left off: applications waiting for your Submit, questions waiting for your answers."><SignIn forceRedirectUrl="/dashboard" appearance={{ variables: { colorPrimary: "#16181d", borderRadius: "10px", fontFamily: "var(--font-plex-sans)" } }} /></AuthShell>;
}
