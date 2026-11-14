import { describe, expect, it } from 'vitest';
import type { AppState, Area, Ritual, Task } from '../types';
import { createBlankState, initialRitualDue, reducer } from './store';

const TODAY = '2026-11-12';

function area(id = 'a'): Area {
  return {
    id,
    title: 'رشد',
    emoji: '🧠',
    color: 'violet',
    intent: 4,
    createdAt: '2026-10-01T00:00:00.000Z',
  };
}

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'کار',
    note: '',
    areaId: 'a',
    energy: 'medium',
    due: TODAY,
    estimateMin: 20,
    deep: false,
    goalId: null,
    ritualId: null,
    status: 'active',
    pinned: false,
    deferCount: 0,
    createdAt: '2026-11-12T07:00:00.000Z',
    updatedAt: '2026-11-12T07:00:00.000Z',
    completedAt: null,
    delegatedTo: null,
    delegatedAt: null,
    brief: null,
    ...overrides,
  };
}

function ritual(overrides: Partial<Ritual> = {}): Ritual {
  return {
    id: 'r1',
    title: 'مرور صبح',
    areaId: 'a',
    cadence: 'daily',
    weekday: null,
    time: '07:00',
    nextDue: TODAY,
    lastDoneAt: null,
    log: [],
    note: '',
    createdAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

function state(overrides: Partial<AppState> = {}): AppState {
  return {
    ...createBlankState(),
    onboarded: true,
    profile: { name: 'آرش', createdAt: '2026-10-01T00:00:00.000Z', demo: false },
    areas: [area()],
    settings: { ...createBlankState().settings, lastVisit: TODAY },
    ...overrides,
  };
}

describe('store reducer', () => {
  it('completes a task', () => {
    const next = reducer(state({ tasks: [task()] }), {
      type: 'completeTask',
      id: 't1',
      at: '2026-11-12T10:00:00.000Z',
      today: TODAY,
    });
    expect(next.tasks[0].status).toBe('done');
    expect(next.tasks[0].completedAt).toBe('2026-11-12T10:00:00.000Z');
  });

  it('completes a ritual task and advances the ritual once', () => {
    const initial = state({ tasks: [task({ ritualId: 'r1' })], rituals: [ritual()] });
    const next = reducer(initial, {
      type: 'completeTask',
      id: 't1',
      at: '2026-11-12T10:00:00.000Z',
      today: TODAY,
    });
    expect(next.tasks[0].status).toBe('done');
    expect(next.rituals[0].log).toEqual([TODAY]);
    expect(next.rituals[0].nextDue).toBe('2026-11-13');
    const again = reducer(next, {
      type: 'completeRitual',
      id: 'r1',
      at: '2026-11-12T11:00:00.000Z',
      today: TODAY,
    });
    expect(again.rituals[0].log).toEqual([TODAY]);
    expect(again.rituals[0].nextDue).toBe('2026-11-13');
  });

  it('restores entities for undo', () => {
    const before = task();
    const initial = state({ tasks: [before] });
    const completed = reducer(initial, {
      type: 'completeTask',
      id: 't1',
      at: '2026-11-12T10:00:00.000Z',
      today: TODAY,
    });
    const undone = reducer(completed, { type: 'restoreEntities', tasks: [before] });
    expect(undone.tasks[0].status).toBe('active');
    expect(undone.tasks[0].completedAt).toBeNull();
  });

  it('defers a task and records the defer count', () => {
    const next = reducer(state({ tasks: [task()] }), {
      type: 'deferTask',
      id: 't1',
      days: 1,
      today: TODAY,
    });
    expect(next.tasks[0].due).toBe('2026-11-13');
    expect(next.tasks[0].deferCount).toBe(1);
  });

  it('unlinks tasks when an area is deleted', () => {
    const next = reducer(state({ tasks: [task()], goals: [], rituals: [] }), {
      type: 'deleteArea',
      id: 'a',
    });
    expect(next.areas).toHaveLength(0);
    expect(next.tasks[0].areaId).toBeNull();
  });

  it('upserts the review of the day', () => {
    const first = reducer(state(), {
      type: 'saveReview',
      energy: 'low',
      review: {
        id: 'rev1',
        date: TODAY,
        moved: 2,
        energy: 'low',
        note: 'فردا آرام',
        createdAt: '2026-11-12T20:00:00.000Z',
      },
    });
    const second = reducer(first, {
      type: 'saveReview',
      energy: 'high',
      review: {
        id: 'rev1',
        date: TODAY,
        moved: 3,
        energy: 'high',
        note: 'فردا عمیق',
        createdAt: '2026-11-12T21:00:00.000Z',
      },
    });
    expect(second.reviews).toHaveLength(1);
    expect(second.reviews[0].moved).toBe(3);
    expect(second.settings.energy).toBe('high');
  });

  it('materializes a due ritual as a task', () => {
    const next = reducer(state(), {
      type: 'addRitual',
      ritual: ritual({ nextDue: TODAY }),
      today: TODAY,
    });
    expect(next.tasks).toHaveLength(1);
    expect(next.tasks[0].ritualId).toBe('r1');
  });

  it('does not materialize a future ritual', () => {
    const next = reducer(state(), {
      type: 'addRitual',
      ritual: ritual({ nextDue: '2026-11-20' }),
      today: TODAY,
    });
    expect(next.tasks).toHaveLength(0);
  });

  it('clears only seeded demo data', () => {
    const seeded = state({
      tasks: [
        task({ id: 'seed', source: 'seed' }),
        task({ id: 'mine', source: undefined }),
      ],
      goals: [],
      rituals: [],
    });
    const next = reducer(seeded, { type: 'clearSample' });
    expect(next.tasks.map((t) => t.id)).toEqual(['mine']);
    expect(next.profile.demo).toBe(false);
  });
});

describe('ritual scheduling', () => {
  const now = new Date(2026, 10, 12, 10, 0); // Thursday

  it('schedules a daily ritual later today', () => {
    expect(initialRitualDue('daily', null, '18:00', now)).toBe('2026-11-12');
  });

  it('schedules a daily ritual tomorrow when its time has passed', () => {
    expect(initialRitualDue('daily', null, '07:00', now)).toBe('2026-11-13');
  });

  it('schedules weekly rituals on the next matching weekday', () => {
    expect(initialRitualDue('weekly', 5, '18:00', now)).toBe('2026-11-13');
  });
});
