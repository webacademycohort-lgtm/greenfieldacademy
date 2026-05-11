'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Payment, PaymentItem } from '@/types/database';

export function usePayments(studentId: string | null, termId: string | null) {
  const [items, setItems]     = useState<PaymentItem[]>([]);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId || !termId) return;
    let m = true;
    setLoading(true);

    (async () => {
      const sb = supabase();
      const [{ data: piData }, { data: payData }] = await Promise.all([
        sb.from('payment_items').select('*').eq('term_id', termId),
        sb.from('payments').select('*').eq('student_id', studentId).eq('term_id', termId).maybeSingle()
      ]);
      if (!m) return;
      setItems((piData ?? []) as PaymentItem[]);
      setPayment(payData as Payment | null);
      setLoading(false);
    })();

    return () => { m = false; };
  }, [studentId, termId]);

  const isPaid    = payment?.fee_status === 'paid';
  const totalDue  = items.reduce((s, i) => s + Number(i.amount), 0);

  return { items, payment, isPaid, totalDue, loading };
}
