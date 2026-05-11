# Next.js 14 (App Router) Migration Guide

This static project mirrors the architecture of a Next.js + Supabase app and
is intentionally easy to port. Below is the recommended Next.js folder
structure and where each file in this repo maps to.

---

## 📁 Recommended Next.js structure

```
greenfield-academy/
├─ app/
│  ├─ (public)/
│  │  ├─ layout.tsx          ← header + footer
│  │  ├─ page.tsx            ← copy from index.html (sections)
│  │  ├─ apply/page.tsx      ← apply.html
│  │  └─ login/page.tsx      ← login.html
│  ├─ (student)/
│  │  ├─ layout.tsx          ← dashboard shell
│  │  └─ student/page.tsx    ← student/index.html + js/student.js
│  ├─ (teacher)/
│  │  └─ teacher/page.tsx    ← teacher/index.html + js/teacher.js
│  ├─ (admin)/
│  │  └─ admin/page.tsx      ← admin/index.html + js/admin.js
│  └─ api/
│     ├─ paystack/
│     │  ├─ init/route.ts    ← paystack/init-payment.js
│     │  └─ webhook/route.ts ← paystack/webhook.js
│     └─ contact/route.ts
├─ components/
│  ├─ HeroSlider.tsx
│  ├─ DashboardCard.tsx
│  ├─ ResultTable.tsx
│  ├─ ResultSlip.tsx
│  └─ ...
├─ lib/
│  ├─ supabaseClient.ts      ← client-side singleton
│  ├─ supabaseServer.ts      ← server actions / RSC
│  └─ grade.ts               ← gradeOf() from js/supabase-client.js
├─ utils/
│  └─ paystack.ts
├─ styles/globals.css        ← css/style.css
└─ supabase/                 ← copy whole folder
   ├─ schema.sql
   ├─ rls.sql
   ├─ storage.sql
   └─ seed.sql
```

---

## 🔑 Environment variables (`.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR-SERVICE-ROLE-KEY     # server only

NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxx
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxx     # server only

NEXT_PUBLIC_SITE_URL=https://greenfieldacademy.ng
```

---

## 🔧 Supabase clients (`lib/`)

```ts
// lib/supabaseClient.ts
import { createBrowserClient } from '@supabase/ssr';
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

```ts
// lib/supabaseServer.ts
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const supabaseServer = () => {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: {
        get: (n) => cookieStore.get(n)?.value,
        set: (n,v,o) => cookieStore.set({ name:n, value:v, ...o }),
        remove: (n,o) => cookieStore.set({ name:n, value:'', ...o })
    }}
  );
};
```

---

## 🛡 Middleware for auth & role gating

```ts
// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: {
        get: (n) => req.cookies.get(n)?.value,
        set: (n,v,o) => res.cookies.set({ name:n, value:v, ...o }),
        remove: (n,o) => res.cookies.set({ name:n, value:'', ...o })
    }}
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;

  if (path.startsWith('/student') || path.startsWith('/teacher') || path.startsWith('/admin')) {
    if (!user) return NextResponse.redirect(new URL('/login', req.url));
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (path.startsWith('/admin')   && profile?.role !== 'admin')   return NextResponse.redirect(new URL('/', req.url));
    if (path.startsWith('/teacher') && !['teacher','admin'].includes(profile?.role||'')) return NextResponse.redirect(new URL('/', req.url));
    if (path.startsWith('/student') && profile?.role !== 'student') return NextResponse.redirect(new URL('/', req.url));
  }
  return res;
}
export const config = { matcher: ['/student/:path*', '/teacher/:path*', '/admin/:path*'] };
```

---

## 🎨 Tailwind config

The styles in `css/style.css` are vanilla CSS variables that map cleanly to a
Tailwind config:

```js
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      colors: {
        green: { 900: '#0d3b1f', 700: '#14532d', 600: '#166534', 500: '#16a34a' },
        gold:  { 500: '#d4a017', 400: '#eab308' },
        cream: { 50: '#fffbea', 100: '#fef3c7' }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui'],
        serif: ['Playfair Display', 'serif']
      }
    }
  }
};
```

---

## 💳 Paystack flow

1. **Client (Student Portal)** opens Paystack Inline popup with the
   student's email + amount + metadata `{student_id, term, session}`.
2. **Webhook** at `/api/paystack/webhook` verifies the signature with
   `PAYSTACK_SECRET_KEY`, upserts the `payments` row to `status='paid'`.
3. RLS policy `results_student_select` then lets that student query results
   for the matching term.

See `paystack/webhook.js` for the full handler code.

---

## 🚀 Deployment

- **Frontend**: Vercel — connect repo, set env vars, deploy.
- **Database**: Supabase project — run `supabase/schema.sql`, then `rls.sql`,
  then `storage.sql`, then optionally `seed.sql`.
- **Webhook**: Paste the webhook URL into Paystack dashboard → API Keys & Webhooks.
