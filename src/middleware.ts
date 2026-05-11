// =============================================================================
// Greenfield Academy — Auth & role-based routing middleware
// =============================================================================
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return req.cookies.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: '', ...options });
        }
      }
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;

  const isProtected =
    path.startsWith('/dashboard') ||           // (student) group
    path.startsWith('/student')   ||
    path.startsWith('/teacher')   ||
    path.startsWith('/admin');

  if (isProtected) {
    if (!user) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', path);
      return NextResponse.redirect(url);
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const role = profile?.role;

    if (path.startsWith('/admin')   && role !== 'admin')                          return NextResponse.redirect(new URL('/', req.url));
    if (path.startsWith('/teacher') && !['teacher','admin'].includes(role || '')) return NextResponse.redirect(new URL('/', req.url));
    if ((path.startsWith('/student') || path.startsWith('/dashboard')) && role !== 'student') return NextResponse.redirect(new URL('/', req.url));
  }

  return res;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/student/:path*',
    '/teacher/:path*',
    '/admin/:path*'
  ]
};
