import { describe, expect, it } from 'vitest';
import {
  addDaysToKey,
  addMonthsToKey,
  countdown,
  dateKey,
  diffDays,
  dueLabel,
  faNum,
  formatFullDate,
  nextWeeklyKey,
  ritualNextDue,
  todayKey,
  weekdayIndex,
} from './date';

describe('date utilities', () => {
  it('uses local calendar keys', () => {
    const d = new Date(2026, 10, 12, 23, 30);
    expect(dateKey(d)).toBe('2026-11-12');
    expect(todayKey(d)).toBe('2026-11-12');
  });

  it('adds days across month boundaries', () => {
    expect(addDaysToKey('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDaysToKey('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('adds months with day clamping', () => {
    expect(addMonthsToKey('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsToKey('2026-12-15', 1)).toBe('2027-01-15');
  });

  it('computes day differences safely', () => {
    expect(diffDays('2026-11-13', '2026-11-12')).toBe(1);
    expect(diffDays('2026-11-12', '2026-11-12')).toBe(0);
    expect(diffDays('2026-11-10', '2026-11-12')).toBe(-2);
  });

  it('finds the next occurrence of a weekday', () => {
    // 2026-11-12 is a Thursday.
    expect(weekdayIndex('2026-11-12')).toBe(4);
    expect(nextWeeklyKey(5, '2026-11-12')).toBe('2026-11-13');
    expect(nextWeeklyKey(4, '2026-11-12')).toBe('2026-11-19');
  });

  it('advances rituals from the completion day', () => {
    expect(ritualNextDue({ cadence: 'daily', weekday: null }, '2026-11-12')).toBe('2026-11-13');
    expect(ritualNextDue({ cadence: 'weekly', weekday: 5 }, '2026-11-12')).toBe('2026-11-13');
    expect(ritualNextDue({ cadence: 'monthly', weekday: null }, '2026-11-12')).toBe('2026-12-12');
  });

  it('labels due dates in Persian', () => {
    expect(dueLabel('2026-11-12', '2026-11-12')).toMatchObject({ tone: 'today', label: 'امروز' });
    expect(dueLabel('2026-11-13', '2026-11-12')).toMatchObject({ tone: 'soon', label: 'فردا' });
    expect(dueLabel('2026-11-11', '2026-11-12')).toMatchObject({ tone: 'overdue', label: 'دیروز' });
    expect(dueLabel(null, '2026-11-12').tone).toBe('none');
  });

  it('converts digits and formats dates', () => {
    expect(faNum(1405)).toBe('۱۴۰۵');
    expect(formatFullDate('2026-11-12')).toContain('آبان');
  });

  it('builds countdowns', () => {
    const now = new Date('2026-11-12T10:00:00');
    expect(countdown('2026-11-12T10:01:05', now)).toBe('۱:۰۵');
  });
});
