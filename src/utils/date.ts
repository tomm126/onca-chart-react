import { HOLIDAYS } from '../constants/holidays';

export function dk(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addD(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function todayStr(): string {
  return dk(new Date());
}

export function isWknd(d: Date): boolean {
  const w = d.getDay();
  return w === 0 || w === 6;
}

export function isHol(d: Date): boolean {
  return HOLIDAYS.has(dk(d));
}

export function isNWD(
  dstr: string,
  customNonWorkingDays: string[],
  removedHolidays: string[],
  d?: Date,
): boolean {
  if (removedHolidays.includes(dstr)) return false;
  const dateObj = d ?? new Date(dstr.replace(/-/g, '/'));
  if (isWknd(dateObj) || isHol(dateObj)) return true;
  return customNonWorkingDays.includes(dstr);
}

export function getGanttStartDate(): Date {
  return addD(new Date(), -14);
}

export function isStartOverdue(startStr: string): boolean {
  if (!startStr) return false;
  let d: Date;
  const m = startStr.match(/^(\d{4})[\/\-](\d{1,2})(?:[\/\-](\d{1,2}))?/);
  if (m) {
    d = new Date(parseInt(m[1]), parseInt(m[2]) - 1, m[3] ? parseInt(m[3]) : 1);
  } else {
    d = new Date(startStr);
  }
  if (isNaN(d.getTime())) return false;
  const ago = new Date();
  ago.setMonth(ago.getMonth() - 3);
  return d <= ago;
}

export function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
