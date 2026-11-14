const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

const dateFmt = new Intl.DateTimeFormat('fa-IR', {
  calendar: 'persian',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const dateYearFmt = new Intl.DateTimeFormat('fa-IR', {
  calendar: 'persian',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const shortDateFmt = new Intl.DateTimeFormat('fa-IR', {
  calendar: 'persian',
  day: 'numeric',
  month: 'long',
});

const weekdayFmt = new Intl.DateTimeFormat('fa-IR', { calendar: 'persian', weekday: 'long' });

const timeFmt = new Intl.DateTimeFormat('fa-IR', {
  calendar: 'persian',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function faNum(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  // Noon avoids DST edge cases around midnight.
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function todayKey(now: Date = new Date()): string {
  return dateKey(now);
}

export function isKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function addDaysToKey(key: string, days: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + days);
  return dateKey(d);
}

export function addMonthsToKey(key: string, months: number): string {
  const d = fromKey(key);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return dateKey(d);
}

export function diffDays(laterKey: string, earlierKey: string): number {
  return Math.round((fromKey(laterKey).getTime() - fromKey(earlierKey).getTime()) / 86_400_000);
}

export function weekdayIndex(key: string): number {
  return fromKey(key).getDay();
}

export function startOfWeekKey(key: string): string {
  const idx = weekdayIndex(key);
  // Persian week starts on Saturday (6).
  const delta = (idx + 1) % 7;
  return addDaysToKey(key, -delta);
}

export function formatFullDate(key: string, withYear = false): string {
  return (withYear ? dateYearFmt : dateFmt).format(fromKey(key));
}

export function formatShortDate(key: string): string {
  return shortDateFmt.format(fromKey(key));
}

export function formatWeekday(key: string): string {
  return weekdayFmt.format(fromKey(key));
}

export function formatTime(date: Date | string): string {
  return timeFmt.format(typeof date === 'string' ? new Date(date) : date);
}

export type DueTone = 'overdue' | 'today' | 'soon' | 'later' | 'none';

export interface DueLabel {
  label: string;
  tone: DueTone;
  days: number | null;
}

export function dueLabel(due: string | null, today: string = todayKey()): DueLabel {
  if (!due) return { label: 'بدون موعد', tone: 'none', days: null };
  const days = diffDays(due, today);
  if (days < 0) {
    if (days === -1) return { label: 'دیروز', tone: 'overdue', days };
    return { label: `${faNum(-days)} روز پیش`, tone: 'overdue', days };
  }
  if (days === 0) return { label: 'امروز', tone: 'today', days };
  if (days === 1) return { label: 'فردا', tone: 'soon', days };
  if (days === 2) return { label: 'پس‌فردا', tone: 'soon', days };
  if (days < 7) return { label: formatWeekday(due), tone: 'soon', days };
  return { label: formatShortDate(due), tone: 'later', days };
}

export function minutesLabel(minutes: number | null): string {
  if (!minutes) return '';
  if (minutes < 60) return `${faNum(minutes)} دقیقه`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!m) return `${faNum(h)} ساعت`;
  return `${faNum(h)} ساعت و ${faNum(m)} دقیقه`;
}

export function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h >= 5 && h < 11) return 'صبح بخیر';
  if (h >= 11 && h < 15) return 'ظهر بخیر';
  if (h >= 15 && h < 19) return 'عصر بخیر';
  return 'شب بخیر';
}

export function daysSince(iso: string | null, now: Date = new Date()): number | null {
  if (!iso) return null;
  return Math.max(0, diffDays(todayKey(now), dateKey(new Date(iso))));
}

export function nextWeeklyKey(weekday: number, fromKeyStr: string): string {
  const current = weekdayIndex(fromKeyStr);
  let delta = (weekday - current + 7) % 7;
  if (delta === 0) delta = 7;
  return addDaysToKey(fromKeyStr, delta);
}

export function ritualNextDue(ritual: RitualLike, fromKeyStr: string): string {
  if (ritual.cadence === 'daily') return addDaysToKey(fromKeyStr, 1);
  if (ritual.cadence === 'weekly') {
    return nextWeeklyKey(ritual.weekday ?? weekdayIndex(fromKeyStr), fromKeyStr);
  }
  return addMonthsToKey(fromKeyStr, 1);
}

interface RitualLike {
  cadence: 'daily' | 'weekly' | 'monthly';
  weekday: number | null;
}

export function formatClock(time: string | null): string {
  if (!time) return '';
  return faNum(time);
}

export function countdown(untilIso: string, now: Date = new Date()): string {
  const ms = new Date(untilIso).getTime() - now.getTime();
  if (ms <= 0) return '۰:۰۰';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${faNum(m)}:${faNum(pad(s))}`;
}

export function isOnlineTomorrow(key: string | null, today: string): boolean {
  return key === addDaysToKey(today, 1);
}
