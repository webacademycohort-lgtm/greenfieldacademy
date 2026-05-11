// =============================================================================
// Grade calculation helpers — mirrors the SQL trigger calculate_grade_and_remark()
// =============================================================================
import type { GradeEnum, RemarkEnum } from '@/types/database';

export interface GradeOutcome { grade: GradeEnum; remark: RemarkEnum; }

export function gradeOf(total: number): GradeOutcome {
  if (total >= 75) return { grade: 'A1', remark: 'Distinction' };
  if (total >= 70) return { grade: 'B2', remark: 'Excellent'   };
  if (total >= 65) return { grade: 'B3', remark: 'Very Good'   };
  if (total >= 60) return { grade: 'C4', remark: 'Good'        };
  if (total >= 55) return { grade: 'C5', remark: 'Credit'      };
  if (total >= 50) return { grade: 'C6', remark: 'Credit'      };
  if (total >= 45) return { grade: 'D7', remark: 'Pass'        };
  if (total >= 40) return { grade: 'E8', remark: 'Pass'        };
  return { grade: 'F9', remark: 'Fail' };
}

export function totalScore(ca1: number | null | undefined, ca2: number | null | undefined, exam: number | null | undefined) {
  return (ca1 ?? 0) + (ca2 ?? 0) + (exam ?? 0);
}

export function caTotal(ca1: number | null | undefined, ca2: number | null | undefined) {
  return (ca1 ?? 0) + (ca2 ?? 0);
}

export function classifyAverage(avg: number) {
  return gradeOf(avg);
}

// CGPA-like simple aggregate over a list of totals
export function termAverage(totals: number[]) {
  if (!totals.length) return 0;
  return totals.reduce((s, n) => s + n, 0) / totals.length;
}
