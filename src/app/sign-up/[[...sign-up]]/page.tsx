import { SignUp } from "@clerk/nextjs";
export default function Page() { return <main className="flex min-h-screen items-center justify-center p-6"><SignUp forceRedirectUrl="/profile?welcome=1" /></main>; }
