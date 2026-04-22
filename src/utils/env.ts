/**
 * Returns the env var value only if it looks like a real, non-placeholder key.
 * `.env.example` uses strings like `your_openrouter_key_here`, and if the user
 * copies the file without replacing them we must NOT treat them as real keys.
 */
export function realEnv(name: string): string | undefined {
  const v = process.env[name];
  if (!v) return undefined;
  const trimmed = v.trim();
  if (!trimmed) return undefined;
  // Common placeholder patterns we ship in .env.example
  if (/^your[_-].*[_-](key|token|id)[_-]?here$/i.test(trimmed)) return undefined;
  if (/^(changeme|placeholder|todo|xxx+)$/i.test(trimmed)) return undefined;
  return trimmed;
}
