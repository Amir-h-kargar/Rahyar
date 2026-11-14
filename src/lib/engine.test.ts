import { describe, expect, it } from 'vitest';
import type { AppState, Area, Goal, Ritual, Task } from '../types';
import {
  buildPortfolio,
  nextAction,
  rankedTasks,
  suggestionReason,
  todayCompleted,
} from './engine';

const NOW = new Date(2026, 10, 12, 10, 0, 0);
const TODAY = '2026-11-12';

function area(id: string, title: string, intent: number, color: Area['color'] = 'gold'): Area {
  return {
    id,
    title,
    emoji: '✦',
    color,
    intent,
    createdAt: new Date(2026, 9, 1).toISOString(),
  };
}

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1',
    title: 'کار نمونه',
    note: '',
    areaId: null,
    energy: 'medium',
    due: null,
    estimateMin: null,
    deep: false,
    goalId: null,
    ritualId: null,
    status: 'active',
    pinned: false,
    deferCount: 0,
    createdAt: new Date(2026, 10, 10, 10).toISOString(),
    updatedAt: new Date(2026, 10, 10, 10).toISOString(),
    completedAt: null,
    delegatedTo: null,
    delegatedAt: null,
    brief: null,
    ...overrides,
  };
}

function baseInput(tasks: Task[], overrides: Partial<Parameters<typeof rankedTasks>[0]> = {}) {
  return {
    now: NOW,
    energy: 'low' as const,
    areas: [area('a', 'کسب‌وکار', 3), area('b', 'سلامت', 3, 'mint')],
    tasks,
    goals: [] as Goal[],
    rituals: [] as Ritual[],
    focusAreaId: null,
    deepWorkUntil: null,
    recovery: false,
    ...overrides,
  };
}

describe('ranked suggestions', () => {
  it('returns null when nothing is active', () => {
    expect(nextAction(baseInput([task({ status: 'done' })]))).toBeNull();
  });

  it('ignores done, archived and delegated tasks', () => {
    const result = rankedTasks(
      baseInput([
        task({ id: 'done', status: 'done', due: '2026-11-01' }),
        task({ id: 'archived', status: 'archived', due: '2026-11-01' }),
        task({ id: 'delegated', status: 'delegated', due: '2026-11-01' }),
        task({ id: 'active', title: 'فعال', due: '2026-11-20' }),
      ]),
    );
    expect(result.map((r) => r.task.id)).toEqual(['active']);
  });

  it('prefers a task that matches the current energy', () => {
    const result = rankedTasks(
      baseInput([
        task({ id: 'high', energy: 'high', due: TODAY }),
        task({ id: 'low', energy: 'low', due: TODAY }),
      ]),
    );
    expect(result[0].task.id).toBe('low');
  });

  it('raises urgency for overdue work', () => {
    const result = rankedTasks(
      baseInput([
        task({ id: 'overdue', due: '2026-11-11', energy: 'medium' }),
        task({ id: 'nodue', energy: 'low', estimateMin: 10 }),
      ]),
    );
    expect(result[0].task.id).toBe('overdue');
  });

  it('dampens overdue work in recovery mode', () => {
    const result = rankedTasks(
      baseInput(
        [
          task({ id: 'overdue', due: '2026-11-11', energy: 'medium' }),
          task({ id: 'small', energy: 'low', estimateMin: 10 }),
        ],
        { recovery: true },
      ),
    );
    expect(result[0].task.id).toBe('small');
  });

  it('boosts the area whose attention lags behind intent', () => {
    const areas = [area('a', 'خانواده', 5, 'rose'), area('b', 'مالی', 1, 'sky')];
    const completed = task({
      id: 'done',
      areaId: 'b',
      status: 'done',
      completedAt: new Date(2026, 10, 11, 12).toISOString(),
    });
    const result = rankedTasks(
      baseInput(
        [
          task({ id: 'family', areaId: 'a', due: TODAY, energy: 'low' }),
          task({ id: 'money', areaId: 'b', due: TODAY, energy: 'low' }),
          completed,
        ],
        { areas },
      ),
    );
    expect(result[0].task.id).toBe('family');
  });

  it('respects a focus area', () => {
    const result = rankedTasks(
      baseInput(
        [
          task({ id: 'a', areaId: 'a', due: TODAY }),
          task({ id: 'b', areaId: 'b', due: TODAY }),
        ],
        { focusAreaId: 'b' },
      ),
    );
    expect(result[0].task.id).toBe('b');
    expect(result).toHaveLength(1);
  });

  it('always offers a reason in Persian', () => {
    const result = rankedTasks(baseInput([task({ id: 'x' })]));
    expect(result[0].reasons.length).toBeGreaterThan(0);
    expect(suggestionReason(result[0]).length).toBeGreaterThan(10);
  });
});

describe('portfolio attention', () => {
  it('does not double count a ritual task and its ritual log', () => {
    const ritual: Ritual = {
      id: 'r1',
      title: 'مرور صبح',
      areaId: 'a',
      cadence: 'daily',
      weekday: null,
      time: '07:00',
      nextDue: '2026-11-13',
      lastDoneAt: new Date(2026, 10, 12, 7).toISOString(),
      log: [TODAY],
      note: '',
      createdAt: new Date(2026, 9, 1).toISOString(),
    };
    const ritualTask = task({
      id: 'rt',
      areaId: 'a',
      ritualId: 'r1',
      status: 'done',
      completedAt: new Date(2026, 10, 12, 7).toISOString(),
    });
    const state = {
      areas: [area('a', 'رشد', 4, 'violet')],
      tasks: [ritualTask],
      rituals: [ritual],
    };
    const portfolio = buildPortfolio(state, NOW);
    expect(portfolio.totalCompleted).toBe(1);
    expect(portfolio.areas[0].completed).toBe(1);
  });

  it('counts completions from the last 14 days only', () => {
    const old = task({
      id: 'old',
      areaId: 'a',
      status: 'done',
      completedAt: new Date(2026, 9, 1, 12).toISOString(),
    });
    const recent = task({
      id: 'new',
      areaId: 'a',
      status: 'done',
      completedAt: new Date(2026, 10, 11, 12).toISOString(),
    });
    const portfolio = buildPortfolio(
      { areas: [area('a', 'کار', 3)], tasks: [old, recent], rituals: [] },
      NOW,
    );
    expect(portfolio.totalCompleted).toBe(1);
  });
});

describe('today completion', () => {
  it('counts a completed ritual task once', () => {
    const ritual: Ritual = {
      id: 'r1',
      title: 'مرور',
      areaId: 'a',
      cadence: 'daily',
      weekday: null,
      time: null,
      nextDue: '2026-11-13',
      lastDoneAt: new Date(2026, 10, 12, 7).toISOString(),
      log: [TODAY],
      note: '',
      createdAt: new Date(2026, 9, 1).toISOString(),
    };
    const state: Pick<AppState, 'tasks' | 'rituals'> = {
      tasks: [
        task({
          id: 'rt',
          ritualId: 'r1',
          status: 'done',
          completedAt: new Date(2026, 10, 12, 7).toISOString(),
        }),
        task({
          id: 'normal',
          status: 'done',
          completedAt: new Date(2026, 10, 12, 8).toISOString(),
        }),
      ],
      rituals: [ritual],
    };
    const result = todayCompleted(state, NOW);
    expect(result.count).toBe(2);
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].id).toBe('normal');
  });
});
