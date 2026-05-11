'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Profile } from '@/types/database';

export function useAuth() {
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const sb = supabase();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { if (mounted) { setProfile(null); setLoading(false); } return; }
      const { data } = await sb.from('profiles').select('*').eq('id', user.id).single();
      if (mounted) { setProfile(data as Profile | null); setLoading(false); }
    })();

    const { data: sub } = supabase().auth.onAuthStateChange(async (_e, session) => {
      if (!session?.user) { setProfile(null); return; }
      const { data } = await supabase().from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(data as Profile | null);
    });

    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  return {
    profile,
    loading,
    signOut: async () => { await supabase().auth.signOut(); window.location.href = '/login'; }
  };
}
