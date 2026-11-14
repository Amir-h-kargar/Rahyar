import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react';
import type {
  AppState,
  Area,
  Decision,
  Energy,
  Goal,
  Review,
  Ritual,
  Task,
  TaskDraft,
} from '../types';
import {
  addDaysToKey,
  addMonthsToKey,
  nextWeeklyKey,
  ritualNextDue,
  todayKey,
} from '../lib/date';
import { uid } from '../lib/id';
import { loadState, saveState, type BootInfo } from '../lib/storage';

export type Action =
  | { type: 'replaceState'; state: AppState }
  | { type: 'touchVisit'; today: string }
  | { type: 'updateName'; name: string }
  | { type: 'setEnergy'; energy: Energy }
  | { type: 'setFocus'; areaId: string | null }
  | { type: 'startDeepWork'; minutes: number; at: string }
  | { type: 'endDeepWork' }
  | { type: 'addTask'; task: Task }
  | { type: 'updateTask'; id: string; patch: Partial<Task> }
  | { type: 'deleteTask'; id: string }
  | { type: 'archiveTask'; id: string; at: string }
  | { type: 'restoreTask'; id: string; at: string }
  | { type: 'completeTask'; id: string; at: string; today: string }
  | { type: 'restoreEntities'; tasks?: Task[]; rituals?: Ritual[] }
  | { type: 'deferTask'; id: string; days: number; today: string }
  | { type: 'delegateTask'; id: string; to: string; brief: string; at: string }
  | { type: 'addArea'; area: Area }
  | { type: 'updateArea'; id: string; patch: Partial<Area> }
  | { type: 'deleteArea'; id: string }
  | { type: 'addGoal'; goal: Goal }
  | { type: 'updateGoal'; id: string; patch: Partial<Goal> }
  | { type: 'deleteGoal'; id: string }
  | { type: 'toggleMilestone'; goalId: string; milestoneId: string }
  | { type: 'addRitual'; ritual: Ritual; today: string }
  | { type: 'updateRitual'; id: string; patch: Partial<Ritual> }
  | { type: 'deleteRitual'; id: string }
  | { type: 'completeRitual'; id: string; at: string; today: string }
  | { type: 'addDecision'; decision: Decision }
  | { type: 'deleteDecision'; id: string }
  | { type: 'saveReview'; review: Review; energy: Energy }
  | { type: 'pushMessage'; id: string; role: 'advisor' | 'user'; text: string; at: string; kind?: string }
  | { type: 'clearMessages' }
  | { type: 'dismissRecovery'; today: string }
  | { type: 'clearSample' }
  | { type: 'importState'; state: AppState; today: string }
  | { type: 'materializeRituals'; today: string }
  | { type: 'clearAll' };

export function createBlankState(): AppState {
  return {
    version: 1,
    onboarded: false,
    profile: { name: '', createdAt: new Date().toISOString(), demo: false },
    areas: [],
    tasks: [],
    goals: [],
    rituals: [],
    decisions: [],
    reviews: [],
    messages: [],
    settings: {
      energy: 'medium',
      focusAreaId: null,
      deepWorkUntil: null,
      deepWorkStartedAt: null,
      deepWorkMinutes: null,
      lastVisit: todayKey(),
      recoveryDismissedOn: null,
    },
  };
}

export function createTask(draft: TaskDraft, now: Date = new Date()): Task {
  const at = now.toISOString();
  return {
    id: uid('task'),
    title: draft.title.trim(),
    note: draft.note?.trim() ?? '',
    areaId: draft.areaId ?? null,
    energy: draft.energy ?? 'medium',
    due: draft.due ?? null,
    estimateMin: draft.estimateMin ?? null,
    deep: Boolean(draft.deep),
    goalId: draft.goalId ?? null,
    ritualId: null,
    status: 'active',
    pinned: false,
    deferCount: 0,
    createdAt: at,
    updatedAt: at,
    completedAt: null,
    delegatedTo: null,
    delegatedAt: null,
    brief: null,
  };
}

export function createGoal(input: {
  title: string;
  areaId: string | null;
  targetDate: string | null;
  note?: string;
  milestones?: string[];
}): Goal {
  return {
    id: uid('goal'),
    title: input.title.trim(),
    areaId: input.areaId,
    targetDate: input.targetDate,
    note: input.note?.trim() ?? '',
    milestones: (input.milestones ?? [])
      .filter((m) => m.trim())
      .map((title) => ({ id: uid('ms'), title: title.trim(), done: false })),
    status: 'active',
    createdAt: new Date().toISOString(),
  };
}

export function createDecision(input: {
  title: string;
  chosen: string;
  alternatives: string[];
  reason: string;
  areaId: string | null;
}): Decision {
  return {
    id: uid('decision'),
    title: input.title.trim(),
    chosen: input.chosen.trim(),
    alternatives: input.alternatives.map((a) => a.trim()).filter(Boolean),
    reason: input.reason.trim(),
    areaId: input.areaId,
    createdAt: new Date().toISOString(),
  };
}

export function initialRitualDue(
  cadence: Ritual['cadence'],
  weekday: number | null,
  time: string | null,
  now: Date,
): string {
  const today = todayKey(now);
  const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const laterToday = !time || time >= current;
  if (cadence === 'daily') return laterToday ? today : addDaysToKey(today, 1);
  if (cadence === 'weekly') {
    const target = weekday ?? now.getDay();
    if (target === now.getDay() && laterToday) return today;
    return nextWeeklyKey(target, today);
  }
  return laterToday ? today : addMonthsToKey(today, 1);
}

function materializeRituals(state: AppState, today: string): AppState {
  if (!state.rituals.length) return state;
  const additions: Task[] = [];
  for (const ritual of state.rituals) {
    if (ritual.nextDue > today) continue;
    const exists = state.tasks.some(
      (t) => t.ritualId === ritual.id && (t.status === 'active' || t.status === 'delegated'),
    );
    if (exists) continue;
    const at = new Date().toISOString();
    additions.push({
      id: uid('task'),
      title: ritual.title,
      note: ritual.note || 'آیین تکرارشونده',
      areaId: ritual.areaId,
      energy: 'low',
      due: ritual.nextDue,
      estimateMin: 10,
      deep: false,
      goalId: null,
      ritualId: ritual.id,
      status: 'active',
      pinned: false,
      deferCount: 0,
      createdAt: at,
      updatedAt: at,
      completedAt: null,
      delegatedTo: null,
      delegatedAt: null,
      brief: null,
    });
  }
  if (!additions.length) return state;
  return { ...state, tasks: [...state.tasks, ...additions] };
}

function completeRitualInState(state: AppState, ritualId: string, at: string, today: string): AppState {
  const ritual = state.rituals.find((r) => r.id === ritualId);
  if (!ritual) return state;
  if (ritual.log.includes(today)) return state;
  const nextDue = ritualNextDue(ritual, today);
  const log = [...ritual.log, today].slice(-120);
  const rituals = state.rituals.map((r) =>
    r.id === ritualId ? { ...r, lastDoneAt: at, nextDue, log } : r,
  );
  const tasks = state.tasks.map((t) =>
    t.ritualId === ritualId && t.status === 'active'
      ? { ...t, status: 'done' as const, completedAt: at, updatedAt: at }
      : t,
  );
  return { ...state, rituals, tasks };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'replaceState':
      return action.state;
    case 'touchVisit':
      return {
        ...state,
        settings: { ...state.settings, lastVisit: action.today },
      };
    case 'updateName':
      return {
        ...state,
        profile: { ...state.profile, name: action.name.trim().slice(0, 40) },
      };
    case 'setEnergy':
      return { ...state, settings: { ...state.settings, energy: action.energy } };
    case 'setFocus': {
      const areaId =
        action.areaId && state.areas.some((a) => a.id === action.areaId) ? action.areaId : null;
      return { ...state, settings: { ...state.settings, focusAreaId: areaId } };
    }
    case 'startDeepWork': {
      const until = new Date(new Date(action.at).getTime() + action.minutes * 60_000).toISOString();
      return {
        ...state,
        settings: {
          ...state.settings,
          deepWorkUntil: until,
          deepWorkStartedAt: action.at,
          deepWorkMinutes: action.minutes,
        },
      };
    }
    case 'endDeepWork':
      return {
        ...state,
        settings: {
          ...state.settings,
          deepWorkUntil: null,
          deepWorkStartedAt: null,
          deepWorkMinutes: null,
        },
      };
    case 'addTask':
      return { ...state, tasks: [...state.tasks, action.task] };
    case 'updateTask':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id ? { ...t, ...action.patch, updatedAt: new Date().toISOString() } : t,
        ),
      };
    case 'deleteTask':
      return {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== action.id),
      };
    case 'archiveTask':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id ? { ...t, status: 'archived', updatedAt: action.at } : t,
        ),
      };
    case 'restoreTask':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id ? { ...t, status: 'active', completedAt: null, updatedAt: action.at } : t,
        ),
      };
    case 'completeTask': {
      const task = state.tasks.find((t) => t.id === action.id);
      if (!task || task.status === 'done') return state;
      let next: AppState = {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id
            ? {
                ...t,
                status: 'done',
                completedAt: action.at,
                updatedAt: action.at,
                pinned: false,
              }
            : t,
        ),
      };
      if (task.ritualId) next = completeRitualInState(next, task.ritualId, action.at, action.today);
      return next;
    }
    case 'restoreEntities': {
      const tasks = action.tasks
        ? (() => {
            const incoming = new Map(action.tasks.map((t) => [t.id, t]));
            const existing = state.tasks.map((t) => incoming.get(t.id) ?? t);
            const known = new Set(existing.map((t) => t.id));
            return [...existing, ...action.tasks.filter((t) => !known.has(t.id))];
          })()
        : state.tasks;
      const rituals = action.rituals
        ? (() => {
            const incoming = new Map(action.rituals.map((r) => [r.id, r]));
            const existing = state.rituals.map((r) => incoming.get(r.id) ?? r);
            const known = new Set(existing.map((r) => r.id));
            return [...existing, ...action.rituals.filter((r) => !known.has(r.id))];
          })()
        : state.rituals;
      return { ...state, tasks, rituals };
    }
    case 'deferTask': {
      const due = addDaysToKey(action.today, action.days);
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id
            ? {
                ...t,
                due,
                deferCount: t.deferCount + 1,
                updatedAt: new Date().toISOString(),
              }
            : t,
        ),
      };
    }
    case 'delegateTask':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id
            ? {
                ...t,
                status: 'delegated',
                delegatedTo: action.to.trim(),
                brief: action.brief,
                delegatedAt: action.at,
                updatedAt: action.at,
              }
            : t,
        ),
      };
    case 'addArea':
      return { ...state, areas: [...state.areas, action.area] };
    case 'updateArea':
      return {
        ...state,
        areas: state.areas.map((a) => (a.id === action.id ? { ...a, ...action.patch } : a)),
      };
    case 'deleteArea':
      return {
        ...state,
        areas: state.areas.filter((a) => a.id !== action.id),
        tasks: state.tasks.map((t) => (t.areaId === action.id ? { ...t, areaId: null } : t)),
        goals: state.goals.map((g) => (g.areaId === action.id ? { ...g, areaId: null } : g)),
        rituals: state.rituals.map((r) => (r.areaId === action.id ? { ...r, areaId: null } : r)),
        decisions: state.decisions.map((d) =>
          d.areaId === action.id ? { ...d, areaId: null } : d,
        ),
        settings: {
          ...state.settings,
          focusAreaId: state.settings.focusAreaId === action.id ? null : state.settings.focusAreaId,
        },
      };
    case 'addGoal':
      return { ...state, goals: [...state.goals, action.goal] };
    case 'updateGoal':
      return {
        ...state,
        goals: state.goals.map((g) => (g.id === action.id ? { ...g, ...action.patch } : g)),
      };
    case 'deleteGoal':
      return {
        ...state,
        goals: state.goals.filter((g) => g.id !== action.id),
        tasks: state.tasks.map((t) => (t.goalId === action.id ? { ...t, goalId: null } : t)),
      };
    case 'toggleMilestone':
      return {
        ...state,
        goals: state.goals.map((g) =>
          g.id === action.goalId
            ? {
                ...g,
                milestones: g.milestones.map((m) =>
                  m.id === action.milestoneId ? { ...m, done: !m.done } : m,
                ),
              }
            : g,
        ),
      };
    case 'addRitual':
      return materializeRituals(
        { ...state, rituals: [...state.rituals, action.ritual] },
        action.today,
      );
    case 'updateRitual':
      return {
        ...state,
        rituals: state.rituals.map((r) =>
          r.id === action.id ? { ...r, ...action.patch } : r,
        ),
      };
    case 'deleteRitual':
      return {
        ...state,
        rituals: state.rituals.filter((r) => r.id !== action.id),
        tasks: state.tasks.filter((t) => t.ritualId !== action.id || t.status === 'done'),
      };
    case 'completeRitual':
      return completeRitualInState(state, action.id, action.at, action.today);
    case 'addDecision':
      return { ...state, decisions: [action.decision, ...state.decisions] };
    case 'deleteDecision':
      return { ...state, decisions: state.decisions.filter((d) => d.id !== action.id) };
    case 'saveReview': {
      const reviews = state.reviews.filter((r) => r.date !== action.review.date);
      reviews.push(action.review);
      reviews.sort((a, b) => (a.date < b.date ? -1 : 1));
      return {
        ...state,
        reviews,
        settings: { ...state.settings, energy: action.energy },
      };
    }
    case 'pushMessage':
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            id: action.id,
            role: action.role,
            text: action.text,
            at: action.at,
            ...(action.kind ? { kind: action.kind } : {}),
          },
        ].slice(-80),
      };
    case 'clearMessages':
      return { ...state, messages: [] };
    case 'dismissRecovery':
      return {
        ...state,
        settings: { ...state.settings, recoveryDismissedOn: action.today },
      };
    case 'clearSample': {
      const seedRitualIds = new Set(
        state.rituals.filter((r) => r.source === 'seed').map((r) => r.id),
      );
      return {
        ...state,
        profile: { ...state.profile, demo: false },
        tasks: state.tasks.filter(
          (t) =>
            t.source !== 'seed' &&
            (!t.ritualId || !state.rituals.some((r) => r.id === t.ritualId && r.source === 'seed')),
        ),
        goals: state.goals.filter((g) => g.source !== 'seed'),
        rituals: state.rituals.filter((r) => !seedRitualIds.has(r.id)),
        decisions: state.decisions.filter((d) => d.source !== 'seed'),
        reviews: state.reviews.filter((r) => r.source !== 'seed'),
        messages: [],
        settings: { ...state.settings, focusAreaId: null },
      };
    }
    case 'importState':
      return materializeRituals(
        {
          ...action.state,
          settings: { ...action.state.settings, lastVisit: action.today },
        },
        action.today,
      );
    case 'materializeRituals':
      return materializeRituals(state, action.today);
    case 'clearAll':
      return { ...createBlankState(), settings: { ...createBlankState().settings, lastVisit: todayKey() } };
    default:
      return state;
  }
}

interface StoreValue {
  state: AppState;
  dispatch: Dispatch<Action>;
  boot: BootInfo;
  recovery: boolean;
  today: string;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => {
    const loaded = loadState();
    const base = loaded.state ?? createBlankState();
    return {
      state: materializeRituals(base, todayKey()),
      boot: loaded.boot,
      corrupt: loaded.corrupt,
    };
  });

  const [state, dispatch] = useReducer(reducer, initial.state);
  const stateRef = useRef(state);
  stateRef.current = state;
  const bootRef = useRef<BootInfo>(initial.boot);
  const [today, setToday] = useState(() => todayKey());

  useEffect(() => {
    if (initial.corrupt) {
      console.warn('Rahyar: previous data was corrupt and has been backed up.');
    }
  }, [initial.corrupt]);

  useEffect(() => {
    if (!state.onboarded) return;
    dispatch({ type: 'touchVisit', today: todayKey() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.onboarded]);

  useEffect(() => {
    if (!state.onboarded) return;
    const timer = window.setTimeout(() => {
      saveState(state);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    const flush = () => saveState(stateRef.current);
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    const check = () => {
      const key = todayKey();
      setToday((prev) => (prev === key ? prev : key));
      if (key !== state.settings.lastVisit) {
        dispatch({ type: 'touchVisit', today: key });
        dispatch({ type: 'materializeRituals', today: key });
      }
      if (
        state.settings.deepWorkUntil &&
        new Date(state.settings.deepWorkUntil).getTime() <= Date.now()
      ) {
        dispatch({ type: 'endDeepWork' });
      }
    };
    const timer = window.setInterval(check, 30_000);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, [state.settings.deepWorkUntil, state.settings.lastVisit]);

  const dismissed = state.settings.recoveryDismissedOn === today;
  const activeNow = state.tasks.filter((t) => t.status === 'active').length;
  const overdueNow = state.tasks.filter(
    (t) => t.status === 'active' && t.due !== null && t.due < today,
  ).length;
  const away = bootRef.current.daysAway ?? 0;
  const recovery =
    state.onboarded &&
    !dismissed &&
    activeNow > 0 &&
    (away >= 2 || overdueNow >= 4);

  const value = useMemo<StoreValue>(
    () => ({ state, dispatch, boot: bootRef.current, recovery, today }),
    [state, recovery, today],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
