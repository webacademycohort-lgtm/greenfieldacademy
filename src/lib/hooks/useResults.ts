'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { StudentResultView } from '@/types/database';

export function useResults(studentId: string | null, termId: string | null) {
  const [rows, setRows]     = useState<StudentResultView[]>([]);
  const [loading, setLoad]  = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!studentId || !termId) return;
    let mounted = true;
    setLoad(true);

    (async () => {
      const { data } = await supabase()
        .from('student_result_view')
        .select('*')
        .eq('admission_number', studentId) // or by id depending on view shape
        .eq('term', termId);
      if (!mounted) return;
      const list = (data ?? []) as StudentResultView[];
      setRows(list);
      setLocked(list.length > 0 ? list[0].is_result_locked : false);
      setLoad(false);
    })();
    return () => { mounted = false; };
  }, [studentId, termId]);

  return { rows, loading, locked };
}
