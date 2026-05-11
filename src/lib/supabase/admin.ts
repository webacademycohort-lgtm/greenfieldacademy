// =============================================================================
// Admin Supabase client — uses the SERVICE_ROLE_KEY (bypasses RLS).
// USE ONLY IN SERVER ROUTES — never expose to the browser.
// =============================================================================
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export function supabaseAdmin() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
