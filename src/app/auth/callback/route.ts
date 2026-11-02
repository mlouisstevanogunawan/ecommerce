import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Supabase email-confirmation and OAuth links land here with ?code=. The code is
// exchanged for a real session cookie on the server; the browser never sees it.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const nextParam = searchParams.get('next') ?? '/account/orders';

  // Only same-origin relative paths, so the link cannot be used as an open redirect.
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
  }

  // Magic-link confirmations arrive with hash tokens instead, which the browser
  // client handles; send the visitor to the login page to complete that flow.
  return NextResponse.redirect(`${origin}/login${next !== '/' ? `?redirect=${encodeURIComponent(next)}` : ''}`);
}
