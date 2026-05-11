// =============================================================================
// Browser Supabase client (Client Components)
// =============================================================================
'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Singleton for components that don't want to recreate on each render
let _browser: ReturnType<typeof createClient> | null = null;
export function supabase() {
  if (!_browser) _browser = createClient();
  return _browser;
}
