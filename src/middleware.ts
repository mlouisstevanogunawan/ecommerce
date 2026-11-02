import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { supabaseAnonKey, supabaseUrl } from '@/lib/env';

const PROTECTED = ['/admin', '/seller', '/account', '/checkout', '/wishlist'];

// Middleware is a redirect convenience only. The authority for who may do what
// is Row Level Security plus requireProfile()/requireRole() in the server code,
// which read the role from the database. A role is never taken from a cookie.
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: request.headers } });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Refreshes the session and rotates the cookie when needed. This is what makes
  // a revoked or expired token stop working, which a cookie-presence check never did.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED.some((prefix) => pathname.startsWith(prefix));
  const isAuthApi = pathname.startsWith('/api/seller') || pathname.startsWith('/api/admin');

  if (!isProtected && !isAuthApi) return response;

  const isApi = pathname.startsWith('/api/');

  if (!user) {
    if (isApi) {
      return NextResponse.json({ error: 'You must be signed in.' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  const isAdminArea =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/seller') ||
    pathname.startsWith('/api/seller');

  if (isAdminArea) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const denied = () =>
      isApi
        ? NextResponse.json({ error: 'Requires a seller or admin role.' }, { status: 403 })
        : NextResponse.redirect(new URL('/login?error=unauthorized_role&redirect=' + encodeURIComponent(pathname), request.url));

    // A missing profile row (or a role we cannot read under RLS) is a denial, not a pass.
    if (error || !profile) return denied();

    const allowed = pathname.startsWith('/admin') || pathname.startsWith('/api/admin')
      ? profile.role === 'admin'
      : profile.role === 'admin' || profile.role === 'seller';
    if (!allowed) return denied();
  }

  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/seller/:path*',
    '/account/:path*',
    '/checkout/:path*',
    '/wishlist/:path*',
    '/api/seller/:path*',
    '/api/admin/:path*',
  ],
};
