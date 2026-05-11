// =============================================================================
// Paystack helpers (server)
// =============================================================================
import type { PaystackInitResponse } from '@/types';

const PAYSTACK_BASE = 'https://api.paystack.co';

export async function initializePayment(args: {
  email: string;
  amountNGN: number;
  reference?: string;
  metadata?: Record<string, any>;
  callbackUrl?: string;
}): Promise<PaystackInitResponse> {
  const r = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: args.email,
      amount: args.amountNGN * 100,
      currency: 'NGN',
      reference: args.reference,
      metadata: args.metadata,
      callback_url: args.callbackUrl
    })
  });
  return r.json();
}

export async function verifyPayment(reference: string) {
  const r = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    cache: 'no-store'
  });
  return r.json();
}

// Browser-side reference generator
export function generateRef(prefix = 'GFA') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}
