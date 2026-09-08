/** Central place for env access so a missing variable fails loudly with its name. */
export function env(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") throw new Error(`Missing env var ${name}`);
  return v;
}
export const isVercel = !!process.env.VERCEL;
