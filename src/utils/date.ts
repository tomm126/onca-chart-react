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
  return addD(new Date(), -30);
}

export function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
