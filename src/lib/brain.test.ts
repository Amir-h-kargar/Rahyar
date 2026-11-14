import { describe, expect, it } from 'vitest';
import { bestHours, brainConfidence, suggestRituals } from './brain';
import { createTask } from '../store/store';
import type { Task } from '../types';

function done(title: string, at: Date, areaId: string | null = null): Task {
  return { ...createTask({ title, areaId }, at), status: 'done', completedAt: at.toISOString() };
}
const at = (day: number, hour: number) => new Date(2026, 9, day, hour, 0, 0);

describe('brain', () => {
  it('needs enough samples before naming golden hours', () => {
    expect(bestHours([done('a', at(1, 9)), done('b', at(2, 9))])).toEqual([]);
  });

  it('finds the hours with most completions', () => {
    const tasks = [9, 9, 9, 9, 15, 15, 21].map((h, i) => done('t' + i, at(i + 1, h)));
    expect(bestHours(tasks)).toEqual([9, 15]);
  });

  it('confidence grows with data and is capped', () => {
    const empty = { tasks: [], rituals: [], reviews: [], areas: [] };
    const many = { ...empty, tasks: Array.from({ length: 60 }, (_, i) => done('x' + i, at((i % 28) + 1, 9), 'a')) };
    const now = new Date(2026, 10, 14);
    expect(brainConfidence(empty, now)).toBe(0);
    expect(brainConfidence(many, now)).toBeGreaterThan(40);
    expect(brainConfidence(many, now)).toBeLessThanOrEqual(96);
  });

  it('suggests a ritual for a weekly-repeating task', () => {
    const tasks = [1, 8, 15, 22].map((d) => done('مرور هفتگی مالی', at(d, 10)));
    const s = suggestRituals({ tasks, rituals: [], reviews: [], areas: [] });
    expect(s[0]?.cadence).toBe('weekly');
  });
});
