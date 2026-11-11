import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/*
 * The product is a demo-first experience: all workspace routes are readable
 * without an account so reviewers can explore the seeded record. Real writes
 * still require a Supabase session at the API layer.
 */
const AUTH_PAGES = ['/auth/login', '/auth/signup'];

export async function updateSession(
  request: NextRequest,
  requestHeaders?: Headers
) {
  const supabaseResponse = NextResponse.next({
    request: requestHeaders ? { headers: requestHeaders } : request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          supabaseResponse.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          supabaseResponse.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // The callback route must be allowed to exchange the auth code/cookie even
  // when a partial session already exists.
  if (pathname === '/auth/callback') {
    return supabaseResponse;
  }

  if (AUTH_PAGES.includes(pathname) && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return supabaseResponse;
}
