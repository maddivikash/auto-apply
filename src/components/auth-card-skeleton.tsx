/**
 * Stand-in for Clerk's sign-in and sign-up card while Clerk's script loads from its own domain,
 * so the right half of the page is never empty. Same size and layout as the real card.
 */
export function AuthCardSkeleton({ title, subtitle }: { title: string; subtitle: string }) {
  const bar = "rounded-[8px] bg-surface-2";
  return (
    <div className="w-full max-w-[400px] overflow-hidden rounded-[16px] bg-surface shadow-[var(--ring)]" aria-busy="true" aria-label="Loading sign in">
      <div className="px-10 pb-8 pt-9 text-center">
        <div className="text-[17px] font-semibold">{title}</div>
        <div className="mt-1 text-[13px] text-muted">{subtitle}</div>
        <div className="mt-7 flex h-10 items-center justify-center gap-2 rounded-[10px] text-[13.5px] text-muted shadow-[0_0_0_1px_var(--line-strong)]">
          <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
          Continue with Google
        </div>
        <div className="my-6 flex items-center gap-3 text-[12px] text-faint"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
        <div className="text-left text-[13px] font-medium">Email address</div>
        <div className={`mt-2 h-10 ${bar} animate-pulse`} />
        <div className="mt-5 h-10 animate-pulse rounded-[10px] bg-accent/70" />
      </div>
      <div className="border-t border-line bg-bg/60 py-4 text-center text-[13px] text-muted"><span className={`inline-block h-3 w-44 align-middle ${bar} animate-pulse`} /></div>
    </div>
  );
}
