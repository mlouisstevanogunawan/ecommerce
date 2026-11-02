// Fail-fast accessors for Supabase configuration.
// A missing or placeholder value is a deployment error, not a runtime state to
// fall back from: silently continuing with a dummy client is what let fake data
// masquerade as a successful database read.

const PLACEHOLDER_MARKERS = ['placeholder', 'dummy', 'your-project', 'changeme', 'xxx'];

function requireEnv(name: string, value: string | undefined, kind: 'url' | 'key'): string {
  const raw = (value ?? '').trim();
  if (!raw) {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Copy .env.example to .env.local and set it to your Supabase project values.`,
    );
  }
  const lowered = raw.toLowerCase();
  if (PLACEHOLDER_MARKERS.some((marker) => lowered.includes(marker))) {
    throw new Error(`${name} still contains a placeholder value. Set it to the real Supabase project credentials.`);
  }
  if (kind === 'url' && !raw.startsWith('https://')) {
    throw new Error(`${name} must be an https:// URL of your Supabase project.`);
  }
  return raw;
}

export function supabaseUrl(): string {
  return requireEnv('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL, 'url');
}

export function supabaseAnonKey(): string {
  return requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'key');
}

// Server-side only. Never reference this from a file reachable by the browser.
export function serviceRoleKey(): string {
  if (typeof window !== 'undefined') {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY must never be read in client code.');
  }
  return requireEnv('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY, 'key');
}
