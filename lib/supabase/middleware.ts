import { createServerClient } from '@supabase/ssr';
import { eq } from 'drizzle-orm';
import { NextResponse, type NextRequest } from 'next/server';

import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { env } from '@/env';

type Verdict = 'unauthed' | 'pending' | 'approved';

async function verdictFor(userId: string): Promise<Verdict> {
  const [profile] = await db
    .select({ role: profiles.role, active: profiles.active })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  if (!profile) return 'unauthed';
  if (profile.active && profile.role !== 'pending') return 'approved';
  return 'pending';
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith('/admin');
  const isLoginRoute = pathname === '/login';
  const isSignUpRoute = pathname === '/sign-up';
  const isPendingRoute = pathname === '/pending';
  const isResetPasswordRoute = pathname.startsWith('/reset-password');

  // Skip the Drizzle round-trip for routes that don't need a verdict.
  const needsVerdict = !!user && (isAdminRoute || isLoginRoute || isSignUpRoute || isPendingRoute);
  const verdict: Verdict = !user
    ? 'unauthed'
    : needsVerdict
      ? await verdictFor(user.id)
      : 'approved';

  // Unauthed user hitting /admin/* → /login (preserve redirectTo).
  if (isAdminRoute && verdict === 'unauthed') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // Pending user hitting /admin/* → /pending.
  if (isAdminRoute && verdict === 'pending') {
    const url = request.nextUrl.clone();
    url.pathname = '/pending';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Approved user on /login or /sign-up or /pending → bounce to dashboard.
  if (verdict === 'approved' && (isLoginRoute || isSignUpRoute || isPendingRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Pending user on /login or /sign-up → /pending (don't loop back to login).
  if (verdict === 'pending' && (isLoginRoute || isSignUpRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = '/pending';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Reset-password REQUEST page: bounce authed users away.
  // Reset-password CALLBACK page: leave alone (the code-exchange establishes a session).
  if (
    isResetPasswordRoute &&
    pathname === '/reset-password' &&
    (verdict === 'approved' || verdict === 'pending')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = verdict === 'approved' ? '/admin/dashboard' : '/pending';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
