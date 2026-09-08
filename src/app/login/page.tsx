import { loginAction } from "../actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto mt-24 max-w-sm">
      <h1 className="text-2xl font-semibold">Auto Apply</h1>
      <p className="mt-1 text-sm text-neutral-600">Enter the app password.</p>
      <form action={loginAction} className="mt-6 space-y-3">
        <input name="password" type="password" autoFocus placeholder="Password" className="w-full rounded-md border border-neutral-300 px-3 py-2" />
        {error && <p className="text-sm text-red-600">Wrong password.</p>}
        <button className="w-full rounded-md bg-neutral-900 px-3 py-2 text-white">Sign in</button>
      </form>
    </main>
  );
}
