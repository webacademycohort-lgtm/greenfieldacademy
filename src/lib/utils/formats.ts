// =============================================================================
// Nigerian formatting helpers
// =============================================================================
import type { PrefectTitle, TermEnum } from '@/types/database';

export const NGN = (n: number) =>
  '₦' + (n ?? 0).toLocaleString('en-NG', { maximumFractionDigits: 2 });

export const formatPhoneNG = (raw?: string | null) => {
  if (!raw) return '';
  const d = raw.replace(/\D/g, '');
  if (d.startsWith('234') && d.length === 13) return `+234 ${d.slice(3,6)} ${d.slice(6,9)} ${d.slice(9)}`;
  if (d.startsWith('0') && d.length === 11)   return `${d.slice(0,4)} ${d.slice(4,7)} ${d.slice(7)}`;
  return raw;
};

export const formatDateNG = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

export const PREFECT_LABEL: Record<PrefectTitle, string> = {
  head_boy:        'Head Boy',
  head_girl:       'Head Girl',
  asst_head_boy:   'Assistant Head Boy',
  asst_head_girl:  'Assistant Head Girl',
  library_prefect: 'Library Prefect',
  sport_prefect:   'Sports Prefect',
  labor_prefect:   'Labour Prefect',
  health_prefect:  'Health Prefect',
  social_prefect:  'Social Prefect',
  class_captain:   'Class Captain',
  none:            '—'
};

export const TERM_LABEL: Record<TermEnum, string> = {
  '1st': '1st Term',
  '2nd': '2nd Term',
  '3rd': '3rd Term'
};

export const generateAdmissionNumber = (year: number = new Date().getFullYear()) =>
  `GFA/${year}/${Math.floor(1000 + Math.random() * 9000)}`;
