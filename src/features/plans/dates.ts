import { formatDate, t } from '@/i18n';
/** Calendar dates, never elapsed 24-hour blocks: Morocco's clock can change. */
export function localDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function addDays(date: string, amount: number): string {
  if (!validDate(date) || !Number.isInteger(amount)) throw new Error(t('plans.engine.invalidDate'));
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + amount);
  return next.toISOString().slice(0, 10);
}
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000);
}
export function dateLabel(date: string): string {
  return formatDate(date, { day: 'numeric', month: 'long', year: 'numeric' });
}
