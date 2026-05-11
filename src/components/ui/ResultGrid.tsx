'use client';
// =============================================================================
// Bulk Result Entry grid — CA1 (20) + CA2 (20) + Exam (60) = Total (100)
// =============================================================================
import { useMemo, useState } from 'react';
import { gradeOf, totalScore } from '@/lib/utils/grades';
import { Button } from './Button';

export interface RowInput {
  student_id:   string;
  admission_no: string;
  full_name:    string;
  ca_test_1:    number | '';
  ca_test_2:    number | '';
  exam_score:   number | '';
}

interface Props {
  initialRows: RowInput[];
  onSave: (rows: RowInput[]) => Promise<void> | void;
}

export function ResultGrid({ initialRows, onSave }: Props) {
  const [rows, setRows]     = useState<RowInput[]>(initialRows);
  const [saving, setSaving] = useState(false);

  function setCell(idx: number, key: keyof RowInput, raw: string) {
    setRows(prev => {
      const copy = [...prev];
      const v = raw === '' ? '' : Math.max(0, Math.min(key === 'exam_score' ? 60 : 20, Number(raw)));
      (copy[idx] as any)[key] = v as any;
      return copy;
    });
  }

  const computed = useMemo(() => rows.map(r => {
    const t = totalScore(
      typeof r.ca_test_1 === 'number' ? r.ca_test_1 : null,
      typeof r.ca_test_2 === 'number' ? r.ca_test_2 : null,
      typeof r.exam_score === 'number' ? r.exam_score : null
    );
    return { total: t, ...gradeOf(t) };
  }), [rows]);

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-cream-50 text-green-900">
            <tr>
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Adm. No.</th>
              <th className="p-3 text-left">Student</th>
              <th className="p-3">CA 1 (20)</th>
              <th className="p-3">CA 2 (20)</th>
              <th className="p-3">Exam (60)</th>
              <th className="p-3">Total</th>
              <th className="p-3">Grade</th>
              <th className="p-3">Remark</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.student_id} className="border-t border-gray-100">
                <td className="p-3">{idx + 1}</td>
                <td className="p-3"><code>{r.admission_no}</code></td>
                <td className="p-3 font-medium">{r.full_name}</td>
                <td className="p-2 text-center">
                  <input type="number" min={0} max={20} value={r.ca_test_1}
                    onChange={e => setCell(idx, 'ca_test_1', e.target.value)}
                    className="w-20 rounded border border-gray-200 p-1.5 text-center" />
                </td>
                <td className="p-2 text-center">
                  <input type="number" min={0} max={20} value={r.ca_test_2}
                    onChange={e => setCell(idx, 'ca_test_2', e.target.value)}
                    className="w-20 rounded border border-gray-200 p-1.5 text-center" />
                </td>
                <td className="p-2 text-center">
                  <input type="number" min={0} max={60} value={r.exam_score}
                    onChange={e => setCell(idx, 'exam_score', e.target.value)}
                    className="w-20 rounded border border-gray-200 p-1.5 text-center" />
                </td>
                <td className="p-3 text-center font-bold">{computed[idx].total || ''}</td>
                <td className="p-3 text-center">
                  <span className="inline-block rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-xs font-semibold">
                    {computed[idx].grade}
                  </span>
                </td>
                <td className="p-3 text-center">{computed[idx].remark}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mt-4">
        <Button
          disabled={saving}
          onClick={async () => { setSaving(true); await onSave(rows); setSaving(false); }}>
          {saving ? 'Saving…' : '💾 Save All Results'}
        </Button>
      </div>
    </div>
  );
}
