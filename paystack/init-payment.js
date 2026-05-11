/**
 * Greenfield Academy — Paystack Initialize (server-side)
 *
 * Optional. We currently use Paystack INLINE (popup) from the browser
 * which is the simplest flow. Use this server route instead if you want
 * a redirect flow with reference-tracking and pre-validation.
 *
 * NEXT.JS: app/api/paystack/init/route.ts
 */

/*
// app/api/paystack/init/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { email, amountNGN, metadata } = await req.json();
  const r = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      amount: amountNGN * 100,
      currency: 'NGN',
      metadata,
      callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/student?payment=success`
    })
  });
  const data = await r.json();
  return NextResponse.json(data);
}
*/

module.exports = {};
