import { describe, expect, it } from 'vitest';
import { buildStarterState } from './seed';
import { buildBrief, lightenMessage, rewardFor } from './content';
import { normalizeState, parseImportedState } from './storage';
import type { Task } from '../types';

function sampleTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'بازبینی پیشنهاد',
    note: 'یادداشت',
    areaId: null,
    energy: 'high',
    due: '2026-11-20',
    estimateMin: 45,
    deep: true,
    goalId: null,
    ritualId: null,
    status: 'active',
    pinned: false,
    deferCount: 0,
    createdAt: '2026-11-12T08:00:00.000Z',
    updatedAt: '2026-11-12T08:00:00.000Z',
    completedAt: null,
    delegatedTo: null,
    delegatedAt: null,
    brief: null,
    ...overrides,
  };
}

describe('Persian copy', () => {
  it('writes a complete delegation brief', () => {
    const brief = buildBrief({
      task: sampleTask(),
      area: { id: 'a', title: 'کسب‌وکار', emoji: '💼', color: 'gold', intent: 4, createdAt: '2026-11-01T00:00:00.000Z' },
      to: 'سارا',
      from: 'آرش',
      today: '2026-11-12',
    });
    expect(brief).toContain('بازبینی پیشنهاد');
    expect(brief).toContain('سارا');
    expect(brief).toContain('آرش');
    expect(brief).toContain('کسب‌وکار');
    expect(brief.length).toBeGreaterThan(300);
  });

  it('generates a warm reward without leftovers', () => {
    const reward = rewardFor({ title: 'کار' }, undefined, 2, () => 0);
    expect(reward.message.length).toBeGreaterThan(20);
    expect(reward.title).toContain('دومین');
  });

  it('counts rescheduled work in the lighten message', () => {
    const message = lightenMessage([sampleTask()], 'low');
    expect(message).toContain('یک کار سنگین');
    expect(message).toContain('فردا');
  });
});

describe('starter data', () => {
  it('builds a complete demo state', () => {
    const state = buildStarterState({
      name: 'آرش',
      areaTitles: ['کسب‌وکار', 'سلامت', 'خانواده'],
      demo: true,
      now: new Date(2026, 10, 12, 10),
    });
    expect(state.onboarded).toBe(true);
    expect(state.areas).toHaveLength(3);
    expect(state.tasks.length).toBeGreaterThan(5);
    expect(state.goals.length).toBeGreaterThan(0);
    expect(state.rituals.length).toBeGreaterThan(0);
    expect(state.tasks.every((t) => state.areas.some((a) => a.id === t.areaId))).toBe(true);
  });

  it('builds a clean state when demo is off', () => {
    const state = buildStarterState({
      name: '',
      areaTitles: ['سلامت'],
      demo: false,
      now: new Date(2026, 10, 12, 10),
    });
    expect(state.tasks).toHaveLength(0);
    expect(state.areas).toHaveLength(1);
  });
});

describe('storage validation', () => {
  it('rejects invalid payloads', () => {
    expect(normalizeState(null)).toBeNull();
    expect(normalizeState({ version: 2 })).toBeNull();
    expect(parseImportedState('not json')).toBeNull();
  });

  it('normalizes a persisted state and repairs orphan tasks', () => {
    const state = buildStarterState({
      name: 'آرش',
      areaTitles: ['کسب‌وکار'],
      demo: false,
      now: new Date(2026, 10, 12, 10),
    });
    const withOrphan = {
      ...state,
      tasks: [sampleTask({ areaId: 'missing-area' })],
    };
    const normalized = normalizeState(JSON.parse(JSON.stringify(withOrphan)));
    expect(normalized).not.toBeNull();
    expect(normalized?.tasks[0].areaId).toBeNull();
    expect(normalized?.onboarded).toBe(true);
  });

  it('drops malformed nested entities instead of crashing', () => {
    const state = buildStarterState({
      name: '',
      areaTitles: ['سلامت'],
      demo: false,
      now: new Date(2026, 10, 12, 10),
    });
    const normalized = normalizeState({
      ...JSON.parse(JSON.stringify(state)),
      goals: [{ nope: true }, null],
      rituals: [{ title: '' }],
      decisions: [{ title: 'x' }],
      reviews: [{ date: 'not-a-date' }],
      messages: [{ text: '' }],
      tasks: [{ title: 'کار سالم' }],
    });
    expect(normalized).not.toBeNull();
    expect(normalized?.goals).toEqual([]);
    expect(normalized?.rituals).toEqual([]);
    expect(normalized?.decisions).toEqual([]);
    expect(normalized?.reviews).toEqual([]);
    expect(normalized?.messages).toEqual([]);
    expect(normalized?.tasks).toHaveLength(1);
  });
});
