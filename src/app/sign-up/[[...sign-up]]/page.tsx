import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth-shell";
export default function Page() {
  return <AuthShell title="Start with the resume you already have." body="Upload it once. It becomes your profile, the only source of facts for every tailored resume after that."><SignUp forceRedirectUrl="/profile?welcome=1" appearance={{ variables: { colorPrimary: "#16181d", borderRadius: "10px", fontFamily: "var(--font-plex-sans)" } }} /></AuthShell>;
}
