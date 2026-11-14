import type {
  AdvisorMessage,
  AppState,
  Area,
  AreaColor,
  Decision,
  Energy,
  Goal,
  Milestone,
  Review,
  Ritual,
  Task,
} from '../types';
import { diffDays, isKey, todayKey } from './date';
import { buildEmptyState } from './seed';

export const STORAGE_KEY = 'rahyar.state.v1';

export interface BootInfo {
  daysAway: number | null;
  activeCount: number;
  dismissedToday: boolean;
}

export interface LoadedState {
  state: AppState | null;
  boot: BootInfo;
  corrupt: boolean;
}

const ARRAY_KEYS = ['areas', 'tasks', 'goals', 'rituals', 'decisions', 'reviews', 'messages'] as const;
const COLORS: AreaColor[] = ['gold', 'mint', 'rose', 'violet', 'sky'];

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function energy(value: unknown): Energy {
  return value === 'low' || value === 'high' ? value : 'medium';
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeTask(
  raw: unknown,
  idx: number,
  now: string,
  areas: Area[],
  goals: Goal[],
  rituals: Ritual[],
): Task | null {
  const value = record(raw);
  if (!value) return null;
  const title = text(value.title).trim();
  if (!title) return null;
  const areaId = nullableText(value.areaId);
  const goalId = nullableText(value.goalId);
  const ritualId = nullableText(value.ritualId);
  const due = value.due;
  const estimate = num(value.estimateMin, 0);
  return {
    id: nullableText(value.id) ?? `recovered_${idx}_${now}`,
    title,
    note: text(value.note),
    areaId: areaId && areas.some((a) => a.id === areaId) ? areaId : null,
    energy: energy(value.energy),
    due: isKey(due) ? due : null,
    estimateMin: estimate > 0 ? Math.min(480, Math.round(estimate)) : null,
    deep: Boolean(value.deep),
    goalId: goalId && goals.some((g) => g.id === goalId) ? goalId : null,
    ritualId: ritualId && rituals.some((r) => r.id === ritualId) ? ritualId : null,
    status:
      value.status === 'done' || value.status === 'archived' || value.status === 'delegated'
        ? value.status
        : 'active',
    pinned: Boolean(value.pinned),
    deferCount: Math.max(0, Math.round(num(value.deferCount, 0))),
    createdAt: nullableText(value.createdAt) ?? now,
    updatedAt: nullableText(value.updatedAt) ?? now,
    completedAt: nullableText(value.completedAt),
    delegatedTo: nullableText(value.delegatedTo),
    delegatedAt: nullableText(value.delegatedAt),
    brief: nullableText(value.brief),
    ...(value.source === 'seed' ? { source: 'seed' as const } : {}),
  };
}

function normalizeArea(raw: unknown, idx: number, now: string): Area | null {
  const value = record(raw);
  if (!value) return null;
  const title = text(value.title).trim();
  if (!title) return null;
  const color = COLORS.includes(value.color as AreaColor) ? (value.color as AreaColor) : 'gold';
  return {
    id: nullableText(value.id) ?? `area_${idx}_${now}`,
    title,
    emoji: text(value.emoji, '✦').slice(0, 4) || '✦',
    color,
    intent: Math.min(5, Math.max(1, Math.round(num(value.intent, 3)))),
    createdAt: nullableText(value.createdAt) ?? now,
    ...(value.source === 'seed' ? { source: 'seed' as const } : {}),
  };
}

function normalizeGoal(raw: unknown, idx: number, now: string, areas: Area[]): Goal | null {
  const value = record(raw);
  if (!value) return null;
  const title = text(value.title).trim();
  if (!title) return null;
  const areaId = nullableText(value.areaId);
  const milestonesRaw = Array.isArray(value.milestones) ? value.milestones : [];
  const milestones: Milestone[] = [];
  milestonesRaw.forEach((item, milestoneIndex) => {
    const milestone = record(item);
    if (!milestone) return;
    const milestoneTitle = text(milestone.title).trim();
    if (!milestoneTitle) return;
    milestones.push({
      id: nullableText(milestone.id) ?? `ms_${idx}_${milestoneIndex}_${now}`,
      title: milestoneTitle,
      done: Boolean(milestone.done),
    });
  });
  return {
    id: nullableText(value.id) ?? `goal_${idx}_${now}`,
    title,
    areaId: areaId && areas.some((a) => a.id === areaId) ? areaId : null,
    targetDate: isKey(value.targetDate) ? value.targetDate : null,
    note: text(value.note),
    milestones,
    status: value.status === 'archived' ? 'archived' : 'active',
    createdAt: nullableText(value.createdAt) ?? now,
    ...(value.source === 'seed' ? { source: 'seed' as const } : {}),
  };
}

function normalizeRitual(raw: unknown, idx: number, now: string, areas: Area[]): Ritual | null {
  const value = record(raw);
  if (!value) return null;
  const title = text(value.title).trim();
  if (!title) return null;
  const areaId = nullableText(value.areaId);
  const cadence =
    value.cadence === 'weekly' || value.cadence === 'monthly' ? value.cadence : 'daily';
  const weekdayRaw = value.weekday;
  const weekday =
    typeof weekdayRaw === 'number' && weekdayRaw >= 0 && weekdayRaw <= 6
      ? Math.round(weekdayRaw)
      : null;
  const logRaw = Array.isArray(value.log) ? value.log : [];
  const log = Array.from(new Set(logRaw.filter(isKey))).slice(-120);
  return {
    id: nullableText(value.id) ?? `ritual_${idx}_${now}`,
    title,
    areaId: areaId && areas.some((a) => a.id === areaId) ? areaId : null,
    cadence,
    weekday: cadence === 'weekly' ? weekday : null,
    time: typeof value.time === 'string' && /^\d{2}:\d{2}$/.test(value.time) ? value.time : null,
    nextDue: isKey(value.nextDue) ? value.nextDue : todayKey(),
    lastDoneAt: nullableText(value.lastDoneAt),
    log,
    note: text(value.note),
    createdAt: nullableText(value.createdAt) ?? now,
    ...(value.source === 'seed' ? { source: 'seed' as const } : {}),
  };
}

function normalizeDecision(raw: unknown, idx: number, now: string, areas: Area[]): Decision | null {
  const value = record(raw);
  if (!value) return null;
  const title = text(value.title).trim();
  const chosen = text(value.chosen).trim();
  if (!title || !chosen) return null;
  const areaId = nullableText(value.areaId);
  const alternatives = Array.isArray(value.alternatives)
    ? value.alternatives.filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
    : [];
  return {
    id: nullableText(value.id) ?? `decision_${idx}_${now}`,
    title,
    chosen,
    alternatives,
    reason: text(value.reason),
    areaId: areaId && areas.some((a) => a.id === areaId) ? areaId : null,
    createdAt: nullableText(value.createdAt) ?? now,
    ...(value.source === 'seed' ? { source: 'seed' as const } : {}),
  };
}

function normalizeReview(raw: unknown, idx: number, now: string): Review | null {
  const value = record(raw);
  if (!value || !isKey(value.date)) return null;
  return {
    id: nullableText(value.id) ?? `review_${idx}_${now}`,
    date: value.date,
    moved: Math.max(0, Math.round(num(value.moved, 0))),
    energy: energy(value.energy),
    note: text(value.note),
    createdAt: nullableText(value.createdAt) ?? now,
    ...(value.source === 'seed' ? { source: 'seed' as const } : {}),
  };
}

function normalizeMessage(raw: unknown, idx: number, now: string): AdvisorMessage | null {
  const value = record(raw);
  if (!value) return null;
  const message = text(value.text).trim();
  if (!message) return null;
  return {
    id: nullableText(value.id) ?? `message_${idx}_${now}`,
    role: value.role === 'user' ? 'user' : 'advisor',
    text: message,
    at: nullableText(value.at) ?? now,
    ...(typeof value.kind === 'string' ? { kind: value.kind } : {}),
  };
}

export function normalizeState(raw: unknown): AppState | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Record<string, unknown>;
  if (candidate.version !== 1) return null;
  for (const key of ARRAY_KEYS) {
    if (!Array.isArray(candidate[key])) return null;
  }
  const base = buildEmptyState();
  const now = new Date().toISOString();

  const areas: Area[] = [];
  const areaIds = new Set<string>();
  for (const [idx, item] of (candidate.areas as unknown[]).entries()) {
    const area = normalizeArea(item, idx, now);
    if (!area || areaIds.has(area.id)) continue;
    areaIds.add(area.id);
    areas.push(area);
  }

  const goals: Goal[] = [];
  const goalIds = new Set<string>();
  for (const [idx, item] of (candidate.goals as unknown[]).entries()) {
    const goal = normalizeGoal(item, idx, now, areas);
    if (!goal || goalIds.has(goal.id)) continue;
    goalIds.add(goal.id);
    goals.push(goal);
  }

  const rituals: Ritual[] = [];
  const ritualIds = new Set<string>();
  for (const [idx, item] of (candidate.rituals as unknown[]).entries()) {
    const ritual = normalizeRitual(item, idx, now, areas);
    if (!ritual || ritualIds.has(ritual.id)) continue;
    ritualIds.add(ritual.id);
    rituals.push(ritual);
  }

  const tasks: Task[] = [];
  const taskIds = new Set<string>();
  for (const [idx, item] of (candidate.tasks as unknown[]).entries()) {
    const task = normalizeTask(item, idx, now, areas, goals, rituals);
    if (!task || taskIds.has(task.id)) continue;
    taskIds.add(task.id);
    tasks.push(task);
  }

  const decisions: Decision[] = [];
  const decisionIds = new Set<string>();
  for (const [idx, item] of (candidate.decisions as unknown[]).entries()) {
    const decision = normalizeDecision(item, idx, now, areas);
    if (!decision || decisionIds.has(decision.id)) continue;
    decisionIds.add(decision.id);
    decisions.push(decision);
  }

  const reviews: Review[] = [];
  const reviewIds = new Set<string>();
  const reviewDates = new Set<string>();
  for (const [idx, item] of (candidate.reviews as unknown[]).entries()) {
    const review = normalizeReview(item, idx, now);
    if (!review || reviewIds.has(review.id) || reviewDates.has(review.date)) continue;
    reviewIds.add(review.id);
    reviewDates.add(review.date);
    reviews.push(review);
  }

  const messages: AdvisorMessage[] = [];
  const messageIds = new Set<string>();
  for (const [idx, item] of (candidate.messages as unknown[]).entries()) {
    const message = normalizeMessage(item, idx, now);
    if (!message || messageIds.has(message.id)) continue;
    messageIds.add(message.id);
    messages.push(message);
  }

  const settings = record(candidate.settings) ?? {};
  const profile = record(candidate.profile) ?? {};
  const focusAreaId = nullableText(settings.focusAreaId);
  const lastVisit = isKey(settings.lastVisit) ? settings.lastVisit : todayKey();

  return {
    version: 1,
    onboarded: candidate.onboarded === true,
    profile: {
      name: text(profile.name).slice(0, 40),
      createdAt: nullableText(profile.createdAt) ?? base.profile.createdAt,
      demo: Boolean(profile.demo),
    },
    areas,
    tasks,
    goals,
    rituals,
    decisions,
    reviews,
    messages,
    settings: {
      energy: energy(settings.energy),
      focusAreaId: focusAreaId && areas.some((a) => a.id === focusAreaId) ? focusAreaId : null,
      deepWorkUntil: nullableText(settings.deepWorkUntil),
      deepWorkStartedAt: nullableText(settings.deepWorkStartedAt),
      deepWorkMinutes:
        typeof settings.deepWorkMinutes === 'number' && settings.deepWorkMinutes > 0
          ? Math.round(settings.deepWorkMinutes)
          : null,
      lastVisit,
      recoveryDismissedOn: isKey(settings.recoveryDismissedOn)
        ? settings.recoveryDismissedOn
        : null,
    },
  };
}

export function loadState(): LoadedState {
  const emptyBoot: BootInfo = { daysAway: null, activeCount: 0, dismissedToday: false };
  if (typeof localStorage === 'undefined') return { state: null, boot: emptyBoot, corrupt: false };
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return { state: null, boot: emptyBoot, corrupt: false };
  }
  if (!raw) return { state: null, boot: emptyBoot, corrupt: false };

  try {
    const parsed = JSON.parse(raw);
    const state = normalizeState(parsed);
    if (!state) throw new Error('invalid state');
    const today = todayKey();
    const daysAway = state.settings.lastVisit
      ? Math.max(0, diffDays(today, state.settings.lastVisit))
      : 0;
    const activeCount = state.tasks.filter((t) => t.status === 'active').length;
    const dismissedToday = state.settings.recoveryDismissedOn === today;
    return {
      state,
      boot: {
        daysAway,
        activeCount,
        dismissedToday,
      },
      corrupt: false,
    };
  } catch (error) {
    try {
      localStorage.setItem(`${STORAGE_KEY}.corrupt.${Date.now()}`, raw);
    } catch {
      /* ignore quota */
    }
    console.warn('Rahyar: could not read saved state, starting fresh.', error);
    return { state: null, boot: emptyBoot, corrupt: true };
  }
}

export function saveState(state: AppState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        messages: state.messages.slice(-80),
      }),
    );
  } catch (error) {
    console.warn('Rahyar: could not persist state.', error);
  }
}

export function serializeState(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function parseImportedState(text: string): AppState | null {
  try {
    return normalizeState(JSON.parse(text));
  } catch {
    return null;
  }
}
