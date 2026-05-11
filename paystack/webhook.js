/**
 * Greenfield Academy — Paystack Webhook Handler
 *
 * Deploy this as a Supabase Edge Function OR a Next.js Route Handler.
 * It verifies Paystack's signature, then upgrades the matching payment
 * row to status='paid' which (via RLS rules) unlocks the student's results.
 *
 * --------------------------------------------------------------------
 * NEXT.JS USAGE (App Router)
 * --------------------------------------------------------------------
 *   File: app/api/paystack/webhook/route.ts
 *   Env:  PAYSTACK_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 *   Add this URL to your Paystack dashboard:
 *     https://YOUR-DOMAIN.com/api/paystack/webhook
 *
 * --------------------------------------------------------------------
 * SUPABASE EDGE FUNCTION USAGE
 * --------------------------------------------------------------------
 *   supabase functions new paystack-webhook
 *   # paste this code (Deno-style import) in index.ts and deploy:
 *   supabase functions deploy paystack-webhook --no-verify-jwt
 *   # then point Paystack to:
 *   https://<project-ref>.functions.supabase.co/paystack-webhook
 */

// ====================================================================
// NEXT.JS ROUTE HANDLER (TypeScript)
// ====================================================================
/*
// app/api/paystack/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs'; // we need crypto

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service role bypasses RLS
);

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get('x-paystack-signature') || '';

  // 1. Verify signature
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(raw)
    .digest('hex');
  if (hash !== signature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(raw);

  // 2. Handle successful charge
  if (event.event === 'charge.success') {
    const { reference, amount, metadata, customer, paid_at } = event.data;
    const studentId = metadata?.student_id;
    const term      = metadata?.term;
    const session   = metadata?.session;

    if (!studentId || !term || !session) {
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
    }

    // Upsert payment as paid (idempotent on paystack_ref)
    const { error } = await supabase.from('payments').upsert({
      student_id: studentId,
      amount: amount / 100,
      term,
      session,
      paystack_ref: reference,
      status: 'paid',
      paid_at: paid_at ? new Date(paid_at).toISOString() : new Date().toISOString()
    }, { onConflict: 'paystack_ref' });

    if (error) {
      console.error('Supabase upsert failed', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Optionally: send a receipt email here (e.g. via Resend / Postmark)
  }

  return NextResponse.json({ received: true });
}
*/

// ====================================================================
// SUPABASE EDGE FUNCTION (Deno) — equivalent
// ====================================================================
/*
// supabase/functions/paystack-webhook/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';

serve(async (req) => {
  const raw = await req.text();
  const sig = req.headers.get('x-paystack-signature') || '';
  const hash = createHmac('sha512', Deno.env.get('PAYSTACK_SECRET_KEY')!).update(raw).digest('hex');
  if (hash !== sig) return new Response('Invalid signature', { status: 401 });

  const evt = JSON.parse(raw);
  if (evt.event === 'charge.success') {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { reference, amount, metadata, paid_at } = evt.data;
    await supabase.from('payments').upsert({
      student_id: metadata.student_id,
      amount: amount / 100,
      term: metadata.term,
      session: metadata.session,
      paystack_ref: reference,
      status: 'paid',
      paid_at: paid_at ? new Date(paid_at).toISOString() : new Date().toISOString()
    }, { onConflict: 'paystack_ref' });
  }
  return new Response(JSON.stringify({ received: true }), { headers: { 'content-type': 'application/json' } });
});
*/

module.exports = { note: 'See comments above for Next.js + Edge Function implementations.' };
